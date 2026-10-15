import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CardBody, EmptyState } from "@/components/ui";
import { openStudentFile, shortDate } from "./api/format";
import type { SimRow } from "./api/types";
import { useStudentSims } from "./api/useStudentSims";
import { StudentPanel } from "./components/StudentPanel";

function openSim(row: SimRow): void {
  if (row.externalUrl) {
    window.open(row.externalUrl, "_blank", "noopener");
    return;
  }
  if (row.hasFile) void openStudentFile(`/student/simulations/${row.id}/file`);
}

export function SimulationsPage() {
  const { t } = useTranslation("student");
  const query = useStudentSims();
  return (
    <StudentPanel query={query}>
      {(data) => (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-brand-900">{t("simsTitle")}</h2>
            <div className="flex gap-2">
              <Badge tone="neutral">{t("gradeLabel", { grade: data.gradeLevel })}</Badge>
              <Badge tone="brand">{t("sectionLabel", { section: data.section })}</Badge>
            </div>
          </div>
          {data.rows.length === 0 ? (
            <Card>
              <EmptyState
                title={t("noSimsTitle")}
                description={t("noSimsBody")}
                action={
                  <Link to="/dashboard" className="inline-flex min-h-tap items-center rounded-control border border-border px-4 text-sm font-semibold">
                    {t("backDashboard")}
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.rows.map((row) => (
                <Card key={row.id}>
                  <CardBody className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <FlaskConical aria-hidden="true" className="size-8 text-brand-700" />
                      <Badge tone="brand">{row.subjectName}</Badge>
                    </div>
                    <h3 className="font-bold">{row.title}</h3>
                    <p className="text-sm text-ink-muted">{t("sentOn", { date: shortDate(row.createdAt) })}</p>
                    <Button fullWidth className="mt-auto" onClick={() => openSim(row)}>
                      {t("openLab")}
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </StudentPanel>
  );
}
