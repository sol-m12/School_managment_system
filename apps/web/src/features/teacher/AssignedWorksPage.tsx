import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useTeacherSchedule, type ScheduleSlot } from "./api/useTeacher";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function dayKey(day: string) {
  switch (day) {
    case "Tuesday":
      return "days.Tuesday" as const;
    case "Wednesday":
      return "days.Wednesday" as const;
    case "Thursday":
      return "days.Thursday" as const;
    case "Friday":
      return "days.Friday" as const;
    case "Saturday":
      return "days.Saturday" as const;
    case "Sunday":
      return "days.Sunday" as const;
    default:
      return "days.Monday" as const;
  }
}

function groupDays(slots: ScheduleSlot[]): { day: string; items: ScheduleSlot[] }[] {
  const groups = new Map<string, ScheduleSlot[]>();
  for (const slot of slots) {
    const list = groups.get(slot.day) ?? [];
    list.push(slot);
    groups.set(slot.day, list);
  }
  return [...groups.entries()]
    .sort((a, b) => DAY_ORDER.indexOf(a[0]) - DAY_ORDER.indexOf(b[0]))
    .map(([day, items]) => ({ day, items }));
}

export function AssignedWorksPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const schedule = useTeacherSchedule();

  if (schedule.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (schedule.isError || !schedule.data) {
    return <Alert tone="danger">{t(`errors:${toErrorKey(schedule.error)}`)}</Alert>;
  }

  const data = schedule.data;
  const days = groupDays(data.classSchedule);
  const exams = groupDays(data.examSchedule);

  return (
    <div>
      <h1 className="text-xl font-bold text-ink-strong">{t("teacher:scheduleTitle")}</h1>
      <h2 className="mt-2 text-lg font-semibold text-ink-strong">
        {t("teacher:scheduleHeading")} — <span className="text-brand-700">{t("teacher:yearMark", { year: data.academicYear })}</span>
      </h2>
      <hr className="my-4 border-border" />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
          <h3 className="border-b border-border bg-canvas px-4 py-3 font-bold">{t("teacher:assignedClasses")}</h3>
          <div className="p-3">
            {data.assignments.length === 0 ? (
              <Alert tone="warning">{t("teacher:noAssignments")}</Alert>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-muted">
                    <th className="px-2 py-1">#</th>
                    <th className="px-2 py-1">{t("teacher:classLabel")}</th>
                    <th className="px-2 py-1">{t("teacher:subjectKind")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assignments.map((row, index) => (
                    <tr key={`${row.gradeLevel}-${row.section}-${row.subjectName}`} className="border-t border-border">
                      <td className="px-2 py-2">{index + 1}</td>
                      <td className="px-2 py-2">
                        <span className="rounded border border-border bg-canvas px-2 py-1 whitespace-nowrap">
                          {row.gradeLevel}
                          {row.section}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-bold">{row.subjectName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
          <h3 className="border-b border-border bg-canvas px-4 py-3 font-bold">{t("teacher:weeklySlots")}</h3>
          <div className="p-3">
            {days.length === 0 ? (
              <Alert tone="warning">{t("teacher:noTimetable")}</Alert>
            ) : (
              days.map((day) => (
                <div key={day.day} className="mb-3">
                  <h4 className="mb-2 rounded bg-brand-700 px-3 py-1 text-sm font-bold text-white">{t(dayKey(day.day))}</h4>
                  {day.items.map((item) => (
                    <div key={`${item.startTime}-${item.subjectName}-${item.section}`} className="mb-2 rounded border border-border px-3 py-2">
                      <p className="font-bold">
                        {item.startTime} - {item.endTime}
                      </p>
                      <p className="mt-1 flex justify-between gap-2">
                        <span>{item.subjectName}</span>
                        <span className="text-sm text-ink-muted">
                          {t("teacher:classLabel")}: {item.gradeLevel}
                          {item.section}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <h3 className="border-b border-border bg-canvas px-4 py-3 font-bold">{t("teacher:examBoard")}</h3>
        <div className="p-4">
          {exams.length === 0 ? (
            <p className="py-4 text-center text-ink-muted">{t("teacher:noExams")}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {exams.map((day) => (
                <div key={day.day}>
                  <h4 className="mb-2 rounded bg-danger px-3 py-1 text-sm font-bold text-white">{t(dayKey(day.day))}</h4>
                  {day.items.map((item) => (
                    <div key={`${item.startTime}-${item.section}`} className="mb-2 rounded border border-danger/30 px-3 py-2">
                      <p className="font-bold">
                        {item.startTime} - {item.endTime}
                      </p>
                      <p>
                        {t("teacher:classLabel")} {item.gradeLevel}
                        {item.section} — <span className="font-bold text-danger">{item.subjectName || t("teacher:invigilation")}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
