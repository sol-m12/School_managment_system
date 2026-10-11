import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth, useSessionUser } from "@/features/auth/authContext";
import { cn } from "@/lib/cn";
import { menuForRole } from "@/navigation/menu";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

const DESKTOP_QUERY = "(min-width: 1024px)";

export function AppLayout() {
  const { t } = useTranslation("common");
  const user = useSessionUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const groups = useMemo(() => menuForRole(user.role), [user.role]);

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) setDesktopCollapsed((value) => !value);
    else setMobileOpen((value) => !value);
  }, []);

  const closeSidebar = useCallback(() => setMobileOpen(false), []);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const onLogout = useCallback(() => void handleLogout(), [handleLogout]);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas">
      <div
        aria-hidden="true"
        onClick={closeSidebar}
        className={cn(
          "fixed inset-0 z-[1040] bg-shell/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <Sidebar
        groups={groups}
        mobileOpen={mobileOpen}
        desktopCollapsed={desktopCollapsed}
        onClose={closeSidebar}
        onLogout={onLogout}
      />

      <div
        className={cn(
          "flex min-h-dvh min-w-0 flex-col transition-[margin] duration-300",
          desktopCollapsed ? "lg:ml-0" : "lg:ml-sidebar",
        )}
      >
        <Header
          user={user}
          sidebarOpen={mobileOpen || !desktopCollapsed}
          onToggleSidebar={toggleSidebar}
          onLogout={onLogout}
        />
        <main id="main-content" className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
