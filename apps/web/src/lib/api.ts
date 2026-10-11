import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retried?: boolean;
  }
}

// The access token is kept in module memory only (never Web Storage).
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let refreshInFlight: Promise<string> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim() || "http://localhost:4000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh"];

/** Calls POST /auth/refresh once even if several requests ask at the same time. */
export function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= api
    .post<{ accessToken: string }>("/auth/refresh")
    .then((response) => {
      setAccessToken(response.data.accessToken);
      return response.data.accessToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError) || error.response?.status !== 401 || !error.config) {
      throw error;
    }
    const config: InternalAxiosRequestConfig = error.config;
    const path = config.url ?? "";
    if (config._retried || NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
      throw error;
    }

    config._retried = true;
    try {
      await refreshAccessToken();
    } catch {
      setAccessToken(null);
      onSessionExpired?.();
      throw error;
    }
    return api(config);
  },
);
