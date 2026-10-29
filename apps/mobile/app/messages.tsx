import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "../src/api";
import { useAuth } from "../src/auth";
import { useTheme } from "../src/theme";

type Person = { id: string; username: string; profile: { displayName: string | null } | null };
type Message = { id: string; body: string; createdAt: string };
type Conversation = {
  id: string;
  members: Person[];
  lastMessage: (Message & { sender: { username: string } }) | null;
  updatedAt: string;
};

export default function MessagesScreen() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const rows = await apiRequest<Conversation[]>("/conversations", accessToken);
      setConversations(rows);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load conversations.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    void loadConversations();
    const timer = setInterval(() => void loadConversations(), 5000);
    return () => clearInterval(timer);
  }, [accessToken, loadConversations]);

  async function startConversation() {
    if (!accessToken) return;
    setStarting(true);
    setError(null);
    try {
      const conversation = await apiRequest<{ id: string }>("/conversations", accessToken, {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      router.push({ pathname: "/conversations/[conversationId]", params: { conversationId: conversation.id } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start conversation.");
    } finally {
      setStarting(false);
    }
  }

  const pageStyle = [styles.page, { backgroundColor: colors.background }];
  if (authLoading || loading) {
    return <ActivityIndicator style={pageStyle} color={colors.primary} />;
  }

  if (!user || !accessToken) {
    return (
      <SafeAreaView style={pageStyle}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        </Pressable>
        <View style={styles.empty}>
          <Text style={[styles.body, { color: colors.muted }]}>Sign in to see your conversations and send messages.</Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push("/auth")}>
            <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={pageStyle}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={[styles.newMessage, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          autoCapitalize="none"
          onChangeText={setUsername}
          onSubmitEditing={() => void startConversation()}
          placeholder="Start a chat by username"
          placeholderTextColor={colors.muted}
          returnKeyType="send"
          style={[styles.input, { color: colors.text }]}
          value={username}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start conversation"
          disabled={!username.trim() || starting}
          onPress={() => void startConversation()}
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
        >
          {starting ? <ActivityIndicator size="small" color={colors.onPrimary} /> : (
            <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
          )}
        </Pressable>
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={conversations.length ? styles.list : styles.empty}
        ListEmptyComponent={
          <Text style={[styles.body, { color: colors.muted }]}>
            No messages yet. Enter someone’s username above to start a conversation.
          </Text>
        }
        renderItem={({ item }) => {
          const other = item.members.find((member) => member.id !== user.id);
          if (!other) return null;
          return (
            <Pressable
              onPress={() => router.push({
                pathname: "/conversations/[conversationId]",
                params: { conversationId: item.id },
              })}
              style={[styles.conversation, { borderBottomColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(other.profile?.displayName || other.username).slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.conversationText}>
                <Text style={[styles.username, { color: colors.text }]}>
                  {other.profile?.displayName || `@${other.username}`}
                </Text>
                <Text numberOfLines={1} style={[styles.preview, { color: colors.muted }]}>
                  {item.lastMessage?.body ?? "Conversation started"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  back: { height: 54, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: "800" },
  newMessage: { flexDirection: "row", alignItems: "center", margin: 16, padding: 5, borderWidth: 1, borderRadius: 14 },
  input: { flex: 1, height: 44, paddingHorizontal: 12, fontSize: 14 },
  sendButton: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  error: { marginHorizontal: 20, marginBottom: 10, lineHeight: 20 },
  list: { paddingHorizontal: 16 },
  conversation: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 13 },
  avatarText: { fontSize: 19, fontWeight: "700" },
  conversationText: { flex: 1 },
  username: { fontSize: 15, fontWeight: "700" },
  preview: { fontSize: 13, marginTop: 4 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  body: { textAlign: "center", lineHeight: 21 },
  primaryButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryButtonText: { fontWeight: "700" },
});
