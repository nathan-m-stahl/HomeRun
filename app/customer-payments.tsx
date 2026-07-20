import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

type WorkSession = {
  id: string;
  task_id: string;
  agreement_id: string;
  worker_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: "active" | "completed";
  created_at: string;
};

export default function CustomerPaymentsScreen() {
  const router = useRouter();

  const [jobPayments, setJobPayments] = useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [selectedEstimateJob, setSelectedEstimateJob] = useState<any>(null);
  const [estimateAmount, setEstimateAmount] = useState("");
  const [isSavingEstimate, setIsSavingEstimate] = useState(false);
  const [busyAgreementId, setBusyAgreementId] = useState<string | null>(null);

  const [showHoursAdjustmentModal, setShowHoursAdjustmentModal] =
    useState(false);
  const [selectedHourlyJob, setSelectedHourlyJob] = useState<any>(null);
  const [additionalHours, setAdditionalHours] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState<"add" | "remove">(
    "add"
  );

  const activeJobs = jobPayments.filter(
    (payment) => payment.agreement_status !== "completed"
  ).length;

  const pendingPaymentTotal = jobPayments.reduce((total, payment) => {
    if (payment.payment_status === "paid") {
      return total;
    }

    const task = getTask(payment);
    const price = Number(
      payment.final_price ??
        payment.agreed_price ??
        task?.price ??
        0
    );

    const serviceFee = Math.ceil(price * 0.1);
    return total + price + serviceFee;
  }, 0);

  async function loadCustomerPayments() {
    setIsLoadingPayments(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      Alert.alert("Not Signed In", "Please log in to view payments.");
      setIsLoadingPayments(false);
      return;
    }

    const { data: agreementsData, error: agreementsError } = await supabase
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
        profiles!agreements_worker_id_fkey (
          full_name
        )
      `)
      .eq("customer_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (agreementsError) {
      Alert.alert("Payments Error", agreementsError.message);
      setIsLoadingPayments(false);
      return;
    }

    const taskIds = (agreementsData || [])
      .map((agreement: any) => getTask(agreement)?.id)
      .filter(Boolean);

    let sessionData: WorkSession[] = [];

    if (taskIds.length > 0) {
      const { data, error: sessionsError } = await supabase
        .from("work_sessions")
        .select("*")
        .in("task_id", taskIds)
        .order("started_at", { ascending: true });

      if (sessionsError) {
        Alert.alert("Work Log Error", sessionsError.message);
        setIsLoadingPayments(false);
        return;
      }

      sessionData = (data || []) as WorkSession[];
    }

    const paymentsWithSessions = (agreementsData || []).map(
      (agreement: any) => {
        const task = getTask(agreement);

        return {
          ...agreement,
          work_sessions: sessionData.filter(
            (session) => session.task_id === task?.id
          ),
        };
      }
    );

    setJobPayments(paymentsWithSessions);
    setIsLoadingPayments(false);
  }

  useEffect(() => {
    loadCustomerPayments();
  }, []);

  function getTask(job: any) {
    return Array.isArray(job.tasks) ? job.tasks[0] : job.tasks;
  }

  function getWorkSessions(job: any): WorkSession[] {
    return Array.isArray(job.work_sessions) ? job.work_sessions : [];
  }

  function getCompletedSessions(job: any) {
    return getWorkSessions(job).filter(
      (session) =>
        session.status === "completed" &&
        session.ended_at &&
        Number(session.duration_seconds || 0) > 0
    );
  }

  function getTotalSeconds(job: any) {
    return getCompletedSessions(job).reduce(
      (total, session) => total + Number(session.duration_seconds || 0),
      0
    );
  }

  function getAdjustmentSeconds(job: any) {
    return Number(job.customer_adjustment_seconds || 0);
  }

  function getApprovedTotalSeconds(job: any) {
    return getTotalSeconds(job) + getAdjustmentSeconds(job);
  }

  function getAdjustedHourlyPrice(job: any) {
    const approvedSeconds = getApprovedTotalSeconds(job);
    const hourlyRate = getHourlyRate(job);

    return Math.round((approvedSeconds / 3600) * hourlyRate * 100) / 100;
  }

  function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  function formatSessionDate(dateValue: string) {
    return new Date(dateValue).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatSessionTime(dateValue: string) {
    return new Date(dateValue).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getHourlyRate(job: any) {
    const task = getTask(job);
    return Number(job.agreed_price ?? task?.price ?? 0);
  }

  function getTaskPrice(job: any) {
    const task = getTask(job);
    const paymentType = job.payment_type || task?.payment_type;

    if (paymentType === "hourly") {
      return Number(job.final_price ?? getAdjustedHourlyPrice(job));
    }

    return Number(
      job.final_price ??
        job.agreed_price ??
        task?.price ??
        0
    );
  }

  function getServiceFee(job: any) {
    return Math.ceil(getTaskPrice(job) * 0.1);
  }

  function handleViewReceipt(job: any) {
    const task = getTask(job);
    const workerName = job.profiles?.full_name || "Worker";
    const taskPrice = getTaskPrice(job);
    const serviceFee = getServiceFee(job);
    const totalPaid = taskPrice + serviceFee;

    router.push({
      pathname: "/receipt-preview",
      params: {
        taskTitle: task?.title || "Task",
        workerName,
        taskPrice: taskPrice.toString(),
        serviceFee: serviceFee.toString(),
        totalPaid: totalPaid.toString(),
        date: task?.preferred_date || "",
        status: job.agreement_status || "confirmed",
      },
    });
  }

  function handleReviewAgreement(job: any) {
    const task = getTask(job);
    const workerName = job.profiles?.full_name || "Worker";

    if (!task) {
      Alert.alert("Agreement Error", "No task was found for this agreement.");
      return;
    }

    router.push({
      pathname: "/agreement-preview",
      params: {
        viewer: "customer",
        mode: "view",
        returnTo: "customer-payments",
        taskTitle: task.title || "Task",
        workerName,
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
        workerMessage: "This agreement has already been signed.",
      },
    });
  }

  function handleOpenEstimateModal(job: any) {
    setSelectedEstimateJob(job);
    setEstimateAmount(job.final_price?.toString() || "");
    setShowEstimateModal(true);
  }

  function handleCloseEstimateModal() {
    if (isSavingEstimate) {
      return;
    }

    setShowEstimateModal(false);
    setSelectedEstimateJob(null);
    setEstimateAmount("");
  }

  async function handleSaveEstimate() {
    if (!selectedEstimateJob) {
      Alert.alert("Estimate Error", "No agreement was selected.");
      return;
    }

    const parsedAmount = Number(estimateAmount);

    if (
      !estimateAmount.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      Alert.alert(
        "Invalid Estimate",
        "Please enter an estimate greater than zero."
      );
      return;
    }

    setIsSavingEstimate(true);

    const { data: updatedAgreement, error } = await supabase
      .from("agreements")
      .update({
        final_price: parsedAmount,
      })
      .eq("id", selectedEstimateJob.id)
      .eq("customer_id", selectedEstimateJob.customer_id)
      .select("id, final_price")
      .single();

    if (error) {
      setIsSavingEstimate(false);
      Alert.alert("Estimate Error", error.message);
      return;
    }

    if (
      !updatedAgreement ||
      Number(updatedAgreement.final_price) !== parsedAmount
    ) {
      setIsSavingEstimate(false);
      Alert.alert("Estimate Error", "The estimate was not saved correctly.");
      return;
    }

    setIsSavingEstimate(false);
    handleCloseEstimateModal();
    await loadCustomerPayments();

    Alert.alert(
      "Estimate Saved",
      `The agreed estimate is now $${parsedAmount.toFixed(2)}.`
    );
  }

  function handleOpenHoursAdjustmentModal(job: any) {
    setSelectedHourlyJob(job);
    setAdditionalHours("");
    setAdjustmentMode("add");
    setAdjustmentNote("");
    setShowHoursAdjustmentModal(true);
  }

  function handleCloseHoursAdjustmentModal() {
    if (isSavingAdjustment) {
      return;
    }

    setShowHoursAdjustmentModal(false);
    setSelectedHourlyJob(null);
    setAdditionalHours("");
    setAdjustmentNote("");
    setAdjustmentMode("add");
  }

  async function handleSaveHoursAdjustment() {
    if (!selectedHourlyJob) {
      Alert.alert(
        "Adjustment Error",
        "No hourly agreement was selected."
      );
      return;
    }

    const parsedHours = Number(additionalHours);

    if (
      !additionalHours.trim() ||
      !Number.isFinite(parsedHours) ||
      parsedHours <= 0
    ) {
      Alert.alert(
        "Invalid Hours",
        "Enter an amount greater than zero."
      );
      return;
    }

    const enteredSeconds = Math.round(parsedHours * 3600);
    const currentAdjustmentSeconds = Number(
      selectedHourlyJob.customer_adjustment_seconds || 0
    );

    const newAdjustmentSeconds =
      adjustmentMode === "add"
        ? currentAdjustmentSeconds + enteredSeconds
        : currentAdjustmentSeconds - enteredSeconds;

    if (newAdjustmentSeconds < 0) {
      Alert.alert(
        "Cannot Remove That Much",
        `The current adjustment is ${formatDuration(
          currentAdjustmentSeconds
        )}. You cannot remove more time than was previously added.`
      );
      return;
    }

    const loggedSeconds = getTotalSeconds(selectedHourlyJob);
    const approvedSeconds = loggedSeconds + newAdjustmentSeconds;
    const hourlyRate = getHourlyRate(selectedHourlyJob);

    const adjustedFinalPrice =
      Math.round((approvedSeconds / 3600) * hourlyRate * 100) / 100;

    const previousNote =
      selectedHourlyJob.customer_adjustment_note?.trim() || "";

    const actionText =
      adjustmentMode === "add"
        ? `Added ${parsedHours} hour${parsedHours === 1 ? "" : "s"}`
        : `Removed ${parsedHours} hour${parsedHours === 1 ? "" : "s"}`;

    const newNotePart = adjustmentNote.trim()
      ? `${actionText}: ${adjustmentNote.trim()}`
      : actionText;

    const combinedNote = previousNote
      ? `${previousNote}\n${newNotePart}`
      : newNotePart;

    setIsSavingAdjustment(true);

    const { data: updatedAgreement, error } = await supabase
      .from("agreements")
      .update({
        customer_adjustment_seconds: newAdjustmentSeconds,
        customer_adjustment_note:
          newAdjustmentSeconds === 0 ? null : combinedNote,
        customer_adjusted_at: new Date().toISOString(),
        final_price: adjustedFinalPrice,
      })
      .eq("id", selectedHourlyJob.id)
      .select(`
        id,
        customer_adjustment_seconds,
        customer_adjustment_note,
        customer_adjusted_at,
        final_price
      `)
      .single();

    if (error) {
      setIsSavingAdjustment(false);
      Alert.alert("Adjustment Error", error.message);
      return;
    }

    if (!updatedAgreement) {
      setIsSavingAdjustment(false);
      Alert.alert(
        "Adjustment Error",
        "The hours adjustment was not saved."
      );
      return;
    }

    setIsSavingAdjustment(false);
    handleCloseHoursAdjustmentModal();
    await loadCustomerPayments();

    Alert.alert(
      "Hours Updated",
      `Adjustment total: ${formatDuration(
        newAdjustmentSeconds
      )}\nApproved job time: ${formatDuration(
        approvedSeconds
      )}\nJob price: $${adjustedFinalPrice.toFixed(2)}`
    );
  }

  function handleMakePayment(job: any) {
    const task = getTask(job);
    const taskTitle = task?.title || "this task";
    const paymentType = job.payment_type || task?.payment_type;
    const loggedSeconds = getTotalSeconds(job);
    const adjustmentSeconds = getAdjustmentSeconds(job);
    const approvedSeconds = getApprovedTotalSeconds(job);
    const hourlyRate = getHourlyRate(job);
    const finalPrice = getTaskPrice(job);

    if (!task) {
      Alert.alert("Task Error", "No task was found for this payment.");
      return;
    }

    if (task.status !== "worker_completed") {
      Alert.alert(
        "Job Not Ready",
        "The worker has not marked this job as complete yet."
      );
      return;
    }

    if (paymentType === "hourly" && approvedSeconds <= 0) {
      Alert.alert(
        "Work Log Error",
        "No completed hourly work sessions were found for this job."
      );
      return;
    }

    const confirmationMessage =
      paymentType === "hourly"
        ? `Review "${taskTitle}":\n\nWorker logged: ${formatDuration(
            loggedSeconds
          )}\nAdded time: ${formatDuration(
            adjustmentSeconds
          )}\nApproved total: ${formatDuration(
            approvedSeconds
          )}\nHourly rate: $${hourlyRate.toFixed(
            2
          )}/hr\nJob price: $${finalPrice.toFixed(
            2
          )}\n\nConfirm these hours and release payment?`
        : `Confirm that "${taskTitle}" is complete and release payment?`;

    Alert.alert(
      paymentType === "hourly"
        ? "Confirm Hours & Payment?"
        : "Confirm Completion?",
      confirmationMessage,
      [
        {
          text: "Not Yet",
          style: "cancel",
        },
        {
          text:
            paymentType === "hourly"
              ? "Approve Hours & Pay"
              : "Confirm & Pay",
          onPress: async () => {
            setBusyAgreementId(job.id);

            const { data: updatedTask, error: taskError } = await supabase
              .from("tasks")
              .update({
                status: "completed",
              })
              .eq("id", task.id)
              .select("id, status")
              .single();

            if (taskError) {
              setBusyAgreementId(null);
              Alert.alert("Task Error", taskError.message);
              return;
            }

            if (!updatedTask || updatedTask.status !== "completed") {
              setBusyAgreementId(null);
              Alert.alert(
                "Task Error",
                "The task was not marked completed. This may be an RLS policy issue."
              );
              return;
            }

            const { data: updatedAgreement, error: agreementError } =
              await supabase
                .from("agreements")
                .update({
                  payment_status: "paid",
                  agreement_status: "completed",
                  customer_approved_at: new Date().toISOString(),
                  paid_at: new Date().toISOString(),
                })
                .eq("id", job.id)
                .select("id, payment_status, agreement_status")
                .single();

            if (agreementError) {
              setBusyAgreementId(null);
              Alert.alert("Payment Error", agreementError.message);
              return;
            }

            if (
              !updatedAgreement ||
              updatedAgreement.payment_status !== "paid" ||
              updatedAgreement.agreement_status !== "completed"
            ) {
              setBusyAgreementId(null);
              Alert.alert(
                "Payment Error",
                "The payment status did not update correctly."
              );
              return;
            }

            await loadCustomerPayments();
            setBusyAgreementId(null);

            Alert.alert(
              "Payment Sent",
              paymentType === "hourly"
                ? "The hours were approved and payment has been released."
                : "The job has been completed and payment has been released."
            );
          },
        },
      ]
    );
  }

  function getAgreementStatus(job: any) {
    if (
      job.agreement_status === "confirmed" ||
      job.agreement_status === "completed"
    ) {
      return "Agreement Signed";
    }

    return "Agreement Not Signed";
  }

  function getPaymentStatus(job: any) {
    const task = getTask(job);
    const paymentType = job.payment_type || task?.payment_type;

    const hasEstimateAmount =
      job.final_price !== null &&
      job.final_price !== undefined &&
      Number(job.final_price) > 0;

    if (
      job.payment_status === "paid" ||
      job.agreement_status === "completed"
    ) {
      return "Paid";
    }

    if (
      job.payment_status === "pending_customer_confirmation" ||
      task?.status === "worker_completed"
    ) {
      return "Needs Confirmation";
    }

    if (paymentType === "estimate" && !hasEstimateAmount) {
      return "Estimate Needed";
    }

    if (paymentType === "hourly" && task?.status === "in_progress") {
      return "Hourly Work In Progress";
    }

    return "Payment Pending";
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/customer-home")}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Payments</Text>

      <Text style={styles.subtitle}>
        Track payments, receipts, job costs, agreements, and upcoming charges.
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statAmount}>
            ${pendingPaymentTotal.toFixed(2)}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statAmount}>{activeJobs}</Text>
          <Text style={styles.statLabel}>Active Jobs</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Job Payments</Text>

      {isLoadingPayments ? (
        <View style={styles.paymentCard}>
          <Text style={styles.taskTitle}>Loading payments...</Text>
          <Text style={styles.jobTime}>
            Checking your confirmed jobs and agreements.
          </Text>
        </View>
      ) : jobPayments.length === 0 ? (
        <View style={styles.paymentCard}>
          <Text style={styles.taskTitle}>No payments yet</Text>
          <Text style={styles.jobTime}>
            Confirmed jobs will appear here after you accept a worker and
            confirm the agreement.
          </Text>
        </View>
      ) : (
        jobPayments.map((job) => {
          const task = getTask(job);
          const workerName = job.profiles?.full_name || "Worker";
          const paymentType = job.payment_type || task?.payment_type;
          const taskPrice = getTaskPrice(job);
          const serviceFee = getServiceFee(job);
          const totalPaid = taskPrice + serviceFee;
          const paymentStatus = getPaymentStatus(job);
          const agreementStatus = getAgreementStatus(job);
          const completedSessions = getCompletedSessions(job);
          const loggedSeconds = getTotalSeconds(job);
          const adjustmentSeconds = getAdjustmentSeconds(job);
          const approvedSeconds = getApprovedTotalSeconds(job);
          const hourlyRate = getHourlyRate(job);
          const isBusy = busyAgreementId === job.id;

          return (
            <View key={job.id} style={styles.paymentCard}>
              <View style={styles.paymentTopRow}>
                <View style={styles.paymentTextContainer}>
                  <Text style={styles.taskTitle}>
                    {task?.title || "Task"}
                  </Text>
                  <Text style={styles.workerName}>
                    Worker: {workerName}
                  </Text>
                </View>

                <Text style={styles.totalPaid}>
                  {paymentStatus === "Estimate Needed"
                    ? "Pending"
                    : `$${totalPaid.toFixed(2)}`}
                </Text>
              </View>

              {paymentType === "hourly" && completedSessions.length > 0 ? (
                <View style={styles.hourlyReviewCard}>
                  <Text style={styles.hourlyReviewTitle}>
                    Hourly Work Summary
                  </Text>

                  <View style={styles.hourlySummaryRow}>
                    <View style={styles.hourlySummaryItem}>
                      <Text style={styles.hourlySummaryValue}>
                        {formatDuration(loggedSeconds)}
                      </Text>
                      <Text style={styles.hourlySummaryLabel}>
                        Logged Time
                      </Text>
                    </View>

                    <View style={styles.hourlySummaryItem}>
                      <Text style={styles.hourlySummaryValue}>
                        {formatDuration(adjustmentSeconds)}
                      </Text>
                      <Text style={styles.hourlySummaryLabel}>
                        Added Time
                      </Text>
                    </View>

                    <View style={styles.hourlySummaryItem}>
                      <Text style={styles.hourlySummaryValue}>
                        {formatDuration(approvedSeconds)}
                      </Text>
                      <Text style={styles.hourlySummaryLabel}>
                        Approved Total
                      </Text>
                    </View>

                    <View style={styles.hourlySummaryItem}>
                      <Text style={styles.hourlySummaryValue}>
                        ${hourlyRate.toFixed(2)}
                      </Text>
                      <Text style={styles.hourlySummaryLabel}>
                        Hourly Rate
                      </Text>
                    </View>

                    <View style={styles.hourlySummaryItem}>
                      <Text style={styles.hourlySummaryValue}>
                        ${taskPrice.toFixed(2)}
                      </Text>
                      <Text style={styles.hourlySummaryLabel}>
                        Job Price
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.workLogTitle}>Work Log</Text>

                  {completedSessions.map((session, index) => (
                    <View key={session.id} style={styles.sessionRow}>
                      <View style={styles.sessionTextContainer}>
                        <Text style={styles.sessionTitle}>
                          Session {index + 1} ·{" "}
                          {formatSessionDate(session.started_at)}
                        </Text>

                        <Text style={styles.sessionTimes}>
                          {formatSessionTime(session.started_at)} –{" "}
                          {session.ended_at
                            ? formatSessionTime(session.ended_at)
                            : "In progress"}
                        </Text>
                      </View>

                      <Text style={styles.sessionDuration}>
                        {formatDuration(
                          Number(session.duration_seconds || 0)
                        )}
                      </Text>
                    </View>
                  ))}

                  {paymentStatus === "Needs Confirmation" ? (
                    <TouchableOpacity
                      style={styles.adjustHoursButton}
                      onPress={() =>
                        handleOpenHoursAdjustmentModal(job)
                      }
                    >
                      <Text style={styles.adjustHoursButtonText}>
                        Add / Remove Hours
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.detailBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {paymentType === "hourly"
                      ? "Calculated job price"
                      : "Task price"}
                  </Text>
                  <Text style={styles.detailValue}>
                    {paymentStatus === "Estimate Needed"
                      ? "Pending"
                      : `$${taskPrice.toFixed(2)}`}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service fee</Text>
                  <Text style={styles.detailValue}>
                    {paymentStatus === "Estimate Needed"
                      ? "Pending"
                      : `$${serviceFee.toFixed(2)}`}
                  </Text>
                </View>

                <View style={styles.detailRowTotal}>
                  <Text style={styles.detailLabelTotal}>Total</Text>
                  <Text style={styles.detailValueTotal}>
                    {paymentStatus === "Estimate Needed"
                      ? "Pending"
                      : `$${totalPaid.toFixed(2)}`}
                  </Text>
                </View>
              </View>

              <Text style={styles.jobTime}>
                {task?.preferred_date || "Date not set"} •{" "}
                {task?.preferred_time || "Time not set"}
              </Text>

              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusPill,
                    paymentStatus === "Payment Pending" &&
                      styles.statusPending,
                    paymentStatus === "Hourly Work In Progress" &&
                      styles.statusInProgress,
                    paymentStatus === "Estimate Needed" &&
                      styles.statusEstimateNeeded,
                    paymentStatus === "Needs Confirmation" &&
                      styles.statusNeedsConfirmation,
                    paymentStatus === "Paid" && styles.statusPaid,
                  ]}
                >
                  <Text style={styles.statusText}>{paymentStatus}</Text>
                </View>

                <View
                  style={[
                    styles.agreementPill,
                    agreementStatus === "Agreement Signed" &&
                      styles.agreementSigned,
                    agreementStatus === "Agreement Not Signed" &&
                      styles.agreementNotSigned,
                  ]}
                >
                  <Text style={styles.agreementText}>
                    {agreementStatus}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                {paymentStatus === "Estimate Needed" ? (
                  <TouchableOpacity
                    style={styles.primarySmallButton}
                    onPress={() => handleOpenEstimateModal(job)}
                  >
                    <Text style={styles.primarySmallButtonText}>
                      Enter Estimate Amount
                    </Text>
                  </TouchableOpacity>
                ) : paymentStatus === "Needs Confirmation" ? (
                  <TouchableOpacity
                    style={[
                      styles.primarySmallButton,
                      isBusy && styles.disabledButton,
                    ]}
                    disabled={isBusy}
                    onPress={() => handleMakePayment(job)}
                  >
                    <Text style={styles.primarySmallButtonText}>
                      {isBusy
                        ? "Processing..."
                        : paymentType === "hourly"
                        ? "Review Hours & Pay"
                        : "Confirm Completion & Pay"}
                    </Text>
                  </TouchableOpacity>
                ) : paymentStatus === "Paid" ? (
                  <TouchableOpacity
                    style={styles.secondarySmallButton}
                    onPress={() => handleViewReceipt(job)}
                  >
                    <Text style={styles.secondarySmallButtonText}>
                      View Receipt
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.secondarySmallButton}
                  onPress={() => handleReviewAgreement(job)}
                >
                  <Text style={styles.secondarySmallButtonText}>
                    Agreement
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>How Payments Work</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Customer pays upfront</Text>
        <Text style={styles.infoText}>
          In the final version, customers will pay before the job starts. The
          money will be held until the job is completed and confirmed.
        </Text>

        <View style={styles.infoDivider} />

        <Text style={styles.infoTitle}>
          Worker gets paid after completion
        </Text>
        <Text style={styles.infoText}>
          Once the task is marked complete and confirmed, the worker payout
          will be released after HomeRun deducts the worker-side fee.
        </Text>

        <View style={styles.exampleBox}>
          <Text style={styles.exampleLine}>Task price: $55</Text>
          <Text style={styles.exampleLine}>Customer service fee: $5</Text>
          <Text style={styles.exampleTotal}>Customer pays: $60</Text>
        </View>
      </View>

      <Modal
        visible={showEstimateModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEstimateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter Agreed Estimate</Text>

            <Text style={styles.modalSubtitle}>
              Enter the amount you and the worker agreed on. Once saved, this
              job will follow the flat-rate completion process.
            </Text>

            <Text style={styles.modalLabel}>Estimate Amount</Text>

            <View style={styles.estimateInputRow}>
              <Text style={styles.currencySymbol}>$</Text>

              <TextInput
                style={styles.estimateInput}
                value={estimateAmount}
                onChangeText={setEstimateAmount}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                isSavingEstimate && styles.disabledButton,
              ]}
              disabled={isSavingEstimate}
              onPress={handleSaveEstimate}
            >
              <Text style={styles.modalSaveButtonText}>
                {isSavingEstimate ? "Saving..." : "Save Estimate"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              disabled={isSavingEstimate}
              onPress={handleCloseEstimateModal}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showHoursAdjustmentModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseHoursAdjustmentModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add / Remove Approved Hours</Text>

            <Text style={styles.modalSubtitle}>
              Adjust approved time without changing the worker&apos;s original
              timer logs.
            </Text>

            <Text style={styles.modalLabel}>Adjustment Type</Text>

            <View style={styles.adjustmentModeRow}>
              <TouchableOpacity
                style={[
                  styles.adjustmentModeButton,
                  adjustmentMode === "add" &&
                    styles.adjustmentModeButtonActive,
                ]}
                onPress={() => setAdjustmentMode("add")}
                disabled={isSavingAdjustment}
              >
                <Text
                  style={[
                    styles.adjustmentModeButtonText,
                    adjustmentMode === "add" &&
                      styles.adjustmentModeButtonTextActive,
                  ]}
                >
                  Add Hours
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.adjustmentModeButton,
                  adjustmentMode === "remove" &&
                    styles.adjustmentModeButtonActive,
                ]}
                onPress={() => setAdjustmentMode("remove")}
                disabled={isSavingAdjustment}
              >
                <Text
                  style={[
                    styles.adjustmentModeButtonText,
                    adjustmentMode === "remove" &&
                      styles.adjustmentModeButtonTextActive,
                  ]}
                >
                  Remove Hours
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>
              Hours to {adjustmentMode === "add" ? "Add" : "Remove"}
            </Text>

            <TextInput
              style={styles.hoursAdjustmentInput}
              value={additionalHours}
              onChangeText={setAdditionalHours}
              placeholder="Example: 0.5"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
            />

            <Text style={styles.adjustmentHelperText}>
              0.25 = 15 minutes · 0.5 = 30 minutes · 1.5 = 1 hour 30 minutes
            </Text>

            {selectedHourlyJob ? (
              <View style={styles.currentAdjustmentCard}>
                <Text style={styles.currentAdjustmentLabel}>
                  Current added time
                </Text>
                <Text style={styles.currentAdjustmentValue}>
                  {formatDuration(
                    getAdjustmentSeconds(selectedHourlyJob)
                  )}
                </Text>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>Optional Note</Text>

            <TextInput
              style={styles.adjustmentNoteInput}
              value={adjustmentNote}
              onChangeText={setAdjustmentNote}
              placeholder="Why are you changing the approved time?"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                isSavingAdjustment && styles.disabledButton,
              ]}
              disabled={isSavingAdjustment}
              onPress={handleSaveHoursAdjustment}
            >
              <Text style={styles.modalSaveButtonText}>
                {isSavingAdjustment
                  ? "Saving..."
                  : adjustmentMode === "add"
                  ? "Add Hours"
                  : "Remove Hours"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              disabled={isSavingAdjustment}
              onPress={handleCloseHoursAdjustmentModal}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
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

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },

  statAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F7A4D",
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111",
    marginTop: 18,
    marginBottom: 12,
  },

  paymentCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 14,
  },

  paymentTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  paymentTextContainer: {
    flex: 1,
    marginRight: 12,
  },

  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },

  workerName: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },

  totalPaid: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F7A4D",
  },

  hourlyReviewCard: {
    backgroundColor: "#F3F8F5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CFE4D7",
    marginBottom: 12,
  },

  hourlyReviewTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1F7A4D",
    marginBottom: 12,
  },

  hourlySummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  hourlySummaryItem: {
    width: "48%",
    alignItems: "center",
    marginBottom: 12,
  },

  hourlySummaryValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },

  hourlySummaryLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 3,
    textAlign: "center",
  },

  workLogTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222",
    marginBottom: 8,
  },

  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 11,
    marginBottom: 8,
  },

  sessionTextContainer: {
    flex: 1,
    marginRight: 10,
  },

  sessionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222",
    marginBottom: 3,
  },

  sessionTimes: {
    fontSize: 12,
    color: "#666",
  },

  sessionDuration: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F7A4D",
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

  jobTime: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },

  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#EFEFEF",
  },

  statusPending: {
    backgroundColor: "#FFF4D6",
  },

  statusInProgress: {
    backgroundColor: "#E8F0FE",
  },

  statusPaid: {
    backgroundColor: "#EAF5EE",
  },

  statusNeedsConfirmation: {
    backgroundColor: "#FFF4D6",
    borderColor: "#FACC15",
  },

  statusEstimateNeeded: {
    backgroundColor: "#EAF2FF",
    borderColor: "#8BB7F0",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  agreementPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginBottom: 8,
    backgroundColor: "#EFEFEF",
  },

  agreementSigned: {
    backgroundColor: "#EAF5EE",
  },

  agreementNotSigned: {
    backgroundColor: "#FEE2E2",
  },

  agreementText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  primarySmallButton: {
    flex: 1,
    backgroundColor: "#111",
    padding: 13,
    borderRadius: 12,
    marginRight: 8,
  },

  primarySmallButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  secondarySmallButton: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    marginLeft: 8,
  },

  secondarySmallButtonText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 40,
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },

  infoText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    marginBottom: 12,
  },

  infoDivider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginVertical: 12,
  },

  exampleBox: {
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },

  exampleLine: {
    fontSize: 15,
    color: "#555",
    marginBottom: 5,
  },

  exampleTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F7A4D",
    marginTop: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },

  modalSubtitle: {
    fontSize: 15,
    color: "#666",
    lineHeight: 21,
    marginBottom: 18,
  },

  modalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },

  estimateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  currencySymbol: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },

  estimateInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 18,
    color: "#111",
  },

  modalSaveButton: {
    backgroundColor: "#1F7A4D",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },

  modalSaveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  modalCancelButton: {
    padding: 12,
  },

  modalCancelButtonText: {
    color: "#555",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  adjustHoursButton: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#1F7A4D",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },

  adjustHoursButtonText: {
    color: "#1F7A4D",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  adjustmentModeRow: {
    flexDirection: "row",
    marginHorizontal: -4,
    marginBottom: 18,
  },

  adjustmentModeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FFF",
    marginHorizontal: 4,
  },

  adjustmentModeButtonActive: {
    backgroundColor: "#1F7A4D",
    borderColor: "#1F7A4D",
  },

  adjustmentModeButtonText: {
    color: "#555",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  adjustmentModeButtonTextActive: {
    color: "#FFF",
  },

  hoursAdjustmentInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    color: "#111",
    marginBottom: 8,
  },

  adjustmentHelperText: {
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
    marginBottom: 16,
  },

  currentAdjustmentCard: {
    backgroundColor: "#F3F8F5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#CFE4D7",
  },

  currentAdjustmentLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },

  currentAdjustmentValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F7A4D",
    textAlign: "center",
  },

  adjustmentNoteInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 14,
    minHeight: 90,
    fontSize: 15,
    color: "#111",
    marginBottom: 18,
  },

  disabledButton: {
    opacity: 0.55,
  },
});
