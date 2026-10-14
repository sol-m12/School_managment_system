import { useMemo, useState } from "react";
import {
  Bolt,
  CircleCheck,
  FileText,
  Layers,
  Pen,
  Plus,
  Presentation,
  RotateCw,
  School,
  Trash2,
  TriangleAlert,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { cn } from "@/lib/cn";
import {
  useAssignHomeroom,
  useClasses,
  useCreateBaseClass,
  useCreateClass,
  useDeleteClass,
  useUpdateClass,
  type ClassBody,
  type ClassRow,
  type ClassStream,
} from "./api/useClasses";
import { LegacyModal } from "./components/LegacyModal";
import { TeacherModuleBar } from "./components/TeacherModuleBar";

type Notice = { tone: "success" | "danger"; text: string };
type ClassForm = { gradeLevel: string; section: string; stream: ClassStream; classTeacherId: string; maxCapacity: string };

const emptyForm = (): ClassForm => ({
  gradeLevel: "",
  section: "",
  stream: null,
  classTeacherId: "",
  maxCapacity: "40",
});

const fieldClass =
  "w-full rounded-md border border-[#ced4da] bg-white px-3 py-1.5 text-base text-[#212529] focus:border-[#86b7fe] focus:shadow-[0_0_0_0.25rem_rgba(13,110,253,0.25)] focus:outline-none";

function percent(count: number, capacity: number): number {
  const cap = Math.max(1, capacity);
  return Math.min(100, Math.round((count / cap) * 100));
}

function statusOf(count: number, capacity: number): "full" | "near" | "open" {
  const pct = percent(count, capacity);
  if (count >= Math.max(1, capacity)) return "full";
  if (pct >= 80) return "near";
  return "open";
}

export function ClassesPage() {
  const { t } = useTranslation(["admin", "errors", "common"]);
  const query = useClasses();
  const createBase = useCreateBaseClass();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();
  const removeClass = useDeleteClass();
  const assignHomeroom = useAssignHomeroom();

  const [notice, setNotice] = useState<Notice | null>(null);
  const [baseOpen, setBaseOpen] = useState(false);
  const [baseGrade, setBaseGrade] = useState("");
  const [baseSection, setBaseSection] = useState("");
  const [editing, setEditing] = useState<ClassRow | "new" | null>(null);
  const [form, setForm] = useState<ClassForm>(emptyForm);
  const [assignId, setAssignId] = useState<number | "">("");
  const [assignTeacher, setAssignTeacher] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);

  const rows = query.data?.rows ?? [];
  const teachers = query.data?.teachers ?? [];
  const academicYear = query.data?.academicYear ?? "";

  const totals = useMemo(() => {
    const assigned = rows.filter((row) => row.classTeacherId != null).length;
    const students = rows.reduce((sum, row) => sum + row.studentCount, 0);
    const capacity = rows.reduce((sum, row) => sum + row.maxCapacity, 0);
    return {
      total: rows.length,
      assigned,
      unassigned: rows.length - assigned,
      students,
      capacity,
      free: Math.max(0, capacity - students),
      occupancy: capacity > 0 ? Math.round((students / capacity) * 100) : 0,
    };
  }, [rows]);

  const selected = rows.find((row) => row.id === assignId);

  function showError(error: unknown) {
    setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
  }

  function openAdd() {
    setForm(emptyForm());
    setEditing("new");
  }

  function openEdit(row: ClassRow) {
    setForm({
      gradeLevel: String(row.gradeLevel),
      section: row.section,
      stream: row.stream,
      classTeacherId: row.classTeacherId == null ? "" : String(row.classTeacherId),
      maxCapacity: String(row.maxCapacity),
    });
    setEditing(row);
  }

  function openAssign(row?: ClassRow) {
    setAssignId(row?.id ?? "");
    setAssignTeacher(row?.classTeacherId == null ? "" : String(row.classTeacherId));
    setAssignOpen(true);
  }

  function bodyFromForm(): ClassBody | null {
    const gradeLevel = Number(form.gradeLevel);
    const maxCapacity = Number(form.maxCapacity);
    if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || !form.section.trim() || !Number.isInteger(maxCapacity) || maxCapacity < 1) {
      setNotice({ tone: "danger", text: t("errors:validation") });
      return null;
    }
    return {
      gradeLevel,
      section: form.section.trim(),
      stream: form.stream,
      classTeacherId: form.classTeacherId ? Number(form.classTeacherId) : null,
      maxCapacity,
    };
  }

  function reportHtml(): string {
    const assigned = rows.filter((row) => row.classTeacherId != null);
    const body = assigned.length
      ? assigned
          .map(
            (row, index) =>
              `<tr><td>${index + 1}</td><td><strong>${row.teacherName}</strong><br><small>${t("admin:classStaffId", { id: row.classTeacherId })}</small></td><td>${row.gradeLevel}</td><td>${row.section}</td><td>${row.yearAssignmentCount}</td><td>${row.yearTotalCredits}</td></tr>`,
          )
          .join("")
      : `<tr><td colspan="6">${t("admin:classReportEmpty")}</td></tr>`;
    const today = new Date().toISOString().slice(0, 10);
    return `<!doctype html><html lang="am"><head><meta charset="UTF-8"><title>${t("admin:classReportTitle")}</title>
      <style>body{font-family:"Noto Sans Ethiopic",sans-serif;color:#0B192C}table{width:100%;border-collapse:collapse}th{background:#0B192C;color:#fff;padding:8px;text-align:left}td{border:1px solid #CBD5E1;padding:8px}h1{font-size:22px}</style></head><body>
      <div>ACADEMIC MANAGEMENT</div><h1>${t("admin:classReportTitle")}</h1>
      <p>${t("admin:classYear")} <b>${academicYear}</b> &nbsp; ${t("admin:classReportPrepared")} <b>${today}</b></p>
      <table><thead><tr><th>#</th><th>${t("admin:classReportTeacher")}</th><th>Grade</th><th>Section</th><th>${t("admin:classReportAssignments")}</th><th>${t("admin:classReportCredits")}</th></tr></thead><tbody>${body}</tbody></table>
      </body></html>`;
  }

  function printReport() {
    const popup = window.open("", "_blank", "width=1200,height=850");
    if (!popup) return;
    popup.document.write(reportHtml());
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function downloadWord() {
    const blob = new Blob([reportHtml()], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `homeroom_assignments_${academicYear.replace(/[^0-9A-Za-z_-]/g, "_") || "year"}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-3 py-4 text-[#334155]">
      <TeacherModuleBar />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#0B192C] px-5 py-[15px] text-white">
        <div>
          <div className="text-[0.7rem] font-bold tracking-[0.12em] opacity-70">{t("admin:classKicker")}</div>
          <h1 className="mb-1 flex items-center text-[1.45rem] font-bold text-white">
            <School aria-hidden="true" className="me-2 size-5" />
            {t("admin:classTitle")}
          </h1>
          <div className="text-[0.85rem] opacity-85">
            {t("admin:classYear")} <strong>{academicYear}</strong>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBaseOpen(true)} className="rounded-[7px] border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
            <Plus aria-hidden="true" className="me-1 inline size-4" />
            {t("admin:classBaseButton")}
          </button>
          <button type="button" onClick={openAdd} className="rounded-[7px] border border-[#F59E0B] bg-[#F59E0B] px-3 py-2 text-sm font-semibold text-[#111827]">
            <Layers aria-hidden="true" className="me-1 inline size-4" />
            {t("admin:classConfigureButton")}
          </button>
        </div>
      </div>

      {notice ? (
        <div role={notice.tone === "danger" ? "alert" : "status"} className={cn("mb-3 rounded-lg p-4", notice.tone === "success" ? "bg-[#d1e7dd] text-[#0f5132]" : "bg-[#f8d7da] text-[#842029]")}>
          {notice.text}
        </div>
      ) : null}

      {query.isPending ? (
        <div className="flex justify-center py-10 text-[#0B192C]">
          <Spinner size="lg" label={t("common:loading")} />
        </div>
      ) : null}
      {query.isError ? (
        <div role="alert" className="mb-3 rounded-lg bg-[#f8d7da] p-4 text-[#842029]">
          {t(`errors:${toErrorKey(query.error)}`)}
        </div>
      ) : null}

      {query.data ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat icon={Presentation} label={t("admin:classStatTotal")} value={String(totals.total)} tone="accent" />
            <Stat icon={UserCheck} label={t("admin:classStatAssigned")} value={String(totals.assigned)} tone="success" />
            <Stat icon={UserRound} label={t("admin:classStatUnassigned")} value={String(totals.unassigned)} tone="warning" />
            <Stat icon={Users} label={t("admin:classStatSeats")} value={String(totals.students)} extra={`/ ${totals.capacity}`} tone="dark" />
          </div>

          <section className="mb-3 rounded-lg border border-[#E2E8F0] bg-white p-4">
            <div className="mb-3 flex items-center font-bold text-[#0B192C]">
              <Bolt aria-hidden="true" className="me-2 size-4" />
              {t("admin:classQuick")}
            </div>
            <div className="flex flex-wrap gap-2">
              <Action onClick={() => setBaseOpen(true)} icon={Plus} label={t("admin:classNewBase")} />
              <Action onClick={openAdd} icon={Layers} label={t("admin:classConfigureYear")} />
              <Action onClick={() => openAssign()} icon={UserPlus} label={t("admin:classAssignAction")} />
              <Action onClick={printReport} icon={FileText} label={t("admin:classPrint")} />
              <Action onClick={downloadWord} icon={FileText} label={t("admin:classWord")} />
              <Action onClick={() => void query.refetch()} icon={RotateCw} label={t("admin:classRefresh")} />
            </div>
          </section>

          <div className="mb-3 grid gap-3 lg:grid-cols-3">
            <section className="rounded-lg border border-[#E2E8F0] bg-white lg:col-span-2">
              <header className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 font-semibold text-[#0B192C]">
                <span>{t("admin:classCapacityTitle")}</span>
                <span className="rounded-full bg-[rgba(0,155,72,0.12)] px-2 py-1 text-xs font-bold text-[#06783A]">
                  {t("admin:classFilled", { percent: totals.occupancy })}
                </span>
              </header>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  <Mini label={t("admin:classStudents")} value={totals.students} />
                  <Mini label={t("admin:classFreeSeats")} value={totals.free} />
                  <Mini label={t("admin:classTotalCapacity")} value={totals.capacity} />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div className="h-full bg-[#009B48]" style={{ width: `${Math.min(100, totals.occupancy)}%` }} />
                </div>
              </div>
            </section>
            <section className="rounded-lg border border-[#E2E8F0] bg-white">
              <header className="border-b border-[#E2E8F0] px-4 py-3 font-semibold text-[#0B192C]">{t("admin:classAssignmentTitle")}</header>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Mini label={t("admin:classAssignedLabel")} value={totals.assigned} />
                  <Mini label={t("admin:classUnassignedLabel")} value={totals.unassigned} />
                </div>
                {totals.unassigned > 0 ? (
                  <p className="mt-3 rounded-[7px] bg-[rgba(245,158,11,0.1)] px-3 py-2 text-[0.82rem] font-semibold text-[#9A6700]">
                    <TriangleAlert aria-hidden="true" className="me-1 inline size-4" />
                    {t("admin:classNeedsTeacher", { count: totals.unassigned })}
                  </p>
                ) : (
                  <p className="mt-3 rounded-[7px] bg-[rgba(0,155,72,0.08)] px-3 py-2 text-[0.82rem] font-semibold text-[#06783A]">
                    <CircleCheck aria-hidden="true" className="me-1 inline size-4" />
                    {t("admin:classAllAssigned")}
                  </p>
                )}
              </div>
            </section>
          </div>

          <section className="mb-4 overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
            <header className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 font-semibold text-[#0B192C]">
              <span>{t("admin:classListTitle")}</span>
              <span className="rounded-full bg-[#F1F5F9] px-2 py-1 text-xs font-bold text-[#475569]">
                {t("admin:classCountBadge", { count: totals.total })}
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="mb-0 w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[#0B192C]">
                    <th className="px-3 py-2">{t("admin:classColGrade")}</th>
                    <th className="px-3 py-2">{t("admin:classColSection")}</th>
                    <th className="px-3 py-2">{t("admin:classColStream")}</th>
                    <th className="px-3 py-2">{t("admin:classColTeacher")}</th>
                    <th className="px-3 py-2">{t("admin:classColStudents")}</th>
                    <th className="px-3 py-2">{t("admin:classColCapacity")}</th>
                    <th className="px-3 py-2">{t("admin:classColStatus")}</th>
                    <th className="px-3 py-2 text-end">{t("admin:classColActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const pct = percent(row.studentCount, row.maxCapacity);
                    const status = statusOf(row.studentCount, row.maxCapacity);
                    return (
                      <tr key={row.id} className="border-t border-[#E2E8F0]">
                        <td className="px-3 py-2 font-bold">{row.gradeLevel}</td>
                        <td className="px-3 py-2">{row.section}</td>
                        <td className="px-3 py-2">
                          <span className="rounded bg-[rgba(11,25,44,0.08)] px-2 py-1 text-xs font-semibold text-[#0B192C]">{row.stream ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2">
                          {row.classTeacherId ? (
                            <button type="button" title={t("admin:classChangeTitle")} onClick={() => openAssign(row)} className="font-semibold text-[#334155]">
                              {row.teacherName}
                            </button>
                          ) : (
                            <button type="button" onClick={() => openAssign(row)} className="font-semibold text-[#9A6700]">
                              <UserPlus aria-hidden="true" className="me-1 inline size-4" />
                              {t("admin:classUnassigned")}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <strong>{row.studentCount}</strong>
                          <span className="text-[#64748B]"> / {row.maxCapacity}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-[#E2E8F0]">
                              <div className="h-full bg-[#009B48]" style={{ width: `${pct}%` }} />
                            </div>
                            <small>{pct}%</small>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "rounded px-2 py-1 text-xs font-semibold",
                              status === "full" && "bg-[rgba(220,38,38,0.1)] text-[#B91C1C]",
                              status === "near" && "bg-[rgba(245,158,11,0.12)] text-[#9A6700]",
                              status === "open" && "bg-[rgba(0,155,72,0.1)] text-[#06783A]",
                            )}
                          >
                            {t(status === "full" ? "admin:classStatusFull" : status === "near" ? "admin:classStatusNear" : "admin:classStatusOpen")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-end">
                          <button type="button" title={t("admin:classEdit")} onClick={() => openEdit(row)} className="me-1 rounded border border-[#E2E8F0] p-1.5">
                            <Pen aria-hidden="true" className="size-3.5" />
                          </button>
                          <button type="button" title={row.classTeacherId ? t("admin:classChangeTeacher") : t("admin:classAssignTeacher")} onClick={() => openAssign(row)} className="me-1 rounded border border-[#E2E8F0] p-1.5">
                            <UserPlus aria-hidden="true" className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title={t("admin:classDelete")}
                            onClick={() => {
                              if (!window.confirm(t("admin:classDeleteConfirm"))) return;
                              removeClass.mutate(row.id, {
                                onSuccess: () => setNotice({ tone: "success", text: t("admin:classDeleted") }),
                                onError: showError,
                              });
                            }}
                            className="rounded border border-[#E2E8F0] p-1.5 text-[#B91C1C]"
                          >
                            <Trash2 aria-hidden="true" className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-[#64748B]">
                        {t("admin:classEmpty")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <LegacyModal
        open={baseOpen}
        onClose={() => setBaseOpen(false)}
        title={t("admin:classBaseTitle")}
        headerClassName="bg-[#0B192C] text-white"
        closeWhite
        footer={
          <>
            <button type="button" onClick={() => setBaseOpen(false)} className="rounded-md bg-[#f8f9fa] px-3 py-2 text-sm">
              {t("admin:classCancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                const gradeLevel = Number(baseGrade);
                if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || !baseSection.trim()) {
                  setNotice({ tone: "danger", text: t("errors:validation") });
                  return;
                }
                createBase.mutate(
                  { gradeLevel, section: baseSection.trim() },
                  {
                    onSuccess: () => {
                      setBaseOpen(false);
                      setBaseGrade("");
                      setBaseSection("");
                      setNotice({ tone: "success", text: t("admin:classBaseSaved") });
                    },
                    onError: showError,
                  },
                );
              }}
              className="rounded-md bg-[#0B192C] px-3 py-2 text-sm font-semibold text-white"
            >
              {t("admin:classSave")}
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Grade
            <input className={fieldClass} type="number" min={1} value={baseGrade} onChange={(event) => setBaseGrade(event.target.value)} />
          </label>
          <label className="text-sm">
            Section
            <input className={fieldClass} value={baseSection} onChange={(event) => setBaseSection(event.target.value)} placeholder="A" />
          </label>
        </div>
      </LegacyModal>

      <LegacyModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        wide
        title={editing === "new" ? t("admin:classAddTitle") : t("admin:classEditTitle")}
        headerClassName="bg-[#0B192C] text-white"
        closeWhite
        footer={
          <>
            <button type="button" onClick={() => setEditing(null)} className="rounded-md bg-[#f8f9fa] px-3 py-2 text-sm">
              {t("admin:classCancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                const body = bodyFromForm();
                if (!body) return;
                const done = () => {
                  setEditing(null);
                  setNotice({ tone: "success", text: t(editing === "new" ? "admin:classSaved" : "admin:classUpdated") });
                };
                if (editing === "new") createClass.mutate(body, { onSuccess: done, onError: showError });
                else if (editing) updateClass.mutate({ id: editing.id, body }, { onSuccess: done, onError: showError });
              }}
              className="rounded-md bg-[#0B192C] px-3 py-2 text-sm font-semibold text-white"
            >
              {t("admin:classSaveChanges")}
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Grade
            <input className={fieldClass} type="number" min={1} value={form.gradeLevel} onChange={(event) => setForm({ ...form, gradeLevel: event.target.value })} />
          </label>
          <label className="text-sm">
            Section
            <input className={fieldClass} value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} />
          </label>
          <label className="text-sm">
            {t("admin:classStream")}
            <select
              className={fieldClass}
              value={form.stream ?? ""}
              onChange={(event) => setForm({ ...form, stream: event.target.value === "" ? null : (event.target.value as ClassStream) })}
            >
              <option value="">{t("admin:classStreamNone")}</option>
              <option value="Natural">Natural</option>
              <option value="Social">Social</option>
            </select>
          </label>
          <label className="text-sm">
            {t("admin:classCapacity")}
            <input className={fieldClass} type="number" min={1} value={form.maxCapacity} onChange={(event) => setForm({ ...form, maxCapacity: event.target.value })} />
          </label>
          <label className="text-sm sm:col-span-2">
            {t("admin:classHomeroomTeacher")}
            <select className={fieldClass} value={form.classTeacherId} onChange={(event) => setForm({ ...form, classTeacherId: event.target.value })}>
              <option value="">{t("admin:classStreamNone")}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </LegacyModal>

      <LegacyModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title={t("admin:classAssignTitle")}
        headerClassName="bg-[#0B192C] text-white"
        closeWhite
        footer={
          <>
            <button type="button" onClick={() => setAssignOpen(false)} className="rounded-md bg-[#f8f9fa] px-3 py-2 text-sm">
              {t("admin:classCancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (assignId === "" || !assignTeacher) {
                  setNotice({ tone: "danger", text: t("errors:validation") });
                  return;
                }
                assignHomeroom.mutate(
                  { id: assignId, teacherId: Number(assignTeacher) },
                  {
                    onSuccess: () => {
                      setAssignOpen(false);
                      setNotice({ tone: "success", text: t("admin:classHomeroomSaved") });
                    },
                    onError: showError,
                  },
                );
              }}
              className="rounded-md bg-[#0B192C] px-3 py-2 text-sm font-semibold text-white"
            >
              {t("admin:classAssignSubmit")}
            </button>
          </>
        }
      >
        <label className="mb-3 block text-sm">
          {t("admin:classPickClass")}
          <select
            className={fieldClass}
            value={assignId}
            onChange={(event) => {
              const id = event.target.value === "" ? "" : Number(event.target.value);
              setAssignId(id);
              const row = rows.find((item) => item.id === id);
              setAssignTeacher(row?.classTeacherId == null ? "" : String(row.classTeacherId));
            }}
          >
            <option value="">{t("admin:classPickClassPlaceholder")}</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>
                {row.gradeLevel} - {row.section}
                {row.stream ? ` / ${row.stream}` : ""}
              </option>
            ))}
          </select>
        </label>
        {selected ? (
          <div className="mb-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <div className="mb-2 text-sm font-bold text-[#0B192C]">{t("admin:classSmart")}</div>
            {selected.recommendations.length === 0 ? (
              <p className="text-sm text-[#64748B]">{t("admin:classNoRecommendation")}</p>
            ) : (
              selected.recommendations.map((rec, index) => (
                <button
                  key={rec.staffId}
                  type="button"
                  onClick={() => setAssignTeacher(String(rec.staffId))}
                  className={cn("mb-2 flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left", index === 0 ? "border-[#009B48]" : "border-[#E2E8F0]")}
                >
                  <span className="font-bold">{index + 1}</span>
                  <span className="grow">
                    <strong>{rec.teacherName}</strong>
                    <small className="block text-[#64748B]">
                      {t("admin:classRecMeta", {
                        subjects: rec.matchingSubjects || "Subject assignment",
                        matching: rec.matchingSubjectCount,
                        assignments: rec.totalYearAssignments,
                      })}
                    </small>
                  </span>
                  <span className="text-sm font-semibold">
                    {t("admin:classRecCredits", { credits: rec.totalYearCredits })}
                    {index === 0 ? " ★" : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
        <label className="block text-sm">
          {t("admin:classPickTeacher")}
          <select className={fieldClass} value={assignTeacher} onChange={(event) => setAssignTeacher(event.target.value)}>
            <option value="">{t("admin:classPickTeacherPlaceholder")}</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-[#64748B]">{t("admin:classRecommendHelp")}</p>
      </LegacyModal>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  extra,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  extra?: string;
  tone: "accent" | "success" | "warning" | "dark";
}) {
  const wrap = {
    accent: "bg-[rgba(245,158,11,0.12)] text-[#F59E0B]",
    success: "bg-[rgba(0,155,72,0.1)] text-[#009B48]",
    warning: "bg-[rgba(245,158,11,0.12)] text-[#F59E0B]",
    dark: "bg-[rgba(11,25,44,0.08)] text-[#0B192C]",
  }[tone];
  return (
    <article className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-4">
      <span className={cn("grid size-11 place-items-center rounded-[10px]", wrap)}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div>
        <div className="text-[0.78rem] font-semibold text-[#64748B]">{label}</div>
        <div className="text-[1.5rem] leading-none font-extrabold text-[#0B192C]">
          {value} {extra ? <small className="text-[0.8rem] font-semibold text-[#64748B]">{extra}</small> : null}
        </div>
      </div>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <span className="block text-xs text-[#64748B]">{label}</span>
      <strong className="text-[1.15rem] text-[#0B192C]">{value}</strong>
    </div>
  );
}

function Action({ onClick, icon: Icon, label }: { onClick: () => void; icon: typeof Plus; label: string }) {
  return (
    <button type="button" onClick={onClick} className="rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#334155] hover:border-[#009B48] hover:text-[#009B48]">
      <Icon aria-hidden="true" className="me-1 inline size-4" />
      {label}
    </button>
  );
}
