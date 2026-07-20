import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
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

export default function WorkerScheduleScreen() {
  const router = useRouter();

  const [scheduledJobs, setScheduledJobs] = useState<any[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  async function loadWorkerSchedule() {
    setIsLoadingJobs(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      Alert.alert("Not Signed In", "Please log in to view your schedule.");
      setIsLoadingJobs(false);
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
        payment_type,
        agreed_price,
        agreement_status,
        created_at,
        final_price,
        payment_status,
        worker_completed_at,
        customer_approved_at,
        paid_at,
        tasks (
          id,
          title,
          description,
          category,
          equipment_needed,
          payment_type,
          price,
          address,
          preferred_date,
          preferred_time,
          extra_notes,
          status,
          accepted_worker_id
        )
      `)
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false });

    if (agreementsError) {
      Alert.alert("Schedule Error", agreementsError.message);
      setIsLoadingJobs(false);
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from("work_sessions")
      .select("*")
      .eq("worker_id", workerId)
      .order("started_at", { ascending: true });

    if (sessionError) {
      Alert.alert("Work Session Error", sessionError.message);
      setIsLoadingJobs(false);
      return;
    }

    const formattedJobs = (agreementsData || [])
      .map((agreement: any) => {
        const task = Array.isArray(agreement.tasks)
          ? agreement.tasks[0]
          : agreement.tasks;

        if (!task) {
          return null;
        }

        if (
          task.status === "cancelled" ||
          agreement.agreement_status === "cancelled" ||
          agreement.payment_status === "cancelled"
        ) {
          return null;
        }

        const workSessions = (sessionData || []).filter(
          (session: WorkSession) => session.task_id === task.id
        );

        return {
          ...task,
          agreement_id: agreement.id,
          customer_id: agreement.customer_id,
          worker_id: agreement.worker_id,
          work_sessions: workSessions,
          agreements: [
            {
              id: agreement.id,
              agreement_status: agreement.agreement_status,
              agreed_price: agreement.agreed_price,
              payment_type: agreement.payment_type,
              final_price: agreement.final_price,
              payment_status: agreement.payment_status,
              worker_completed_at: agreement.worker_completed_at,
              customer_approved_at: agreement.customer_approved_at,
              paid_at: agreement.paid_at,
            },
          ],
        };
      })
      .filter(Boolean);

    setScheduledJobs(formattedJobs);
    setIsLoadingJobs(false);
  }

  useEffect(() => {
    loadWorkerSchedule();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const totalScheduledJobs = scheduledJobs.length;

  const needsActionCount = scheduledJobs.filter((job) => {
    const agreement = getAgreement(job);
    return agreement?.agreement_status !== "confirmed";
  }).length;

  function getAgreement(job: any) {
    return Array.isArray(job.agreements) ? job.agreements[0] : null;
  }

  function getWorkSessions(job: any): WorkSession[] {
    return Array.isArray(job.work_sessions) ? job.work_sessions : [];
  }

  function getActiveSession(job: any): WorkSession | null {
    return (
      getWorkSessions(job).find(
        (session) => session.status === "active" && !session.ended_at
      ) || null
    );
  }

  function getTotalSeconds(job: any) {
    return getWorkSessions(job).reduce((total, session) => {
      if (session.status === "active" && !session.ended_at) {
        const startedMs = new Date(session.started_at).getTime();
        return total + Math.max(0, Math.floor((nowMs - startedMs) / 1000));
      }

      return total + Number(session.duration_seconds || 0);
    }, 0);
  }

  function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  function getHourlyRate(job: any) {
    const agreement = getAgreement(job);
    return Number(agreement?.agreed_price ?? job.price ?? 0);
  }

  function getCurrentHourlyTotal(job: any) {
    const seconds = getTotalSeconds(job);
    const rate = getHourlyRate(job);
    return Math.round((seconds / 3600) * rate * 100) / 100;
  }

  function getPayLabel(job: any) {
    const agreement = getAgreement(job);
    const price =
      agreement?.final_price ??
      agreement?.agreed_price ??
      job.price;

    if (job.payment_type === "hourly") {
      return price ? `$${price}/hr` : "Hourly";
    }

    if (job.payment_type === "estimate") {
      return price ? `$${price}` : "Estimate Pending";
    }

    return price ? `$${price}` : "Price not set";
  }

  function getPaymentTypeLabel(job: any) {
    if (job.payment_type === "hourly") {
      return "Hourly Rate";
    }

    if (job.payment_type === "estimate") {
      return "Estimate Requested";
    }

    return "Flat Rate";
  }

  function getAgreementStatus(job: any) {
    const agreement = getAgreement(job);

    if (
      agreement?.agreement_status === "confirmed" ||
      agreement?.agreement_status === "completed"
    ) {
      return "Agreement Signed";
    }

    if (agreement?.agreement_status === "pending") {
      return "Agreement Sent";
    }

    return "Needs Agreement";
  }

  function getWorkerJobStatusLabel(job: any) {
    const agreement = getAgreement(job);
    const activeSession = getActiveSession(job);
    const totalSeconds = getTotalSeconds(job);

    if (job.status === "worker_completed") {
      return "Waiting for Customer Confirmation";
    }

    if (job.status === "completed" || agreement?.payment_status === "paid") {
      return "Completed & Paid";
    }

    if (job.payment_type === "hourly" && activeSession) {
      return "Timer Running";
    }

    if (job.payment_type === "hourly" && totalSeconds > 0) {
      return "Paused";
    }

    return "Confirmed";
  }

  function handleOpenEditJob(job: any) {
    setSelectedJob(job);
    setShowEditJobModal(true);
  }

  function handleRescheduleJob() {
    Alert.alert(
      "Coming Soon",
      "Reschedule requests will be added after the main job flow is finished."
    );
  }

  function handleCancelJob() {
    if (!selectedJob) {
      Alert.alert("Cancel Error", "No job was selected.");
      return;
    }

    const agreement = getAgreement(selectedJob);

    if (!agreement) {
      Alert.alert("Cancel Error", "No agreement was found for this job.");
      return;
    }

    if (
      selectedJob.status === "worker_completed" ||
      selectedJob.status === "completed" ||
      agreement.payment_status === "paid"
    ) {
      Alert.alert(
        "Cannot Cancel",
        "This job has already been completed or sent to the customer for approval."
      );
      return;
    }

    Alert.alert(
      "Cancel Job?",
      `Are you sure you want to cancel: ${
        selectedJob.title || "this job"
      }?`,
      [
        {
          text: "Keep Job",
          style: "cancel",
        },
        {
          text: "Cancel Job",
          style: "destructive",
          onPress: async () => {
            const { data: userData, error: userError } =
              await supabase.auth.getUser();

            if (userError || !userData.user) {
              Alert.alert(
                "Cancel Error",
                "You must be signed in to cancel this job."
              );
              return;
            }

            setBusyJobId(selectedJob.id);

            const activeSession = getActiveSession(selectedJob);

            if (activeSession) {
              const stopped = await stopActiveSession(selectedJob);

              if (!stopped) {
                setBusyJobId(null);
                return;
              }
            }

            const cancelledAt = new Date().toISOString();

            const { error: taskError } = await supabase
              .from("tasks")
              .update({
                status: "cancelled",
                cancelled_by: userData.user.id,
                cancelled_by_role: "worker",
                cancellation_reason: "Worker cancelled from Worker Schedule.",
                cancelled_at: cancelledAt,
              })
              .eq("id", selectedJob.id);

            if (taskError) {
              setBusyJobId(null);
              Alert.alert("Task Cancel Error", taskError.message);
              return;
            }

            const { error: agreementError } = await supabase
              .from("agreements")
              .update({
                agreement_status: "cancelled",
                payment_status: "cancelled",
                cancelled_by: userData.user.id,
                cancelled_by_role: "worker",
                cancellation_reason: "Worker cancelled from Worker Schedule.",
                cancelled_at: cancelledAt,
              })
              .eq("id", agreement.id);

            if (agreementError) {
              setBusyJobId(null);
              Alert.alert("Agreement Cancel Error", agreementError.message);
              return;
            }

            setShowEditJobModal(false);
            setSelectedJob(null);

            await loadWorkerSchedule();

            setBusyJobId(null);

            Alert.alert(
              "Job Cancelled",
              "This job has been cancelled and removed from your active schedule."
            );
          },
        },
      ]
    );
  }

  async function handleStartHourlyJob(job: any) {
    const agreement = getAgreement(job);

    if (!agreement || !job.id) {
      Alert.alert("Job Error", "This job is missing task or agreement data.");
      return;
    }

    setBusyJobId(job.id);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setBusyJobId(null);
      Alert.alert("Not Signed In", "Please log in before starting work.");
      return;
    }

    const { data: existingActiveSession, error: activeSessionError } =
      await supabase
        .from("work_sessions")
        .select("id, task_id")
        .eq("worker_id", userData.user.id)
        .eq("status", "active")
        .is("ended_at", null)
        .maybeSingle();

    if (activeSessionError) {
      setBusyJobId(null);
      Alert.alert("Timer Error", activeSessionError.message);
      return;
    }

    if (existingActiveSession) {
      setBusyJobId(null);

      if (existingActiveSession.task_id === job.id) {
        Alert.alert("Timer Running", "This job already has an active timer.");
      } else {
        Alert.alert(
          "Another Timer Is Running",
          "Pause or finish your other active job before starting this one."
        );
      }
      return;
    }

    const { error: insertError } = await supabase
      .from("work_sessions")
      .insert({
        task_id: job.id,
        agreement_id: agreement.id,
        worker_id: userData.user.id,
        started_at: new Date().toISOString(),
        ended_at: null,
        duration_seconds: null,
        status: "active",
      });

    if (insertError) {
      setBusyJobId(null);
      Alert.alert("Start Error", insertError.message);
      return;
    }

    const { error: taskError } = await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", job.id);

    if (taskError) {
      setBusyJobId(null);
      Alert.alert("Task Error", taskError.message);
      return;
    }

    await loadWorkerSchedule();
    setBusyJobId(null);
  }

  async function stopActiveSession(job: any) {
    const activeSession = getActiveSession(job);

    if (!activeSession) {
      return true;
    }

    const endedAt = new Date();
    const startedAt = new Date(activeSession.started_at);
    const durationSeconds = Math.max(
      1,
      Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
    );

    const { error } = await supabase
      .from("work_sessions")
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        status: "completed",
      })
      .eq("id", activeSession.id);

    if (error) {
      Alert.alert("Timer Error", error.message);
      return false;
    }

    return true;
  }

  async function handlePauseHourlyJob(job: any) {
    setBusyJobId(job.id);

    const stopped = await stopActiveSession(job);

    if (!stopped) {
      setBusyJobId(null);
      return;
    }

    await loadWorkerSchedule();
    setBusyJobId(null);
  }

  function handleFinishHourlyJob(job: any) {
    const agreement = getAgreement(job);
    const hourlyRate = getHourlyRate(job);

    if (!agreement || !job.id) {
      Alert.alert("Job Error", "This job is missing task or agreement data.");
      return;
    }

    if (!hourlyRate || hourlyRate <= 0) {
      Alert.alert("Rate Error", "This hourly job does not have a valid rate.");
      return;
    }

    Alert.alert(
      "Finish Hourly Job?",
      "This will stop the timer, calculate the total hours and price, and send the job to the customer for approval.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Finish Job",
          onPress: async () => {
            setBusyJobId(job.id);

            const stopped = await stopActiveSession(job);

            if (!stopped) {
              setBusyJobId(null);
              return;
            }

            const { data: sessions, error: sessionsError } = await supabase
              .from("work_sessions")
              .select("duration_seconds")
              .eq("task_id", job.id)
              .eq("agreement_id", agreement.id)
              .eq("status", "completed");

            if (sessionsError) {
              setBusyJobId(null);
              Alert.alert("Work Log Error", sessionsError.message);
              return;
            }

            const totalSeconds = (sessions || []).reduce(
              (total, session) =>
                total + Number(session.duration_seconds || 0),
              0
            );

            if (totalSeconds <= 0) {
              setBusyJobId(null);
              Alert.alert(
                "No Time Logged",
                "Start the timer and log some work before finishing this job."
              );
              return;
            }

            const finalPrice =
              Math.round((totalSeconds / 3600) * hourlyRate * 100) / 100;

            const { data: updatedTask, error: taskError } = await supabase
              .from("tasks")
              .update({ status: "worker_completed" })
              .eq("id", job.id)
              .select("id, status")
              .single();

            if (taskError) {
              setBusyJobId(null);
              Alert.alert("Task Error", taskError.message);
              return;
            }

            if (!updatedTask || updatedTask.status !== "worker_completed") {
              setBusyJobId(null);
              Alert.alert("Task Error", "The task status did not update.");
              return;
            }

            const { data: updatedAgreement, error: agreementError } =
              await supabase
                .from("agreements")
                .update({
                  final_price: finalPrice,
                  payment_status: "pending_customer_confirmation",
                  worker_completed_at: new Date().toISOString(),
                })
                .eq("id", agreement.id)
                .select("id, final_price, payment_status")
                .single();

            if (agreementError) {
              setBusyJobId(null);
              Alert.alert("Agreement Error", agreementError.message);
              return;
            }

            if (
              !updatedAgreement ||
              updatedAgreement.payment_status !==
                "pending_customer_confirmation"
            ) {
              setBusyJobId(null);
              Alert.alert(
                "Agreement Error",
                "The final hourly price was not saved correctly."
              );
              return;
            }

            await loadWorkerSchedule();
            setBusyJobId(null);

            Alert.alert(
              "Hourly Job Finished",
              `Logged ${formatDuration(totalSeconds)} at $${hourlyRate}/hr. The customer will review the total of $${finalPrice.toFixed(
                2
              )}.`
            );
          },
        },
      ]
    );
  }

  function handleFinishFixedPriceJob(job: any) {
    const agreement = getAgreement(job);

    if (!agreement) {
      Alert.alert("Agreement Error", "No agreement was found for this job.");
      return;
    }

    if (!job.id) {
      Alert.alert("Task Error", "This job is missing a task ID.");
      return;
    }

    const finalPrice =
      agreement.final_price ??
      agreement.agreed_price ??
      job.price;

    if (
      job.payment_type === "estimate" &&
      (finalPrice === null || finalPrice === undefined)
    ) {
      Alert.alert(
        "Estimate Needed",
        "The customer must enter the agreed estimate amount before this job can be finished."
      );
      return;
    }

    Alert.alert(
      "Finish Job?",
      "Mark this job as complete? The customer will be asked to confirm the work before payment is released.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Finish Job",
          onPress: async () => {
            setBusyJobId(job.id);

            const { data: updatedTask, error: taskError } = await supabase
              .from("tasks")
              .update({ status: "worker_completed" })
              .eq("id", job.id)
              .select("id, status")
              .single();

            if (taskError) {
              setBusyJobId(null);
              Alert.alert("Task Error", taskError.message);
              return;
            }

            if (!updatedTask || updatedTask.status !== "worker_completed") {
              setBusyJobId(null);
              Alert.alert(
                "Task Error",
                "The task status did not update. This is probably an RLS policy issue."
              );
              return;
            }

            const { data: updatedAgreement, error: agreementError } =
              await supabase
                .from("agreements")
                .update({
                  payment_status: "pending_customer_confirmation",
                  worker_completed_at: new Date().toISOString(),
                  final_price: finalPrice,
                })
                .eq("id", agreement.id)
                .select("id, payment_status")
                .single();

            if (agreementError) {
              setBusyJobId(null);
              Alert.alert("Agreement Error", agreementError.message);
              return;
            }

            if (
              !updatedAgreement ||
              updatedAgreement.payment_status !==
                "pending_customer_confirmation"
            ) {
              setBusyJobId(null);
              Alert.alert(
                "Agreement Error",
                "The agreement payment status did not update."
              );
              return;
            }

            await loadWorkerSchedule();
            setBusyJobId(null);

            Alert.alert(
              "Job Marked Complete",
              "The customer will now be asked to confirm the job."
            );
          },
        },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/worker-home")}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>My Schedule</Text>

      <Text style={styles.subtitle}>
        View your upcoming jobs, agreements, times, and customer details.
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{totalScheduledJobs}</Text>
          <Text style={styles.summaryLabel}>Upcoming Jobs</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{needsActionCount}</Text>
          <Text style={styles.summaryLabel}>Needs Action</Text>
        </View>
      </View>

      {isLoadingJobs ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading schedule...</Text>
          <Text style={styles.emptyText}>Checking your accepted jobs.</Text>
        </View>
      ) : scheduledJobs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No scheduled jobs yet</Text>
          <Text style={styles.emptyText}>
            Jobs will appear here after a customer accepts your request and
            confirms the agreement.
          </Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push("/worker-home")}
          >
            <Text style={styles.emptyButtonText}>
              Browse Available Tasks
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        scheduledJobs.map((job) => {
          const agreement = getAgreement(job);
          const activeSession = getActiveSession(job);
          const totalSeconds = getTotalSeconds(job);
          const hourlyTotal = getCurrentHourlyTotal(job);
          const isBusy = busyJobId === job.id;
          const estimateIsMissing =
            job.payment_type === "estimate" &&
            (agreement?.final_price === null ||
              agreement?.final_price === undefined);

          return (
            <View key={job.id} style={styles.jobCard}>
              <View style={styles.timeColumn}>
                <Text style={styles.jobTime}>
                  {job.preferred_time || "Time TBD"}
                </Text>
                <View style={styles.timelineDot} />
                <View style={styles.timelineLine} />
              </View>

              <View style={styles.jobContent}>
                <View style={styles.jobTopRow}>
                  <Text style={styles.jobTitle}>
                    {job.title || "Untitled Job"}
                  </Text>
                  <Text style={styles.jobPay}>{getPayLabel(job)}</Text>
                </View>

                <Text style={styles.jobDetail}>
                  Date: {job.preferred_date || "Date not set"}
                </Text>

                <Text style={styles.jobDetail}>
                  Location: {job.address || "Location not set"}
                </Text>

                <Text style={styles.paymentTypeLabel}>
                  {getPaymentTypeLabel(job)}
                </Text>

                <View style={styles.statusRow}>
                  <View style={[styles.statusPill, styles.statusConfirmed]}>
                    <Text style={styles.statusText}>
                      {getWorkerJobStatusLabel(job)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.agreementPill,
                      getAgreementStatus(job) === "Agreement Signed" &&
                        styles.agreementSigned,
                      getAgreementStatus(job) === "Needs Agreement" &&
                        styles.agreementNeeds,
                      getAgreementStatus(job) === "Agreement Sent" &&
                        styles.agreementSent,
                    ]}
                  >
                    <Text style={styles.agreementText}>
                      {getAgreementStatus(job)}
                    </Text>
                  </View>
                </View>

                {job.payment_type === "hourly" &&
                job.status !== "worker_completed" &&
                job.status !== "completed" ? (
                  <View style={styles.timerCard}>
                    <Text style={styles.timerLabel}>
                      {activeSession ? "Current Work Time" : "Total Work Time"}
                    </Text>

                    <Text style={styles.timerValue}>
                      {formatDuration(totalSeconds)}
                    </Text>

                    <View style={styles.timerSummaryRow}>
                      <Text style={styles.timerSummaryText}>
                        Rate: ${getHourlyRate(job).toFixed(2)}/hr
                      </Text>
                      <Text style={styles.timerSummaryText}>
                        Current total: ${hourlyTotal.toFixed(2)}
                      </Text>
                    </View>

                    <Text style={styles.sessionCountText}>
                      {getWorkSessions(job).filter(
                        (session) => session.status === "completed"
                      ).length}{" "}
                      completed work session
                      {getWorkSessions(job).filter(
                        (session) => session.status === "completed"
                      ).length === 1
                        ? ""
                        : "s"}
                    </Text>

                    {activeSession ? (
                      <View style={styles.hourlyButtonRow}>
                        <TouchableOpacity
                          style={[
                            styles.pauseJobButton,
                            isBusy && styles.disabledButton,
                          ]}
                          disabled={isBusy}
                          onPress={() => handlePauseHourlyJob(job)}
                        >
                          <Text style={styles.pauseJobButtonText}>
                            {isBusy ? "Saving..." : "Pause Job"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.finishHourlyButton,
                            isBusy && styles.disabledButton,
                          ]}
                          disabled={isBusy}
                          onPress={() => handleFinishHourlyJob(job)}
                        >
                          <Text style={styles.finishHourlyButtonText}>
                            Finish Job
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.hourlyButtonRow}>
                        <TouchableOpacity
                          style={[
                            styles.startJobButton,
                            isBusy && styles.disabledButton,
                          ]}
                          disabled={isBusy}
                          onPress={() => handleStartHourlyJob(job)}
                        >
                          <Text style={styles.startJobButtonText}>
                            {isBusy
                              ? "Starting..."
                              : totalSeconds > 0
                              ? "Resume Job"
                              : "Start Job"}
                          </Text>
                        </TouchableOpacity>

                        {totalSeconds > 0 ? (
                          <TouchableOpacity
                            style={[
                              styles.finishHourlyButton,
                              isBusy && styles.disabledButton,
                            ]}
                            disabled={isBusy}
                            onPress={() => handleFinishHourlyJob(job)}
                          >
                            <Text style={styles.finishHourlyButtonText}>
                              Finish Job
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    )}
                  </View>
                ) : null}

                <View style={styles.jobButtonRow}>
                  <TouchableOpacity
                    style={styles.agreementButton}
                    onPress={() =>
                      router.push({
                        pathname: "/agreement-preview",
                        params: {
                          viewer: "worker",
                          mode: "view",
                          returnTo: "worker-schedule",
                          taskTitle: job.title || "Task",
                          workerName: "You",
                          paymentType: job.payment_type,
                          price:
                            agreement?.final_price?.toString() ||
                            agreement?.agreed_price?.toString() ||
                            job.price?.toString() ||
                            "",
                          date: job.preferred_date || "",
                          time: job.preferred_time || "",
                          address: job.address || "",
                          equipment:
                            job.equipment_needed?.join(", ") || "",
                          workerMessage:
                            "This agreement is connected to your accepted job.",
                        },
                      })
                    }
                  >
                    <Text style={styles.agreementButtonText}>
                      View Agreement
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.editJobButton}
                    onPress={() => handleOpenEditJob(job)}
                  >
                    <Text style={styles.editJobButtonText}>
                      Job Options
                    </Text>
                  </TouchableOpacity>
                </View>

                {(job.payment_type === "flat" ||
                  job.payment_type === "estimate") &&
                job.status === "accepted" ? (
                  estimateIsMissing ? (
                    <View style={styles.waitingCard}>
                      <Text style={styles.waitingText}>
                        Waiting for the customer to enter the agreed estimate.
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.finishJobButton,
                        isBusy && styles.disabledButton,
                      ]}
                      disabled={isBusy}
                      onPress={() => handleFinishFixedPriceJob(job)}
                    >
                      <Text style={styles.finishJobButtonText}>
                        Finish Job
                      </Text>
                    </TouchableOpacity>
                  )
                ) : null}

                {(job.payment_type === "flat" ||
                  job.payment_type === "estimate" ||
                  job.payment_type === "hourly") &&
                job.status === "worker_completed" ? (
                  <View style={styles.waitingCard}>
                    <Text style={styles.waitingText}>
                      Waiting for customer confirmation and payment.
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })
      )}

      <Modal
        visible={showEditJobModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditJobModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Job Options</Text>

            <Text style={styles.modalSubtitle}>
              What would you like to do with this scheduled job?
            </Text>

            {selectedJob && (
              <View style={styles.selectedJobCard}>
                <Text style={styles.selectedJobTitle}>
                  {selectedJob.title || "Task"}
                </Text>

                <Text style={styles.selectedJobDetail}>
                  Date: {selectedJob.preferred_date || "Date not set"}
                </Text>

                <Text style={styles.selectedJobDetail}>
                  Time: {selectedJob.preferred_time || "Time not set"}
                </Text>

                <Text style={styles.selectedJobDetail}>
                  Location: {selectedJob.address || "Location not set"}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.rescheduleButton}
              onPress={handleRescheduleJob}
            >
              <Text style={styles.rescheduleButtonText}>
                Request Reschedule
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelJobButton}
              onPress={handleCancelJob}
            >
              <Text style={styles.cancelJobButtonText}>Cancel Job</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setShowEditJobModal(false);
                setSelectedJob(null);
              }}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
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

  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 26,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F7A4D",
  },

  summaryLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },

  summaryDivider: {
    width: 1,
    height: 44,
    backgroundColor: "#E5E5E5",
  },

  jobCard: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 14,
    flexDirection: "row",
  },

  timeColumn: {
    width: 72,
    alignItems: "center",
    marginRight: 12,
  },

  jobTime: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F7A4D",
    marginBottom: 8,
    textAlign: "center",
  },

  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1F7A4D",
    marginBottom: 4,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#DDE8E1",
  },

  jobContent: {
    flex: 1,
  },

  jobTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },

  jobTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginRight: 10,
  },

  jobPay: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#1F7A4D",
  },

  jobDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },

  paymentTypeLabel: {
    fontSize: 13,
    color: "#1F7A4D",
    fontWeight: "700",
    marginTop: 2,
    marginBottom: 8,
  },

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
    marginBottom: 12,
  },

  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#EFEFEF",
  },

  statusConfirmed: {
    backgroundColor: "#EAF5EE",
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

  agreementNeeds: {
    backgroundColor: "#FEE2E2",
  },

  agreementSent: {
    backgroundColor: "#E8F0FE",
  },

  agreementText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },

  timerCard: {
    backgroundColor: "#F3F8F5",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#CFE4D7",
    marginBottom: 12,
  },

  timerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    textAlign: "center",
  },

  timerValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1F7A4D",
    textAlign: "center",
    marginVertical: 8,
    fontVariant: ["tabular-nums"],
  },

  timerSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },

  timerSummaryText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "600",
    marginBottom: 4,
  },

  sessionCountText: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    marginTop: 6,
  },

  hourlyButtonRow: {
    flexDirection: "row",
    marginTop: 12,
  },

  startJobButton: {
    flex: 1,
    backgroundColor: "#1F7A4D",
    padding: 13,
    borderRadius: 12,
    marginRight: 6,
  },

  startJobButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  pauseJobButton: {
    flex: 1,
    backgroundColor: "#FFF4D6",
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FACC15",
    marginRight: 6,
  },

  pauseJobButtonText: {
    color: "#7A5A00",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  finishHourlyButton: {
    flex: 1,
    backgroundColor: "#111",
    padding: 13,
    borderRadius: 12,
    marginLeft: 6,
  },

  finishHourlyButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  disabledButton: {
    opacity: 0.55,
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

  jobButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  agreementButton: {
    flex: 1,
    backgroundColor: "#111",
    padding: 13,
    borderRadius: 12,
    marginRight: 8,
  },

  agreementButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  editJobButton: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
    marginLeft: 8,
  },

  editJobButtonText: {
    color: "#111",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  finishJobButton: {
    backgroundColor: "#1F7A4D",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },

  finishJobButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  waitingCard: {
    backgroundColor: "#FFF4D6",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FACC15",
  },

  waitingText: {
    color: "#7A5A00",
    fontSize: 14,
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
    fontSize: 26,
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

  selectedJobCard: {
    backgroundColor: "#F7F7F7",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },

  selectedJobTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },

  selectedJobDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 3,
  },

  rescheduleButton: {
    backgroundColor: "#1F7A4D",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },

  rescheduleButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  cancelJobButton: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    marginBottom: 12,
  },

  cancelJobButtonText: {
    color: "#B91C1C",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  closeModalButton: {
    padding: 12,
  },

  closeModalButtonText: {
    color: "#555",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
