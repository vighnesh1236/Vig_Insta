import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme";

type Reel = {
  id: string;
  caption: string;
  media: { id: string; url: string; type: string }[];
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

function ReelCard({ item, colors }: { item: Reel; colors: ReturnType<typeof useTheme>["colors"] }) {
  const mediaUrl = item.media[0]?.url;
  const player = useVideoPlayer(mediaUrl ?? null, (videoPlayer) => {
    videoPlayer.loop = true;
  });
  const [title, ...credits] = item.caption.split("\n");

  if (!mediaUrl) return null;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
      />
      <View style={styles.caption}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {credits.slice(0, 3).map((line, index) => (
          <Text key={`${item.id}-${index}`} style={[styles.credit, { color: colors.muted }]}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const { colors } = useTheme();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadReels() {
      if (!apiBaseUrl) {
        setError("Set EXPO_PUBLIC_API_BASE_URL to connect to the Vig_Insta API.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${apiBaseUrl}/posts?mediaType=VIDEO`);
        if (!response.ok) throw new Error(`Reels request failed (${response.status}).`);
        const result = (await response.json()) as { data: Reel[] };
        if (active) setReels(result.data);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load Reels.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadReels();
    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Reels</Text>
      {loading ? (
        <ActivityIndicator style={styles.state} color={colors.primary} />
      ) : error ? (
        <View style={styles.state}>
          <Text style={[styles.body, { color: colors.error }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={reels.length ? styles.list : styles.state}
          ListEmptyComponent={
            <Text style={[styles.body, { color: colors.muted }]}>
              No Reels yet. When creators share videos, they’ll show up here.
            </Text>
          }
          renderItem={({ item }) => <ReelCard item={item} colors={colors} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  heading: { fontSize: 24, fontWeight: "800", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 },
  list: { padding: 14, gap: 18 },
  card: { overflow: "hidden", borderWidth: 1, borderRadius: 16 },
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#08080A" },
  caption: { padding: 13, gap: 4 },
  title: { fontWeight: "700", fontSize: 15 },
  credit: { fontSize: 11, lineHeight: 16 },
  state: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  body: { textAlign: "center", lineHeight: 21 },
});
