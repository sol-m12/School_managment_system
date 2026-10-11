import { createContext, useContext } from "react";
import type { Role } from "@/lib/roles";
import type { AuthUser } from "./authApi";
import type { LoginValues } from "./loginSchema";

export type SessionUser = Omit<AuthUser, "role"> & { role: Role };

export type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: SessionUser };

export type AuthContextValue = AuthState & {
  login: (values: LoginValues) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}

export function useSessionUser(): SessionUser {
  const auth = useAuth();
  if (auth.status !== "authenticated") throw new Error("useSessionUser requires a signed-in user");
  return auth.user;
}
