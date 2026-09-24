import { supabase } from "@/lib/supabase";
import { makeRedirectUri } from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function StartScreen() {
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);

    // "homerun" must match the "scheme" value in app.json, or the redirect
    // back into the app after Google's login page won't resolve.
    const redirectTo = makeRedirectUri({ scheme: "homerun" });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      setIsGoogleLoading(false);
      Alert.alert(
        "Google Sign-In Error",
        error?.message || "Could not start Google sign-in."
      );
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== "success" || !result.url) {
      setIsGoogleLoading(false);
      return; // user closed the browser sheet — not an error
    }

    const url = new URL(result.url);
    const fragment = url.hash ? url.hash.replace("#", "") : url.search.replace("?", "");
    const params = new URLSearchParams(fragment);

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) {
      setIsGoogleLoading(false);
      Alert.alert("Google Sign-In Error", "Could not complete sign-in.");
      return;
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.setSession({ access_token, refresh_token });

    if (sessionError || !sessionData.user) {
      setIsGoogleLoading(false);
      Alert.alert(
        "Google Sign-In Error",
        sessionError?.message || "Could not complete sign-in."
      );
      return;
    }

    // Google sign-in doesn't collect customer/worker the way the email
    // signup forms do. A brand-new Google user has no profiles row yet —
    // route them somewhere that picks a role before setting one up.
    // NOTE: that screen doesn't exist yet — see the message below this file.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", sessionData.user.id)
      .maybeSingle();

    setIsGoogleLoading(false);

    if (!profile) {
      router.replace("/choose-role");
      return;
    }

    if (profile.role === "worker") {
      router.replace("/worker-home");
      return;
    }

    router.replace("/customer-home");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.push("/")}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.logoText}>HomeRun</Text>
        <Text style={styles.title}>Let&apos;s get started</Text>
        <Text style={styles.subtitle}>
          Continue with Google, or log in with email below.
        </Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={[styles.socialButton, isGoogleLoading && styles.disabledButton]}
          onPress={handleGoogleLogin}
          disabled={isGoogleLoading}
        >
          <Image
            source={require("../assets/images/googleLogo.png")}
            style={styles.socialLogo}
          />
          <Text style={styles.socialButtonText}>
            {isGoogleLoading ? "Connecting..." : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.primaryButtonText}>Log In with Email</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.accountOptions}>
        <Text style={styles.optionText}>New to HomeRun?</Text>

        <View style={styles.optionRow}>
          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => router.push("/customer")}
          >
            <Text style={styles.optionButtonText}>Create Customer Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionButton}
            onPress={() => router.push("/worker")}
          >
            <Text style={styles.optionButtonText}>Become a Worker</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.termsText}>
        By continuing, you agree to HomeRun&apos;s{" "}
        <Text
          style={styles.termsLink}
          onPress={() => router.push("/privacy-policy")}
        >
          Privacy Policy.
        </Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 70,
    backgroundColor: "#F7F7F7",
  },

  backButton: {
    marginBottom: 24,
  },

  backButtonText: {
    color: "#1F7A4D",
    fontSize: 17,
    fontWeight: "700",
  },

  header: {
    alignItems: "center",
    marginBottom: 26,
  },

  logoText: {
    color: "#1F7A4D",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
    letterSpacing: 1,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#111",
    textAlign: "center",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    lineHeight: 23,
  },

  card: {
    backgroundColor: "#c9ebc4",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  socialButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  socialButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginRight: 38,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },

  dividerText: {
    color: "#777",
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 12,
  },

  primaryButton: {
    backgroundColor: "#1F7A4D",
    padding: 16,
    borderRadius: 14,
    marginBottom: 4,
  },

  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  accountOptions: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    marginBottom: 20,
  },

  optionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#555",
    textAlign: "center",
    marginBottom: 12,
  },

  optionRow: {
    gap: 10,
  },

  optionButton: {
    backgroundColor: "#F7F7F7",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD",
  },

  optionButtonText: {
    color: "#1F7A4D",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  termsText: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 30,
  },

  socialLogo: {
    width: 26,
    height: 26,
    resizeMode: "contain",
    marginRight: 12,
  },

  termsLink: {
    color: "#484949",
    textDecorationLine: "underline",
    fontWeight: "700",
  },
});
