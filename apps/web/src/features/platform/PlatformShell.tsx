import { Building2, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { cn } from "@/lib/cn";
import { usePlatformAuth } from "./platformAuthContext";

const NAV = [
  { to: "/platform", end: true, icon: LayoutDashboard, labelKey: "nav.home" as const },
  { to: "/platform/schools", end: true, icon: Building2, labelKey: "nav.schools" as const },
  { to: "/platform/schools/new", end: true, icon: PlusCircle, labelKey: "nav.addSchool" as const },
];

export function PlatformShell() {
  const { t } = useTranslation("platform");
  const auth = usePlatformAuth();

  return (
    <div className="min-h-dvh bg-[#f4f7fb] font-sans text-ink-strong">
      <div className="flex min-h-dvh">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#0b1526] text-slate-200 lg:flex">
          <div className="border-b border-white/10 px-5 py-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-teal-300/90 uppercase">
              {t("brand.eyebrow")}
            </p>
            <p className="mt-1 text-lg font-semibold text-white">{t("brand.short")}</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-teal-500/15 text-teal-200"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    )
                  }
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-4">
            <p className="truncate text-sm font-medium text-white">
              {auth.status === "authenticated" ? auth.user.displayName : ""}
            </p>
            <p className="truncate text-xs text-slate-400">
              {auth.status === "authenticated" ? auth.user.username : ""}
            </p>
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm text-slate-200 transition hover:bg-white/5"
            >
              <LogOut aria-hidden className="size-4" />
              {t("nav.logout")}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-white/90 px-4 backdrop-blur sm:px-6">
            <div className="lg:hidden">
              <p className="text-sm font-semibold text-ink-strong">{t("brand.short")}</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => void auth.logout()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-ink-muted transition hover:bg-canvas lg:hidden"
              >
                <LogOut aria-hidden className="size-4" />
                {t("nav.logout")}
              </button>
            </div>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-white px-3 py-2 lg:hidden">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium",
                      isActive ? "bg-teal-700 text-white" : "text-ink-muted hover:bg-canvas",
                    )
                  }
                >
                  <Icon aria-hidden className="size-4" />
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </nav>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
