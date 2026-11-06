import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/auth";
import { useTheme } from "../../src/theme";

export default function ProfileScreen() {
  const { user, loading, error: sessionError, signOut } = useAuth();
  const { mode, colors, toggleTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const appUrl = process.env.EXPO_PUBLIC_APP_URL ||
    (Platform.OS === "web" && typeof globalThis.location !== "undefined"
      ? globalThis.location.origin
      : null);
  const qrUrl = appUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&data=${encodeURIComponent(appUrl)}`
    : null;

  if (loading) return <ActivityIndicator style={[styles.page, { backgroundColor: colors.background }]} color={colors.primary} />;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: mode === "dark" }}
        onPress={toggleTheme}
        style={[styles.themeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Text style={[styles.themeButtonText, { color: colors.text }]}>
          {mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        </Text>
      </Pressable>
      {user ? (
        <>
          <Text style={[styles.heading, { color: colors.text }]}>{user.profile?.displayName || user.username}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>@{user.username}</Text>
          {user.profile?.bio ? <Text style={[styles.body, { color: colors.muted }]}>{user.profile.bio}</Text> : null}
          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={() => void signOut().catch((cause: unknown) =>
              setError(cause instanceof Error ? cause.message : "Unable to sign out."),
            )}
            style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={[styles.logoutButtonText, { color: colors.error }]}>Log out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.heading, { color: colors.text }]}>Your profile</Text>
          {sessionError ? <Text style={[styles.error, { color: colors.error }]}>{sessionError}</Text> : null}
          <Text style={[styles.body, { color: colors.muted }]}>Sign in to set up your profile and connect with others.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/auth")} style={styles.button}>
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Sign in or create account</Text>
          </Pressable>
        </>
      )}
      <View style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.qrHeading, { color: colors.text }]}>Share Vig_Insta</Text>
        {qrUrl && appUrl ? (
          <>
            <Text style={[styles.qrBody, { color: colors.muted }]}>Scan this QR code to open the app</Text>
            <Image
              accessibilityLabel="QR code linking to Vig_Insta"
              contentFit="contain"
              source={{ uri: qrUrl }}
              style={styles.qrImage}
            />
            <Text selectable style={[styles.qrLink, { color: colors.primary }]}>{appUrl}</Text>
          </>
        ) : (
          <Text style={[styles.qrBody, { color: colors.muted }]}>
            Set EXPO_PUBLIC_APP_URL to your deployed app URL to enable its QR code.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, backgroundColor: "#FFFFFF" },
  heading: { fontSize: 26, fontWeight: "800", color: "#201E2B" },
  body: { marginTop: 8, color: "#77758A", textAlign: "center" },
  error: { marginTop: 12, color: "#B42318", textAlign: "center" },
  button: { marginTop: 22, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, backgroundColor: "#6C4CF1" },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
  logoutButton: { minHeight: 46, marginTop: 22, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  logoutButtonText: { fontWeight: "700", fontSize: 15 },
  themeButton: { position: "absolute", top: 24, right: 20, zIndex: 1, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderRadius: 20 },
  themeButtonText: { fontWeight: "600", fontSize: 13 },
  qrCard: { alignItems: "center", marginTop: 28, padding: 18, borderRadius: 18, borderWidth: 1 },
  qrHeading: { fontSize: 18, fontWeight: "800" },
  qrBody: { marginTop: 5, fontSize: 13 },
  qrImage: { width: 200, height: 200, marginTop: 12, backgroundColor: "#FFFFFF" },
  qrLink: { marginTop: 8, fontSize: 12, textAlign: "center" },
});
