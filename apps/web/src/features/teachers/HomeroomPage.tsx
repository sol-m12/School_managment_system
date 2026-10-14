import { Info, Pencil, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { LegacyModal } from "@/features/teachers/components/LegacyModal";
import { TeacherModuleBar } from "@/features/teachers/components/TeacherModuleBar";
import { useAssignHomeroom, useClasses, type ClassRow } from "@/features/teachers/api/useClasses";

const field =
  "w-full rounded-md border border-[#ced4da] bg-white px-3 py-2 text-base text-[#212529] focus:border-[#86b7fe] focus:outline-none";

function classLabel(row: ClassRow): string {
  return `${row.gradeLevel}${row.section}${row.stream ? ` (${row.stream})` : ""}`;
}

export function HomeroomPage() {
  const { t } = useTranslation(["admin", "errors", "common"]);
  const query = useClasses();
  const assign = useAssignHomeroom();
  const [sessionId, setSessionId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [editTeacher, setEditTeacher] = useState("");

  const rows = query.data?.rows ?? [];
  const teachers = query.data?.teachers ?? [];
  const taken = useMemo(() => new Set(rows.flatMap((row) => (row.classTeacherId == null ? [] : [row.classTeacherId]))), [rows]);
  const openClasses = rows.filter((row) => row.classTeacherId == null);
  const assigned = rows.filter((row) => row.classTeacherId != null);
  const freeTeachers = teachers.filter((teacher) => !taken.has(teacher.id));

  const run = (id: number, nextTeacher: number | null, saved: string) => {
    assign.mutate(
      { id, teacherId: nextTeacher },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: saved });
          setSessionId("");
          setTeacherId("");
          setEditing(null);
        },
        onError: (error) => {
          const key = toErrorKey(error);
          setNotice({
            tone: "danger",
            text: key === "teacherInUse" ? t("admin:homeroomTaken") : t(`errors:${key}`),
          });
        },
      },
    );
  };

  return (
    <div className="bg-[#f8fafc] px-3 py-4 md:px-8">
      <TeacherModuleBar />
      <div className="mb-4">
        <h4 className="mb-1 text-xl font-bold text-[#212529]">{t("admin:homeroomTitle")}</h4>
        <p className="mb-0 text-sm text-[#6c757d]">{t("admin:homeroomSubtitle", { year: query.data?.academicYear ?? "" })}</p>
      </div>

      {query.isPending ? (
        <div className="flex justify-center py-10 text-brand-700">
          <Spinner size="lg" label={t("common:loading")} />
        </div>
      ) : null}
      {query.isError ? <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert> : null}

      {notice ? (
        <div
          className={`mb-4 flex items-start justify-between gap-3 rounded-md px-4 py-3 text-sm shadow-sm ${
            notice.tone === "danger"
              ? "bg-[#f8d7da] text-[#842029]"
              : notice.tone === "info"
                ? "bg-[#cff4fc] text-[#055160]"
                : "bg-[#d1e7dd] text-[#0f5132]"
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" className="font-bold" onClick={() => setNotice(null)} aria-label={t("common:close")}>
            ×
          </button>
        </div>
      ) : null}

      {query.data ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-xl border-t-4 border-[#0d6efd] bg-white p-4 shadow-sm lg:col-span-1">
            <h6 className="mb-4 text-xs font-bold tracking-wide text-[#0d6efd] uppercase">{t("admin:homeroomFormTitle")}</h6>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                run(Number(sessionId), Number(teacherId), t("admin:homeroomSaved"));
              }}
            >
              <label className="mb-3 block text-sm font-bold">
                {t("admin:homeroomPickClass")}
                <select className={`${field} mt-1`} required value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
                  <option value="">{t("admin:homeroomPickClassPlaceholder")}</option>
                  {openClasses.map((row) => (
                    <option key={row.id} value={row.id}>
                      {t("admin:homeroomGrade", { name: classLabel(row) })}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mb-2 block text-sm font-bold">
                {t("admin:homeroomPickTeacher")}
                <select className={`${field} mt-1`} required value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
                  <option value="">{t("admin:homeroomPickTeacherPlaceholder")}</option>
                  {freeTeachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mb-4 flex items-start gap-1 text-xs text-[#6c757d]">
                <Info aria-hidden="true" className="mt-0.5 size-3.5" />
                {t("admin:homeroomFreeOnly")}
              </p>
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0d6efd] py-2 font-bold text-white" disabled={assign.isPending}>
                <Save aria-hidden="true" className="size-4" />
                {t("admin:homeroomSave")}
              </button>
            </form>
          </section>

          <section className="rounded-xl bg-white shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between px-4 py-3">
              <h6 className="mb-0 font-bold">
                {t("admin:homeroomAssignedTitle")}{" "}
                <span className="ms-2 rounded bg-[#f8f9fa] px-2 py-1 text-sm text-[#212529]">{assigned.length}</span>
              </h6>
            </div>
            <div className="overflow-x-auto">
              <table className="mb-0 w-full text-sm">
                <thead className="bg-[#f8f9fa] text-left text-xs text-[#6c757d]">
                  <tr>
                    <th className="px-4 py-2">{t("admin:homeroomColClass")}</th>
                    <th className="px-4 py-2">{t("admin:homeroomColTeacher")}</th>
                    <th className="px-4 py-2 text-center">{t("admin:homeroomColAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {assigned.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-[#6c757d]">
                        {t("admin:homeroomEmpty")}
                      </td>
                    </tr>
                  ) : (
                    assigned.map((row) => (
                      <tr key={row.id} className="border-t border-[#e2e8f0]">
                        <td className="px-4 py-3 font-bold">
                          {t("admin:homeroomGrade", { name: `${row.gradeLevel}${row.section}` })}
                          {row.stream ? <span className="ms-1 rounded bg-[#6c757d] px-1.5 py-0.5 font-mono text-xs text-white">{row.stream}</span> : null}
                        </td>
                        <td className="px-4 py-3">
                          <span className="me-2 hidden size-9 items-center justify-center rounded-lg bg-[#dbeafe] font-bold text-[#1e40af] md:inline-flex">
                            {row.teacherName.slice(0, 1)}
                          </span>
                          <span className="font-semibold">{row.teacherName}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            className="border px-3 py-1"
                            onClick={() => {
                              setEditing(row);
                              setEditTeacher(String(row.classTeacherId ?? ""));
                            }}
                          >
                            <Pencil aria-hidden="true" className="inline size-4 text-[#ffc107]" />
                          </button>
                          <button
                            type="button"
                            className="border border-l-0 px-3 py-1"
                            onClick={() => {
                              if (!window.confirm(t("admin:homeroomResetConfirm"))) return;
                              run(row.id, null, t("admin:homeroomReset"));
                            }}
                          >
                            <Trash2 aria-hidden="true" className="inline size-4 text-[#dc3545]" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      <LegacyModal
        open={editing != null}
        onClose={() => setEditing(null)}
        title={t("admin:homeroomEditTitle")}
        headerClassName="bg-[#0d6efd] text-white"
        closeWhite
        footer={
          <>
            <button type="button" className="rounded-md bg-[#f8f9fa] px-4 py-2" onClick={() => setEditing(null)}>
              {t("admin:homeroomCancel")}
            </button>
            <button
              type="button"
              className="rounded-md bg-[#0d6efd] px-4 py-2 font-bold text-white"
              onClick={() => {
                if (!editing) return;
                run(editing.id, Number(editTeacher), t("admin:homeroomSaved"));
              }}
            >
              {t("admin:homeroomUpdate")}
            </button>
          </>
        }
      >
        {editing ? (
          <>
            <div className="mb-4 rounded-lg bg-[#f8f9fa] p-3 text-center">
              <div className="mb-1 text-xs text-[#6c757d]">{t("admin:homeroomSelectedClass")}</div>
              <div className="text-xl font-bold text-[#0d6efd]">{t("admin:homeroomGrade", { name: `${editing.gradeLevel}${editing.section}` })}</div>
            </div>
            <label className="block text-sm font-bold text-[#6c757d]">
              {t("admin:homeroomNewTeacher")}
              <select className={`${field} mt-2 py-3 text-lg`} value={editTeacher} onChange={(event) => setEditTeacher(event.target.value)}>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
      </LegacyModal>
    </div>
  );
}
