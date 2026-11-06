import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Socket, io } from "socket.io-client";
import { apiRequest, getApiOrigin } from "./api";
import { useAuth } from "./auth";
import { useTheme } from "./theme";

type IncomingMessage = {
  id: string;
  senderId: string;
  sender: { username: string };
};
type MessageNotice = { username: string };
type InboxConversation = {
  id: string;
  lastMessage: IncomingMessage | null;
};

const MessageNotificationContext = createContext<{
  joinConversation: (conversationId: string) => void;
} | null>(null);

export function MessageNotificationProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const { colors } = useTheme();
  const socketRef = useRef<Socket | null>(null);
  const joinedConversationIds = useRef(new Set<string>());
  const seenMessageIds = useRef(new Set<string>());
  const [notice, setNotice] = useState<MessageNotice | null>(null);

  const joinConversation = useCallback((conversationId: string) => {
    joinedConversationIds.current.add(conversationId);
    const socket = socketRef.current;
    if (socket?.connected) socket.emit("conversation:join", conversationId);
  }, []);

  useEffect(() => {
    if (!user || !accessToken) {
      setNotice(null);
      return;
    }

    const authenticatedUser = user;
    const token = accessToken;
    let active = true;
    let inboxErrorLogged = false;
    let hasInboxSnapshot = false;
    joinedConversationIds.current.clear();
    seenMessageIds.current.clear();

    const socket = io(getApiOrigin(), { auth: { token } });
    socketRef.current = socket;

    async function joinInboxConversations() {
      try {
        const conversations = await apiRequest<InboxConversation[]>("/conversations", token);
        if (!active) return;
        inboxErrorLogged = false;
        for (const conversation of conversations) {
          joinedConversationIds.current.add(conversation.id);
          if (socket.connected) socket.emit("conversation:join", conversation.id);
          const message = conversation.lastMessage;
          if (!message || seenMessageIds.current.has(message.id)) continue;
          seenMessageIds.current.add(message.id);
          if (hasInboxSnapshot && message.senderId !== authenticatedUser.id) {
            setNotice({ username: message.sender.username });
          }
        }
        hasInboxSnapshot = true;
      } catch (cause) {
        if (active && !inboxErrorLogged) {
          console.error("Unable to subscribe to conversation message popups.", cause);
          inboxErrorLogged = true;
        }
      }
    }

    socket.on("connect", () => {
      for (const conversationId of joinedConversationIds.current) {
        socket.emit("conversation:join", conversationId);
      }
      void joinInboxConversations();
    });
    socket.on("message:new", (message: IncomingMessage) => {
      if (message.senderId === authenticatedUser.id || seenMessageIds.current.has(message.id)) return;
      seenMessageIds.current.add(message.id);
      if (seenMessageIds.current.size > 200) {
        const oldestMessageId = seenMessageIds.current.values().next().value;
        if (oldestMessageId) seenMessageIds.current.delete(oldestMessageId);
      }
      setNotice({ username: message.sender.username });
    });

    const inboxTimer = setInterval(() => void joinInboxConversations(), 5000);
    return () => {
      active = false;
      clearInterval(inboxTimer);
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      joinedConversationIds.current.clear();
    };
  }, [accessToken, user]);

  return (
    <MessageNotificationContext.Provider value={{ joinConversation }}>
      {children}
      <Modal
        animationType="fade"
        onRequestClose={() => setNotice(null)}
        transparent
        visible={notice !== null}
      >
        <View style={styles.overlay}>
          <View accessibilityRole="alert" style={[styles.dialog, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>You got a message</Text>
            {notice ? (
              <Text style={[styles.sender, { color: colors.primary }]}>From @{notice.username}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setNotice(null)}
              style={[styles.button, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </MessageNotificationContext.Provider>
  );
}

export function useMessageNotifications() {
  const context = useContext(MessageNotificationContext);
  if (!context) throw new Error("useMessageNotifications must be used within MessageNotificationProvider.");
  return context;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.48)" },
  dialog: { width: "100%", maxWidth: 380, borderRadius: 20, padding: 24, elevation: 8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  title: { fontSize: 21, fontWeight: "800" },
  sender: { fontSize: 14, fontWeight: "700", marginTop: 16 },
  button: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, marginTop: 20 },
  buttonText: { fontSize: 15, fontWeight: "700" },
});
