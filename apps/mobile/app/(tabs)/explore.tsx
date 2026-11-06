import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "../../src/api";
import { useAuth } from "../../src/auth";
import { useTheme } from "../../src/theme";

type Person = {
  id: string;
  username: string;
  profile: { displayName: string; avatarUrl: string | null } | null;
};

export default function ExploreScreen() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingConversation, setStartingConversation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) {
      setPeople([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      const query = search.trim();
      const path = query ? `/users?search=${encodeURIComponent(query)}` : "/users";
      void apiRequest<Person[]>(path, accessToken)
        .then((results) => {
          if (active) {
            setPeople(results);
            setError(null);
          }
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : "Unable to discover people.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [accessToken, authLoading, search]);

  async function messagePerson(person: Person) {
    if (!accessToken || startingConversation) return;
    setStartingConversation(person.id);
    setError(null);
    try {
      const conversation = await apiRequest<{ id: string }>("/conversations", accessToken, {
        method: "POST",
        body: JSON.stringify({ username: person.username }),
      });
      router.push({
        pathname: "/conversations/[conversationId]",
        params: { conversationId: conversation.id },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start conversation.");
    } finally {
      setStartingConversation(null);
    }
  }

  const pageStyle = [styles.page, { backgroundColor: colors.background }];
  if (authLoading) return <ActivityIndicator style={pageStyle} color={colors.primary} />;

  if (!user || !accessToken) {
    return (
      <SafeAreaView style={pageStyle}>
        <Text style={[styles.heading, { color: colors.text }]}>Discover people</Text>
        <View style={styles.signInPrompt}>
          <Text style={[styles.body, { color: colors.muted }]}>Sign in to find people and start conversations.</Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => router.push("/auth")}>
            <Text style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={pageStyle}>
      <Text style={[styles.heading, { color: colors.text }]}>Discover people</Text>
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={19} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search people"
          autoCapitalize="none"
          onChangeText={setSearch}
          placeholder="Search by name or username"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
        />
        {search ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={19} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(person) => person.id}
          contentContainerStyle={people.length ? styles.list : styles.empty}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[styles.body, { color: colors.muted }]}>
              {error ? "People could not be loaded." : search.trim() ? "No people found. Try another name or username." : "No other accounts to show yet."}
            </Text>
          }
          renderItem={({ item }) => {
            const name = item.profile?.displayName || item.username;
            return (
              <View style={[styles.personRow, { borderBottomColor: colors.border }]}>
                {item.profile?.avatarUrl ? (
                  <Image source={{ uri: item.profile.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>{name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.personDetails}>
                  <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
                  <Text style={[styles.username, { color: colors.muted }]}>@{item.username}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${name}`}
                  disabled={startingConversation !== null}
                  onPress={() => void messagePerson(item)}
                  style={[styles.messageButton, { borderColor: colors.border }]}
                >
                  {startingConversation === item.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={[styles.messageButtonText, { color: colors.primary }]}>Message</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  heading: { fontSize: 26, fontWeight: "800", marginHorizontal: 20, marginTop: 12, marginBottom: 16 },
  searchBox: { minHeight: 48, borderWidth: 1, borderRadius: 14, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, minHeight: 46, fontSize: 15 },
  error: { marginHorizontal: 20, marginVertical: 8, lineHeight: 20 },
  loader: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  personRow: { minHeight: 76, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 19, fontWeight: "700" },
  personDetails: { flex: 1, marginLeft: 13 },
  name: { fontSize: 15, fontWeight: "700" },
  username: { fontSize: 13, marginTop: 4 },
  messageButton: { minWidth: 82, minHeight: 36, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  messageButtonText: { fontSize: 13, fontWeight: "700" },
  empty: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  body: { textAlign: "center", lineHeight: 21 },
  signInPrompt: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  primaryButton: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryButtonText: { fontWeight: "700" },
});
