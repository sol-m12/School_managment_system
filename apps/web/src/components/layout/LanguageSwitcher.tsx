import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { LANGUAGES } from "@/i18n/resources";

type LanguageSwitcherProps = { tone?: "shell" | "light" | "surface" };

const WRAP: Record<NonNullable<LanguageSwitcherProps["tone"]>, string> = {
  shell: "bg-white/5 ring-1 ring-white/10",
  light: "bg-white/15 ring-1 ring-white/25 backdrop-blur",
  surface: "bg-canvas ring-1 ring-border",
};

const IDLE: Record<NonNullable<LanguageSwitcherProps["tone"]>, string> = {
  shell: "text-white/80 hover:bg-white/10 hover:text-white",
  light: "text-white/80 hover:bg-white/10 hover:text-white",
  surface: "text-ink-muted hover:bg-white hover:text-ink-strong",
};

const ACTIVE: Record<NonNullable<LanguageSwitcherProps["tone"]>, string> = {
  shell: "bg-white text-brand-900",
  light: "bg-white text-brand-900",
  surface: "bg-white text-brand-900 shadow-soft",
};

export function LanguageSwitcher({ tone = "shell" }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("common");
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn("inline-flex shrink-0 rounded-control p-0.5", WRAP[tone])}
    >
      {LANGUAGES.map((language) => {
        const active = current === language || current.startsWith(`${language}-`);
        return (
          <button
            key={language}
            type="button"
            lang={language}
            aria-pressed={active}
            title={t(`languages.${language}`)}
            onClick={() => void i18n.changeLanguage(language)}
            className={cn(
              "min-h-tap min-w-tap rounded-[calc(var(--radius-control)-2px)] px-2.5 text-xs font-semibold transition-colors",
              active ? ACTIVE[tone] : IDLE[tone],
            )}
          >
            {t(`languagesShort.${language}`)}
          </button>
        );
      })}
    </div>
  );
}
