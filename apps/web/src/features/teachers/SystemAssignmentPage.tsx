import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Spinner } from "@/components/ui";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import { toErrorKey } from "@/lib/apiError";
import { TeacherModuleBar } from "./components/TeacherModuleBar";

type Teacher = { id: number; name: string; experience: number; subjectId: number | null; load: number };
type Subject = { id: number; name: string; gradeLevel: number; stream: string; creditHours: number; isVocational: number | null };
type ClassRow = { id: number; gradeLevel: number; stream: "Natural" | "Social" | null; section: string };
type Assignment = { id: number; staffId: number; subjectId: number; gradeLevel: number; section: string | null; creditHours: number; firstName: string };
type Board = { year: string; cap: number; teachers: Teacher[]; subjects: Subject[]; classes: ClassRow[]; assignments: Assignment[] };

function applies(subject: Subject, room: ClassRow): boolean {
  if (subject.isVocational === 1) return false;
  if (subject.stream === "Common") return true;
  return room.stream === subject.stream;
}

function shortName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, 4).toUpperCase();
}

export function SystemAssignmentPage() {
  const { t } = useTranslation(["admin", "errors", "common"]);
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", tenantId, "system-assignment"],
    queryFn: async () => (await api.get<Board>("/admin/system-assignment")).data,
  });
  const refresh = async () => client.invalidateQueries({ queryKey: ["admin", tenantId, "system-assignment"] });
  const auto = useMutation({
    mutationFn: async () => api.post("/admin/system-assignment/auto"),
    onSuccess: () => void refresh(),
  });
  const save = useMutation({
    mutationFn: async (body: { staffId: number; subjectId: number; gradeLevel: number; section: string | null; assignmentId?: number }) => {
      if (body.assignmentId) return api.put(`/admin/system-assignment/${body.assignmentId}`, { staffId: body.staffId });
      return api.post("/admin/system-assignment", body);
    },
    onSuccess: () => void refresh(),
  });
  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/system-assignment/${id}`),
    onSuccess: () => void refresh(),
  });
  const [modal, setModal] = useState<{ subjectId: number; gradeLevel: number; section: string | null; assignmentId?: number; label: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const data = query.data;

  const grades = useMemo(() => [...new Set((data?.subjects ?? []).map((subject) => subject.gradeLevel))].sort((a, b) => b - a), [data]);

  if (query.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (query.isError || !data) return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;

  const findAssignment = (subjectId: number, gradeLevel: number, section: string | null) =>
    data.assignments.find((row) => row.subjectId === subjectId && row.gradeLevel === gradeLevel && (row.section ?? null) === section);

  return (
    <div className="px-3 py-4">
      <TeacherModuleBar />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">{t("admin:assignTitle")}</h2>
          <p className="text-sm font-bold text-[#0d6efd]">
            {t("admin:assignYear")} {data.year}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md bg-[#0d6efd] px-4 py-2 font-bold text-white"
            onClick={() => {
              if (!window.confirm(t("admin:assignAutoConfirm"))) return;
              auto.mutate(undefined, {
                onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)),
              });
            }}
          >
            {t("admin:assignAuto")}
          </button>
          <button type="button" className="rounded-md border px-4 py-2 font-bold" onClick={() => window.print()}>
            {t("admin:assignPrint")}
          </button>
        </div>
      </div>
      {notice ? <Alert tone="danger" className="mb-4">{notice}</Alert> : null}

      <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-extrabold">{t("admin:assignOpen")}</h3>
        <div className="flex flex-wrap gap-2">
          {data.subjects.flatMap((subject) => {
            if (subject.isVocational === 1) {
              if (findAssignment(subject.id, subject.gradeLevel, null)) return [];
              return [
                <button
                  key={`v-${subject.id}`}
                  type="button"
                  className="rounded-full bg-[#fff3cd] px-3 py-1 text-sm font-bold"
                  onClick={() => setModal({ subjectId: subject.id, gradeLevel: subject.gradeLevel, section: null, label: `${subject.name} (G-${subject.gradeLevel} Voc)` })}
                >
                  G-{subject.gradeLevel} (Voc): {subject.name}
                </button>,
              ];
            }
            return data.classes
              .filter((room) => room.gradeLevel === subject.gradeLevel && applies(subject, room) && !findAssignment(subject.id, subject.gradeLevel, room.section))
              .map((room) => (
                <button
                  key={`${subject.id}-${room.id}`}
                  type="button"
                  className="rounded-full bg-[#e7f1ff] px-3 py-1 text-sm font-bold"
                  onClick={() =>
                    setModal({
                      subjectId: subject.id,
                      gradeLevel: subject.gradeLevel,
                      section: room.section,
                      label: `${subject.name} (G-${subject.gradeLevel}${room.section})`,
                    })
                  }
                >
                  G-{subject.gradeLevel}
                  {room.section}: {subject.name}
                </button>
              ));
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {grades.map((grade) => {
            const subjects = data.subjects.filter((subject) => subject.gradeLevel === grade);
            const rooms = data.classes.filter((room) => room.gradeLevel === grade);
            return (
              <section key={grade} className="overflow-x-auto rounded-2xl bg-white p-3 shadow-sm">
                <h3 className="mb-2 font-extrabold">Grade {grade}</h3>
                <table className="w-full min-w-[720px] border text-center text-sm">
                  <thead>
                    <tr className="bg-[#1a237e] text-white">
                      <th className="px-2 py-2">SEC</th>
                      {subjects.map((subject) => (
                        <th key={subject.id} className="px-2 py-2" title={subject.name}>
                          {shortName(subject.name)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border px-2 py-2 font-bold">Vocational</td>
                      {subjects.map((subject) => {
                        const row = subject.isVocational === 1 ? findAssignment(subject.id, grade, null) : undefined;
                        return (
                          <td key={subject.id} className="border px-2 py-2">
                            {subject.isVocational !== 1 ? "-" : row ? (
                              <button type="button" className="font-bold text-[#0d6efd]" title={row.firstName} onClick={() => setModal({ subjectId: subject.id, gradeLevel: grade, section: null, assignmentId: row.id, label: subject.name })}>
                                ID-{row.staffId}
                              </button>
                            ) : (
                              "-"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {rooms.map((room) => (
                      <tr key={room.id}>
                        <td className="border px-2 py-2 font-bold">
                          {room.section}
                          <div className="text-xs font-normal text-[#6c757d]">{room.stream ?? ""}</div>
                        </td>
                        {subjects.map((subject) => {
                          if (!applies(subject, room)) return <td key={subject.id} className="border bg-[#f1f5f9]" />;
                          const row = findAssignment(subject.id, grade, room.section);
                          return (
                            <td key={subject.id} className="border px-2 py-2">
                              {row ? (
                                <button type="button" className="font-bold text-[#0d6efd]" title={row.firstName} onClick={() => setModal({ subjectId: subject.id, gradeLevel: grade, section: room.section, assignmentId: row.id, label: subject.name })}>
                                  ID-{row.staffId}
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
        <aside className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-extrabold">{t("admin:assignLoad")}</h3>
          <ul className="space-y-3">
            {data.teachers.map((teacher) => {
              const width = Math.min(100, (teacher.load / data.cap) * 100);
              const over = teacher.load > data.cap;
              return (
                <li key={teacher.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>
                      ID-{teacher.id} ({teacher.name.split(" ")[0]})
                    </span>
                    <strong className={over ? "text-[#dc3545]" : "text-[#198754]"}>
                      {teacher.load}/{data.cap} hr
                    </strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-[#e9ecef]">
                    <div className={`h-full ${over ? "bg-[#dc3545]" : "bg-[#198754]"}`} style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              const staffId = Number(new FormData(event.currentTarget).get("staffId"));
              save.mutate(
                { ...modal, staffId },
                {
                  onSuccess: () => setModal(null),
                  onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)),
                },
              );
            }}
          >
            <h3 className="mb-3 font-extrabold">{t("admin:assignModal")}</h3>
            <p className="mb-3 text-sm">{modal.label}</p>
            <select name="staffId" required className="mb-4 w-full rounded-md border px-3 py-2" defaultValue="">
              <option value="">{t("admin:assignPickTeacher")}</option>
              {data.teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  ID-{teacher.id} - {teacher.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <button type="submit" name="mode" value="save" className="rounded-md bg-[#0d6efd] px-3 py-2 font-bold text-white">
                {modal.assignmentId ? t("admin:assignChange") : t("admin:assignNew")}
              </button>
              {modal.assignmentId ? (
                <button
                  type="button"
                  className="rounded-md bg-[#dc3545] px-3 py-2 font-bold text-white"
                  onClick={() => {
                    if (!window.confirm(t("admin:assignDeleteConfirm"))) return;
                    remove.mutate(modal.assignmentId ?? 0, {
                      onSuccess: () => setModal(null),
                      onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)),
                    });
                  }}
                >
                  {t("admin:studentDelete")}
                </button>
              ) : null}
              <button type="button" className="rounded-md border px-3 py-2" onClick={() => setModal(null)}>
                {t("admin:homeroomCancel")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
