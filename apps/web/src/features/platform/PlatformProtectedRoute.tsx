import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";
import { usePlatformAuth } from "./platformAuthContext";

export function PlatformProtectedRoute({ children }: { children: ReactNode }) {
  const auth = usePlatformAuth();
  const location = useLocation();

  if (auth.status === "loading") return <FullScreenLoader />;
  if (auth.status === "anonymous") {
    return <Navigate to="/platform/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
