import { GraduationCap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui";

export function FullScreenLoader() {
  const { t } = useTranslation("common");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-shell text-white">
      <div className="flex items-center gap-2">
        <GraduationCap aria-hidden="true" className="size-7 text-accent" />
        <span className="text-lg font-bold tracking-wide">{t("appName")}</span>
      </div>
      <div className="flex items-center gap-2 text-shell-text">
        <Spinner size="sm" />
        <span className="text-sm">{t("loading")}</span>
      </div>
    </div>
  );
}
