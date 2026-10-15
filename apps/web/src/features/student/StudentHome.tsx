import { CalendarCheck, FlaskConical, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button, Card, CardBody, EmptyState } from "@/components/ui";
import { openStudentFile, shortDate, useStudentHome, type SimRow } from "./studentApi";
import { StudentPanel } from "./StudentPanel";

function openSim(row: SimRow): void {
  if (row.externalUrl) {
    window.open(row.externalUrl, "_blank", "noopener");
    return;
  }
  if (row.hasFile) void openStudentFile(`/student/simulations/${row.id}/file`);
}

export function StudentHome() {
  const { t } = useTranslation("student");
  const query = useStudentHome();
  return (
    <StudentPanel query={query}>
      {(data) => (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-panel bg-gradient-to-br from-brand-900 to-brand-600 p-6 text-white shadow-raised sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  {t(data.greeting === "morning" ? "greetingMorning" : data.greeting === "afternoon" ? "greetingAfternoon" : "greetingEvening")}
                  {"፣ "}
                  {data.fullName}!
                </h2>
                <p className="mt-1 text-sm text-white/80">{t("welcomeLine")}</p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full bg-surface px-4 py-2 text-sm font-semibold text-brand-700">
                {t("classBadge", { grade: data.gradeLevel, section: data.section })}
              </span>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardBody className="flex items-center gap-3 border-l-4 border-brand-700">
                <span className="flex size-12 items-center justify-center rounded-card bg-brand-50 text-brand-700">
                  <FlaskConical aria-hidden="true" className="size-6" />
                </span>
                <div>
                  <p className="text-lg font-bold">{data.simulationCount}</p>
                  <p className="text-sm text-ink-muted">{t("simCount")}</p>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="flex items-center gap-3 border-l-4 border-success">
                <span className="flex size-12 items-center justify-center rounded-card bg-success/10 text-success">
                  <CalendarCheck aria-hidden="true" className="size-6" />
                </span>
                <div>
                  <p className="text-lg font-bold">{data.today}</p>
                  <p className="text-sm text-ink-muted">{t("today")}</p>
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">{t("recentSims")}</h3>
            <Link to="/student/simulations" className="text-sm font-semibold text-brand-700">
              {t("seeAll")}
            </Link>
          </div>

          {data.simulations.length === 0 ? (
            <Card>
              <EmptyState title={t("emptyDashTitle")} description={t("emptyDashBody")} />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.simulations.map((row) => (
                <Card key={row.id}>
                  <CardBody className="flex h-full flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                        {row.subjectName}
                      </span>
                      <span className="text-xs text-ink-muted">{shortDate(row.createdAt)}</span>
                    </div>
                    <h4 className="font-bold">{row.title}</h4>
                    <Button fullWidth leftIcon={<Play aria-hidden="true" className="size-4" />} onClick={() => openSim(row)}>
                      {t("startSim")}
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
