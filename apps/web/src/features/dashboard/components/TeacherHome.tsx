import { Check, Clock, GraduationCap, Pencil, School } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { DashboardView } from "../api/useDashboardStats";

const numberFormat = new Intl.NumberFormat("en-US");

type Academic = Extract<DashboardView, { kind: "academic" }>;

export function TeacherHome({ data }: { data: Academic }) {
  const { t } = useTranslation("dashboard");
  const cards = [
    { label: t("academicStudents"), value: data.students, icon: GraduationCap, tone: "bg-success/10 text-success" },
    { label: t("academicClasses"), value: data.classes, icon: School, tone: "bg-info/10 text-info" },
    { label: t("academicToday"), value: data.todayPeriods.length, icon: Clock, tone: "bg-warning/10 text-warning" },
  ];

  return (
    <div>
      <section className="mb-6 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-600 px-6 py-6 text-white shadow-soft">
        <h1 className="text-2xl font-bold md:text-3xl">{t("academicHello", { name: data.firstName })}</h1>
        <p className="mt-1 text-sm text-white/80">{t("academicMeta", { weekday: data.weekday, year: data.academicYear })}</p>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="flex flex-col items-center rounded-xl border border-border bg-surface px-4 py-5 text-center shadow-soft">
              <span className={`mb-3 flex size-11 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <p className="text-xs font-bold text-ink-muted">{card.label}</p>
              <p className="text-2xl font-bold text-ink-strong">{numberFormat.format(card.value)}</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft lg:col-span-2">
          <h2 className="border-b border-border px-4 py-3 text-sm font-bold text-ink-strong">{t("todayProgram")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-left text-ink-muted">
                <tr>
                  <th className="px-4 py-2 font-semibold">{t("period")}</th>
                  <th className="px-4 py-2 font-semibold">{t("subject")}</th>
                  <th className="px-4 py-2 font-semibold">{t("classRoom")}</th>
                  <th className="px-4 py-2 font-semibold">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {data.todayPeriods.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-ink-muted">
                      {t("noPeriods")}
                    </td>
                  </tr>
                ) : (
                  data.todayPeriods.map((period) => (
                    <tr key={`${period.classId}-${period.periodNumber}`} className="border-t border-border">
                      <td className="px-4 py-2">
                        <span className="rounded-lg bg-[#eff6ff] px-2.5 py-1 text-xs font-bold text-[#1e40af]">
                          {period.periodNumber}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-bold">{period.subjectName}</td>
                      <td className="px-4 py-2">
                        G-{period.gradeLevel}({period.section})
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          to={`/teacher/attendance?classId=${period.classId}`}
                          className="inline-flex size-8 items-center justify-center rounded-full bg-success text-white"
                          aria-label={t("action")}
                        >
                          <Check aria-hidden="true" className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside>
          <h2 className="mb-3 text-xs font-bold tracking-wide text-ink-muted uppercase">{t("academicQuick")}</h2>
          <div className="flex flex-col gap-2">
            <Link to="/teacher/grades" className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 font-semibold text-ink-strong shadow-soft">
              <Pencil aria-hidden="true" className="size-5 text-brand-700" />
              {t("enterGrades")}
            </Link>
            <Link to="/teacher/class-roster" className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 font-semibold text-ink-strong shadow-soft">
              {t("printRoster")}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
