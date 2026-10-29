import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../src/auth";
import { useTheme } from "../src/theme";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { colors } = useTheme();
  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (registering) {
        await signUp({ username, displayName, email, password });
      } else {
        await signIn({ email, password });
      }
      router.replace("/(tabs)/profile");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.back, { color: colors.primary }]}>Back</Text>
        </Pressable>
        <View style={styles.form}>
          <Text style={[styles.brand, { color: colors.primary }]}>Vig_Insta</Text>
          <Text style={[styles.heading, { color: colors.text }]}>{registering ? "Join the community" : "Welcome back"}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {registering ? "Create your account to start sharing." : "Sign in to continue to your feed."}
          </Text>
          {registering && (
            <>
              <TextInput
                autoCapitalize="none"
                autoComplete="username"
                onChangeText={setUsername}
                placeholder="Username"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                value={username}
              />
              <TextInput
                autoComplete="name"
                onChangeText={setDisplayName}
                placeholder="Display name"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                value={displayName}
              />
            </>
          )}
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={email}
          />
          <TextInput
            autoComplete={registering ? "new-password" : "current-password"}
            onChangeText={setPassword}
            placeholder="Password (12+ characters)"
            secureTextEntry
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={password}
          />
          {error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text>}
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void submit()}
            style={[styles.submit, { backgroundColor: colors.primary }, submitting && styles.disabled]}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={[styles.submitText, { color: colors.onPrimary }]}>{registering ? "Create account" : "Sign in"}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => { setError(null); setRegistering((value) => !value); }}>
            <Text style={[styles.toggle, { color: colors.primary }]}>
              {registering ? "Already have an account? Sign in" : "New to Vig_Insta? Create an account"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  page: { flex: 1, paddingHorizontal: 24 },
  back: { color: "#6C4CF1", fontWeight: "700", paddingVertical: 12 },
  form: { flex: 1, justifyContent: "center", paddingBottom: 56 },
  brand: { color: "#6C4CF1", fontWeight: "800", fontSize: 16 },
  heading: { color: "#201E2B", fontWeight: "800", fontSize: 29, marginTop: 12 },
  subtitle: { color: "#77758A", marginTop: 6, marginBottom: 24, lineHeight: 20 },
  input: {
    height: 52,
    backgroundColor: "#F7F6FA",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 12,
    color: "#201E2B",
  },
  error: { color: "#B42318", marginBottom: 12, lineHeight: 19 },
  submit: {
    height: 52,
    backgroundColor: "#6C4CF1",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  disabled: { opacity: 0.65 },
  submitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  toggle: { textAlign: "center", color: "#6C4CF1", fontWeight: "600", marginTop: 20 },
});
