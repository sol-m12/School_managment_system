import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth, useSessionUser } from "@/features/auth/authContext";
import { cn } from "@/lib/cn";
import { menuForUser } from "@/navigation/menu";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

const DESKTOP_QUERY = "(min-width: 992px)";

export function AppLayout() {
  const { t } = useTranslation("common");
  const user = useSessionUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const groups = useMemo(
    () => menuForUser({ role: user.role, permissions: user.permissions }),
    [user.role, user.permissions],
  );

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
          "fixed inset-0 z-[1040] bg-shell/60 backdrop-blur-sm transition-opacity duration-300 min-[992px]:hidden",
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
          desktopCollapsed ? "min-[992px]:ml-0" : "min-[992px]:ml-sidebar",
        )}
      >
        <Header user={user} sidebarOpen={mobileOpen || !desktopCollapsed} onToggleSidebar={toggleSidebar} />
        <main id="main-content" className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
        <footer className="border-t border-border bg-surface px-4 py-4 text-sm">
          <div className="flex flex-col items-center gap-2 md:flex-row md:justify-between">
            <div className="flex items-center justify-center md:justify-start">
              <span className="font-bold text-ink-strong">{t("footerKeyit")}</span>
              <span className="ms-1 me-2 font-bold text-brand-700">{t("footerMs")}</span>
              <span className="border-s border-border ps-2 text-ink-muted">
                {t("footerPatent", { year: new Date().getFullYear() })}
              </span>
            </div>
            <p className="text-ink-muted">{t("footerVersion")}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
