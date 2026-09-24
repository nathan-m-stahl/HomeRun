import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ReceiptPreviewScreen() {
  const router = useRouter();

  const {
    taskTitle,
    workerName,
    taskPrice,
    serviceFee,
    totalPaid,
    date,
    status,
  } = useLocalSearchParams();

  function handleDownloadReceipt() {
    Alert.alert(
      "Coming Soon",
      "Later this will download or email the receipt."
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/customer-completed-jobs")}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Receipt</Text>

      <Text style={styles.subtitle}>
        Review the payment details for this completed or scheduled job.
      </Text>

      <View style={styles.receiptCard}>
        <Text style={styles.receiptLabel}>Task</Text>
        <Text style={styles.receiptTitle}>{taskTitle}</Text>

        <Text style={styles.label}>Worker</Text>
        <Text style={styles.value}>{workerName}</Text>

        <Text style={styles.label}>Date</Text>
        <Text style={styles.value}>{date}</Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{status}</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Task price</Text>
          <Text style={styles.rowValue}>${taskPrice}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Service fee</Text>
          <Text style={styles.rowValue}>${serviceFee}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total paid</Text>
          <Text style={styles.totalValue}>${totalPaid}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Payment note</Text>
        <Text style={styles.infoText}>
          In the final version, this receipt will be generated after payment is
          processed and will include payment ID, refund status, and confirmation
          details.
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleDownloadReceipt}>
        <Text style={styles.buttonText}>Download Receipt</Text>
      </TouchableOpacity>
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

  receiptCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 16,
  },

  receiptLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginBottom: 4,
  },

  receiptTitle: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 16,
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
    marginBottom: 6,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginVertical: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  rowLabel: {
    fontSize: 15,
    color: "#555",
  },

  rowValue: {
    fontSize: 15,
    color: "#111",
    fontWeight: "600",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 12,
    marginTop: 6,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

  totalValue: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#1F7A4D",
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
  },

  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});