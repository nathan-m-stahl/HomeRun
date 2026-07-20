import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function StartScreen() {
  const router = useRouter();

  function handleSocialLogin(provider: string) {
    Alert.alert(
      `${provider} Login`,
      `${provider} authentication will be connected later.`
    );
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
          Create an account or log in to book help, find work, and manage your jobs.
        </Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialLogin("Google")}
        >
          <Image
            source={require("../assets/images/googleLogo.png")}
            style={styles.socialLogo}
            />
          <Text style={styles.socialButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialLogin("Facebook")}
        >
          <Image
            source={require("../assets/images/facebookLogo.png")}
            style={styles.socialLogo}
            />
          <Text style={styles.socialButtonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocialLogin("Apple")}
        >
          <Text style={styles.socialIcon}></Text>
          <Text style={styles.socialButtonText}>Continue with Apple</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => Alert.alert("Phone Login", "Phone number login will be added later.")}
        >
          <Text style={styles.primaryButtonText}>Continue with Phone Number</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={styles.emailTextButton}
            onPress={() => Alert.alert("Email Login", "Email login will be added later.")}
            >
            <Text style={styles.emailTextButtonText}>Use email instead</Text>
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

  socialIcon: {
    fontSize: 28,
    width: 28,
    marginRight: 10,
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
    marginBottom: 12,
  },

  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  emailTextButton: {
    paddingVertical: 10,
    alignSelf: "center",
  },

    emailTextButtonText: {
    color: "#424242",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    textDecorationLine: "underline",
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