import { SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, EmptyState } from "@/components/ui";

export function NotFoundPage() {
  const { t } = useTranslation("common");
  return (
    <Card>
      <EmptyState
        icon={<SearchX aria-hidden="true" className="size-7" />}
        title={t("notFound.title")}
        description={t("notFound.description")}
        action={
          <Link
            to="/dashboard"
            className="inline-flex min-h-tap items-center rounded-control px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            {t("backToDashboard")}
          </Link>
        }
      />
    </Card>
  );
}
