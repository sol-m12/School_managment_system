import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { LANGUAGES } from "@/i18n/resources";

type LanguageSwitcherProps = { tone?: "shell" | "light" };

export function LanguageSwitcher({ tone = "shell" }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation("common");
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex shrink-0 rounded-control p-0.5",
        tone === "shell" ? "bg-white/5 ring-1 ring-white/10" : "bg-white/15 ring-1 ring-white/25 backdrop-blur",
      )}
    >
      {LANGUAGES.map((language) => {
        const active = current === language;
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
              active ? "bg-white text-brand-900" : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            {t(`languagesShort.${language}`)}
          </button>
        );
      })}
    </div>
  );
}
