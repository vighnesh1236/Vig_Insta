import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme";

type FeedPost = {
  id: string;
  caption: string;
  createdAt: string;
  author: { username: string; profile: { displayName: string | null } | null };
  media: { id: string; url: string; type: string }[];
  _count: { likes: number; comments: number };
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export default function HomeScreen() {
  const { colors } = useTheme();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadFeed() {
      if (!apiBaseUrl) {
        setError("Set EXPO_PUBLIC_API_BASE_URL to connect to the Vig_Insta API.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${apiBaseUrl}/posts?mediaType=IMAGE`);
        if (!response.ok) throw new Error(`Feed request failed (${response.status}).`);
        const result = (await response.json()) as { data: FeedPost[] };
        if (active) setPosts(result.data);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load the feed.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadFeed();
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.brand, { color: colors.text }]}>Vig_Insta</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Messages" onPress={() => router.push("/messages")}>
          <Ionicons name="paper-plane-outline" size={23} color={colors.text} />
        </Pressable>
      </View>
      <View style={[styles.stories, { borderBottomColor: colors.border }]}>
        <View style={[styles.storyRing, { borderColor: colors.border }]}>
          <Ionicons name="add" size={25} color={colors.primary} />
        </View>
        <Text style={[styles.storyLabel, { color: colors.muted }]}>Your story</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={styles.state} color={colors.primary} />
      ) : error ? (
        <View style={styles.state}>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Feed unavailable</Text>
          <Text style={[styles.stateText, { color: colors.muted }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(post) => post.id}
          contentContainerStyle={posts.length ? styles.feed : styles.state}
          ListEmptyComponent={
            <View>
              <Text style={[styles.stateTitle, { color: colors.text }]}>Your feed starts here</Text>
              <Text style={[styles.stateText, { color: colors.muted }]}>
                Follow creators and share a post to bring your community to life.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.post, { borderColor: colors.border }]}>
              <Text style={[styles.username, { color: colors.text }]}>@{item.author.username}</Text>
              {item.media[0]?.url ? (
                <Image
                  contentFit="cover"
                  source={{ uri: item.media[0].url }}
                  style={styles.postImage}
                />
              ) : null}
              <Text style={[styles.caption, { color: colors.text }]}>{item.caption}</Text>
              <View style={styles.postActions}>
                <Ionicons name="heart-outline" size={21} color={colors.text} />
                <Text style={[styles.actionCount, { color: colors.muted }]}>{item._count.likes}</Text>
                <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
                <Text style={[styles.actionCount, { color: colors.muted }]}>{item._count.comments}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 24, fontWeight: "800", letterSpacing: -0.8, color: "#201E2B" },
  stories: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EFF4",
  },
  storyRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: "#DAD6E8",
    alignItems: "center",
    justifyContent: "center",
  },
  storyLabel: { marginTop: 5, fontSize: 11, color: "#555263" },
  feed: { paddingBottom: 24 },
  post: { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderColor: "#F0EFF4" },
  postImage: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: "#F0EFF4", marginBottom: 10 },
  username: { fontWeight: "700", color: "#201E2B", marginBottom: 8 },
  caption: { fontSize: 15, lineHeight: 22, color: "#393744" },
  postActions: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
  actionCount: { marginRight: 10, fontSize: 12, color: "#77758A" },
  state: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  stateTitle: { fontSize: 18, fontWeight: "700", color: "#201E2B", textAlign: "center" },
  stateText: { marginTop: 7, color: "#77758A", lineHeight: 20, textAlign: "center" },
});
