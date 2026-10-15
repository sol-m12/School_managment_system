import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui";
import { useStudentExams } from "./api/useStudentExams";
import { StudentPanel } from "./components/StudentPanel";

export function ExamsPage() {
  const { t } = useTranslation("student");
  const query = useStudentExams();
  return (
    <StudentPanel query={query}>
      {(data) => {
        if (data.locked) {
          return (
            <div className="mx-auto max-w-lg rounded-panel bg-surface px-6 py-10 text-center shadow-panel">
              <p className="text-5xl" aria-hidden="true">
                🚫
              </p>
              <h2 className="mt-3 text-xl font-bold text-danger">{t("examWarningTitle")}</h2>
              <p className="mt-2 text-sm text-ink">{t("examWarningBody")}</p>
              <Link to="/dashboard" className="mt-6 inline-flex min-h-tap items-center rounded-control bg-brand-900 px-5 text-sm font-bold text-white">
                {t("backLogin")}
              </Link>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-brand-900">{t("examListTitle")}</h2>
              <div className="flex gap-2">
                <Badge tone="neutral">{t("gradeLabel", { grade: data.gradeLevel })}</Badge>
                <Badge tone="brand">{t("sectionLabel", { section: data.section })}</Badge>
              </div>
            </div>
            {data.rows.length === 0 ? (
              <Card>
                <EmptyState title={t("noPublishedExams")} />
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {data.rows.map((row) => (
                  <Card key={row.id}>
                    <CardBody className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold">{row.title}</h3>
                        <Badge tone={row.taken ? "success" : "warning"}>{t(row.taken ? "examTaken" : "examReady")}</Badge>
                      </div>
                      <p className="text-sm text-ink-muted">{row.subjectName}</p>
                      {row.description ? <p className="text-sm">{row.description}</p> : null}
                      <p className="text-xs text-ink-muted">{t("examMinutes", { count: row.durationMinutes ?? 0 })}</p>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      }}
    </StudentPanel>
  );
}
