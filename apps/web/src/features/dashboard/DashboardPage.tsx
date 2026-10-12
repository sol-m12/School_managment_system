import { useMemo } from "react";
import {
  ArrowRightLeft,
  Boxes,
  Building2,
  CalendarCheck,
  ChartPie,
  CircleCheck,
  GraduationCap,
  Presentation,
  Shield,
  TriangleAlert,
  Users,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { useCan, useSessionUser } from "@/features/auth/authContext";
import { toErrorKey } from "@/lib/apiError";
import { MENU_ITEMS, type NavItemKey } from "@/navigation/menu";
import { useDashboard } from "./api/useDashboardStats";
import { QuickActionCard } from "./components/QuickActionCard";
import { StatCard } from "./components/StatCard";
import { WelcomeBanner } from "./components/WelcomeBanner";

const QUICK_ACTIONS = [
  { key: "receiveItems", item: "receiveItems" },
  { key: "binCard", item: "binCard" },
  { key: "accountSettings", item: "accountManagement" },
  { key: "profile", item: "profile" },
] as const satisfies readonly { key: string; item: NavItemKey }[];

const numberFormat = new Intl.NumberFormat("en-US");

export function DashboardPage() {
  const { t } = useTranslation(["dashboard", "nav", "errors", "common"]);
  const user = useSessionUser();
  const can = useCan();
  const dashboard = useDashboard();

  const quickActions = useMemo(
    () =>
      QUICK_ACTIONS.flatMap((action) => {
        const item = MENU_ITEMS.find((menuItem) => menuItem.key === action.item);
        if (!item) return [];
        if (action.key === "profile" || (item.permission !== undefined && can(item.permission))) {
          return [{ ...item, key: action.key }];
        }
        return [];
      }),
    [can],
  );

  if (dashboard.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return <Alert tone="danger">{t(`errors:${toErrorKey(dashboard.error)}`)}</Alert>;
  }

  const data = dashboard.data;
  if (data.kind === "empty") return null;

  if (data.kind === "control") {
    const cards = [
      {
        label: t("dashboard:studentsLabel"),
        value: data.students,
        hint: t("dashboard:studentsHint"),
        icon: GraduationCap,
        bar: "bg-[#3b82f6]",
        iconWrap: "bg-[#eff6ff] text-[#3b82f6]",
        hintIcon: CircleCheck,
      },
      {
        label: t("dashboard:teachersLabel"),
        value: data.teachers,
        hint: t("dashboard:teacherRole"),
        icon: Presentation,
        bar: "bg-[#10b981]",
        iconWrap: "bg-[#ecfdf5] text-[#10b981]",
        hintIcon: null,
      },
      {
        label: t("dashboard:staffLabel"),
        value: data.staff,
        hint: t("dashboard:staffHint"),
        icon: Users,
        bar: "bg-[#6366f1]",
        iconWrap: "bg-[#eef2ff] text-[#6366f1]",
        hintIcon: Building2,
      },
      {
        label: t("dashboard:otherStaffLabel"),
        value: data.otherStaff,
        hint: t("dashboard:otherStaffHint"),
        icon: Users,
        bar: "bg-[#8b5cf6]",
        iconWrap: "bg-[#f5f3ff] text-[#8b5cf6]",
        hintIcon: Shield,
      },
    ] as const;

    return (
      <>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1e293b]">{t("dashboard:controlTitle")}</h1>
            <p className="mt-1 font-medium text-ink-muted">{t("dashboard:controlSubtitle")}</p>
          </div>
          <div className="inline-flex items-center self-start rounded-card bg-surface p-3 text-sm font-bold text-brand-700 shadow-soft">
            <CalendarCheck aria-hidden="true" className="mr-2 size-4" />
            {t("dashboard:academicYear", { year: data.academicYear })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const HintIcon = card.hintIcon;
            return (
              <article key={card.label} className="relative overflow-hidden rounded-card bg-surface p-6 shadow-soft">
                <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${card.bar}`} />
                <div className={`mb-4 flex size-14 items-center justify-center rounded-card ${card.iconWrap}`}>
                  <Icon aria-hidden="true" className="size-7" />
                </div>
                <p className="text-sm font-bold tracking-wide text-ink-muted uppercase">{card.label}</p>
                <p className="text-4xl font-black text-ink-strong">{numberFormat.format(card.value)}</p>
                <p className="mt-3 flex items-center gap-1 text-xs text-ink-muted">
                  {HintIcon ? <HintIcon aria-hidden="true" className="size-3.5 text-brand-700" /> : null}
                  {card.hint}
                </p>
              </article>
            );
          })}
        </div>

        <section className="mt-8 rounded-card bg-surface p-4 shadow-soft sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-ink-strong">
            <ChartPie aria-hidden="true" className="size-4 text-brand-700" />
            {t("dashboard:rolesTitle")}
          </h2>
          {data.roles.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("dashboard:noRoles")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {data.roles.map((role) => (
                <div key={role.role} className="flex items-center justify-between rounded-control bg-canvas p-3">
                  <span className="font-semibold text-ink-muted">{role.role}</span>
                  <span className="rounded-full bg-brand-700 px-3 py-1 text-sm font-bold text-white">
                    {numberFormat.format(role.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </>
    );
  }

  return (
    <>
      <WelcomeBanner firstName={data.firstName} jobTitle={data.jobTitle} role={user.role} />
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
        <StatCard label={t("dashboard:stats.itemTypes")} value={numberFormat.format(data.itemTypes)} icon={Boxes} />
        <StatCard
          label={t("dashboard:stats.lowStock")}
          value={numberFormat.format(data.lowStock)}
          icon={TriangleAlert}
          tone="danger"
        />
        <StatCard
          label={t("dashboard:stats.todayTransactions")}
          value={numberFormat.format(data.todayTransactions)}
          icon={ArrowRightLeft}
          tone="success"
        />
      </div>
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
            title={t(`dashboard:actionTitles.${action.key}`)}
            description={t(`dashboard:actions.${action.key}`)}
          />
        ))}
      </div>
    </>
  );
}
