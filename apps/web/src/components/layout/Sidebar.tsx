import { memo } from "react";
import { GraduationCap, Power, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { MenuGroup } from "@/navigation/menu";

type SidebarProps = {
  groups: MenuGroup[];
  mobileOpen: boolean;
  desktopCollapsed: boolean;
  onClose: () => void;
  onLogout: () => void;
};

const itemClass =
  "group flex min-h-tap items-center gap-3 rounded-control border-l-[3px] border-transparent px-3 py-2 text-sm font-medium transition-all duration-200";

export const Sidebar = memo(function Sidebar({
  groups,
  mobileOpen,
  desktopCollapsed,
  onClose,
  onLogout,
}: SidebarProps) {
  const { t } = useTranslation(["common", "nav"]);

  return (
    <aside
      id="app-sidebar"
      aria-label={t("common:mainNavigation")}
      className={cn(
        "fixed inset-y-0 left-0 z-[1050] flex w-sidebar max-w-[85vw] flex-col bg-shell text-shell-text shadow-panel",
        "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        desktopCollapsed ? "lg:-translate-x-full" : "lg:translate-x-0",
      )}
    >
      <div className="flex h-header shrink-0 items-center justify-between border-b border-shell-border bg-white/[0.02] px-5">
        <div className="flex items-center gap-2">
          <GraduationCap aria-hidden="true" className="size-6 text-accent" />
          <span className="text-lg font-bold tracking-wide text-white">{t("common:appName")}</span>
        </div>
        <IconButton
          label={t("common:closeSidebar")}
          icon={<X className="size-5" />}
          onClick={onClose}
          className="text-shell-text hover:bg-shell-hover hover:text-white lg:hidden"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-color:var(--color-shell-hover)_transparent] [scrollbar-width:thin]">
        {groups.length === 0 ? (
          <p className="p-3 text-center text-sm text-shell-title">{t("common:noModules")}</p>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="mb-2">
              <h2 className="px-3 pt-3 pb-1.5 text-[0.7rem] font-bold tracking-[0.08em] text-shell-title uppercase">
                {t(`nav:groups.${group.key}`)}
              </h2>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.key}>
                      <NavLink
                        to={item.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            itemClass,
                            isActive
                              ? "border-accent bg-accent/15 font-semibold text-accent"
                              : "hover:translate-x-0.5 hover:bg-shell-hover hover:text-white",
                          )
                        }
                      >
                        <Icon aria-hidden="true" className="size-[1.1rem] shrink-0" />
                        <span className="min-w-0 break-words">{t(`nav:items.${item.key}`)}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}

        <div className="mt-4 border-t border-white/10 pt-3">
          <button type="button" onClick={onLogout} className={cn(itemClass, "w-full text-danger hover:bg-shell-hover")}>
            <Power aria-hidden="true" className="size-[1.1rem] shrink-0" />
            <span>{t("common:logout")}</span>
          </button>
        </div>
      </nav>
    </aside>
  );
});
