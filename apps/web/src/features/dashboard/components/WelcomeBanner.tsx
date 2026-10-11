import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui";
import type { SessionUser } from "@/features/auth/authContext";

export const WelcomeBanner = memo(function WelcomeBanner({ user }: { user: SessionUser }) {
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const roleLabel = t(`common:roles.${user.role}`);

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language === "am" ? "am-ET" : "en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
      }).format(new Date()),
    [i18n.language],
  );

  return (
    <section className="mb-6 flex flex-col gap-3 rounded-card border border-border border-l-[5px] border-l-brand-700 bg-surface p-4 shadow-soft sm:p-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold break-words text-ink-strong sm:text-2xl">
          {t("dashboard:welcome", { name: user.username })}
        </h1>
        <p className="mt-1 text-sm break-words text-ink-muted">
          {t("dashboard:today", { date: today })}
          <span aria-hidden="true" className="mx-1.5">
            |
          </span>
          {t("dashboard:jobTitle")} <strong className="text-ink">{roleLabel}</strong>
        </p>
        <p className="mt-1 text-sm break-words text-ink-muted">
          {t("dashboard:tenant")} <strong className="text-ink">{user.tenantName}</strong>
        </p>
      </div>
      <Badge tone="brand" className="self-start px-3 py-1 text-sm md:self-center">
        {roleLabel}
      </Badge>
    </section>
  );
});
