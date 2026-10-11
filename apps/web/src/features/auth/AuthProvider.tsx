import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAccessToken, setSessionExpiredHandler } from "@/lib/api";
import { isRole } from "@/lib/roles";
import { loginRequest, logoutRequest, restoreSession, type AuthUser } from "./authApi";
import { AuthContext, type AuthContextValue, type AuthState, type SessionUser } from "./authContext";
import type { LoginValues } from "./loginSchema";

class UnknownRoleError extends Error {}

function toSessionUser(user: AuthUser): SessionUser {
  if (!isRole(user.role)) throw new UnknownRoleError();
  return { ...user, role: user.role };
}

const ANONYMOUS: AuthState = { status: "anonymous", user: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const clearSession = useCallback(() => {
    setAccessToken(null);
    queryClient.clear();
    setState(ANONYMOUS);
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(clearSession);
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    restoreSession()
      .then((user) => {
        if (!cancelled) setState({ status: "authenticated", user: toSessionUser(user) });
      })
      .catch(() => {
        if (!cancelled) {
          setAccessToken(null);
          setState(ANONYMOUS);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (values: LoginValues) => {
    const user = await loginRequest(values);
    setState({ status: "authenticated", user: toSessionUser(user) });
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // The local session is cleared even if the server call fails.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(() => ({ ...state, login, logout }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
