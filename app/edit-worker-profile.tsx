import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const skillOptions = [
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
];

const equipmentOptions = [
  "Mower",
  "Rake",
  "Shovel",
  "Truck",
  "Trailer",
  "Car",
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

export default function EditWorkerProfileScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [serviceRadius, setServiceRadius] = useState("");
  const [experience, setExperience] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  async function loadWorkerProfile() {
    setIsLoadingProfile(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      Alert.alert("Not Signed In", "Please log in to edit your profile.");
      setIsLoadingProfile(false);
      return;
    }

    const userId = userData.user.id;

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      Alert.alert("Profile Error", profileError.message);
      setIsLoadingProfile(false);
      return;
    }

    const { data: workerData, error: workerError } = await supabase
      .from("worker_profiles")
      .select("age, bio, skills, equipment, service_radius_miles")
      .eq("id", userId)
      .single();

    if (workerError) {
      Alert.alert("Worker Profile Error", workerError.message);
      setIsLoadingProfile(false);
      return;
    }

    setFullName(profileData?.full_name || "");
    setAge(workerData?.age?.toString() || "");
    setBio(workerData?.bio || "");
    setSelectedSkills(workerData?.skills || []);
    setSelectedEquipment(workerData?.equipment || []);
    setServiceRadius(workerData?.service_radius_miles?.toString() || "");

    setIsLoadingProfile(false);
  }

  useEffect(() => {
    loadWorkerProfile();
  }, []);

  function toggleSkill(skill: string) {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((item) => item !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  }

  function toggleEquipment(equipment: string) {
    if (selectedEquipment.includes(equipment)) {
      setSelectedEquipment(selectedEquipment.filter((item) => item !== equipment));
    } else {
      setSelectedEquipment([...selectedEquipment, equipment]);
    }
  }

  async function handleUpdateProfile() {
    if (!fullName || !age || !bio || selectedSkills.length === 0 || !serviceRadius) {
      Alert.alert(
        "Missing Info",
        "Please add your name, age, bio, at least one skill, and service radius."
      );
      return;
    }

    setIsSavingProfile(true);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setIsSavingProfile(false);
      Alert.alert("Not Signed In", "Please log in to update your profile.");
      return;
    }

    const userId = userData.user.id;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
      })
      .eq("id", userId);

    if (profileError) {
      setIsSavingProfile(false);
      Alert.alert("Profile Error", profileError.message);
      return;
    }

    const { error: workerProfileError } = await supabase
      .from("worker_profiles")
      .update({
        age: Number(age),
        bio,
        skills: selectedSkills,
        equipment: selectedEquipment,
        service_radius_miles: Number(serviceRadius),
      })
      .eq("id", userId);

    if (workerProfileError) {
      setIsSavingProfile(false);
      Alert.alert("Worker Profile Error", workerProfileError.message);
      return;
    }

    setIsSavingProfile(false);

    Alert.alert("Profile Updated", "Your worker profile was updated.", [
      {
        text: "Back to Home",
        onPress: () => router.push("/worker-home"),
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/worker-home")}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Edit Worker Profile</Text>

      <Text style={styles.subtitle}>
        Update your skills, equipment, service area, and experience.
      </Text>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Nathan"
        placeholderTextColor="#999"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: 20"
        placeholderTextColor="#999"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        maxLength={3}
      />

      <Text style={styles.label}>Short Bio</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Tell customers what kind of work you can help with."
        placeholderTextColor="#999"
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <Text style={styles.label}>Skills</Text>
      <Text style={styles.helperText}>Choose all that apply.</Text>

      <View style={styles.chipContainer}>
        {skillOptions.map((skill) => {
          const isSelected = selectedSkills.includes(skill);

          return (
            <TouchableOpacity
              key={skill}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggleSkill(skill)}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {skill}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Service Radius (Miles)</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: 10"
        placeholderTextColor="#999"
        value={serviceRadius}
        onChangeText={setServiceRadius}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Years of Experience</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: 1, 5, 10"
        placeholderTextColor="#999"
        value={experience}
        onChangeText={setExperience}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Equipment</Text>
      <Text style={styles.helperText}>Choose all that apply.</Text>

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

      <TouchableOpacity 
        style={styles.primaryButton} 
        onPress={handleUpdateProfile} 
        disabled={isSavingProfile}
      >
        <Text style={styles.buttonText}>
          {isSavingProfile ? "Updating..." : "Update Profile"}
        </Text>
      </TouchableOpacity>
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
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: "#1F7A4D",
  },

  subtitle: {
    fontSize: 17,
    textAlign: "center",
    color: "#555",
    lineHeight: 24,
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
});