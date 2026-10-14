import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useHomeroomAttendance,
  useSaveHomeroomAttendance,
  useSaveSubjectAttendance,
  useSubjectAttendance,
  type AttendanceMark,
} from "./api/useTeacherPages";

const MARKS = ["X", "A", "P", "L"] as const;

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function TakeAttendancePage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [date, setDate] = useState(today);
  const [classId, setClassId] = useState("");
  const sheet = useHomeroomAttendance(date, classId);
  const save = useSaveHomeroomAttendance();
  const [marks, setMarks] = useState<Record<number, AttendanceMark>>({});
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    if (!sheet.data) return;
    const next: Record<number, AttendanceMark> = {};
    for (const student of sheet.data.students) next[student.id] = student.mark;
    setMarks(next);
    if (sheet.data.classId && classId === "") setClassId(String(sheet.data.classId));
  }, [sheet.data, classId]);

  if (sheet.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (sheet.isError || !sheet.data) return <Alert tone="danger">{t(`errors:${toErrorKey(sheet.error)}`)}</Alert>;

  const data = sheet.data;
  function setAll(mark: AttendanceMark) {
    setMarks((current) => {
      const next = { ...current };
      for (const student of data.students) next[student.id] = mark;
      return next;
    });
  }

  async function onSave() {
    if (!data.classId) return;
    setNotice(null);
    const payload = data.students
      .map((student) => ({ studentId: student.id, mark: marks[student.id] }))
      .filter((row): row is { studentId: number; mark: Exclude<AttendanceMark, ""> } => row.mark !== "" && row.mark !== undefined);
    try {
      await save.mutateAsync({ classId: data.classId, date, marks: payload });
      setNotice({ tone: "success", text: t("teacher:attendanceSaved") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 rounded-xl bg-surface p-4 shadow-raised print:hidden md:grid-cols-3">
        <label className="text-sm font-bold">
          {t("teacher:pickClass")}
          <select
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
            className="mt-1 w-full rounded-control border border-border px-3 py-2 font-normal"
          >
            {data.classes.length === 0 ? <option value="">{t("teacher:noAssignedClass")}</option> : null}
            {data.classes.map((room) => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:pickDate")}
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-control border border-border px-3 py-2 font-normal" />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAll("X")}>
            {t("teacher:markAllPresent")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setAll("A")}>
            {t("teacher:markAllAbsent")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            {t("teacher:printForm")}
          </Button>
        </div>
      </div>

      {notice ? <Alert tone={notice.tone} className="mb-4 print:hidden">{notice.text}</Alert> : null}

      <section className="overflow-hidden rounded-xl bg-surface shadow-raised print:hidden">
        <div className="bg-[#0b1f44] px-4 py-3 text-white">
          <h1 className="text-lg font-bold">{t("teacher:takeTitle")}</h1>
          <p className="text-sm">{t("teacher:dateLabel", { date })}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-2 py-2">{t("teacher:studentNameCol")}</th>
                <th className="px-2 py-2">{t("teacher:sex")}</th>
                <th className="px-2 py-2 text-center">{t("teacher:markLegend")}</th>
                <th className="px-2 py-2">{t("teacher:remark")}</th>
              </tr>
            </thead>
            <tbody>
              {data.students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ink-muted">
                    {t("teacher:noStudents")}
                  </td>
                </tr>
              ) : (
                data.students.map((student, index) => (
                  <tr key={student.id} className="border-t border-border">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-2 py-2 font-semibold">{student.fullName}</td>
                    <td className="px-2 py-2">{student.gender}</td>
                    <td className="px-2 py-2">
                      <div className="flex justify-center gap-3">
                        {MARKS.map((value) => (
                          <label key={value} className="inline-flex items-center gap-1 text-sm font-bold">
                            <input
                              type="radio"
                              checked={(marks[student.id] ?? "") === value}
                              onChange={() => setMarks((current) => ({ ...current, [student.id]: value }))}
                            />
                            {value}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={remarks[student.id] ?? ""}
                        onChange={(event) => setRemarks((current) => ({ ...current, [student.id]: event.target.value }))}
                        className="w-full rounded-control border border-border px-2 py-1"
                        aria-label={t("teacher:remark")}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4">
          <Button type="button" onClick={onSave} loading={save.isPending} disabled={!data.classId}>
            {t("teacher:saveAttendance")}
          </Button>
        </div>
      </section>

      <section className="hidden print:block text-black">
        <h2 className="text-center text-sm font-bold">{t("teacher:printSchool")}</h2>
        <p className="text-center text-xs font-bold">
          {t("teacher:printYear", { year: data.academicYear })} {t("teacher:printMonth")} {t("teacher:printGrade", { grade: data.gradeLevel ?? "" })}{" "}
          {t("teacher:printSec", { section: data.section ?? "" })}
        </p>
        <table className="mt-2 w-full border-collapse text-[10px]">
          <thead>
            <tr>
              {["RNO", "STUDENT FULL NAME", "SEX", "AGE", "kebele", "gote"].map((heading) => (
                <th key={heading} className="border border-black px-1">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.students.map((student, index) => (
              <tr key={student.id}>
                <td className="border border-black px-1">{index + 1}</td>
                <td className="border border-black px-1">{student.fullName}</td>
                <td className="border border-black px-1">{student.gender}</td>
                <td className="border border-black px-1">{student.age}</td>
                <td className="border border-black px-1">{student.kebele ?? ""}</td>
                <td className="border border-black px-1">{student.gote ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function AttendanceRegisterPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [date, setDate] = useState(today);
  const [classSelect, setClassSelect] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const sheet = useSubjectAttendance(date, classSelect, subjectId);
  const save = useSaveSubjectAttendance();
  const [marks, setMarks] = useState<Record<number, AttendanceMark>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    if (!sheet.data) return;
    const next: Record<number, AttendanceMark> = {};
    for (const student of sheet.data.students) next[student.id] = student.mark;
    setMarks(next);
  }, [sheet.data]);

  if (sheet.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (sheet.isError || !sheet.data) return <Alert tone="danger">{t(`errors:${toErrorKey(sheet.error)}`)}</Alert>;
  const data = sheet.data;

  async function onSave() {
    if (!classSelect || !subjectId) return;
    setNotice(null);
    const payload = data.students
      .map((student) => ({ studentId: student.id, mark: marks[student.id] }))
      .filter((row): row is { studentId: number; mark: Exclude<AttendanceMark, ""> } => row.mark !== "" && row.mark !== undefined);
    try {
      await save.mutateAsync({ classSelect, subjectId: Number(subjectId), date, marks: payload });
      setNotice({ tone: "success", text: t("teacher:attendanceSaved") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">{t("teacher:registerTitle")}</h1>
      <div className="mb-4 grid gap-3 rounded-xl bg-surface p-4 shadow-raised md:grid-cols-4">
        <label className="text-sm font-bold">
          {t("teacher:pickClass")}
          <select value={classSelect} onChange={(event) => setClassSelect(event.target.value)} className="mt-1 w-full rounded-control border border-border px-3 py-2 font-normal">
            <option value="">{t("teacher:choose")}</option>
            {data.classes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:subjectPick")}
          <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="mt-1 w-full rounded-control border border-border px-3 py-2 font-normal">
            <option value="">{t("teacher:choose")}</option>
            {data.subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:pickDate")}
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-control border border-border px-3 py-2 font-normal" />
        </label>
        <div className="flex items-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setMarks(Object.fromEntries(data.students.map((student) => [student.id, "X"])))}>
            {t("teacher:markAllPresent")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMarks(Object.fromEntries(data.students.map((student) => [student.id, "A"])))}>
            {t("teacher:markAllAbsent")}
          </Button>
        </div>
      </div>
      {notice ? <Alert tone={notice.tone} className="mb-4">{notice.text}</Alert> : null}
      <div className="overflow-x-auto rounded-xl bg-surface shadow-raised">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-left">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-2 py-2">{t("teacher:studentNameCol")}</th>
              <th className="px-2 py-2">{t("teacher:sex")}</th>
              <th className="px-2 py-2 text-center">{t("teacher:markLegend")}</th>
            </tr>
          </thead>
          <tbody>
            {data.students.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-ink-muted">
                  {t("teacher:noStudents")}
                </td>
              </tr>
            ) : (
              data.students.map((student, index) => (
                <tr key={student.id} className="border-t border-border">
                  <td className="px-3 py-2">{index + 1}</td>
                  <td className="px-2 py-2">{student.fullName}</td>
                  <td className="px-2 py-2">{student.gender}</td>
                  <td className="px-2 py-2">
                    <div className="flex justify-center gap-3">
                      {MARKS.map((value) => (
                        <label key={value} className="inline-flex items-center gap-1 font-bold">
                          <input
                            type="radio"
                            checked={marks[student.id] === value}
                            onChange={() => setMarks((current) => ({ ...current, [student.id]: value }))}
                          />
                          {value}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="p-4">
          <Button type="button" onClick={onSave} loading={save.isPending} disabled={!classSelect || !subjectId}>
            {t("teacher:saveAttendance")}
          </Button>
        </div>
      </div>
    </div>
  );
}
