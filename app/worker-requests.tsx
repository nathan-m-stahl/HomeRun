import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";


export default function WorkerRequestsScreen() {
  const router = useRouter();

  const { taskId } = useLocalSearchParams();

  const [workerRequests, setWorkerRequests] = useState<any[]>([]);
  const [taskDetails, setTaskDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acceptedWorkerId, setAcceptedWorkerId] = useState<string | null>(null);

  async function loadWorkerRequests() {
    if (!taskId) {
      Alert.alert("Task Error", "No task ID was found.");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) {
      Alert.alert("Task Error", taskError.message);
      setLoading(false);
      return;
    }

    setTaskDetails(taskData);

    const { data: requestData, error: requestError } = await supabase
      .from("task_requests")
      .select("*")
      .eq("task_id", taskId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requestError) {
      Alert.alert("Request Error", requestError.message);
      setLoading(false);
      return;
    }

    const requestsWithWorkers = await Promise.all(
      (requestData || []).map(async (request) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", request.worker_id)
          .single();

        const { data: workerProfile } = await supabase
          .from("worker_profiles")
          .select("skills, equipment, rating, completed_jobs")
          .eq("id", request.worker_id)
          .single();

        return {
          ...request,
          workerName: profile?.full_name || "Worker",
          skills: workerProfile?.skills || [],
          equipment: workerProfile?.equipment || [],
          rating: workerProfile?.rating || "New",
          completedJobs: workerProfile?.completed_jobs || 0,
          reliability: "100%",
        };
      })
    );

    setWorkerRequests(requestsWithWorkers);
    setLoading(false);
  }

  useEffect(() => {
    loadWorkerRequests();
  }, [taskId]);

  function handleAcceptRequest(requestId: string, workerName: string) {
    Alert.alert(
      "Accept Worker?",
      `Review and confirm the agreement with ${workerName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Review Agreement",
          onPress: () => {
            const acceptedRequest = workerRequests.find(
              (request) => request.id === requestId
            );

            if (!acceptedRequest || !taskDetails) {
              Alert.alert("Error", "Could not find this request or task.");
              return;
            }

            const agreedPrice =
              taskDetails.payment_type === "estimate"
                ? acceptedRequest.estimate_price
                : taskDetails.price;

            router.push({
              pathname: "/agreement-preview",
              params: {
                viewer: "customer",
                mode: "confirm",
                returnTo: "customer-home",

                requestId: acceptedRequest.id,
                taskId: taskDetails.id,
                workerId: acceptedRequest.worker_id,
                customerId: taskDetails.customer_id,

                taskTitle: taskDetails.title,
                workerName,
                paymentType: taskDetails.payment_type,
                price: agreedPrice?.toString() || "",
                date: taskDetails.preferred_date || "",
                time: taskDetails.preferred_time || "",
                address: taskDetails.address || "",
                equipment: taskDetails.equipment_needed?.join(", ") || "",
                workerMessage: acceptedRequest.message || "",
              },
            });
          },
        },
      ]
    );
  }

  function handleDeclineRequest(requestId: string, workerName: string) {
    Alert.alert("Decline Request?", `Decline ${workerName}'s request?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("task_requests")
            .update({ status: "declined" })
            .eq("id", requestId);

          if (error) {
            Alert.alert("Decline Error", error.message);
            return;
          }

          setWorkerRequests((currentRequests) =>
            currentRequests.filter((request) => request.id !== requestId)
          );

          Alert.alert("Request Declined", `${workerName}'s request was declined.`);
        },
      },
    ]);
  }

  function handleMessageWorker(workerName: string) {
    router.push({
        pathname: "/customer-messages",
        params: {
        workerName,
        },
    });
  }

  function handleViewProfile(workerName: string) {
    Alert.alert(
        `${workerName}'s Profile`,
        "This will eventually show the worker's full bio, skills, equipment, rating, completed jobs, and reviews."
    );
  }
  

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace("/customer-home")}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Worker Requests</Text>

      <Text style={styles.subtitle}>
        Review workers who requested your task, compare profiles, and choose who
        you want to hire.
      </Text>

      <View style={styles.taskSummaryCard}>
        <Text style={styles.taskSummaryLabel}>Task</Text>
        <Text style={styles.taskSummaryTitle}>
          {taskDetails?.title || "Task"}
        </Text>

        <View style={styles.taskSummaryRow}>
          <Text style={styles.taskSummaryDetail}>Customer offering</Text>
          <Text style={styles.taskSummaryPrice}>
            {taskDetails?.payment_type === "estimate"
              ? "Estimate"
              : taskDetails?.payment_type === "hourly"
              ? `$${taskDetails?.price}/hr`
              : `$${taskDetails?.price}`}
          </Text>
        </View>

        <Text style={styles.taskSummarySubtext}>
          {workerRequests.length} worker{workerRequests.length !== 1 ? "s have" : " has"} requested this task.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Requests</Text>
      

      {loading ? (
        <View style={styles.requestCard}>
          <Text style={styles.messageText}>Loading worker requests...</Text>
        </View>
      ) : workerRequests.length === 0 ? (
        <View style={styles.requestCard}>
          <Text style={styles.messageLabel}>No worker requests yet</Text>
          <Text style={styles.messageText}>
            When workers request this task, they will appear here.
          </Text>
        </View>
      ) : (
        workerRequests.map((request) => (
        <View key={request.id} style={styles.requestCard}>
          <View style={styles.requestTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {request.workerName.charAt(0)}
              </Text>
            </View>

            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{request.workerName}</Text>
              <Text style={styles.requestTime}>
                Requested {new Date(request.created_at).toLocaleDateString()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => handleViewProfile(request.workerName)}
            >
              <Text style={styles.profileButtonText}>Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{request.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{request.completedJobs}</Text>
              <Text style={styles.statLabel}>Jobs</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statValue}>{request.reliability}</Text>
              <Text style={styles.statLabel}>Reliable</Text>
            </View>
          </View>

          <Text style={styles.messageLabel}>Worker Message</Text>
          <Text style={styles.messageText}>{request.message}</Text>

          <Text style={styles.chipLabel}>Skills</Text>
          <View style={styles.chipRow}>
            {request.skills.map((skill: string) => (
              <View key={skill} style={styles.chip}>
                <Text style={styles.chipText}>{skill}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.chipLabel}>Equipment</Text>
          <View style={styles.chipRow}>
            {request.equipment.map((equipment: string) => (
              <View key={equipment} style={styles.chip}>
                <Text style={styles.chipText}>{equipment}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => handleMessageWorker(request.workerName)}
            >
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDeclineRequest(request.id, request.workerName)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.acceptButton,
                    acceptedWorkerId === request.id && styles.acceptedButton,
                ]}
                onPress={() => handleAcceptRequest(request.id, request.workerName)}
                disabled={acceptedWorkerId === request.id}
                >
                <Text style={styles.acceptButtonText}>
                    {acceptedWorkerId === request.id ? "Accepted" : "Accept"}
                </Text>
            </TouchableOpacity>
          </View>
        </View>
        ))
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>What happens after accepting?</Text>
        <Text style={styles.infoText}>
          In the final version, accepting a worker will create a customer-worker
          agreement. After both sides confirm, the customer will pay upfront and
          the job will move to the schedule.
        </Text>
      </View>
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

  taskSummaryCard: {
    backgroundColor: "#1F7A4D",
    borderRadius: 22,
    padding: 22,
    marginBottom: 22,
  },

  taskSummaryLabel: {
    color: "#DDEFE4",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },

  taskSummaryTitle: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 14,
  },

  taskSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  taskSummaryDetail: {
    color: "#DDEFE4",
    fontSize: 15,
    fontWeight: "600",
  },

  taskSummaryPrice: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "bold",
  },

  taskSummarySubtext: {
    color: "#DDEFE4",
    fontSize: 14,
    marginTop: 12,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 12,
  },

  requestCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 16,
  },

  requestTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#1F7A4D",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  avatarText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "bold",
  },

  workerInfo: {
    flex: 1,
  },

  workerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 3,
  },

  requestTime: {
    fontSize: 13,
    color: "#777",
  },

  profileButton: {
    backgroundColor: "#F7F7F7",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DDD",
  },

  profileButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  statBox: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 4,
    alignItems: "center",
  },

  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F7A4D",
    marginBottom: 3,
  },

  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
  },

  messageLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginBottom: 6,
  },

  messageText: {
    fontSize: 15,
    color: "#111",
    lineHeight: 22,
    marginBottom: 16,
  },

  chipLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginBottom: 8,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },

  chip: {
    backgroundColor: "#EAF5EE",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },

  chipText: {
    color: "#1F7A4D",
    fontSize: 13,
    fontWeight: "700",
  },

  actionRow: {
    flexDirection: "row",
    marginTop: 4,
  },

  messageButton: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    padding: 13,
    borderRadius: 12,
    marginRight: 6,
  },

  messageButtonText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  declineButton: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 13,
    borderRadius: 12,
    marginHorizontal: 6,
  },

  declineButtonText: {
    color: "#B91C1C",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  acceptButton: {
    flex: 1,
    backgroundColor: "#111",
    padding: 13,
    borderRadius: 12,
    marginLeft: 6,
  },

  acceptButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  infoCard: {
    backgroundColor: "#FFF4D6",
    borderRadius: 18,
    padding: 18,
    marginTop: 8,
    marginBottom: 40,
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

  acceptedButton: {
    backgroundColor: "#1F7A4D",
  },
});