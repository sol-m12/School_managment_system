import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  platformLoginRequest,
  platformLogoutRequest,
  platformRestoreSession,
  setPlatformAccessToken,
  setPlatformSessionExpiredHandler,
} from "./platformApi";
import {
  PlatformAuthContext,
  type PlatformAuthContextValue,
  type PlatformAuthState,
} from "./platformAuthContext";

const ANONYMOUS: PlatformAuthState = { status: "anonymous", user: null };

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PlatformAuthState>({ status: "loading", user: null });

  const clearSession = useCallback(() => {
    setPlatformAccessToken(null);
    queryClient.removeQueries({ queryKey: ["platform"] });
    setState(ANONYMOUS);
  }, [queryClient]);

  useEffect(() => {
    setPlatformSessionExpiredHandler(clearSession);
    return () => setPlatformSessionExpiredHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    platformRestoreSession()
      .then((user) => {
        if (!cancelled) setState({ status: "authenticated", user });
      })
      .catch(() => {
        if (!cancelled) {
          setPlatformAccessToken(null);
          setState(ANONYMOUS);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (values: { username: string; password: string }) => {
    const user = await platformLoginRequest(values);
    setState({ status: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await platformLogoutRequest();
    } catch {
      // Clear local session even if the server call fails.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<PlatformAuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}
