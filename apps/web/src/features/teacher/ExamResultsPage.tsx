import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useExamResults, useResultList } from "./api/useTeacherPages";

export function ExamResultsPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const exams = useResultList();
  const [examId, setExamId] = useState<number | null>(null);
  const detail = useExamResults(examId);

  if (exams.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (exams.isError || !exams.data) return <Alert tone="danger">{t(`errors:${toErrorKey(exams.error)}`)}</Alert>;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-[#1a237e]">{t("teacher:resultsTitle")}</h1>
        <p className="text-sm text-ink-muted">{t("teacher:resultsHint")}</p>
      </header>
      <section className="overflow-hidden rounded-xl bg-surface shadow-raised">
        <h2 className="border-b border-border px-4 py-3 font-bold">{t("teacher:resultsBoard")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left">
              <tr>
                <th className="px-3 py-2">{t("teacher:examHeading")}</th>
                <th className="px-3 py-2">{t("teacher:subject")}</th>
                <th className="px-3 py-2">{t("teacher:classSection")}</th>
                <th className="px-3 py-2">{t("teacher:studentsTested")}</th>
                <th className="px-3 py-2">{t("teacher:durationCol")}</th>
                <th className="px-3 py-2">{t("teacher:action")}</th>
              </tr>
            </thead>
            <tbody>
              {exams.data.exams.map((exam) => (
                <tr key={exam.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{exam.title}</td>
                  <td className="px-3 py-2">{exam.subjectName}</td>
                  <td className="px-3 py-2">
                    {exam.vocational || exam.gradeLevel == null
                      ? t("teacher:vocational")
                      : t("teacher:classSectionValue", { grade: exam.gradeLevel, section: exam.section ?? "" })}
                  </td>
                  <td className="px-3 py-2">{t("teacher:studentCount", { count: exam.studentCount })}</td>
                  <td className="px-3 py-2">{exam.durationMinutes} {t("teacher:minutes")}</td>
                  <td className="px-3 py-2">
                    <Button type="button" onClick={() => setExamId(exam.id)}>{t("teacher:showStudents")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {examId !== null ? (
        <section className="rounded-xl bg-surface p-4 shadow-raised">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">{t("teacher:resultDetail", { title: detail.data?.title ?? "" })}</h2>
            <Button type="button" variant="secondary" onClick={() => setExamId(null)}>{t("common:close")}</Button>
          </div>
          {detail.isPending ? <Spinner label={t("common:loading")} /> : null}
          {detail.isError ? <Alert tone="danger">{t(`errors:${toErrorKey(detail.error)}`)}</Alert> : null}
          {detail.data && detail.data.students.length === 0 ? <p className="text-ink-muted">{t("teacher:noTakers")}</p> : null}
          {detail.data && detail.data.students.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1">{t("teacher:fullName")}</th>
                  <th className="px-2 py-1">{t("teacher:idNumber")}</th>
                  <th className="px-2 py-1">{t("teacher:classSection")}</th>
                  <th className="px-2 py-1">{t("teacher:scoreGot")}</th>
                  <th className="px-2 py-1">{t("teacher:takenOn")}</th>
                </tr>
              </thead>
              <tbody>
                {detail.data.students.map((student) => (
                  <tr key={student.id} className="border-t border-border">
                    <td className="px-2 py-2">{student.fullName}</td>
                    <td className="px-2 py-2">{student.id}</td>
                    <td className="px-2 py-2">{t("teacher:classSectionValue", { grade: student.gradeLevel, section: student.section })}</td>
                    <td className="px-2 py-2">{student.totalScore.toFixed(2)}</td>
                    <td className="px-2 py-2">{student.submittedAt ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
