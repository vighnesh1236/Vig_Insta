import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest, getApiOrigin } from "../../src/api";
import { useAuth } from "../../src/auth";
import { useMessageNotifications } from "../../src/message-notifications";
import { useTheme } from "../../src/theme";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender: { id: string; username: string };
};
type ConversationRow = {
  id: string;
  members: { id: string; username: string; profile: { displayName: string | null } | null }[];
};

function mergeMessages(current: Message[], incoming: Message[]) {
  const messages = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort((first, second) =>
    first.createdAt.localeCompare(second.createdAt) || first.id.localeCompare(second.id),
  );
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { joinConversation } = useMessageNotifications();
  const { colors } = useTheme();
  const listRef = useRef<FlatList<Message>>(null);
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");

  const loadMessages = useCallback(async () => {
    if (!accessToken || !conversationId) return;
    try {
      const [rows, chats] = await Promise.all([
        apiRequest<Message[]>(`/conversations/${conversationId}/messages`, accessToken),
        apiRequest<ConversationRow[]>("/conversations", accessToken),
      ]);
      setMessages((current) => mergeMessages(current, rows));
      setConversation(chats.find((chat) => chat.id === conversationId) ?? null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, conversationId]);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    void loadMessages();
    const timer = setInterval(() => {
      if (realtimeStatus !== "connected") void loadMessages();
    }, 2500);
    return () => clearInterval(timer);
  }, [accessToken, loadMessages, realtimeStatus]);

  useEffect(() => {
    if (!accessToken || !conversationId) return;
    joinConversation(conversationId);
    const socket = io(getApiOrigin(), { auth: { token: accessToken } });
    setRealtimeStatus("connecting");
    socket.on("connect", () => {
      setRealtimeStatus("connected");
      socket.emit("conversation:join", conversationId);
      void loadMessages();
    });
    socket.on("disconnect", () => setRealtimeStatus("offline"));
    socket.on("connect_error", () => setRealtimeStatus("offline"));
    socket.on("conversation:error", (message: string) => setError(message));
    socket.on("message:new", (message: Message) => {
      setMessages((current) => mergeMessages(current, [message]));
    });
    return () => {
      socket.disconnect();
    };
  }, [accessToken, conversationId, joinConversation, loadMessages]);

  async function sendMessage() {
    const body = text.trim();
    if (!accessToken || !body || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await apiRequest<Message>(`/conversations/${conversationId}/messages`, accessToken, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setMessages((current) => mergeMessages(current, [message]));
      setText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  if (authLoading || loading) return <ActivityIndicator style={styles.center} color={colors.primary} />;
  if (!user || !accessToken) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.muted }}>Sign in to view your messages.</Text>
        <Pressable onPress={() => router.push("/auth")} style={[styles.sendButton, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>Sign in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const other = conversation?.members.find((member) => member.id !== user.id);
  return (
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to messages" onPress={() => router.replace("/messages")}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {other?.profile?.displayName || (other ? `@${other.username}` : "Conversation")}
        </Text>
        <View style={{ width: 22 }} />
      </View>
      <Text style={[styles.connectionStatus, { color: realtimeStatus === "connected" ? colors.primary : colors.muted }]}>
        {realtimeStatus === "connected"
          ? "Live updates connected"
          : "Live updates unavailable · checking periodically"}
      </Text>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      <FlatList
        data={messages}
        keyExtractor={(message) => message.id}
        contentContainerStyle={messages.length ? styles.messageList : styles.messageEmpty}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ref={listRef}
        ListEmptyComponent={<Text style={{ color: colors.muted }}>Send a message to start the conversation.</Text>}
        renderItem={({ item }) => {
          const own = item.senderId === user.id;
          return (
            <View style={[styles.messageRow, own ? styles.ownRow : styles.otherRow]}>
              <Text style={[
                styles.messageBubble,
                { backgroundColor: own ? colors.primary : colors.receivedBubble, color: own ? colors.onPrimary : colors.text },
              ]}>
                {item.body}
              </Text>
            </View>
          );
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.composer, { borderTopColor: colors.border }]}>
          <TextInput
            multiline
            onChangeText={setText}
            onSubmitEditing={() => void sendMessage()}
            placeholder="Write a message..."
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={text}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={!text.trim() || sending}
            onPress={() => void sendMessage()}
            style={[styles.sendButton, { backgroundColor: colors.primary, opacity: text.trim() ? 1 : 0.6 }]}
          >
            {sending ? <ActivityIndicator size="small" color={colors.onPrimary} /> : (
              <Ionicons name="send" size={18} color={colors.onPrimary} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  header: { height: 54, borderBottomWidth: 1, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  connectionStatus: { paddingHorizontal: 18, paddingTop: 7, fontSize: 12 },
  error: { paddingHorizontal: 18, paddingTop: 8 },
  messageList: { padding: 16, gap: 10 },
  messageEmpty: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  messageRow: { width: "100%", flexDirection: "row" },
  ownRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  messageBubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, overflow: "hidden", fontSize: 15, lineHeight: 21 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 9, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 11 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
