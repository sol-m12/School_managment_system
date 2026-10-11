import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Card, EmptyState } from "@/components/ui";

type PublicPlaceholderPageProps = {
  title: "homePage" | "forgotPassword";
};

/** Public pages that exist in legacy but are not ported yet (home page, forgot password). */
export function PublicPlaceholderPage({ title }: PublicPlaceholderPageProps) {
  const { t } = useTranslation(["common", "auth"]);
  const heading = title === "homePage" ? t("common:homePage") : t("auth:forgotPassword");

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-brand-700/95 via-brand-700/85 to-brand-900 px-4 py-10">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
        <LanguageSwitcher tone="light" />
      </div>
      <Card className="w-full max-w-md rounded-panel">
        <EmptyState
          icon={<Construction aria-hidden="true" className="size-7" />}
          title={heading}
          description={t("common:notBuilt.title")}
          action={
            <Link
              to="/login"
              className="inline-flex min-h-tap items-center rounded-control bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
            >
              {t("common:backToLogin")}
            </Link>
          }
        />
      </Card>
    </div>
  );
}
