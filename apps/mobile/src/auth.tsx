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

type User = {
  id: string;
  username: string;
  email?: string;
  profile: { displayName: string; bio: string } | null;
};

type Credentials = { email: string; password: string };
type Registration = Credentials & { username: string; displayName: string };

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: Credentials) => Promise<void>;
  signUp: (details: Registration) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const tokenKey = "vig-insta-access-token";

async function getStoredToken() {
  if (Platform.OS === "web") return globalThis.localStorage.getItem(tokenKey);
  return SecureStore.getItemAsync(tokenKey);
}

async function setStoredToken(token: string) {
  if (Platform.OS === "web") {
    globalThis.localStorage.setItem(tokenKey, token);
    return;
  }
  await SecureStore.setItemAsync(tokenKey, token);
}

async function clearStoredToken() {
  if (Platform.OS === "web") {
    globalThis.localStorage.removeItem(tokenKey);
    return;
  }
  await SecureStore.deleteItemAsync(tokenKey);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) throw new Error("Set EXPO_PUBLIC_API_BASE_URL in apps/mobile/.env.");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await response.json()) as { data?: T; error?: string };
  if (!response.ok || body.data === undefined) {
    throw new Error(body.error ?? `Request failed (${response.status}).`);
  }
  return body.data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const token = await getStoredToken();
        if (!token) return;
        const restoredUser = await request<User>("/auth/me", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (active) {
          setAccessToken(token);
          setUser(restoredUser);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to restore session.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  async function authenticate(path: string, body: Credentials | Registration) {
    setError(null);
    const result = await request<{ user: User; accessToken: string }>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    await setStoredToken(result.accessToken);
    setAccessToken(result.accessToken);
    setUser(result.user);
  }

  async function signOut() {
    await clearStoredToken();
    setAccessToken(null);
    setUser(null);
    setError(null);
  }

  const value = useMemo(
    () => ({
      user,
      accessToken,
      loading,
      error,
      signIn: (credentials: Credentials) => authenticate("/auth/login", credentials),
      signUp: (details: Registration) => authenticate("/auth/register", details),
      signOut,
    }),
    [user, accessToken, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
