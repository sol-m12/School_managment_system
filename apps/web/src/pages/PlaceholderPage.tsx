import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import type { NavItemKey } from "@/navigation/menu";

export function PlaceholderPage({ titleKey }: { titleKey: NavItemKey }) {
  const { t } = useTranslation(["common", "nav"]);
  return (
    <>
      <PageHeader title={t(`nav:items.${titleKey}`)} />
      <Card>
        <EmptyState
          icon={<Construction aria-hidden="true" className="size-7" />}
          title={t("common:notBuilt.title")}
          description={t("common:notBuilt.description")}
          action={
            <Link
              to="/dashboard"
              className="inline-flex min-h-tap items-center rounded-control px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              {t("common:backToDashboard")}
            </Link>
          }
        />
      </Card>
    </>
  );
}
