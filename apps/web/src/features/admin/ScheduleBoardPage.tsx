import { useEffect, useMemo, useState } from "react";
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

type MoveOption = {
  day: (typeof DAYS)[number];
  period: number;
  targetId: number | null;
  ok: boolean;
  reasons: string[];
  warnings: string[];
  rank: number;
  targetSubjectName: string | null;
  targetTeacherName: string | null;
  sourceOffBefore: number;
  sourceOffAfter: number;
  partnerOffBefore: number | null;
  partnerOffAfter: number | null;
};

type MovesPayload = {
  source: {
    id: number;
    subjectName: string;
    teacherName: string;
    day: (typeof DAYS)[number];
    period: number;
    classId: number;
    gradeLevel: number;
    section: string;
    offDays: number;
  };
  options: MoveOption[];
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

function warnLabel(code: string, t: (key: string) => string): string {
  if (code === "TEACHER_BUSY") return t("admin:scheduleBusy");
  if (code === "TEACHER_DAILY") return t("admin:scheduleDailyCap");
  if (code === "SUBJECT_DAY") return t("admin:scheduleSubjectDay");
  return code;
}

export function ScheduleBoardPage() {
  const { t } = useTranslation(["admin", "errors", "common", "auth"]);
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  const [shift, setShift] = useState<"Morning" | "Afternoon" | "Both">("Morning");
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const query = useQuery({
    queryKey: ["admin", tenantId, "schedule-board", shift],
    queryFn: async () => (await api.get<Board>("/admin/schedule/board", { params: { shift } })).data,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", tenantId, "schedule-board"] });

  const hintId = draggingId ?? (panelOpen ? activeId : null);
  const moves = useQuery({
    queryKey: ["admin", tenantId, "schedule-moves", hintId],
    queryFn: async () => (await api.get<MovesPayload>("/admin/schedule/moves", { params: { sourceId: hintId } })).data,
    enabled: hintId != null,
  });

  const generate = useMutation({
    mutationFn: async (body: { shift: string; totalPeriods: number; startTime: string; afternoonStartTime: string; duration: number }) =>
      api.post("/admin/schedule/generate", body),
    onSuccess: () => void refresh(),
  });
  const move = useMutation({
    mutationFn: async (body: { sourceId: number; day: string; period: number }) => api.post("/admin/schedule/move", body),
    onSuccess: () => {
      void refresh();
      setPanelOpen(false);
      setActiveId(null);
      setDraggingId(null);
    },
  });
  const swap = useMutation({
    mutationFn: async (body: { sourceId: number; targetId: number }) => api.post("/admin/schedule/swap", body),
    onSuccess: () => {
      void refresh();
      setPanelOpen(false);
      setActiveId(null);
      setDraggingId(null);
    },
  });

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  const optionMap = useMemo(() => {
    const map = new Map<string, MoveOption>();
    for (const option of moves.data?.options ?? []) {
      map.set(`${option.day}:${option.period}`, option);
    }
    return map;
  }, [moves.data]);

  const ranked = useMemo(() => {
    const list = [...(moves.data?.options ?? [])];
    list.sort((a, b) => b.rank - a.rank || a.day.localeCompare(b.day) || a.period - b.period);
    return list.slice(0, 8);
  }, [moves.data]);

  if (query.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (query.isError || !query.data) return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;
  const data = query.data;
  const periods = [...new Map(data.periods.map((period) => [period.period, period])).values()].sort((a, b) => a.period - b.period);
  const breakAfter = periods.length > 0 ? Math.ceil(periods.length / 2) : 0;
  const classIds = [...new Set(data.lessons.map((lesson) => lesson.classId))];
  void breakAfter;
  const columns = data.classes.filter((room) => classIds.length === 0 || classIds.includes(room.id));
  const sheetTitle = t("admin:schedulePrintPreview");
  const sheetSubtitle = `${t("admin:scheduleCenterHint", { year: data.year })} · ${shift}`;
  const sourceLesson = activeId != null ? data.lessons.find((lesson) => lesson.id === activeId) : null;

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

  function applyOption(option: MoveOption) {
    if (!hintId || !option.ok) return;
    if (option.targetId == null) {
      move.mutate(
        { sourceId: hintId, day: option.day, period: option.period },
        { onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)) },
      );
      return;
    }
    swap.mutate(
      { sourceId: hintId, targetId: option.targetId },
      { onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)) },
    );
  }

  function cellTone(classId: number, day: (typeof DAYS)[number], period: number): string {
    if (hintId == null || moves.data?.source.classId !== classId) return "border px-1 py-2";
    const source = data.lessons.find((item) => item.id === hintId);
    if (!source || source.classId !== classId) return "border px-1 py-2";
    if (source.day === day && source.period === period) return "border px-1 py-2 bg-[#e7f1ff] outline outline-2 outline-dashed outline-[#0d6efd]";
    const option = optionMap.get(`${day}:${period}`);
    if (!option) return "border px-1 py-2";
    if (option.ok) return "border px-1 py-2 bg-[#d1e7dd] outline outline-2 outline-[#198754]";
    return "border px-1 py-2 bg-[#f8d7da]";
  }

  return (
    <div className="bg-[#f8fafc] px-4 py-6 text-black print:bg-white print:p-0">
      <style>{`@media print { @page { size: landscape; margin: 0.4in; } }`}</style>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:mb-2">
        <div>
          <h2 className="text-2xl font-extrabold">{t("admin:scheduleCenter")}</h2>
          <p className="text-sm text-[#6c757d] print:text-black">{t("admin:scheduleCenterHint", { year: data.year })} · {shift}</p>
          <p className="mt-1 text-xs text-[#6c757d] print:hidden">{t("admin:scheduleDragHint")}</p>
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

      <div className="mb-6 grid gap-4 print:mb-0 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm print:overflow-visible print:shadow-none">
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
                      <td className="border px-2 py-2 font-bold align-middle" rowSpan={periods.length}>
                        {DAY_SHORT[day]}
                      </td>
                    ) : null}
                    <td className="border px-2 py-2">
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#cfe2ff] font-bold text-[#084298] print:bg-white print:text-black">
                        P{period.period}
                      </span>
                      <div>
                        {period.start.slice(0, 5)}–{period.end.slice(0, 5)}
                      </div>
                      {period.period === breakAfter ? (
                        <div className="mt-1 rounded bg-[#ffe8cc] px-1 text-[10px] font-bold text-[#9a3412] print:hidden">
                          ☕ {t("admin:scheduleTeaBreak")}
                        </div>
                      ) : null}
                    </td>
                    {columns.map((room) => {
                      const lesson = data.lessons.find((item) => item.classId === room.id && item.day === day && item.period === period.period);
                      return (
                        <td
                          key={room.id}
                          className={cellTone(room.id, day, period.period)}
                          onDragOver={(event) => {
                            if (draggingId == null) return;
                            const option = optionMap.get(`${day}:${period.period}`);
                            if (option?.ok) event.preventDefault();
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const sourceId = Number(event.dataTransfer.getData("text/plain"));
                            const source = data.lessons.find((item) => item.id === sourceId);
                            if (!source || source.classId !== room.id) return;
                            const option = optionMap.get(`${day}:${period.period}`);
                            if (!option?.ok) return;
                            applyOption(option);
                          }}
                        >
                          {lesson ? (
                            <button
                              type="button"
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData("text/plain", String(lesson.id));
                                event.dataTransfer.effectAllowed = "move";
                                setDraggingId(lesson.id);
                                setActiveId(lesson.id);
                                setPanelOpen(false);
                              }}
                              onDragEnd={() => setDraggingId(null)}
                              onClick={() => {
                                setActiveId(lesson.id);
                                setPanelOpen(true);
                                setDraggingId(null);
                              }}
                              className={`w-full cursor-grab rounded px-1 py-1 text-left print:cursor-auto print:bg-white ${
                                activeId === lesson.id && panelOpen ? "bg-[#cfe2ff] ring-2 ring-[#0d6efd]" : "bg-[#e7f1ff]"
                              }`}
                              title={`${lesson.subjectName} / ${lesson.teacherName}`}
                            >
                              <div className="font-bold print:hidden">{shortSubject(lesson.subjectName)}</div>
                              <div className="print:hidden">ID {lesson.staffId}</div>
                              <div className="hidden text-left print:block">
                                <div className="font-bold">{lesson.subjectName}</div>
                                <div>{lesson.teacherName}</div>
                              </div>
                            </button>
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

        {panelOpen && sourceLesson ? (
          <aside className="rounded-2xl border bg-white p-4 shadow-sm print:hidden">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold">{t("admin:scheduleSmartSwap")}</h3>
                <p className="text-sm font-semibold text-[#1a237e]">
                  {sourceLesson.subjectName} · {sourceLesson.teacherName}
                </p>
                <p className="text-xs text-[#6c757d]">
                  {DAY_SHORT[sourceLesson.day]} · Period {sourceLesson.period}
                </p>
                <p className="mt-1 text-xs text-[#6c757d]">{t("admin:scheduleSmartSwapHint")}</p>
              </div>
              <button type="button" className="rounded border px-2 py-1 text-xs font-bold" onClick={() => setPanelOpen(false)}>
                {t("admin:scheduleClosePanel")}
              </button>
            </div>
            {moves.isPending ? (
              <div className="flex justify-center py-8">
                <Spinner label={t("common:loading")} />
              </div>
            ) : moves.isError ? (
              <Alert tone="danger">{t(`errors:${toErrorKey(moves.error)}`)}</Alert>
            ) : (
              <div className="grid gap-2">
                {ranked.map((option, index) => {
                  const best = index === 0 && option.ok;
                  const warnOnly = !option.ok || option.warnings.includes("SOURCE_OFF") || option.warnings.includes("PARTNER_OFF");
                  return (
                    <button
                      key={`${option.day}-${option.period}-${option.targetId ?? "empty"}`}
                      type="button"
                      disabled={!option.ok || move.isPending || swap.isPending}
                      onClick={() => applyOption(option)}
                      className={`rounded-xl border p-3 text-left ${
                        best
                          ? "border-[#198754] bg-[#d1e7dd]"
                          : warnOnly
                            ? "border-[#fd7e14] bg-[#fff3cd]"
                            : "border-[#ced4da] bg-white"
                      } disabled:opacity-50`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-bold">
                          {DAY_SHORT[option.day]} · Period {option.period}
                        </span>
                        {best ? <span className="rounded bg-[#198754] px-2 py-0.5 text-[10px] font-bold text-white">{t("admin:scheduleBest")}</span> : null}
                      </div>
                      <p className="text-sm">
                        {option.targetId == null
                          ? t("admin:scheduleMoveEmpty")
                          : t("admin:scheduleSwapWith", {
                              subject: option.targetSubjectName ?? "",
                              teacher: option.targetTeacherName ?? "",
                            })}
                      </p>
                      {option.warnings.includes("SOURCE_OFF") ? (
                        <p className="mt-1 text-xs font-semibold text-[#9a3412]">
                          {t("admin:scheduleOffLose", {
                            name: sourceLesson.teacherName,
                            before: option.sourceOffBefore,
                            after: option.sourceOffAfter,
                          })}
                        </p>
                      ) : null}
                      {option.warnings.includes("PARTNER_OFF") && option.targetTeacherName ? (
                        <p className="mt-1 text-xs font-semibold text-[#9a3412]">
                          {t("admin:scheduleOffLose", {
                            name: option.targetTeacherName,
                            before: option.partnerOffBefore ?? 0,
                            after: option.partnerOffAfter ?? 0,
                          })}
                        </p>
                      ) : null}
                      {option.reasons.map((reason) => (
                        <p key={reason} className="mt-1 text-xs font-semibold text-[#9a3412]">
                          {warnLabel(reason, t)}
                        </p>
                      ))}
                    </button>
                  );
                })}
              </div>
            )}
          </aside>
        ) : null}
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
                <p className="mb-4 text-sm">
                  {sheetTitle} · {sheetSubtitle}
                </p>
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
