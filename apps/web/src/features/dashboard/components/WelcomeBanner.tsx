import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui";

type WelcomeBannerProps = {
  firstName: string;
  jobTitle: string;
  role: string;
};

export const WelcomeBanner = memo(function WelcomeBanner({ firstName, jobTitle, role }: WelcomeBannerProps) {
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const locale = i18n.language.startsWith("am") ? "am-ET" : "en-US";

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
      }).format(new Date()),
    [locale],
  );

  return (
    <section className="mb-6 flex flex-col gap-3 rounded-card border border-border border-l-[5px] border-l-[#1a237e] bg-surface p-5 shadow-soft md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold break-words text-ink-strong sm:text-2xl">
          {t("welcome", { name: firstName })}
        </h1>
        <p className="mt-1 text-sm break-words text-ink-muted">
          {t("today", { date: today })}
          <span aria-hidden="true" className="mx-1.5">
            |
          </span>
          {t("jobTitle")} <strong className="text-ink">{jobTitle}</strong>
        </p>
      </div>
      <Badge tone="brand" className="self-start rounded-full px-3 py-2 text-sm md:self-center">
        {t(`common:roles.${role}`, { defaultValue: role.replaceAll("_", " ") })}
      </Badge>
    </section>
  );
});
