import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useImportScores,
  useSaveScholarshipSettings,
  useScholarshipSettings,
  useScholarshipStudents,
} from "./api/useScholarships";

export function ScholarshipRecordsPage() {
  const { t } = useTranslation(["scholarships", "errors", "common"]);
  const settings = useScholarshipSettings();
  const students = useScholarshipStudents();
  const saveSettings = useSaveScholarshipSettings();
  const importScores = useImportScores();
  const [year, setYear] = useState("2017");
  const [cutoff, setCutoff] = useState("350");
  const [studentId, setStudentId] = useState(0);
  const [score, setScore] = useState("");
  const [transcriptRef, setTranscriptRef] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  function onSettings(event: FormEvent) {
    event.preventDefault();
    saveSettings.mutate(
      { academicYear: year, cutoffScore: Number(cutoff) },
      {
        onSuccess: () => setNotice({ tone: "success", text: t("settingsSaved") }),
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  function onImport(event: FormEvent) {
    event.preventDefault();
    if (!studentId) return;
    importScores.mutate(
      {
        academicYear: year,
        rows: [
          {
            studentId,
            nationalScore: Number(score),
            transcriptRef,
          },
        ],
      },
      {
        onSuccess: () => setNotice({ tone: "success", text: t("scoresImported") }),
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  return (
    <>
      <PageHeader title={t("recordsTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <CardBody>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onSettings}>
            <Input label={t("year")} value={year} onChange={(e) => setYear(e.target.value)} required />
            <Input
              label={t("cutoff")}
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
              required
            />
            <div className="flex items-end">
              <Button type="submit" loading={saveSettings.isPending}>
                {t("saveSettings")}
              </Button>
            </div>
          </form>
          {settings.data?.rows?.length ? (
            <p className="mt-3 text-sm text-ink-muted">
              {settings.data.rows
                .map((r) => `${r.academicYear}: ${r.cutoffScore}`)
                .join(" · ")}
            </p>
          ) : null}
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onImport}>
            {students.isPending ? (
              <Spinner label={t("common:loading")} />
            ) : (students.data?.students.length ?? 0) === 0 ? (
              <Alert tone="info">{t("noStudents")}</Alert>
            ) : (
              <label className="grid gap-1 text-sm">
                <span>{t("student")}</span>
                <select
                  className="rounded border border-border px-3 py-2"
                  value={studentId ? String(studentId) : ""}
                  onChange={(e) => setStudentId(Number(e.target.value) || 0)}
                  required
                >
                  <option value="">{t("chooseStudent")}</option>
                  {students.data?.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Input label={t("nationalScore")} value={score} onChange={(e) => setScore(e.target.value)} required />
            <Input
              label={t("transcriptRef")}
              value={transcriptRef}
              onChange={(e) => setTranscriptRef(e.target.value)}
            />
            <div className="flex items-end">
              <Button type="submit" loading={importScores.isPending}>
                {t("importScore")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
