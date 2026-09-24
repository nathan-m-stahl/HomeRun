import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function MessageThreadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const taskId = getParamValue(params.taskId);
  const receiverId = getParamValue(params.receiverId);
  const receiverName = getParamValue(params.receiverName) || "User";
  const taskTitle = getParamValue(params.taskTitle) || "Task";

  const [currentUserId, setCurrentUserId] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);

  async function loadMessages() {
    if (!taskId || !receiverId) {
      Alert.alert(
        "Message Error",
        "This conversation is missing task or user information."
      );
      setIsLoadingMessages(false);
      return;
    }

    setIsLoadingMessages(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      Alert.alert("Not Signed In", "Please log in to view messages.");
      setIsLoadingMessages(false);
      return;
    }

    const userId = userData.user.id;
    setCurrentUserId(userId);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("task_id", taskId)
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      Alert.alert("Message Error", error.message);
      setIsLoadingMessages(false);
      return;
    }

    setMessages(data || []);
    setIsLoadingMessages(false);
  }

  useEffect(() => {
    loadMessages();

    if (!taskId) {
        return;
    }

    let realtimeChannel: any;

    async function setupRealtimeMessages() {
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
        console.log("Realtime user error:", userError);
        return;
        }

        const userId = userData.user.id;

        realtimeChannel = supabase
        .channel(`messages-${taskId}-${userId}`)
        .on(
            "postgres_changes",
            {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `task_id=eq.${taskId}`,
            },
            (payload) => {
            console.log("Realtime message received:", payload);

            const newMessage = payload.new as any;

            const isPartOfConversation =
                newMessage.sender_id === userId ||
                newMessage.receiver_id === userId;

            if (!isPartOfConversation) {
                return;
            }

            setMessages((currentMessages) => {
                const alreadyExists = currentMessages.some(
                (message) => message.id === newMessage.id
                );

                if (alreadyExists) {
                return currentMessages;
                }

                return [...currentMessages, newMessage];
            });
            }
        )
        .subscribe((status) => {
            console.log("Realtime status:", status);
        });
    }

    setupRealtimeMessages();

    return () => {
        if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        }
    };
    }, [taskId]);

  async function handleSendMessage() {
    if (!messageText.trim()) {
      return;
    }

    if (!taskId || !receiverId || !currentUserId) {
      Alert.alert(
        "Message Error",
        "This conversation is missing required information."
      );
      return;
    }

    setIsSending(true);

    const { error } = await supabase.from("messages").insert({
      task_id: taskId,
      sender_id: currentUserId,
      receiver_id: receiverId,
      body: messageText.trim(),
    });

    if (error) {
      setIsSending(false);
      Alert.alert("Send Error", error.message);
      return;
    }

    setMessageText("");
    setIsSending(false);
    loadMessages();
    }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerCard}>
            <Text style={styles.title}>{receiverName}</Text>
            <Text style={styles.subtitle}>{taskTitle}</Text>
          </View>

          <ScrollView
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {isLoadingMessages ? (
              <Text style={styles.emptyText}>Loading messages...</Text>
            ) : messages.length === 0 ? (
              <Text style={styles.emptyText}>
                No messages yet. Send the first message below.
              </Text>
            ) : (
              messages.map((message) => {
                const isMine = message.sender_id === currentUserId;

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      isMine ? styles.myMessage : styles.theirMessage,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageBody,
                        isMine
                          ? styles.myMessageText
                          : styles.theirMessageText,
                      ]}
                    >
                      {message.body}
                    </Text>

                    <Text
                      style={[
                        styles.messageTime,
                        isMine
                          ? styles.myMessageTime
                          : styles.theirMessageTime,
                      ]}
                    >
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                isSending && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={isSending}
            >
              <Text style={styles.sendButtonText}>
                {isSending ? "..." : "Send"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },

  keyboardContainer: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: "#F7F7F7",
  },

  backButton: {
    marginBottom: 10,
  },

  backButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F7A4D",
  },

  headerCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F7A4D",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginTop: 6,
  },

  messagesContainer: {
    flex: 1,
  },

  messagesContent: {
    paddingVertical: 12,
    paddingBottom: 20,
  },

  emptyText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginTop: 30,
    lineHeight: 22,
  },

  messageBubble: {
    maxWidth: "78%",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },

  myMessage: {
    backgroundColor: "#1F7A4D",
    alignSelf: "flex-end",
  },

  theirMessage: {
    backgroundColor: "#FFF",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  messageBody: {
    fontSize: 15,
    lineHeight: 21,
  },

  myMessageText: {
    color: "#FFF",
  },

  theirMessageText: {
    color: "#111",
  },

  messageTime: {
    fontSize: 11,
    marginTop: 6,
  },

  myMessageTime: {
    color: "#DDEFE5",
    textAlign: "right",
  },

  theirMessageTime: {
    color: "#777",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 8,
    marginTop: 8,
    marginBottom: Platform.OS === "ios" ? 4 : 8,
  },

  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111",
  },

  sendButton: {
    backgroundColor: "#1F7A4D",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 8,
  },

  sendButtonDisabled: {
    opacity: 0.6,
  },

  sendButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});