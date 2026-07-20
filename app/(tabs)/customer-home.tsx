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


const upcomingJobs: any[] = [];

const recentActivity: any[] = [];

export default function CustomerHomeScreen() {
  const router = useRouter();

  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const totalWorkerRequests = activeTasks.reduce((total, task) => total + task.requests,0);

  async function loadCustomerTasks() {
    setIsLoadingTasks(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      Alert.alert("Not Signed In", "Please log in to view your tasks.");
      setIsLoadingTasks(false);
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("customer_id", userData.user.id)
      .in("status", ["open", "accepted"])
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Task Error", error.message);
      setIsLoadingTasks(false);
      return;
    }

    const tasksWithRequestCounts = await Promise.all(
      (data || []).map(async (task) => {
        const { count } = await supabase
          .from("task_requests")
          .select("*", { count: "exact", head: true })
          .eq("task_id", task.id)
          .eq("status", "pending");

        return {
          ...task,
          requests: count || 0,
        };
      })
    );

    setActiveTasks(tasksWithRequestCounts);
    setIsLoadingTasks(false);
  }

  useEffect(() => {
    loadCustomerTasks();
  }, []);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert("Logout Error", error.message);
      return;
    }

    router.replace("/");
  }

  function handlePostTask() {
    router.push("/post-task");
  } 

  function handleViewRequests(task: any) {
    router.push({
      pathname: "/worker-requests",
      params: {
        taskId: task.id,
      },
    });
  }

  function handleEditTask(task: any) {
    router.push({
      pathname: "/edit-task",
      params: {
        title: task.title,
        category: task.category,
        paymentType: task.paymentType,
        price: task.price?.toString() || "",
        date: task.date,
        time: task.time,
      },
    });
  }

  function handleCancelTask(taskId: string, taskTitle: string) {
    Alert.alert(
      "Cancel Task?",
      `Are you sure you want to cancel: ${taskTitle}?`,
      [
        {
          text: "Keep Task",
          style: "cancel",
        },
        {
          text: "Cancel Task",
          style: "destructive",
          onPress: async () => {
            const { data: userData, error: userError } =
              await supabase.auth.getUser();

            if (userError || !userData.user) {
              Alert.alert(
                "Cancel Error",
                "You must be signed in to cancel this task."
              );
              return;
            }

            const cancelledAt = new Date().toISOString();

            const { error: taskError } = await supabase
              .from("tasks")
              .update({
                status: "cancelled",
                cancelled_by: userData.user.id,
                cancelled_by_role: "customer",
                cancellation_reason: "Customer cancelled from Customer Home.",
                cancelled_at: cancelledAt,
              })
              .eq("id", taskId);

            if (taskError) {
              Alert.alert("Cancel Error", taskError.message);
              return;
            }

            const { error: agreementError } = await supabase
              .from("agreements")
              .update({
                agreement_status: "cancelled",
                payment_status: "cancelled",
                cancelled_by: userData.user.id,
                cancelled_by_role: "customer",
                cancellation_reason: "Customer cancelled from Customer Home.",
                cancelled_at: cancelledAt,
              })
              .eq("task_id", taskId);

            if (agreementError) {
              Alert.alert("Agreement Cancel Error", agreementError.message);
              return;
            }

            const { error: requestError } = await supabase
              .from("task_requests")
              .update({
                status: "declined",
              })
              .eq("task_id", taskId)
              .eq("status", "pending");

            if (requestError) {
              Alert.alert("Request Cancel Error", requestError.message);
              return;
            }

            setActiveTasks((currentTasks) =>
              currentTasks.filter((task) => task.id !== taskId)
            );

            Alert.alert(
              "Task Cancelled",
              "The task has been cancelled and removed from your active list."
            );
          },
        },
      ]
    );
  }

  function handlePayNow(jobTitle: string) {
    Alert.alert(
      "Payment",
      `Eventually this will open checkout for: ${jobTitle}`,
      [
        {
          text: "Go to Payments",
          onPress: () => router.push("/customer-payments"),
        },
      ]
    );
  }

  function getPriceLabel(item: any) {
    if (item.payment_type === "hourly") {
      return item.price ? `$${item.price}/hr` : "Hourly";
    }

    if (item.payment_type === "estimate") {
      return "Estimate";
    }

    return item.price ? `$${item.price}` : "Price not set";
  }

  function getPaymentTypeLabel(item: any) {
    if (item.payment_type === "hourly") {
      return "Hourly Rate";
    }

    if (item.payment_type === "estimate") {
      return "Estimate Requested";
    }

    return "Flat Rate";
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.title}>Customer Homepage</Text>

      <Text style={styles.subtitle}>
        Post home tasks, review worker requests, and keep track of upcoming jobs.
      </Text>

      <TouchableOpacity style={styles.postTaskButton} onPress={handlePostTask}>
        <Text style={styles.postTaskButtonText}>+ Post a New Task</Text>
      </TouchableOpacity>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{activeTasks.length}</Text>
          <Text style={styles.summaryLabel}>Active Tasks</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{totalWorkerRequests}</Text>
          <Text style={styles.summaryLabel}>Worker Requests</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{upcomingJobs.length}</Text>
          <Text style={styles.summaryLabel}>Upcoming Job</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Active Tasks</Text>

        {isLoadingTasks ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Loading tasks...</Text>
            <Text style={styles.emptyText}>
              Checking your posted tasks.
            </Text>
          </View>
        ) : activeTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No active tasks yet</Text>
          <Text style={styles.emptyText}>
            When you post a task, it will show up here so you can review worker
            requests, edit details, or cancel it.
          </Text>

          <TouchableOpacity style={styles.emptyButton} onPress={handlePostTask}>
            <Text style={styles.emptyButtonText}>Post Your First Task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        activeTasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
          <View style={styles.taskTopRow}>
            <View style={styles.taskTextContainer}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskCategory}>{task.category}</Text>
              <Text style={styles.paymentTypeLabel}>
                {getPaymentTypeLabel(task)}
              </Text>
            </View>

            <Text style={styles.taskPrice}>{getPriceLabel(task)}</Text>
          </View>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusPill,
                task.status === "Awaiting Worker" && styles.statusAwaiting,
                task.status === "Worker Confirmed" && styles.statusConfirmed,
              ]}
            >
              <Text style={styles.statusText}>{task.status}</Text>
            </View>

            <Text style={styles.requestText}>
              {task.requests} request{task.requests !== 1 ? "s" : ""}
            </Text>
          </View>

          <Text style={styles.taskDetail}>
            {task.preferred_date} • {task.preferred_time}
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleViewRequests(task)}
          >
            <Text style={styles.secondaryButtonText}>View Worker Requests</Text>
          </TouchableOpacity>

          <View style={styles.taskActionRow}>
            <TouchableOpacity
              style={styles.editTaskButton}
              onPress={() => handleEditTask(task)}
            >
              <Text style={styles.editTaskButtonText}>Edit Task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelTaskButton}
              onPress={() => handleCancelTask(task.id, task.title)}
              
            >
              <Text style={styles.cancelTaskButtonText}>Cancel Task</Text>
            </TouchableOpacity>
          </View>
        </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Upcoming Jobs</Text>

      {upcomingJobs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No upcoming jobs yet</Text>
          <Text style={styles.emptyText}>
            Once you accept a worker and confirm an agreement, scheduled jobs will
            appear here.
          </Text>
        </View>
      ) : (
        upcomingJobs.map((job) => (
          <View key={job.id} style={styles.jobCard}>
          <View style={styles.taskTopRow}>
            <View style={styles.taskTextContainer}>
              <Text style={styles.taskTitle}>{job.title}</Text>
              <Text style={styles.taskCategory}>Worker: {job.worker}</Text>
              <Text style={styles.paymentTypeLabel}>
                {getPaymentTypeLabel(job)}
              </Text>
            </View>

            <Text style={styles.taskPrice}>{getPriceLabel(job)}</Text>
          </View>

          <Text style={styles.taskDetail}>
            {job.date} • {job.time}
          </Text>

          <View style={styles.agreementPill}>
            <Text style={styles.agreementText}>{job.agreementStatus}</Text>
          </View>

          <View style={styles.paymentPill}>
            <Text style={styles.paymentText}>{job.paymentStatus}</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/agreement-preview",
                params: {
                  taskTitle: job.title,
                  workerName: job.worker,
                  paymentType: job.paymentType,
                  price: job.price.toString(),
                  date: job.date,
                  time: job.time,
                  address: job.address,
                  equipment: job.equipment,
                  workerMessage: job.workerMessage,
                },
              })
            }
          >
            <Text style={styles.primaryButtonText}>Review Agreement</Text>
          </TouchableOpacity>

          {job.paymentStatus === "Payment Pending" && (
            <TouchableOpacity
              style={styles.payNowButton}
              onPress={() => handlePayNow(job.title)}
            >
              <Text style={styles.payNowButtonText}>Pay Now</Text>
            </TouchableOpacity>
          )}
        </View>
        ))
      )}


      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={handlePostTask}
        >
          <Text style={styles.quickActionText}>Post Task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push("/customer-messages")}
        >
          <Text style={styles.quickActionText}>Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push("/customer-payments")}
        >
          <Text style={styles.quickActionText}>Payments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push("/customer-completed-jobs")}
        >
          <Text style={styles.quickActionText}>Completed Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push("/edit-customer-profile")}
        >
          <Text style={styles.quickActionText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.quickActionButton} onPress={handleLogout}>
        <Text style={styles.quickActionText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Recent Activity</Text>

      {recentActivity.map((activity) => (
        <View key={activity.id} style={styles.activityCard}>
          <Text style={styles.activityText}>{activity.text}</Text>
          <Text style={styles.activityTime}>{activity.time}</Text>
        </View>
      ))}
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

  postTaskButton: {
    backgroundColor: "#1F7A4D",
    padding: 18,
    borderRadius: 18,
    marginBottom: 20,
  },

  postTaskButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  summaryNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F7A4D",
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111",
    marginTop: 18,
    marginBottom: 12,
  },

  taskCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 14,
  },

  jobCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 14,
  },

  taskTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  taskTextContainer: {
    flex: 1,
    marginRight: 12,
  },

  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },

  taskCategory: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },

  taskPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F7A4D",
    textAlign: "right",
    maxWidth: 110,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
  },

  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  statusAwaiting: {
    backgroundColor: "#FFF4D6",
  },

  statusConfirmed: {
    backgroundColor: "#EAF5EE",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  requestText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F7A4D",
  },

  taskDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 14,
  },

  primaryButton: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
  },

  primaryButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  secondaryButton: {
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
  },

  secondaryButtonText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  agreementPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF4D6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  paymentPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F0FE",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginTop: 8,
  },

  paymentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  agreementText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  quickActions: {
    marginBottom: 8,
  },

  quickActionButton: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 10,
  },

  quickActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },

  activityCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 10,
  },

  activityText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginBottom: 4,
  },

  activityTime: {
    fontSize: 13,
    color: "#777",
  },

  taskActionRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 12,
},

  editTaskButton: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    marginRight: 6,
  },

  editTaskButtonText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  cancelTaskButton: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginLeft: 6,
  },

  cancelTaskButtonText: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  payNowButton: {
    backgroundColor: "#1F7A4D",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },

  payNowButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
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
    marginBottom: 16,
  },

  emptyButton: {
    backgroundColor: "#1F7A4D",
    padding: 14,
    borderRadius: 12,
  },

  emptyButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  paymentTypeLabel: {
    fontSize: 13,
    color: "#1F7A4D",
    fontWeight: "700",
    marginBottom: 6,
  },
});