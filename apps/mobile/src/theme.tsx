import * as SecureStore from "expo-secure-store";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";

export type ThemeMode = "light" | "dark";
export type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  subtle: string;
  primary: string;
  onPrimary: string;
  error: string;
  receivedBubble: string;
};

const palettes: Record<ThemeMode, ThemeColors> = {
  light: {
    background: "#FFFFFF",
    surface: "#F7F6FA",
    text: "#201E2B",
    muted: "#77758A",
    border: "#ECEAF2",
    subtle: "#F0EFF4",
    primary: "#6C4CF1",
    onPrimary: "#FFFFFF",
    error: "#B42318",
    receivedBubble: "#F0EFF4",
  },
  dark: {
    background: "#101014",
    surface: "#1A1921",
    text: "#F5F3FA",
    muted: "#AAA6B8",
    border: "#302D39",
    subtle: "#25232C",
    primary: "#A18BFF",
    onPrimary: "#17131F",
    error: "#FF8D86",
    receivedBubble: "#292732",
  },
};

const storageKey = "vig-insta-theme";
const ThemeContext = createContext<{
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
} | null>(null);

async function loadMode(): Promise<ThemeMode | null> {
  const stored = Platform.OS === "web"
    ? globalThis.localStorage.getItem(storageKey)
    : await SecureStore.getItemAsync(storageKey);
  return stored === "light" || stored === "dark" ? stored : null;
}

async function persistMode(mode: ThemeMode) {
  if (Platform.OS === "web") {
    globalThis.localStorage.setItem(storageKey, mode);
  } else {
    await SecureStore.setItemAsync(storageKey, mode);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    let active = true;
    void loadMode().then((saved) => {
      if (active && saved) setMode(saved);
    }).catch((cause: unknown) => {
      console.error("Unable to load saved theme preference.", cause);
    });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({
    mode,
    colors: palettes[mode],
    toggleTheme: () => {
      const next = mode === "light" ? "dark" : "light";
      setMode(next);
      void persistMode(next).catch((cause: unknown) => {
        console.error("Unable to save theme preference.", cause);
      });
    },
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider.");
  return context;
}
