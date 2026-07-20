import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

export default function LoginScreen() {
  const router = useRouter();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    if (!emailOrPhone || !password) {
      Alert.alert(
        "Missing Info",
        "Please enter your email and password."
      );
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailOrPhone,
      password,
    });

    if (error) {
      Alert.alert("Login Error", error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      Alert.alert("Login Error", "No user was found.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      Alert.alert("Profile Error", profileError.message);
      return;
    }

    if (profile.role === "customer") {
      router.replace("/customer-home");
      return;
    }

    if (profile.role === "worker") {
      router.replace("/worker-home");
      return;
    }

    if (profile.role === "both") {
      router.replace("/customer-home");
      return;
    }

    Alert.alert("Login Error", "Account role could not be recognized.");
  }

  return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/")}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Welcome Back</Text>

      <Text style={styles.subtitle}>
        Log in to continue managing your tasks, messages, schedule, and payments.
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor="#999"
        value={emailOrPhone}
        onChangeText={setEmailOrPhone}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.createAccountLink}
        onPress={() => router.push("/")}
      >
        <Text style={styles.createAccountText}>
          Don&apos;t have an account? Create one
        </Text>
      </TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#F7F7F7",
    justifyContent: "center",
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
    fontSize: 38,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1F7A4D",
    marginBottom: 12,
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

  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
  },

  primaryButton: {
    backgroundColor: "#111",
    padding: 18,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 18,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },

  createAccountLink: {
    padding: 12,
  },

  createAccountText: {
    color: "#1F7A4D",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});