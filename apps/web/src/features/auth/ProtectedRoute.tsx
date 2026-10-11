import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";
import { can, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { useAuth } from "./authContext";

type ProtectedRouteProps = {
  children: ReactNode;
  /** Omit to allow every signed-in role. */
  roles?: readonly Role[];
  /** When set, the user also needs this permission key. */
  permission?: Permission;
};

export function ProtectedRoute({ children, roles, permission }: ProtectedRouteProps) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") return <FullScreenLoader />;
  if (auth.status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (roles && !roles.includes(auth.user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (permission && !can(auth.user.permissions, permission)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
