import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Spinner } from "@/components/ui";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import { toErrorKey } from "@/lib/apiError";
import { AxiosError } from "axios";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri" };

type Lesson = {
  id: number;
  classId: number;
  gradeLevel: number;
  section: string;
  stream: string | null;
  subjectName: string;
  teacherName: string;
  staffId: number | null;
  day: (typeof DAYS)[number];
  period: number;
  start: string;
  end: string;
  shift: string;
};
type Board = {
  year: string;
  shift: string;
  periods: { period: number; start: string; end: string; shift: string }[];
  classes: { id: number; gradeLevel: number; section: string; stream: string | null }[];
  lessons: Lesson[];
  heatmap: { staffId: number; name: string; days: Record<(typeof DAYS)[number], number>; total: number; band: "green" | "yellow" | "red" }[];
};

const bandClass = { green: "bg-[#198754] text-white", yellow: "bg-[#ffc107] text-[#212529]", red: "bg-[#dc3545] text-white" };

function dayBand(count: number): "green" | "yellow" | "red" | "empty" {
  if (count <= 0) return "empty";
  if (count >= 5) return "red";
  if (count >= 4) return "yellow";
  return "green";
}

function shortSubject(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map((word) => word[0] ?? "").join("").toUpperCase();
  return name.replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function timetableDocument(options: {
  title: string;
  school: string;
  subtitle: string;
  dayLabel: string;
  periodLabel: string;
  columns: { id: number; gradeLevel: number; section: string }[];
  periods: { period: number; start: string; end: string }[];
  lessons: Lesson[];
}): string {
  const body = DAYS.map((day) =>
    options.periods
      .map((period, index) => {
        const cells = options.columns
          .map((room) => {
            const lesson = options.lessons.find((item) => item.classId === room.id && item.day === day && item.period === period.period);
            if (!lesson) return "<td>—</td>";
            return `<td><div class="subject">${escapeHtml(lesson.subjectName)}</div><div>${escapeHtml(lesson.teacherName)}</div></td>`;
          })
          .join("");
        const dayCell = index === 0 ? `<td rowspan="${options.periods.length}">${DAY_SHORT[day]}</td>` : "";
        return `<tr>${dayCell}<td>P${period.period}<div>${period.start.slice(0, 5)}–${period.end.slice(0, 5)}</div></td>${cells}</tr>`;
      })
      .join(""),
  ).join("");
  const heads = options.columns.map((room) => `<th>${room.gradeLevel}-${escapeHtml(room.section)}</th>`).join("");
  return `<!doctype html><html lang="am"><head><meta charset="UTF-8"><title>${escapeHtml(options.title)}</title>
    <style>
      @page { size: landscape; margin: 0.4in; }
      body { font-family: "Noto Sans Ethiopic", "Segoe UI", sans-serif; color: #000; margin: 0; }
      h1 { font-size: 18px; margin: 0; }
      p { margin: 4px 0 12px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { border: 1px solid #000; padding: 4px; text-align: center; vertical-align: top; }
      .subject { font-weight: 700; }
    </style></head><body>
    <h1>${escapeHtml(options.school)}</h1>
    <p>${escapeHtml(options.title)} · ${escapeHtml(options.subtitle)}</p>
    <table><thead><tr><th>${escapeHtml(options.dayLabel)}</th><th>${escapeHtml(options.periodLabel)}</th>${heads}</tr></thead><tbody>${body}</tbody></table>
    <script>window.addEventListener("load", function () { window.print(); });</script>
    </body></html>`;
}

export function ScheduleBoardPage() {
  const { t } = useTranslation(["admin", "errors", "common", "auth"]);
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  const [shift, setShift] = useState<"Morning" | "Afternoon" | "Both">("Morning");
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const query = useQuery({
    queryKey: ["admin", tenantId, "schedule-board", shift],
    queryFn: async () => (await api.get<Board>("/admin/schedule/board", { params: { shift } })).data,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", tenantId, "schedule-board"] });
  const generate = useMutation({
    mutationFn: async (body: { shift: string; totalPeriods: number; startTime: string; afternoonStartTime: string; duration: number }) =>
      api.post("/admin/schedule/generate", body),
    onSuccess: () => void refresh(),
  });
  const move = useMutation({
    mutationFn: async (body: { sourceId: number; day: string; period: number }) => api.post("/admin/schedule/move", body),
    onSuccess: () => void refresh(),
  });
  const swap = useMutation({
    mutationFn: async (body: { sourceId: number; targetId: number }) => api.post("/admin/schedule/swap", body),
    onSuccess: () => void refresh(),
  });

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  if (query.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (query.isError || !query.data) return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;
  const data = query.data;
  const periods = [...new Map(data.periods.map((period) => [period.period, period])).values()];
  const classIds = [...new Set(data.lessons.map((lesson) => lesson.classId))];
  const columns = data.classes.filter((room) => classIds.length === 0 || classIds.includes(room.id));
  const sheetTitle = t("admin:schedulePrintPreview");
  const sheetSubtitle = `${t("admin:scheduleCenterHint", { year: data.year })} · ${shift}`;

  function saveTimetable() {
    const html = timetableDocument({
      title: sheetTitle,
      school: t("auth:schoolName"),
      subtitle: sheetSubtitle,
      dayLabel: "DAY",
      periodLabel: "PERIOD",
      columns,
      periods,
      lessons: data.lessons,
    });
    const blob = new Blob([`\uFEFF${html}`], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timetable_${data.year.replace(/[^0-9A-Za-z_-]/g, "_")}_${shift}.html`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="bg-[#f8fafc] px-4 py-6 text-black print:bg-white print:p-0">
      <style>{`@media print { @page { size: landscape; margin: 0.4in; } }`}</style>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:mb-2">
        <div>
          <h2 className="text-2xl font-extrabold">{t("admin:scheduleCenter")}</h2>
          <p className="text-sm text-[#6c757d] print:text-black">{t("admin:scheduleCenterHint", { year: data.year })} · {shift}</p>
        </div>
        <button type="button" className="rounded-md bg-[#1a237e] px-4 py-2 text-sm font-bold text-white print:hidden" onClick={() => setPreview(true)}>
          {t("admin:schedulePrint")}
        </button>
      </div>
      {notice ? <Alert tone="danger" className="mb-4 print:hidden">{notice}</Alert> : null}
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        {(["Morning", "Afternoon", "Both"] as const).map((item) => (
          <button key={item} type="button" className={`rounded-md px-3 py-2 text-sm font-bold ${shift === item ? "bg-[#1a237e] text-white" : "bg-white"}`} onClick={() => setShift(item)}>
            {item}
          </button>
        ))}
      </div>

      <form
        className="mb-4 grid gap-3 rounded-2xl bg-white p-4 print:hidden md:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!window.confirm(t("admin:scheduleGenerateConfirm"))) return;
          const form = new FormData(event.currentTarget);
          generate.mutate(
            {
              shift: String(form.get("shift")),
              totalPeriods: Number(form.get("totalPeriods")),
              startTime: String(form.get("startTime")),
              afternoonStartTime: String(form.get("afternoonStartTime")),
              duration: Number(form.get("duration")),
            },
            {
              onSuccess: () => setNotice(t("admin:scheduleGenerated")),
              onError: (error) => {
                if (error instanceof AxiosError && error.response?.data && typeof error.response.data === "object") {
                  const body = error.response.data as { teachers?: { name: string; demand: number; cap: number }[] };
                  const names = (body.teachers ?? []).map((teacher) => `${teacher.name} ${teacher.demand}/${teacher.cap}`).join(", ");
                  setNotice(`${t(`errors:${toErrorKey(error)}`)}${names ? ` ${names}` : ""}`);
                  return;
                }
                setNotice(t(`errors:${toErrorKey(error)}`));
              },
            },
          );
        }}
      >
        <label className="text-sm font-bold">
          Shift
          <select name="shift" className="mt-1 w-full rounded-md border px-2 py-2" defaultValue={shift === "Both" ? "Both" : shift}>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Both</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("admin:schedulePeriods")}
          <input name="totalPeriods" type="number" min={1} max={12} defaultValue={6} className="mt-1 w-full rounded-md border px-2 py-2" />
        </label>
        <label className="text-sm font-bold">
          {t("admin:scheduleMorningStart")}
          <input name="startTime" defaultValue="08:00" className="mt-1 w-full rounded-md border px-2 py-2" />
        </label>
        <label className="text-sm font-bold">
          {t("admin:scheduleAfternoonStart")}
          <input name="afternoonStartTime" defaultValue="13:00" className="mt-1 w-full rounded-md border px-2 py-2" />
        </label>
        <label className="text-sm font-bold">
          {t("admin:scheduleDuration")}
          <input name="duration" type="number" min={20} max={120} defaultValue={45} className="mt-1 w-full rounded-md border px-2 py-2" />
        </label>
        <div className="flex items-end">
          <button type="submit" className="rounded-md bg-[#198754] px-4 py-2 font-bold text-white" disabled={generate.isPending}>
            {t("admin:scheduleGenerate")}
          </button>
        </div>
      </form>

      <div className="mb-6 overflow-x-auto rounded-2xl bg-white shadow-sm print:mb-0 print:overflow-visible print:shadow-none">
        <table className="w-full min-w-[900px] border border-black text-center text-xs print:min-w-0 print:text-[9px]">
          <thead>
            <tr className="bg-[#1a237e] text-white print:bg-white print:text-black">
              <th className="px-2 py-2">DAY</th>
              <th className="px-2 py-2">PERIOD</th>
              {columns.map((room) => (
                <th key={room.id} className="px-2 py-2">
                  {room.gradeLevel}-{room.section}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) =>
              periods.map((period, index) => (
                <tr key={`${day}-${period.period}`}>
                  {index === 0 ? (
                    <td className="border px-2 py-2 font-bold" rowSpan={periods.length}>
                      {DAY_SHORT[day]}
                    </td>
                  ) : null}
                  <td className="border px-2 py-2">
                    P{period.period}
                    <div>
                      {period.start.slice(0, 5)}–{period.end.slice(0, 5)}
                    </div>
                  </td>
                  {columns.map((room) => {
                    const lesson = data.lessons.find((item) => item.classId === room.id && item.day === day && item.period === period.period);
                    return (
                      <td
                        key={room.id}
                        className="border px-1 py-2"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          const sourceId = Number(event.dataTransfer.getData("text/plain"));
                          const source = data.lessons.find((item) => item.id === sourceId);
                          if (!source || source.classId !== room.id) return;
                          if (!lesson) {
                            move.mutate(
                              { sourceId, day, period: period.period },
                              { onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)) },
                            );
                          } else if (lesson.id !== sourceId) {
                            swap.mutate(
                              { sourceId, targetId: lesson.id },
                              { onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)) },
                            );
                          }
                        }}
                      >
                        {lesson ? (
                          <div draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(lesson.id))} className="cursor-grab rounded bg-[#e7f1ff] px-1 py-1 print:cursor-auto print:bg-white" title={`${lesson.subjectName} / ${lesson.teacherName}`}>
                            <div className="font-bold print:hidden">{shortSubject(lesson.subjectName)}</div>
                            <div className="print:hidden">ID {lesson.staffId}</div>
                            <div className="hidden text-left print:block">
                              <div className="font-bold">{lesson.subjectName}</div>
                              <div>{lesson.teacherName}</div>
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    );
                  })}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm print:hidden">
        <h3 className="mb-3 font-extrabold">{t("admin:scheduleHeatmap")}</h3>
        <p className="mb-3 text-sm text-[#6c757d]">{t("admin:scheduleHeatHint")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead>
              <tr>
                <th className="px-2 py-2 text-left">{t("admin:teacher")}</th>
                {DAYS.map((day) => (
                  <th key={day} className="px-2 py-2">
                    {DAY_SHORT[day]}
                  </th>
                ))}
                <th className="px-2 py-2">{t("admin:scheduleWeekly")}</th>
              </tr>
            </thead>
            <tbody>
              {data.heatmap.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-[#6c757d]">
                    {t("admin:scheduleHeatEmpty")}
                  </td>
                </tr>
              ) : (
                data.heatmap.map((row) => (
                  <tr key={row.staffId}>
                    <td className="px-2 py-2 text-left font-bold">{row.name || `ID-${row.staffId}`}</td>
                    {DAYS.map((day) => {
                      const tone = dayBand(row.days[day]);
                      return (
                        <td key={day} className="px-2 py-2">
                          <span className={`inline-block min-w-8 rounded px-2 py-1 ${tone === "empty" ? "bg-[#e9ecef]" : bandClass[tone]}`}>{row.days[day]}</span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 font-bold">{row.total}/25</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {preview
        ? createPortal(
            <div className="fixed inset-0 z-[1200] overflow-auto bg-white text-black">
              <div className="sticky top-0 flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
                <div>
                  <h2 className="text-lg font-extrabold">{sheetTitle}</h2>
                  <p className="text-sm text-[#6c757d]">{t("admin:schedulePrintUseFile")}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded-md bg-[#1a237e] px-4 py-2 text-sm font-bold text-white" onClick={saveTimetable}>
                    {t("admin:schedulePrintSave")}
                  </button>
                  <button type="button" className="rounded-md border px-4 py-2 text-sm font-bold" onClick={() => setPreview(false)}>
                    {t("common:close")}
                  </button>
                </div>
              </div>
              <div className="px-4 py-6">
                <h1 className="text-xl font-extrabold">{t("auth:schoolName")}</h1>
                <p className="mb-4 text-sm">{sheetTitle} · {sheetSubtitle}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse border border-black text-center text-[11px]">
                    <thead>
                      <tr>
                        <th className="border border-black px-2 py-2">DAY</th>
                        <th className="border border-black px-2 py-2">PERIOD</th>
                        {columns.map((room) => (
                          <th key={room.id} className="border border-black px-2 py-2">
                            {room.gradeLevel}-{room.section}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day) =>
                        periods.map((period, index) => (
                          <tr key={`${day}-${period.period}`}>
                            {index === 0 ? (
                              <td className="border border-black px-2 py-2 font-bold" rowSpan={periods.length}>
                                {DAY_SHORT[day]}
                              </td>
                            ) : null}
                            <td className="border border-black px-2 py-2">
                              P{period.period}
                              <div>
                                {period.start.slice(0, 5)}–{period.end.slice(0, 5)}
                              </div>
                            </td>
                            {columns.map((room) => {
                              const lesson = data.lessons.find((item) => item.classId === room.id && item.day === day && item.period === period.period);
                              return (
                                <td key={room.id} className="border border-black px-1 py-2 align-top">
                                  {lesson ? (
                                    <>
                                      <div className="font-bold">{lesson.subjectName}</div>
                                      <div>{lesson.teacherName}</div>
                                    </>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
