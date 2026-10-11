import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";
import type { Role } from "@/lib/roles";
import { useAuth } from "./authContext";

type ProtectedRouteProps = {
  children: ReactNode;
  /** Omit to allow every signed-in role. */
  roles?: readonly Role[];
};

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") return <FullScreenLoader />;
  if (auth.status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(auth.user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
