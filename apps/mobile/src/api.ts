const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export async function apiRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("Set EXPO_PUBLIC_API_BASE_URL in apps/mobile/.env.");
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  const result = (await response.json()) as { data?: T; error?: string };
  if (!response.ok || result.data === undefined) {
    throw new Error(result.error ?? `Request failed (${response.status}).`);
  }
  return result.data;
}
