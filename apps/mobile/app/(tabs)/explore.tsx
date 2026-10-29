import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../src/theme";

export default function ExploreScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Explore</Text>
      <Text style={[styles.body, { color: colors.muted }]}>Discover people and posts as the community grows.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, backgroundColor: "#FFFFFF" },
  heading: { fontSize: 26, fontWeight: "800", color: "#201E2B" },
  body: { marginTop: 8, color: "#77758A", textAlign: "center" },
});
