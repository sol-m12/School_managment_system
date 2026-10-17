import { useMemo } from "react";
import { Navigate } from "react-router-dom";
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
import { TeacherHome } from "./components/TeacherHome";
import { WelcomeBanner } from "./components/WelcomeBanner";
import { StudentHome } from "@/features/student/StudentHome";

const QUICK_ACTIONS = [
  { key: "receiveItems", item: "model19" },
  { key: "issueItems", item: "issueModel22" },
  { key: "binCard", item: "binCard" },
  { key: "accountSettings", item: "accountManagement" },
  { key: "profile", item: "profile" },
] as const satisfies readonly { key: string; item: NavItemKey }[];

const numberFormat = new Intl.NumberFormat("en-US");

export function DashboardPage() {
  const user = useSessionUser();
  if (user.role === "Student") return <StudentHome />;
  if (user.role === "Registrar") return <Navigate to="/records" replace />;
  return <StaffDashboard />;
}

function StaffDashboard() {
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
  if (data.kind === "academic") return <TeacherHome data={data} />;

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
      <div className="-m-3 min-h-full bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_100%)] p-5 sm:-m-4 sm:p-8 md:-m-6 md:p-10">
        <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1e293b]">{t("dashboard:controlTitle")}</h1>
            <p className="mt-1 font-medium text-ink-muted">{t("dashboard:controlSubtitle")}</p>
          </div>
          <div className="inline-flex items-center self-start rounded-[1rem] bg-white p-3 text-sm font-bold text-brand-700 shadow-soft">
            <CalendarCheck aria-hidden="true" className="mr-2 size-4" />
            {t("dashboard:academicYear", { year: data.academicYear })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const HintIcon = card.hintIcon;
            return (
              <article
                key={card.label}
                className="relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] bg-white/85 p-5 shadow-[0_10px_30px_rgb(0_0_0/0.04)] backdrop-blur-md transition duration-300 hover:-translate-y-2.5 hover:shadow-[0_20px_40px_rgb(0_0_0/0.08)] sm:p-[30px]"
              >
                <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${card.bar}`} />
                <div>
                  <div className={`mb-5 flex size-[60px] items-center justify-center rounded-[18px] ${card.iconWrap}`}>
                    <Icon aria-hidden="true" className="size-7" />
                  </div>
                  <p className="text-sm font-bold tracking-wide text-ink-muted uppercase">{card.label}</p>
                  <p className="text-[2.4rem] leading-none font-black text-[#0f172a]">{numberFormat.format(card.value)}</p>
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs text-ink-muted">
                  {HintIcon ? <HintIcon aria-hidden="true" className="size-3.5 text-brand-700" /> : null}
                  {card.hint}
                </p>
              </article>
            );
          })}
        </div>

        <section className="mt-8 rounded-[1rem] bg-white p-4 shadow-soft sm:mt-12 sm:p-5">
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
      </div>
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
