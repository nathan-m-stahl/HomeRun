import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const categoryOptions = [
  "Mowing",
  "Weeding",
  "Raking",
  "Snow Shoveling",
  "Moving Help",
  "Landscaping",
  "Painting",
  "Furniture Assembly",
  "Cleaning",
  "Junk Removal",
  "General Labor",
  "Other",
];

const equipmentOptions = [
  "No equipment needed",
  "Mower",
  "Rake",
  "Shovel",
  "Truck",
  "Trailer",
  "Weed Whacker",
  "Leaf Blower",
  "Wheelbarrow",
  "Ladder",
  "Snow Blower",
  "Tool Set",
  "Power Washer",
  "Power Drill",
  "Other",
];

export default function EditTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const taskId = params.taskId?.toString();

  const [taskTitle, setTaskTitle] = useState(
    params.title?.toString() 
  );
  const [taskDescription, setTaskDescription] = useState(
    params.description?.toString()
  );
  const [selectedCategory, setSelectedCategory] = useState(
    params.category?.toString()
  );
  const [otherCategory, setOtherCategory] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(
  params.equipment
    ? params.equipment
        .toString()
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : ["No equipment needed"]
);
  const [otherEquipment, setOtherEquipment] = useState("");
  const [price, setPrice] = useState(params.price?.toString());
  const [paymentType, setPaymentType] = useState<"flat" | "hourly" | "estimate">((params.paymentType?.toString() as "flat" | "hourly" | "estimate"));
  const [address, setAddress] = useState(
    params.address?.toString() || ""
  );
  const [preferredDate, setPreferredDate] = useState(
    params.date?.toString() 
  );
  const [preferredTime, setPreferredTime] = useState(
    params.time?.toString() 
  );
  const [extraNotes, setExtraNotes] = useState(
    params.extraNotes?.toString() 
  );

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [selectedHour, setSelectedHour] = useState("4");
  const [selectedMinute, setSelectedMinute] = useState("30");
  const [selectedAmPm, setSelectedAmPm] = useState("PM");

  const hours = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

  const minutes = Array.from({ length: 60 }, (_, index) =>
    index.toString().padStart(2, "0")
  );

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


  const today = new Date();
  const todayText = `${
    monthNames[today.getMonth()]
  } ${today.getDate()}, ${today.getFullYear()}`;
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();

  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);

  const firstWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function isMissing(fieldName: string) {
    return missingFields.includes(fieldName);
  }

  function clearMissingField(fieldName: string) {
    setMissingFields((currentFields) =>
      currentFields.filter((field) => field !== fieldName)
    );
  }

  function goToPreviousMonth() {
    setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  }

  function goToNextMonth() {
    setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
  }

  function handleSelectCalendarDay(day: number) {
    const selectedDate = new Date(calendarYear, calendarMonth, day);

    const formattedDate = `${
      monthNames[selectedDate.getMonth()]
    } ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;

    setPreferredDate(formattedDate);
    clearMissingField("preferredDate");
    setShowDatePicker(false);
  }

  function handleConfirmTime() {
    setPreferredTime(`${selectedHour}:${selectedMinute} ${selectedAmPm}`);
    clearMissingField("preferredTime");
    setShowTimePicker(false);
  }

  function toggleEquipment(equipment: string) {
  clearMissingField("selectedEquipment");

  if (equipment === "No equipment needed") {
    setSelectedEquipment(["No equipment needed"]);
    setOtherEquipment("");
    clearMissingField("otherEquipment");
    return;
  }

  if (selectedEquipment.includes(equipment)) {
    setSelectedEquipment(
      selectedEquipment.filter((item) => item !== equipment)
    );

    if (equipment === "Other") {
      setOtherEquipment("");
      clearMissingField("otherEquipment");
    }

    return;
  }

  setSelectedEquipment([
    ...selectedEquipment.filter((item) => item !== "No equipment needed"),
    equipment,
  ]);
}

  async function handleUpdateTask() {
    const missing = [];

    if (!taskTitle) missing.push("taskTitle");
    if (!taskDescription) missing.push("taskDescription");
    if (!selectedCategory) missing.push("selectedCategory");

    if (selectedCategory === "Other" && !otherCategory) {
      missing.push("otherCategory");
    }

    if (paymentType !== "estimate" && !price) {
      missing.push("price");
    }

    if (!address) missing.push("address");
    if (!preferredDate) missing.push("preferredDate");
    if (!preferredTime) missing.push("preferredTime");

    if (selectedEquipment.includes("Other") && !otherEquipment) {
      missing.push("otherEquipment");
    }

    setMissingFields(missing);

    if (missing.length > 0) {
      const fieldNames: Record<string, string> = {
        taskTitle: "Task Title",
        taskDescription: "Task Description",
        selectedCategory: "Category",
        otherCategory: "Other Category",
        price: "Price",
        address: "Task Address",
        preferredDate: "Preferred Date",
        preferredTime: "Preferred Time",
        otherEquipment: "Other Equipment",
      };

      Alert.alert(
        "Missing Required Fields",
        `Please complete the following:\n\n${missing
          .map((field) => fieldNames[field])
          .join("\n")}`
      );

      return;
    }

    if (!taskId) {
      Alert.alert("Update Error", "Missing task ID. Please go back and try again.");
      return;
    }

    const finalCategory =
      selectedCategory === "Other" ? otherCategory : selectedCategory;

    const finalEquipment = selectedEquipment.map((equipment) => {
      if (equipment === "Other") {
        return otherEquipment;
      }

      return equipment;
    });

    const { error } = await supabase
      .from("tasks")
      .update({
        title: taskTitle,
        description: taskDescription,
        category: finalCategory,
        equipment_needed: finalEquipment,
        payment_type: paymentType,
        price: paymentType === "estimate" ? null : Number(price),
        address: address,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        extra_notes: extraNotes,
      })
      .eq("id", taskId);

    if (error) {
      Alert.alert("Update Error", error.message);
      return;
    }

    Alert.alert("Task Updated", "Your task has been updated.", [
      {
        text: "Back to Customer Home",
        onPress: () => router.replace("/customer-home"),
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/customer-home")}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Edit Task</Text>

        <Text style={styles.subtitle}>
          Update the task details before accepting a worker.
        </Text>

        <Text style={[styles.label, isMissing("taskTitle") && styles.labelError]}>
          Task Title
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Example: Mow front and backyard"
          placeholderTextColor="#999"
          value={taskTitle}
          onChangeText={(text) => {
            setTaskTitle(text);
            clearMissingField("taskTitle");
          }}
        />

        <Text
          style={[
            styles.label,
            isMissing("taskDescription") && styles.labelError,
          ]}
        >
          Task Description
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what needs to be done."
          placeholderTextColor="#999"
          value={taskDescription}
          onChangeText={(text) => {
            setTaskDescription(text);
            clearMissingField("taskDescription");
          }}
          multiline
        />

        <Text
          style={[
            styles.label,
            isMissing("selectedCategory") && styles.labelError,
          ]}
        >
          Category
        </Text>
        <Text style={styles.helperText}>Choose the best match for this job.</Text>

        <View style={styles.chipContainer}>
          {categoryOptions.map((category) => {
            const isSelected = selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => {
                  setSelectedCategory(category);
                  clearMissingField("selectedCategory");
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedCategory === "Other" && (
          <>
            <Text
              style={[
                styles.label,
                isMissing("otherCategory") && styles.labelError,
              ]}
            >
              Other Category
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Example: Gutter cleaning"
              placeholderTextColor="#999"
              value={otherCategory}
              onChangeText={(text) => {
                setOtherCategory(text);
                clearMissingField("otherCategory");
              }}
            />
          </>
        )}

        <Text
          style={[
            styles.label,
            isMissing("selectedEquipment") && styles.labelError,
          ]}
        >
          Equipment Worker Should Bring
        </Text>
        <Text style={styles.helperText}>
          Choose anything the worker needs to provide.
        </Text>

        <View style={styles.chipContainer}>
          {equipmentOptions.map((equipment) => {
            const isSelected = selectedEquipment.includes(equipment);

            return (
              <TouchableOpacity
                key={equipment}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleEquipment(equipment)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {equipment}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedEquipment.includes("Other") && (
          <>
            <Text
              style={[
                styles.label,
                isMissing("otherEquipment") && styles.labelError,
              ]}
            >
              Other Equipment
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Example: Hedge trimmer, chainsaw, shop vac"
              placeholderTextColor="#999"
              value={otherEquipment}
              onChangeText={(text) => {
                setOtherEquipment(text);
                clearMissingField("otherEquipment");
              }}
            />
          </>
        )}

        <Text style={styles.label}>Payment Type</Text>
        <Text style={styles.helperText}>Choose how you want this job to be paid.</Text>

        <View style={styles.paymentTypeRow}>
          <TouchableOpacity
            style={[
              styles.paymentTypeButton,
              paymentType === "flat" && styles.paymentTypeButtonSelected,
            ]}
            onPress={() => setPaymentType("flat")}
          >
            <Text
              style={[
                styles.paymentTypeText,
                paymentType === "flat" && styles.paymentTypeTextSelected,
              ]}
            >
              Flat Rate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentTypeButton,
              paymentType === "hourly" && styles.paymentTypeButtonSelected,
            ]}
            onPress={() => setPaymentType("hourly")}
          >
            <Text
              style={[
                styles.paymentTypeText,
                paymentType === "hourly" && styles.paymentTypeTextSelected,
              ]}
            >
              Hourly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentTypeButton,
              paymentType === "estimate" && styles.paymentTypeButtonSelected,
            ]}
            onPress={() => {
              setPaymentType("estimate");
              setPrice("");
              setMissingFields(missingFields.filter((field) => field !== "price"));
            }}
          >
            <Text
              style={[
                styles.paymentTypeText,
                paymentType === "estimate" && styles.paymentTypeTextSelected,
              ]}
            >
              Estimate
            </Text>
          </TouchableOpacity>
        </View>

        {paymentType !== "estimate" && (
  <>
    <Text style={[styles.label, isMissing("price") && styles.labelError]}>
      {paymentType === "flat" ? "Flat Rate Offer ($)" : "Hourly Rate ($/hr)"}
    </Text>

      <TextInput
          style={styles.input}
          placeholder={paymentType === "flat" ? "Example: 50" : "Example: 20"}
          placeholderTextColor="#999"
          value={price}
          onChangeText={(text) => {
            setPrice(text);
            setMissingFields(missingFields.filter((field) => field !== "price"));
          }}
          keyboardType="numeric"
        />
      </>
    )}

        {paymentType === "hourly" && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How hourly jobs will work</Text>
            <Text style={styles.infoText}>
              The worker will be able to start and stop a timer during the job. After
              the job, you will review the logged hours before payment is released. If
              the worker forgets to track time, you can approve a manual payment amount.
            </Text>
          </View>
        )}
        {paymentType === "flat" && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How flat rate jobs will work</Text>
            <Text style={styles.infoText}>
              Best for jobs with a clear scope. You offer one total price, and the 
              worker is paid that amount after the job is completed and approved.
            </Text>
          </View>
        )}

        {paymentType === "estimate" && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Request an Estimate</Text>
            <Text style={styles.infoText}>
              Workers will review your task and send an estimated price before you accept
              them. This is best for jobs where the time or amount of work is unclear.
            </Text>
          </View>
        )}

        <Text style={[styles.label, isMissing("address") && styles.labelError]}>
          Task Address
        </Text>
        <View style={styles.readOnlyAddressBox}>
          <Text style={styles.readOnlyAddressText}>
            {address || "No address saved for this task"}
          </Text>
        </View>

        <Text
          style={[
            styles.label,
            isMissing("preferredDate") && styles.labelError,
          ]}
        >
          Preferred Date
        </Text>

        <TouchableOpacity
          style={styles.selectorBox}
          onPress={() => setShowDatePicker(true)}
        >
          <Text
            style={[
              styles.selectorText,
              !preferredDate && styles.selectorPlaceholder,
            ]}
          >
            {preferredDate || "Select a date"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.todayReferenceText}>
          Today is {todayText}
        </Text>

        <Text
          style={[
            styles.label,
            isMissing("preferredTime") && styles.labelError,
          ]}
        >
          Preferred Time
        </Text>

        <TouchableOpacity
          style={styles.selectorBox}
          onPress={() => setShowTimePicker(true)}
        >
          <Text
            style={[
              styles.selectorText,
              !preferredTime && styles.selectorPlaceholder,
            ]}
          >
            {preferredTime || "Select a time"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Extra Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Example: Gate code, parking info, pets, etc."
          placeholderTextColor="#999"
          value={extraNotes}
          onChangeText={setExtraNotes}
          multiline
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateTask}>
          <Text style={styles.buttonText}>Update Task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/customer-home")}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>

        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={goToPreviousMonth}>
                  <Text style={styles.calendarArrow}>‹</Text>
                </TouchableOpacity>

                <Text style={styles.modalTitle}>
                  {monthNames[calendarMonth]} {calendarYear}
                </Text>

                <TouchableOpacity onPress={goToNextMonth}>
                  <Text style={styles.calendarArrow}>›</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.todayReferenceText}>
                Today is {todayText}
              </Text>

              <View style={styles.weekDayRow}>
                {weekDays.map((day) => (
                  <Text key={day} style={styles.weekDayText}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return (
                      <View
                        key={`empty-${index}`}
                        style={styles.calendarDay}
                      />
                    );
                  }

                  const selectedDateText = `${monthNames[calendarMonth]} ${day}, ${calendarYear}`;
                  const isSelected = preferredDate === selectedDateText;

                  const isToday =
                    day === today.getDate() &&
                    calendarMonth === today.getMonth() &&
                    calendarYear === today.getFullYear();

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.calendarDay,
                        isToday && styles.calendarDayToday,
                        isSelected && styles.calendarDaySelected,
                      ]}
                      onPress={() => handleSelectCalendarDay(day)}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          isToday && styles.calendarDayTextToday,
                          isSelected && styles.calendarDayTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showTimePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select a Time</Text>

              <View style={styles.timePickerRow}>
                <ScrollView style={styles.timeColumn}>
                  {hours.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      style={[
                        styles.timeOption,
                        selectedHour === hour && styles.timeOptionSelected,
                      ]}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          selectedHour === hour && styles.timeOptionTextSelected,
                        ]}
                      >
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <ScrollView style={styles.timeColumn}>
                  {minutes.map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      style={[
                        styles.timeOption,
                        selectedMinute === minute && styles.timeOptionSelected,
                      ]}
                      onPress={() => setSelectedMinute(minute)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          selectedMinute === minute &&
                            styles.timeOptionTextSelected,
                        ]}
                      >
                        {minute}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.timeColumn}>
                  {["AM", "PM"].map((period) => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.timeOption,
                        selectedAmPm === period && styles.timeOptionSelected,
                      ]}
                      onPress={() => setSelectedAmPm(period)}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          selectedAmPm === period &&
                            styles.timeOptionTextSelected,
                        ]}
                      >
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleConfirmTime}
              >
                <Text style={styles.buttonText}>Confirm Time</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
    secondaryButton: {
        backgroundColor: "#FFF",
        padding: 18,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#DDD",
        marginBottom: 40,
    },

        secondaryButtonText: {
        color: "#111",
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
    },

    keyboardView: {
    flex: 1,
  },

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
    marginBottom: 30,
  },

  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },

  helperText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
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
    height: 110,
    textAlignVertical: "top",
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 18,
  },

  chip: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 10,
  },

  chipSelected: {
    backgroundColor: "#1F7A4D",
    borderColor: "#1F7A4D",
  },

  chipText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "600",
  },

  chipTextSelected: {
    color: "#FFF",
  },

  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 18,
  },

  infoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },

  infoText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 21,
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
    fontWeight: "600",
    textAlign: "center",
  },

  selectorBox: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    },

    selectorText: {
    fontSize: 16,
    color: "#111",
    },

    selectorPlaceholder: {
    color: "#999",
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
    marginBottom: 18,
    },

    timePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    },

    timeColumn: {
    width: "31%",
    maxHeight: 210,
    backgroundColor: "#F7F7F7",
    borderRadius: 14,
    padding: 6,
    },

    timeOption: {
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 6,
    },

    timeOptionSelected: {
    backgroundColor: "#1F7A4D",
    },

    timeOptionText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
    },

    timeOptionTextSelected: {
    color: "#FFF",
    },

    modalCancelButton: {
    padding: 12,
    },

    modalCancelText: {
    color: "#555",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    },

    calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    },

    calendarArrow: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#1F7A4D",
    paddingHorizontal: 12,
    },

    weekDayRow: {
    flexDirection: "row",
    marginBottom: 10,
    },

    weekDayText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    },

    calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    },

    calendarDay: {
    width: `${100 / 7}%`,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    },

    calendarDaySelected: {
    backgroundColor: "#1F7A4D",
    borderRadius: 999,
    },

    calendarDayText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111",
    },

    calendarDayTextSelected: {
        color: "#FFF",
    },

    labelError: {
        color: "#B91C1C",
    },

    paymentTypeRow: {
  flexDirection: "row",
  marginBottom: 18,
},

paymentTypeButton: {
  flex: 1,
  backgroundColor: "#FFF",
  borderWidth: 1,
  borderColor: "#DDD",
  padding: 14,
  borderRadius: 12,
  marginRight: 8,
},

paymentTypeButtonSelected: {
  backgroundColor: "#1F7A4D",
  borderColor: "#1F7A4D",
},

paymentTypeText: {
  color: "#111",
  fontSize: 15,
  fontWeight: "700",
  textAlign: "center",
},

paymentTypeTextSelected: {
  color: "#FFF",
},

readOnlyAddressBox: {
  backgroundColor: "#F7F7F7",
  padding: 14,
  marginBottom: 8,
},

readOnlyAddressText: {
  fontSize: 16,
  color: "#111",
  lineHeight: 22,
},

todayReferenceText: {
  fontSize: 14,
  color: "#666",
  textAlign: "center",
  marginTop: -8,
  marginBottom: 14,
  fontWeight: "600",
},

calendarDayToday: {
  borderWidth: 2,
  borderColor: "#1F7A4D",
  borderRadius: 999,
},

calendarDayTextToday: {
  color: "#1F7A4D",
  fontWeight: "800",
},
});