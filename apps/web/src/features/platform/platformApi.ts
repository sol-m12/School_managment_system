import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _platformRetried?: boolean;
  }
}

let platformAccessToken: string | null = null;
let onPlatformSessionExpired: (() => void) | null = null;
let platformRefreshInFlight: Promise<string> | null = null;

export function setPlatformAccessToken(token: string | null): void {
  platformAccessToken = token;
}

export function setPlatformSessionExpiredHandler(handler: (() => void) | null): void {
  onPlatformSessionExpired = handler;
}

export const platformApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim() || "http://localhost:4000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const NO_REFRESH_PATHS = ["/platform/auth/login", "/platform/auth/refresh"];

export function refreshPlatformAccessToken(): Promise<string> {
  platformRefreshInFlight ??= platformApi
    .post<{ accessToken: string }>("/platform/auth/refresh")
    .then((response) => {
      setPlatformAccessToken(response.data.accessToken);
      return response.data.accessToken;
    })
    .finally(() => {
      platformRefreshInFlight = null;
    });
  return platformRefreshInFlight;
}

platformApi.interceptors.request.use((config) => {
  if (platformAccessToken) {
    config.headers.set("Authorization", `Bearer ${platformAccessToken}`);
  }
  return config;
});

platformApi.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError) || error.response?.status !== 401 || !error.config) {
      throw error;
    }
    const config: InternalAxiosRequestConfig = error.config;
    const path = config.url ?? "";
    if (config._platformRetried || NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
      throw error;
    }

    config._platformRetried = true;
    try {
      await refreshPlatformAccessToken();
    } catch {
      setPlatformAccessToken(null);
      onPlatformSessionExpired?.();
      throw error;
    }
    return platformApi(config);
  },
);

export type PlatformUser = {
  id: number;
  username: string;
  displayName: string;
};

export type PlatformSchool = {
  id: number;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
};

export type CreatedSchool = {
  tenantId: number;
  name: string;
  slug: string;
  status: string;
  loginPath: string;
  adminUsername: string;
  adminRole: string;
};

export async function platformLoginRequest(values: {
  username: string;
  password: string;
}): Promise<PlatformUser> {
  const { data } = await platformApi.post<{ accessToken: string; user: PlatformUser }>(
    "/platform/auth/login",
    values,
  );
  setPlatformAccessToken(data.accessToken);
  return data.user;
}

export async function platformFetchMe(): Promise<PlatformUser> {
  const { data } = await platformApi.get<{ user: PlatformUser }>("/platform/auth/me");
  return data.user;
}

export async function platformRestoreSession(): Promise<PlatformUser> {
  await refreshPlatformAccessToken();
  return platformFetchMe();
}

export async function platformLogoutRequest(): Promise<void> {
  try {
    await platformApi.post("/platform/auth/logout");
  } finally {
    setPlatformAccessToken(null);
  }
}

export async function listPlatformSchools(): Promise<PlatformSchool[]> {
  const { data } = await platformApi.get<{ rows: PlatformSchool[] }>("/platform/schools");
  return data.rows;
}

export async function createPlatformSchool(body: {
  name: string;
  slug: string;
  adminUsername: string;
  adminPassword: string;
  adminFirstName?: string;
  adminLastName?: string;
}): Promise<CreatedSchool> {
  const { data } = await platformApi.post<{ school: CreatedSchool }>("/platform/schools", body);
  return data.school;
}
