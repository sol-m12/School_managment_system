import { useState, type DragEvent } from "react";
import { BadgeCheck, Siren, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { toErrorKey } from "@/lib/apiError";
import {
  useAnalytics,
  useAtRisk,
  useCorrelation,
  useCreateIncident,
  useCreateTraining,
  useDeleteReport,
  useDemographics,
  useIncidentStatus,
  useIncidents,
  useIssueCertificate,
  useLibraryCheck,
  useMoeReport,
  useOpenTransfer,
  useReportDefs,
  useRunReport,
  useSaveClearance,
  useSaveReport,
  useTraining,
  useTransfers,
  useWarnings,
  type Certificate,
  type Insight,
  type MoeReport,
  type TransferRow,
} from "./api/usePrincipal";
import { GradeBars, Panel, PassChart, pct, readForm, textOf, useNotice } from "./officeUi";

const FIELDS = ["name", "gender", "gradeLevel", "section", "year", "registrationType", "average", "absenceRate"] as const;

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: string) => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
}

function fieldLabel(t: (key: string) => string, field: string): string {
  const map: Record<string, string> = {
    name: "fieldName",
    gender: "fieldGender",
    gradeLevel: "fieldGrade",
    section: "fieldSection",
    year: "fieldYear",
    registrationType: "fieldRegistration",
    average: "fieldAverage",
    absenceRate: "fieldAbsence",
  };
  return t(map[field] ?? field);
}

function insightText(t: (key: string, options?: Record<string, unknown>) => string, insight: Insight): string {
  if (insight.code === "passDrop") return t("insightPassDrop", { value: insight.value });
  if (insight.code === "gradeBehind") return t("insightGradeBehind", { value: insight.value, grade: insight.grade ?? "" });
  if (insight.code === "absenceHigh") return t("insightAbsenceHigh", { value: insight.value });
  if (insight.code === "submissionLow") return t("insightSubmissionLow", { value: insight.value });
  if (insight.code === "genderGap") return t("insightGenderGap", { value: insight.value });
  return t("insightAtRisk", { value: insight.value });
}

export function AnalyticsPage() {
  const { t } = useTranslation("principal");
  const query = useAnalytics();
  return (
    <>
      <PageHeader title={t("compareTitle")} description={t("compareHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label={t("passRate")} value={pct(data.schoolPassRate)} icon={BadgeCheck} />
              <StatCard label={t("latestYear")} value={data.latestYear ?? "—"} icon={Users} />
            </div>
            <Card>
              <CardHeader title={t("passRate")} />
              <CardBody>
                <PassChart rows={data.years} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("grade")} />
              <CardBody>
                <GradeBars rows={data.grades} />
              </CardBody>
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function CorrelationPage() {
  const { t } = useTranslation("principal");
  const query = useCorrelation();
  return (
    <>
      <PageHeader title={t("correlationTitle")} description={t("correlationHelp")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "teacher", header: t("teacher"), render: (row) => row.teacher },
                { key: "subject", header: t("subject"), render: (row) => row.subject },
                { key: "grade", header: t("grade"), render: (row) => `${row.gradeLevel}${row.section ? `-${row.section}` : ""}` },
                { key: "year", header: t("year"), render: (row) => row.year },
                { key: "students", header: t("classSize"), render: (row) => row.students },
                { key: "average", header: t("average"), render: (row) => row.average ?? "—" },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function TransfersPage() {
  const { t } = useTranslation(["principal", "errors"]);
  const query = useTransfers();
  const open = useOpenTransfer();
  const library = useLibraryCheck();
  const save = useSaveClearance();
  const issue = useIssueCertificate();
  const { setNotice, view } = useNotice();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [flags, setFlags] = useState<Record<number, { libraryClear: boolean; storeClear: boolean; financeClear: boolean }>>({});
  const flagOf = (row: TransferRow) => flags[row.id] ?? { libraryClear: row.libraryClear, storeClear: row.storeClear, financeClear: row.financeClear };
  return (
    <>
      <PageHeader title={t("transferTitle")} description={t("transferHelp")} />
      {view}
      <style>{`@media print { body * { visibility: hidden; } .certificate-sheet, .certificate-sheet * { visibility: visible; } .certificate-sheet { position: absolute; inset: 0; background: white; } }`}</style>
      {certificate ? (
        <Card className="certificate-sheet mb-4">
          <CardHeader title={t("certificate")} actions={<Button type="button" variant="secondary" onClick={() => window.print()}>{t("print")}</Button>} />
          <CardBody>
            <p className="text-lg font-semibold text-ink-strong">{certificate.studentName}</p>
            <p>{t("certificateNo")}: {certificate.number}</p>
            <p>{t("grade")}: {certificate.gradeLevel}{certificate.section ? `-${certificate.section}` : ""} · {certificate.academicYear}</p>
            <p>{t("destination")}: {certificate.destination}</p>
            <p>{t("reason")}: {certificate.reason}</p>
            <p>{t("when")}: {certificate.issuedOn}</p>
          </CardBody>
        </Card>
      ) : null}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("transferTitle")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    open.mutate(
                      { studentId: Number(textOf(form, "studentId")), destination: textOf(form, "destination"), reason: textOf(form, "reason") },
                      { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
                    );
                  }}
                >
                  <Select
                    name="studentId"
                    label={t("student")}
                    options={data.students.map((student) => ({
                      value: String(student.id),
                      label: `${student.name} · ${student.gradeLevel}${student.section ? `-${student.section}` : ""} · ${student.year}`,
                    }))}
                    placeholder={t("student")}
                  />
                  <Input name="destination" label={t("destination")} required />
                  <Input name="reason" label={t("reason")} required />
                  <Button type="submit" loading={open.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "name", header: t("student"), render: (row) => row.studentName },
                  { key: "to", header: t("destination"), render: (row) => row.destination },
                  { key: "status", header: t("status"), render: (row) => <Badge tone={row.status === "Issued" ? "success" : "neutral"}>{row.status === "Issued" ? t("issued") : row.status === "Cleared" ? t("clear") : t("open")}</Badge> },
                  {
                    key: "flags",
                    header: t("clear"),
                    render: (row) => {
                      const current = flagOf(row);
                      return (
                        <div className="flex flex-col gap-1 text-sm">
                          <label><input type="checkbox" checked={current.libraryClear} onChange={(event) => setFlags((map) => ({ ...map, [row.id]: { ...current, libraryClear: event.target.checked } }))} /> {t("library")}</label>
                          <label><input type="checkbox" checked={current.storeClear} onChange={(event) => setFlags((map) => ({ ...map, [row.id]: { ...current, storeClear: event.target.checked } }))} /> {t("store")}</label>
                          <label><input type="checkbox" checked={current.financeClear} onChange={(event) => setFlags((map) => ({ ...map, [row.id]: { ...current, financeClear: event.target.checked } }))} /> {t("finance")}</label>
                        </div>
                      );
                    },
                  },
                  {
                    key: "act",
                    header: t("action"),
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" loading={library.isPending} onClick={() => library.mutate(row.id, { onError: (error) => fail(setNotice, t, error) })}>{t("checkLibrary")}</Button>
                        <Button type="button" variant="secondary" loading={save.isPending} onClick={() => save.mutate({ id: row.id, ...flagOf(row) }, { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) })}>{t("saveClearance")}</Button>
                        <Button type="button" loading={issue.isPending} onClick={() => issue.mutate(row.id, { onSuccess: (result) => { setCertificate(result); setNotice({ tone: "success", text: t("issued") }); }, onError: (error) => fail(setNotice, t, error) })}>{t("issueCertificate")}</Button>
                      </div>
                    ),
                  },
                ]}
                rows={data.transfers}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function AtRiskPage() {
  const { t } = useTranslation("principal");
  const query = useAtRisk();
  return (
    <>
      <PageHeader title={t("atRiskTitle")} description={t("atRiskHelp")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardHeader title={data.latestYear ? `${t("latestYear")}: ${data.latestYear}` : t("atRiskTitle")} />
            <Table
              columns={[
                { key: "name", header: t("student"), render: (row) => row.name },
                { key: "grade", header: t("grade"), render: (row) => `${row.gradeLevel}${row.section ? `-${row.section}` : ""}` },
                { key: "average", header: t("average"), render: (row) => row.average ?? "—" },
                { key: "absence", header: t("absence"), render: (row) => pct(row.absenceRate) },
                { key: "score", header: t("score"), render: (row) => row.score },
                { key: "band", header: t("band"), render: (row) => <Badge tone={row.band === "high" ? "danger" : "warning"}>{t(row.band)}</Badge> },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

function downloadCsv(report: MoeReport) {
  const lines = [
    ["school", report.schoolName],
    ["date", report.generatedOn],
    ["year", "students", "male", "female", "passRate", "presentRate"],
    ...report.years.map((year) => [year.year, year.students, year.male, year.female, year.passRate ?? "", year.presentRate ?? ""]),
  ];
  const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "moe-woreda-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function MoePage() {
  const { t } = useTranslation("principal");
  const query = useMoeReport();
  return (
    <>
      <PageHeader title={t("moeTitle")} description={t("moeHelp")} />
      <style>{`@media print { body * { visibility: hidden; } .moe-sheet, .moe-sheet * { visibility: visible; } .moe-sheet { position: absolute; inset: 0; background: white; } }`}</style>
      <Panel query={query}>
        {(data) => (
          <div className="moe-sheet grid gap-4">
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button type="button" onClick={() => downloadCsv(data)}>{t("downloadCsv")}</Button>
              <Button type="button" variant="secondary" onClick={() => window.print()}>{t("print")}</Button>
            </div>
            <Card>
              <CardHeader title={data.schoolName || t("school")} description={`${data.generatedOn} · ${t("passMark")}`} />
              <CardBody>
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label={t("teachers")} value={String(data.teachers)} icon={Users} />
                  <StatCard label={t("staffApproved")} value={`${data.approvedStaff}/${data.staffTotal}`} icon={BadgeCheck} />
                  <StatCard label={t("latestYear")} value={data.latestYear ?? "—"} icon={Siren} />
                </div>
              </CardBody>
              <Table
                columns={[
                  { key: "year", header: t("year"), render: (row) => row.year },
                  { key: "students", header: t("students"), render: (row) => row.students },
                  { key: "male", header: t("male"), render: (row) => row.male },
                  { key: "female", header: t("female"), render: (row) => row.female },
                  { key: "pass", header: t("passRate"), render: (row) => pct(row.passRate) },
                  { key: "present", header: t("attendanceRate"), render: (row) => pct(row.presentRate) },
                ]}
                rows={data.years}
                rowKey={(row) => row.year}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function TrainingPage() {
  const { t } = useTranslation(["principal", "errors"]);
  const query = useTraining();
  const create = useCreateTraining();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("trainingTitle")} description={t("trainingHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    create.mutate(
                      {
                        title: textOf(form, "title"),
                        trainer: textOf(form, "trainer"),
                        audience: textOf(form, "audience"),
                        scheduledOn: textOf(form, "scheduledOn"),
                        seats: Number(textOf(form, "seats")),
                        notes: textOf(form, "notes"),
                      },
                      { onSuccess: () => { setNotice({ tone: "success", text: t("saved") }); event.currentTarget.reset(); }, onError: (error) => fail(setNotice, t, error) },
                    );
                  }}
                >
                  <Input name="title" label={t("title")} required />
                  <Input name="trainer" label={t("trainer")} required />
                  <Input name="audience" label={t("audience")} required />
                  <Input name="scheduledOn" type="date" label={t("scheduledOn")} required />
                  <Input name="seats" type="number" min={1} label={t("seats")} required />
                  <Input name="notes" label={t("notes")} />
                  <Button type="submit" loading={create.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "trainer", header: t("trainer"), render: (row) => row.trainer },
                  { key: "audience", header: t("audience"), render: (row) => row.audience },
                  { key: "date", header: t("scheduledOn"), render: (row) => row.scheduledOn },
                  { key: "seats", header: t("seats"), render: (row) => row.seats },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function BuilderPage() {
  const { t } = useTranslation(["principal", "errors"]);
  const query = useReportDefs();
  const save = useSaveReport();
  const run = useRunReport();
  const remove = useDeleteReport();
  const { setNotice, view } = useNotice();
  const [columns, setColumns] = useState<string[]>([]);
  const [name, setName] = useState("");
  const drop = (event: DragEvent, index?: number) => {
    event.preventDefault();
    const field = event.dataTransfer.getData("text/plain");
    if (!FIELDS.includes(field as (typeof FIELDS)[number])) return;
    setColumns((current) => {
      const next = current.filter((item) => item !== field);
      next.splice(index ?? next.length, 0, field);
      return next;
    });
  };
  return (
    <>
      <PageHeader title={t("builderTitle")} description={t("builderHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
            <Card>
              <CardHeader title={t("available")} />
              <CardBody className="grid gap-2">
                {FIELDS.map((field) => (
                  <button
                    key={field}
                    type="button"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", field)}
                    className="rounded-control border border-border bg-canvas px-3 py-2 text-left text-sm font-medium text-ink-strong"
                  >
                    {fieldLabel(t, field)}
                  </button>
                ))}
              </CardBody>
            </Card>
            <div className="grid gap-4">
              <Card>
                <CardHeader title={t("layout")} />
                <CardBody>
                  <div
                    className="min-h-28 rounded-card border border-dashed border-brand-100 bg-brand-50/40 p-3"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => drop(event)}
                  >
                    {columns.length === 0 ? <p className="text-sm text-ink-muted">{t("dropHere")}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      {columns.map((field, index) => (
                        <span
                          key={field}
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("text/plain", field)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => drop(event, index)}
                          className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-3 py-1 text-sm text-white"
                        >
                          {fieldLabel(t, field)}
                          <button type="button" className="text-white/80" onClick={() => setColumns((current) => current.filter((item) => item !== field))}>
                            {t("remove")}
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <Input label={t("reportName")} value={name} onChange={(event) => setName(event.target.value)} />
                    <Button
                      type="button"
                      loading={save.isPending}
                      disabled={columns.length === 0 || name.trim() === ""}
                      onClick={() =>
                        save.mutate(
                          { name: name.trim(), columns },
                          { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
                        )
                      }
                    >
                      {t("save")}
                    </Button>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <Table
                  columns={[
                    { key: "name", header: t("reportName"), render: (row) => row.name },
                    { key: "columns", header: t("layout"), render: (row) => row.columns.map((column) => fieldLabel(t, column)).join(", ") },
                    {
                      key: "act",
                      header: t("action"),
                      render: (row) => (
                        <div className="flex gap-2">
                          <Button type="button" loading={run.isPending} onClick={() => run.mutate(row.id, { onError: (error) => fail(setNotice, t, error) })}>{t("run")}</Button>
                          <Button type="button" variant="danger" loading={remove.isPending} onClick={() => remove.mutate(row.id, { onError: (error) => fail(setNotice, t, error) })}>{t("remove")}</Button>
                        </div>
                      ),
                    },
                  ]}
                  rows={data.rows}
                  rowKey={(row) => row.id}
                  empty={t("empty")}
                />
              </Card>
              {run.data ? (
                <Card>
                  <CardHeader title={t("run")} />
                  <Table
                    columns={run.data.columns.map((column) => ({
                      key: column,
                      header: fieldLabel(t, column),
                      render: (row: { key: number } & Record<string, string | number | null>) => {
                        const value = row[column];
                        if (column === "gender" && value === "M") return t("genderM");
                        if (column === "gender" && value === "F") return t("genderF");
                        return value ?? "—";
                      },
                    }))}
                    rows={run.data.rows.map((row, index) => ({ ...row, key: index }))}
                    rowKey={(row) => row.key}
                    empty={t("empty")}
                  />
                </Card>
              ) : null}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

export function WarningsPage() {
  const { t } = useTranslation("principal");
  const query = useWarnings();
  return (
    <>
      <PageHeader title={t("warningsTitle")} description={t("warningsHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardBody className="grid gap-2">
                {data.insights.length === 0 ? <p className="text-sm text-ink-muted">{t("insightStable")}</p> : data.insights.map((insight) => (
                  <p key={`${insight.code}-${insight.grade ?? ""}`} className="text-sm text-ink-strong">{insightText(t, insight)}</p>
                ))}
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "name", header: t("student"), render: (row) => row.name },
                  { key: "grade", header: t("grade"), render: (row) => row.gradeLevel },
                  { key: "score", header: t("score"), render: (row) => row.score },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function IncidentsPage() {
  const { t } = useTranslation(["principal", "errors"]);
  const query = useIncidents();
  const create = useCreateIncident();
  const status = useIncidentStatus();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("incidentsTitle")} description={t("incidentsHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    const student = textOf(form, "studentId");
                    create.mutate(
                      { title: textOf(form, "title"), details: textOf(form, "details"), severity: textOf(form, "severity"), studentId: student ? Number(student) : null },
                      { onSuccess: () => { setNotice({ tone: "success", text: t("saved") }); event.currentTarget.reset(); }, onError: (error) => fail(setNotice, t, error) },
                    );
                  }}
                >
                  <Input name="title" label={t("title")} required />
                  <Select name="severity" label={t("severity")} options={[{ value: "low", label: t("low") }, { value: "medium", label: t("medium") }, { value: "high", label: t("high") }]} />
                  <Input name="details" label={t("detail")} required />
                  <Input name="studentId" label={`${t("studentId")} (${t("optional")})`} />
                  <Button type="submit" loading={create.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "severity", header: t("severity"), render: (row) => <Badge tone={row.severity === "high" ? "danger" : row.severity === "medium" ? "warning" : "neutral"}>{t(row.severity)}</Badge> },
                  { key: "details", header: t("detail"), render: (row) => row.details },
                  {
                    key: "status",
                    header: t("status"),
                    render: (row) => (
                      <Select
                        label={t("status")}
                        value={row.status}
                        options={[
                          { value: "Open", label: t("open") },
                          { value: "Investigating", label: t("investigating") },
                          { value: "Resolved", label: t("resolved") },
                        ]}
                        onChange={(event) => status.mutate({ id: row.id, status: event.target.value }, { onError: (error) => fail(setNotice, t, error) })}
                      />
                    ),
                  },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function DemographicsPage() {
  const { t } = useTranslation("principal");
  const query = useDemographics();
  return (
    <>
      <PageHeader title={t("demographicsTitle")} description={t("demographicsHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("genderRatio")} />
              <CardBody>
                <PassChart rows={data.years.map((year) => ({ year: year.year, passRate: year.femaleShare }))} />
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "year", header: t("year"), render: (row) => row.year },
                  { key: "students", header: t("students"), render: (row) => row.students },
                  { key: "male", header: t("male"), render: (row) => row.male },
                  { key: "female", header: t("female"), render: (row) => row.female },
                  { key: "share", header: t("genderRatio"), render: (row) => pct(row.femaleShare) },
                  { key: "p25", header: t("p25"), render: (row) => row.p25 ?? "—" },
                  { key: "p50", header: t("p50"), render: (row) => row.p50 ?? "—" },
                  { key: "p75", header: t("p75"), render: (row) => row.p75 ?? "—" },
                  { key: "reg", header: t("registration"), render: (row) => row.registration.map((item) => `${item.type || "—"} ${item.count}`).join(", ") || "—" },
                ]}
                rows={data.years}
                rowKey={(row) => row.year}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}
