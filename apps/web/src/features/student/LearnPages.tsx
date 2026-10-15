import { type FormEvent, useState } from "react";
import { Atom, FlaskConical, Leaf, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Badge, Button, Card, CardBody, EmptyState, Modal } from "@/components/ui";
import { openStudentFile, shortDate, useStudentQuiz, useStudentResources, useStudentSims, type ResourceRow, type SimRow } from "./studentApi";
import { StudentPanel } from "./StudentPanel";

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

export function ResourcesPage() {
  const { t } = useTranslation("student");
  const [filters, setFilters] = useState({ search: "", semester: "", year: "" });
  const [draft, setDraft] = useState(filters);
  const [reading, setReading] = useState<ResourceRow | null>(null);
  const query = useStudentResources(filters);
  return (
    <StudentPanel query={query}>
      {(data) => (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-brand-900">{t("filesTitle")}</h2>
            <Badge tone="neutral">{t("classLine", { grade: data.gradeLevel, section: data.section, stream: data.stream })}</Badge>
          </div>
          <Card>
            <CardBody>
              <form
                className="grid gap-3 md:grid-cols-4"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  setFilters(draft);
                }}
              >
                <label className="text-sm font-bold">
                  {t("searchByName")}
                  <input
                    value={draft.search}
                    onChange={(event) => setDraft({ ...draft, search: event.target.value })}
                    placeholder={t("searchPlaceholder")}
                    className="mt-1 min-h-tap w-full rounded-control border border-border px-3"
                  />
                </label>
                <label className="text-sm font-bold">
                  {t("semester")}
                  <select
                    value={draft.semester}
                    onChange={(event) => setDraft({ ...draft, semester: event.target.value })}
                    className="mt-1 min-h-tap w-full rounded-control border border-border px-3"
                  >
                    <option value="">{t("all")}</option>
                    <option value="1st Semester">{t("sem1")}</option>
                    <option value="2nd Semester">{t("sem2")}</option>
                  </select>
                </label>
                <label className="text-sm font-bold">
                  {t("year")}
                  <input
                    value={draft.year}
                    onChange={(event) => setDraft({ ...draft, year: event.target.value })}
                    placeholder={t("yearPlaceholder")}
                    className="mt-1 min-h-tap w-full rounded-control border border-border px-3"
                  />
                </label>
                <div className="flex items-end">
                  <Button type="submit" fullWidth>
                    {t("filter")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
          {data.rows.length === 0 ? (
            <EmptyState title={t("noFiles")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.rows.map((row) => (
                <Card key={row.id}>
                  <CardBody className="flex h-full flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="brand">{row.subjectName || t("generalSubject")}</Badge>
                      <span className="text-xs text-ink-muted">{shortDate(row.sharedAt)}</span>
                    </div>
                    <h3 className="truncate font-bold" title={row.title}>
                      {row.title}
                    </h3>
                    <p className="text-sm text-ink-muted">{row.teacherName}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{t("semesterBadge", { value: row.semester ?? "" })}</Badge>
                      <Badge>{t("yearBadge", { value: row.academicYear ?? "" })}</Badge>
                    </div>
                    <div className="mt-auto flex gap-2">
                      {row.fileType === "EDITOR" ? (
                        <Button fullWidth onClick={() => setReading(row)}>
                          {t("read")}
                        </Button>
                      ) : (
                        <>
                          <Button variant="secondary" fullWidth onClick={() => void openStudentFile(`/student/resources/${row.id}/file`)}>
                            {t("view")}
                          </Button>
                          <Button fullWidth onClick={() => void openStudentFile(`/student/resources/${row.id}/file`)}>
                            {t("download")}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
          <Modal open={reading != null} onClose={() => setReading(null)} title={reading?.title ?? ""}>
            {reading ? (
              <div className="space-y-3 text-sm">
                <p>
                  {t("teacher")} <strong>{reading.teacherName}</strong>
                </p>
                <p className="whitespace-pre-wrap break-words">{reading.content}</p>
                <Button variant="secondary" onClick={() => setReading(null)}>
                  {t("close")}
                </Button>
              </div>
            ) : null}
          </Modal>
        </div>
      )}
    </StudentPanel>
  );
}

export function ExamsPage() {
  const { t } = useTranslation("student");
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

export function QuizPage() {
  const { t } = useTranslation("student");
  const query = useStudentQuiz();
  return (
    <StudentPanel query={query}>
      {(data) => {
        if (!data.inGroup) {
          return <div className="rounded-panel bg-warning/10 px-4 py-8 text-center font-semibold text-warning-strong">{t("quizNotInGroup")}</div>;
        }
        return (
          <div className="rounded-panel bg-gradient-to-br from-brand-900 via-brand-800 to-gold p-4 text-white">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="rounded-full border border-white/30 px-3 py-1 text-sm">{data.groupName}</p>
                <p className="mt-2 text-sm font-bold text-ink-strong">{t("rank")}</p>
              </div>
              <div className="text-end">
                <p className="text-3xl font-bold text-gold">0</p>
                <p className="text-xs uppercase">{t("points")}</p>
              </div>
            </div>
            <Card>
              <CardBody>
                <h3 className="mb-4 text-center text-lg font-bold">{t("activeExams")}</h3>
                {data.exams.length === 0 ? (
                  <div className="py-6 text-center">
                    <h4 className="font-bold text-ink-muted">{t("noActiveExam")}</h4>
                    <p className="text-sm text-ink-muted">{t("waitTeacher")}</p>
                    <Button variant="secondary" className="mt-3" onClick={() => void query.refetch()}>
                      {t("checkAgain")}
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {data.exams.map((exam) => (
                      <li key={exam.examId} className="flex items-center justify-between gap-3 rounded-card border-l-4 border-brand-700 bg-canvas px-4 py-3">
                        <div>
                          <p className="font-bold">{t("examId", { id: exam.examId })}</p>
                          <p className="text-xs text-ink-muted">{t("startedAt", { time: shortDate(exam.startTime) })}</p>
                        </div>
                        <button type="button" className="rounded-full bg-brand-700 px-4 py-2 text-sm font-bold text-white" onClick={() => void query.refetch()}>
                          {t("start")}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        );
      }}
    </StudentPanel>
  );
}

const LABS = [
  { id: "physics", icon: Zap, title: "physics", hint: "physicsHint", url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html" },
  { id: "chemistry", icon: Atom, title: "chemistry", hint: "chemistryHint", url: "https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_all.html" },
  { id: "biology", icon: Leaf, title: "biology", hint: "biologyHint", url: "https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_all.html" },
] as const;

export function VirtualLabPage() {
  const { t } = useTranslation("student");
  const [url, setUrl] = useState<string | null>(null);
  if (url) {
    return (
      <div className="space-y-3">
        <Button variant="secondary" onClick={() => setUrl(null)}>
          {t("close")}
        </Button>
        <iframe title={t("labTitle")} src={url} className="h-[70vh] w-full rounded-card border border-border bg-shell" />
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-panel bg-shell p-4 text-white sm:p-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gold">{t("labTitle")}</h2>
        <p className="text-sm text-white/70">{t("labSubtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LABS.map((lab) => {
          const Icon = lab.icon;
          return (
            <button
              key={lab.id}
              type="button"
              onClick={() => setUrl(lab.url)}
              className="rounded-card border border-white/10 bg-shell-hover p-5 text-center hover:-translate-y-1"
            >
              <Icon aria-hidden="true" className="mx-auto mb-2 size-8 text-gold" />
              <h3 className="font-bold">{t(lab.title)}</h3>
              <p className="text-sm text-white/60">{t(lab.hint)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
