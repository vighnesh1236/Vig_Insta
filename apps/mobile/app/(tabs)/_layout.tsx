import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTheme } from "../../src/theme";

const icons = {
  index: "home-outline",
  explore: "search-outline",
  create: "add-circle-outline",
  reels: "play-circle-outline",
  profile: "person-circle-outline",
} as const;

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 62,
          paddingTop: 7,
          paddingBottom: 8,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={icons[route.name as keyof typeof icons] ?? "ellipse-outline"}
            color={typeof color === "string" ? color : colors.muted}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="create" options={{ title: "Create" }} />
      <Tabs.Screen name="reels" options={{ title: "Reels" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
