import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";




export default function WorkerTaskDetailsScreen() {
  const router = useRouter();
  
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");

  const {
    taskId,
    title,
    description,
    category,
    paymentType,
    price,
    address,
    date,
    time,
    equipment,
    otherEquipment,
    extraNotes,
  } = useLocalSearchParams();

  function openRequestModal() {
    setShowRequestModal(true);
    }

  async function handleSendRequest() {
    if (!requestMessage.trim()) {
      Alert.alert(
        "Message Required",
        "Please write a short message to the customer before requesting this task."
      );
      return;
    }

    if (!taskId) {
      Alert.alert("Task Error", "This task is missing its ID.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      Alert.alert("Not Signed In", "Please log in before requesting a task.");
      return;
    }

    const { error } = await supabase.from("task_requests").insert({
      task_id: taskId,
      worker_id: userData.user.id,
      message: requestMessage,
      estimate_price: null,
      status: "pending",
    });

    if (error) {
      Alert.alert("Request Error", error.message);
      return;
    }

    setShowRequestModal(false);
    setRequestMessage("");

    Alert.alert(
      "Request Sent",
      "Your request and message were sent to the customer.",
      [
        {
          text: "Back to Tasks",
          onPress: () => router.push("/worker-home"),
        },
      ]
    );
  }

  function getPriceLabel() {
    if (paymentType === "hourly") {
      return price ? `$${price}/hr` : "Hourly";
    }

    if (paymentType === "estimate") {
      return "Estimate Requested";
    }

    return price ? `$${price}` : "Price not set";
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/worker-home")}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Customer Offering</Text>
        <Text style={styles.priceAmount}>{getPriceLabel()}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Job Details</Text>

        <Text style={styles.label}>Category</Text>
        <Text style={styles.value}>{category}</Text>

        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>{description}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>When & Where</Text>

        <Text style={styles.label}>Preferred Date</Text>
        <Text style={styles.value}>{date}</Text>

        <Text style={styles.label}>Preferred Time</Text>
        <Text style={styles.value}>{time}</Text>

        <Text style={styles.label}>Task Address</Text>
        <Text style={styles.value}>{address}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Equipment Needed</Text>

        <Text style={styles.value}>
          {equipment || "No equipment listed"}
        </Text>

        {otherEquipment ? (
          <>
            <Text style={styles.label}>Other Equipment</Text>
            <Text style={styles.value}>{otherEquipment}</Text>
          </>
        ) : null}
      </View>

      {extraNotes ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Extra Notes</Text>
          <Text style={styles.value}>{extraNotes}</Text>
        </View>
      ) : null}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Before requesting</Text>
        <Text style={styles.infoText}>
          Make sure you can complete the job at the requested time and bring any
          equipment the customer listed. In the final version, this request will
          lead to a customer-worker agreement before the job is confirmed.
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={openRequestModal}>
        <Text style={styles.buttonText}>Request This Task</Text>
      </TouchableOpacity>

      <Modal
    visible={showRequestModal}
    transparent
    animationType="fade"
    onRequestClose={() => setShowRequestModal(false)}
    >
    <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>Message the Customer</Text>

        <Text style={styles.modalSubtitle}>
            Introduce yourself and explain why you’re a good fit for this task.
        </Text>

        <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Example: Hi, I can do this job tomorrow afternoon. I have the equipment needed and experience with yard work."
            placeholderTextColor="#999"
            value={requestMessage}
            onChangeText={setRequestMessage}
            multiline
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleSendRequest}>
            <Text style={styles.buttonText}>Send Request</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
            setShowRequestModal(false);
            setRequestMessage("");
            }}
        >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
        </View>
    </View>
    </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 80,
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
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 18,
    color: "#1F7A4D",
  },

  priceCard: {
    backgroundColor: "#1F7A4D",
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
  },

  priceLabel: {
    color: "#DDEFE4",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
  },

  priceAmount: {
    color: "#FFF",
    fontSize: 44,
    fontWeight: "bold",
  },

  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginTop: 8,
    marginBottom: 4,
  },

  value: {
    fontSize: 16,
    color: "#111",
    lineHeight: 23,
    marginBottom: 6,
  },

  infoCard: {
    backgroundColor: "#FFF4D6",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },

  primaryButton: {
    backgroundColor: "#111",
    padding: 18,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 40,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    padding: 24,
  },

    modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 20,
    },

    modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F7A4D",
    textAlign: "center",
    marginBottom: 8,
    },

    modalSubtitle: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 18,
    },

    input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
    },

    textArea: {
    height: 130,
    textAlignVertical: "top",
    },

    secondaryButton: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDD",
    },

    secondaryButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    },
});