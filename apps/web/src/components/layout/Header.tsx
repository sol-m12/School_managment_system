import { memo } from "react";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui";
import type { SessionUser } from "@/features/auth/authContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

type HeaderProps = {
  user: SessionUser;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export const Header = memo(function Header({ user, sidebarOpen, onToggleSidebar }: HeaderProps) {
  const { t } = useTranslation("common");
  const initial = user.username.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-[1030] flex h-header shrink-0 items-center justify-between gap-2 border-b border-shell-border bg-shell px-3 shadow-[0_1px_3px_rgb(0_0_0/0.2)] print:hidden sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <IconButton
          tone="shell"
          label={t("toggleSidebar")}
          aria-controls="app-sidebar"
          aria-expanded={sidebarOpen}
          icon={<Menu className="size-5" />}
          onClick={onToggleSidebar}
        />
        <span className="hidden truncate text-[1.05rem] font-bold text-white sm:inline">{t("systemTitle")}</span>
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        <div className="hidden min-w-0 text-right md:block">
          <div className="max-w-[12rem] truncate text-sm leading-tight font-bold text-white">{user.username}</div>
          <div className="max-w-[12rem] truncate text-xs text-accent">{user.role}</div>
        </div>
        <div
          aria-hidden="true"
          className="flex size-[38px] shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-shell-hover text-sm font-bold text-white"
        >
          {initial}
        </div>
      </div>
    </header>
  );
});
