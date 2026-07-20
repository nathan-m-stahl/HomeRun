import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

export default function EditCustomerProfileScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [missingFields, setMissingFields] = useState<string[]>([]);

  function isMissing(fieldName: string) {
    return missingFields.includes(fieldName);
  }

  function clearMissingField(fieldName: string) {
    setMissingFields((currentFields) =>
      currentFields.filter((field) => field !== fieldName)
    );
  }

  async function loadCustomerProfile() {
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
      .select("full_name, email")
      .eq("id", userId)
      .single();

    if (profileError) {
      Alert.alert("Profile Error", profileError.message);
      setIsLoadingProfile(false);
      return;
    }

    const { data: customerData, error: customerError } = await supabase
      .from("customer_profiles")
      .select("phone, address, notes")
      .eq("id", userId)
      .single();

    if (customerError) {
      Alert.alert("Customer Profile Error", customerError.message);
      setIsLoadingProfile(false);
      return;
    }

    setFullName(profileData?.full_name || "");
    setEmail(profileData?.email || "");
    setPhoneNumber(customerData?.phone || "");
    setAddress(customerData?.address || "");
    setCustomerNote(customerData?.notes || "");

    setIsLoadingProfile(false);
  }

  useEffect(() => {
    loadCustomerProfile();
  }, []);

  async function handleUpdateProfile() {
    const missing = [];

    if (!fullName) missing.push("fullName");
    if (!phoneNumber) missing.push("phoneNumber");
    if (!email) missing.push("email");
    if (!address) missing.push("address");

    setMissingFields(missing);

    if (missing.length > 0) {
      const fieldNames: Record<string, string> = {
        fullName: "Full Name",
        phoneNumber: "Phone Number",
        email: "Email",
        address: "Address",
      };

      Alert.alert(
        "Missing Required Fields",
        `Please complete the following:\n\n${missing
          .map((field) => fieldNames[field])
          .join("\n")}`
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
        email,
      })
      .eq("id", userId);

    if (profileError) {
      setIsSavingProfile(false);
      Alert.alert("Profile Error", profileError.message);
      return;
    }

    const { error: customerProfileError } = await supabase
      .from("customer_profiles")
      .update({
        phone: phoneNumber,
        address,
        notes: customerNote,
      })
      .eq("id", userId);

    if (customerProfileError) {
      setIsSavingProfile(false);
      Alert.alert("Customer Profile Error", customerProfileError.message);
      return;
    }

    setIsSavingProfile(false);

    Alert.alert("Profile Updated", "Your customer profile was updated.", [
      {
        text: "Back to Home",
        onPress: () => router.push("/customer-home"),
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

        <Text style={styles.title}>Edit Customer Profile</Text>

        <Text style={styles.subtitle}>
          Update your contact info, address, and notes workers may need to know.
        </Text>

        <Text
          style={[styles.label, isMissing("fullName") && styles.labelError]}
        >
          Full Name
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Example: John Smith"
          placeholderTextColor="#999"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            clearMissingField("fullName");
          }}
        />

        <Text
          style={[styles.label, isMissing("phoneNumber") && styles.labelError]}
        >
          Phone Number
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Example: 555-555-5555"
          placeholderTextColor="#999"
          value={phoneNumber}
          onChangeText={(text) => {
            setPhoneNumber(text);
            clearMissingField("phoneNumber");
          }}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, isMissing("email") && styles.labelError]}>
          Email
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Example: johnsmith@email.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            clearMissingField("email");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={[styles.label, isMissing("address") && styles.labelError]}>
          Address
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Example: 1234 Main St, Springfield, CO 80014"
          placeholderTextColor="#999"
          value={address}
          onChangeText={(text) => {
            setAddress(text);
            clearMissingField("address");
          }}
        />

        <Text style={styles.label}>Anything Workers Should Know?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Example: Gate code, parking info, pets, preferred contact method, etc."
          placeholderTextColor="#999"
          value={customerNote}
          onChangeText={setCustomerNote}
          multiline
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleUpdateProfile}
          disabled={isSavingProfile}
        >
          <Text style={styles.buttonText}>
            {isSavingProfile ? "Updating..." : "Update Profile"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/customer-home")}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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

  labelError: {
    color: "#B91C1C",
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

  primaryButton: {
    backgroundColor: "#111",
    padding: 18,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 16,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },

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
    fontWeight: "600",
    textAlign: "center",
  },
});