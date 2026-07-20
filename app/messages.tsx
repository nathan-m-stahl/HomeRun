import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MessagesScreen() {
  const router = useRouter();

  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  async function loadWorkerConversations() {
    setIsLoadingMessages(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      Alert.alert("Not Signed In", "Please log in to view your messages.");
      setIsLoadingMessages(false);
      return;
    }

    const workerId = userData.user.id;

    const { data: agreementsData, error: agreementsError } = await supabase
      .from("agreements")
      .select(`
        id,
        task_id,
        customer_id,
        worker_id,
        agreement_status,
        created_at,
        tasks (
          id,
          title,
          preferred_date,
          preferred_time,
          address,
          status
        )
      `)
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false });

    if (agreementsError) {
      Alert.alert("Messages Error", agreementsError.message);
      setIsLoadingMessages(false);
      return;
    }

    const conversationsWithMessages = await Promise.all(
      (agreementsData || []).map(async (agreement: any) => {
        const task = Array.isArray(agreement.tasks)
          ? agreement.tasks[0]
          : agreement.tasks;

        const { data: customerProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", agreement.customer_id)
          .single();

        const { data: latestMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("task_id", agreement.task_id)
          .or(
            `and(sender_id.eq.${workerId},receiver_id.eq.${agreement.customer_id}),and(sender_id.eq.${agreement.customer_id},receiver_id.eq.${workerId})`
          )
          .order("created_at", { ascending: false })
          .limit(1);

        const latestMessage = latestMessages?.[0];

        return {
          id: agreement.id,
          taskId: agreement.task_id,
          taskTitle: task?.title || "Task",
          taskDate: task?.preferred_date || "",
          taskTime: task?.preferred_time || "",
          customerId: agreement.customer_id,
          customerName: customerProfile?.full_name || "Customer",
          lastMessage:
            latestMessage?.body || "No messages yet. Start the conversation.",
          lastMessageTime: latestMessage
            ? new Date(latestMessage.created_at).toLocaleDateString()
            : "",
          status:
            agreement.agreement_status === "confirmed"
              ? "Confirmed"
              : "Pending Agreement",
          unread: false,
        };
      })
    );

    setConversations(conversationsWithMessages);
    setIsLoadingMessages(false);
  }

  useEffect(() => {
    loadWorkerConversations();
  }, []);

  function handleOpenConversation(conversation: any) {
    router.push({
      pathname: "/message-thread",
      params: {
        taskId: conversation.taskId,
        receiverId: conversation.customerId,
        receiverName: conversation.customerName,
        taskTitle: conversation.taskTitle,
      },
    });
  }

  const unreadCount = conversations.filter(
    (conversation) => conversation.unread
  ).length;

  const activeConversationCount = conversations.length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/worker-home")}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Messages</Text>

      <Text style={styles.subtitle}>
        Keep track of task requests, customer questions, and active jobs.
      </Text>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryNumber}>{unreadCount}</Text>
          <Text style={styles.summaryLabel}>Unread Messages</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View>
          <Text style={styles.summaryNumber}>{activeConversationCount}</Text>
          <Text style={styles.summaryLabel}>Active Conversations</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterButtonActive}>
          <Text style={styles.filterButtonTextActive}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Unread</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Active Jobs</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Inbox</Text>

      {isLoadingMessages ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading messages...</Text>
          <Text style={styles.emptyText}>
            Checking your task conversations.
          </Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Conversations will appear here after a customer accepts you for a
            task and confirms the agreement.
          </Text>
        </View>
      ) : (
        conversations.map((conversation) => (
          <TouchableOpacity
            key={conversation.id}
            style={[
              styles.messageCard,
              conversation.unread && styles.unreadMessageCard,
            ]}
            onPress={() => handleOpenConversation(conversation)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {conversation.customerName.charAt(0)}
              </Text>
            </View>

            <View style={styles.messageContent}>
              <View style={styles.messageTopRow}>
                <Text style={styles.customerName}>
                  {conversation.customerName}
                </Text>
                <Text style={styles.messageTime}>
                  {conversation.lastMessageTime}
                </Text>
              </View>

              <Text style={styles.taskName}>{conversation.taskTitle}</Text>

              <Text
                style={[
                  styles.lastMessage,
                  conversation.unread && styles.unreadLastMessage,
                ]}
                numberOfLines={2}
              >
                {conversation.lastMessage}
              </Text>

              <View style={styles.messageBottomRow}>
                <View
                  style={[
                    styles.statusPill,
                    conversation.status === "Confirmed" &&
                      styles.statusConfirmed,
                    conversation.status === "Pending Agreement" &&
                      styles.statusPending,
                    conversation.status === "Completed" &&
                      styles.statusCompleted,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {conversation.status}
                  </Text>
                </View>

                {conversation.unread && <View style={styles.unreadDot} />}
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#F7F7F7",
  },

  backButton: {
    marginTop: 20,
    marginBottom: 20,
  },

  backButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F7A4D",
  },

  title: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#1F7A4D",
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    lineHeight: 23,
    marginBottom: 24,
  },

  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 22,
  },

  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F7A4D",
    textAlign: "center",
  },

  summaryLabel: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },

  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: "#E5E5E5",
  },

  filterRow: {
    flexDirection: "row",
    marginBottom: 22,
  },

  filterButtonActive: {
    backgroundColor: "#1F7A4D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    marginRight: 8,
  },

  filterButton: {
    backgroundColor: "#FFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },

  filterButtonTextActive: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },

  filterButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 12,
  },

  messageCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
  },

  unreadMessageCard: {
    borderColor: "#1F7A4D",
    backgroundColor: "#F4FBF6",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1F7A4D",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  avatarText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },

  messageContent: {
    flex: 1,
  },

  messageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  customerName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111",
  },

  messageTime: {
    fontSize: 12,
    color: "#777",
  },

  taskName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F7A4D",
    marginTop: 3,
    marginBottom: 6,
  },

  lastMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },

  unreadLastMessage: {
    color: "#222",
    fontWeight: "600",
  },

  messageBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  statusPill: {
    backgroundColor: "#EAF5EE",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  statusConfirmed: {
    backgroundColor: "#EAF5EE",
  },

  statusPending: {
    backgroundColor: "#FFF4D6",
  },

  statusCompleted: {
    backgroundColor: "#EFEFEF",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1F7A4D",
  },

  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
  },
});