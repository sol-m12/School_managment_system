import { createContext, useCallback, useContext } from "react";
import { can, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import type { AuthUser } from "./authApi";
import type { LoginValues } from "./loginSchema";

export type SessionUser = Omit<AuthUser, "role" | "permissions"> & { role: Role; permissions: Permission[] };

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

/** `const can = useCan(); can("subjects.create")` — hides UI only; the API still checks. */
export function useCan(): (permission: Permission) => boolean {
  const { permissions } = useSessionUser();
  return useCallback((permission: Permission) => can(permissions, permission), [permissions]);
}
