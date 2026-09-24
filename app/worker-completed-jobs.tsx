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

export default function WorkerCompletedJobsScreen() {
  const router = useRouter();

  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);

  async function loadCompletedJobs() {
    setIsLoadingJobs(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      Alert.alert("Not Signed In", "Please log in to view completed jobs.");
      setIsLoadingJobs(false);
      return;
    }

    const { data, error } = await supabase
      .from("agreements")
      .select(`
        *,
        tasks (
          id,
          title,
          address,
          preferred_date,
          preferred_time,
          price,
          payment_type,
          status,
          equipment_needed
        ),
        profiles!agreements_customer_id_fkey (
          full_name
        )
      `)
      .eq("worker_id", userData.user.id)
      .or("payment_status.eq.paid,agreement_status.eq.completed")
      .order("paid_at", { ascending: false });

    if (error) {
      Alert.alert("Completed Jobs Error", error.message);
      setIsLoadingJobs(false);
      return;
    }

    setCompletedJobs(data || []);
    setIsLoadingJobs(false);
  }

  useEffect(() => {
    loadCompletedJobs();
  }, []);

  function getTask(job: any) {
    return Array.isArray(job.tasks) ? job.tasks[0] : job.tasks;
  }

  function getCustomerName(job: any) {
    return job.profiles?.full_name || "Customer";
  }

  function getPaymentTypeLabel(job: any) {
    const task = getTask(job);
    const paymentType = job.payment_type || task?.payment_type;

    if (paymentType === "hourly") {
      return "Hourly Rate";
    }

    if (paymentType === "estimate") {
      return "Estimate";
    }

    return "Flat Rate";
  }

  function getJobPrice(job: any) {
    const task = getTask(job);

    return Number(
      job.final_price ??
        job.agreed_price ??
        task?.price ??
        0
    );
  }

  function getCompletedDate(job: any) {
    const dateValue =
      job.paid_at ||
      job.customer_approved_at ||
      job.worker_completed_at ||
      job.created_at;

    if (!dateValue) {
      return "Completed date not available";
    }

    return new Date(dateValue).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function handleViewAgreement(job: any) {
    const task = getTask(job);

    if (!task) {
      Alert.alert("Agreement Error", "No task was found for this agreement.");
      return;
    }

    router.push({
      pathname: "/agreement-preview",
      params: {
        viewer: "worker",
        mode: "view",
        returnTo: "worker-completed-jobs",

        taskTitle: task.title || "Task",
        workerName: "You",
        paymentType: job.payment_type || task.payment_type || "",
        price:
          job.final_price?.toString() ||
          job.agreed_price?.toString() ||
          task.price?.toString() ||
          "",
        date: task.preferred_date || "",
        time: task.preferred_time || "",
        address: task.address || "",
        equipment: task.equipment_needed?.join(", ") || "",
        workerMessage: "This agreement is connected to a completed job.",
      },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace("/worker-home")}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Completed Jobs</Text>

      <Text style={styles.subtitle}>
        Review your finished jobs, completed payments, and past agreements.
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryNumber}>{completedJobs.length}</Text>
        <Text style={styles.summaryLabel}>Completed Jobs</Text>
      </View>

      {isLoadingJobs ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading completed jobs...</Text>
          <Text style={styles.emptyText}>
            Checking your completed job history.
          </Text>
        </View>
      ) : completedJobs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No completed jobs yet</Text>
          <Text style={styles.emptyText}>
            Completed jobs will appear here after the customer confirms the job
            and payment is marked paid.
          </Text>
        </View>
      ) : (
        completedJobs.map((job) => {
          const task = getTask(job);
          const customerName = getCustomerName(job);
          const jobPrice = getJobPrice(job);

          return (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.jobTopRow}>
                <View style={styles.jobTextContainer}>
                  <Text style={styles.jobTitle}>
                    {task?.title || "Completed Job"}
                  </Text>

                  <Text style={styles.customerName}>
                    Customer: {customerName}
                  </Text>

                  <Text style={styles.paymentType}>
                    {getPaymentTypeLabel(job)}
                  </Text>
                </View>

                <Text style={styles.jobPay}>${jobPrice.toFixed(2)}</Text>
              </View>

              <View style={styles.detailBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Worker payout amount</Text>
                  <Text style={styles.detailValue}>
                    ${jobPrice.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment status</Text>
                  <Text style={styles.detailValue}>
                    {job.payment_status === "paid" ? "Paid" : "Completed"}
                  </Text>
                </View>

                <View style={styles.detailRowTotal}>
                  <Text style={styles.detailLabelTotal}>Completed</Text>
                  <Text style={styles.detailValueTotal}>
                    {getCompletedDate(job)}
                  </Text>
                </View>
              </View>

              <Text style={styles.jobDetail}>
                Original date: {task?.preferred_date || "Date not set"} •{" "}
                {task?.preferred_time || "Time not set"}
              </Text>

              <Text style={styles.jobDetail}>
                Location: {task?.address || "Location not set"}
              </Text>

              <View style={styles.statusPill}>
                <Text style={styles.statusText}>Completed & Paid</Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleViewAgreement(job)}
              >
                <Text style={styles.primaryButtonText}>View Agreement</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
    backgroundColor: "#F7F7F7",
  },

  backButton: {
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
    marginBottom: 12,
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
    alignItems: "center",
    marginBottom: 24,
  },

  summaryNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F7A4D",
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "700",
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

  jobCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 14,
  },

  jobTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  jobTextContainer: {
    flex: 1,
    marginRight: 12,
  },

  jobTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },

  customerName: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginBottom: 4,
  },

  paymentType: {
    fontSize: 13,
    color: "#1F7A4D",
    fontWeight: "700",
  },

  jobPay: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F7A4D",
    textAlign: "right",
  },

  detailBox: {
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  detailRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#DDD",
    paddingTop: 8,
    marginTop: 4,
  },

  detailLabel: {
    fontSize: 14,
    color: "#666",
  },

  detailValue: {
    fontSize: 14,
    color: "#111",
    fontWeight: "600",
  },

  detailLabelTotal: {
    fontSize: 15,
    color: "#111",
    fontWeight: "700",
  },

  detailValueTotal: {
    fontSize: 15,
    color: "#1F7A4D",
    fontWeight: "700",
  },

  jobDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },

  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EAF5EE",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 14,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  primaryButton: {
    backgroundColor: "#111",
    padding: 13,
    borderRadius: 12,
  },

  primaryButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});