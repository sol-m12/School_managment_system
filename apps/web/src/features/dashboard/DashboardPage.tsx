import { useMemo } from "react";
import { ArrowRightLeft, Boxes, TriangleAlert, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, Badge, Spinner } from "@/components/ui";
import { useSessionUser } from "@/features/auth/authContext";
import { toErrorKey } from "@/lib/apiError";
import { MENU_ITEMS, canAccess, type NavItemKey } from "@/navigation/menu";
import { useDashboardStats } from "./api/useDashboardStats";
import { QuickActionCard } from "./components/QuickActionCard";
import { StatCard } from "./components/StatCard";
import { WelcomeBanner } from "./components/WelcomeBanner";

const QUICK_ACTION_KEYS = ["receiveItems", "binCard", "accountSettings", "profile"] as const satisfies readonly NavItemKey[];

export function DashboardPage() {
  const { t, i18n } = useTranslation(["dashboard", "nav", "errors", "common"]);
  const user = useSessionUser();
  const stats = useDashboardStats();

  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language === "am" ? "am-ET" : "en-US"),
    [i18n.language],
  );

  const quickActions = useMemo(
    () =>
      QUICK_ACTION_KEYS.flatMap((key) => {
        const item = MENU_ITEMS.find((menuItem) => menuItem.key === key);
        return item && canAccess(item, user) ? [{ ...item, key }] : [];
      }),
    [user],
  );

  return (
    <>
      <WelcomeBanner user={user} />

      <div className="mb-3 flex items-center justify-end">
        <Badge tone="warning">{t("dashboard:sampleData")}</Badge>
      </div>

      {stats.isPending ? (
        <div className="flex justify-center py-10 text-brand-700">
          <Spinner size="lg" label={t("common:loading")} />
        </div>
      ) : stats.isError ? (
        <Alert tone="danger">{t(`errors:${toErrorKey(stats.error)}`)}</Alert>
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          <StatCard label={t("dashboard:stats.itemTypes")} value={numberFormat.format(stats.data.itemTypes)} icon={Boxes} />
          <StatCard
            label={t("dashboard:stats.lowStock")}
            value={numberFormat.format(stats.data.lowStock)}
            icon={TriangleAlert}
            tone="danger"
          />
          <StatCard
            label={t("dashboard:stats.todayTransactions")}
            value={numberFormat.format(stats.data.todayTransactions)}
            icon={ArrowRightLeft}
            tone="success"
          />
        </div>
      )}

      <h2 className="mb-4 flex items-center gap-2 px-1 text-base font-bold text-ink-strong sm:text-lg">
        <Zap aria-hidden="true" className="size-5 text-warning" />
        {t("dashboard:quickActions")}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {quickActions.map((action) => (
          <QuickActionCard
            key={action.key}
            to={action.path}
            icon={action.icon}
            title={t(`nav:items.${action.key}`)}
            description={t(`dashboard:actions.${action.key}`)}
          />
        ))}
      </div>
    </>
  );
}
