import { createContext, useContext } from "react";
import type { PlatformUser } from "./platformApi";

export type PlatformAuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: PlatformUser };

export type PlatformAuthContextValue = PlatformAuthState & {
  login: (values: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

export const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(null);

export function usePlatformAuth(): PlatformAuthContextValue {
  const value = useContext(PlatformAuthContext);
  if (!value) {
    throw new Error("usePlatformAuth must be used inside PlatformAuthProvider");
  }
  return value;
}
