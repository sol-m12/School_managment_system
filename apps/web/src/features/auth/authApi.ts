import { api, refreshAccessToken, setAccessToken } from "@/lib/api";
import type { LoginValues } from "./loginSchema";

export type AuthUser = {
  id: number;
  username: string;
  role: string;
  tenantId: number;
  tenantName: string;
};

export async function loginRequest(values: LoginValues): Promise<AuthUser> {
  const { data } = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", values);
  setAccessToken(data.accessToken);
  return data.user;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<{ user: AuthUser }>("/auth/me");
  return data.user;
}

/** Restores a session from the refresh cookie. Rejects when there is none. */
export async function restoreSession(): Promise<AuthUser> {
  await refreshAccessToken();
  return fetchMe();
}

export async function logoutRequest(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}
