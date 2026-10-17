import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, IdCard, Megaphone, ScanLine, Sparkles, UserPlus, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Select, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { useCan } from "@/features/auth/authContext";
import { toErrorKey } from "@/lib/apiError";
import {
  useAppointmentStatus,
  useAppointments,
  useCleanup,
  useCreateAppointment,
  useCreateDocument,
  useCreateNotice,
  useCreateTicket,
  useDecideDocument,
  useDecideNotice,
  useDocuments,
  useIdCards,
  useNotices,
  useOcrScans,
  usePendingApprovals,
  useRegisterScan,
  useRegisterStudent,
  useRenew,
  useRenewals,
  useRunCleanup,
  useScanForm,
  useSecretaryDesk,
  useSecretaryStudents,
  useTicketStatus,
  useTickets,
  type ParsedForm,
} from "./api/useSecretary";

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

function saved(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, text: string) {
  setNotice({ tone: "success", text });
}

const GRADES = [9, 10, 11, 12];
const TYPES = ["አዲስ", "ነባር", "አቋራጭ", "ደጋሚ", "መልሶ ቅበላ"] as const;
const TARGETS = ["All", "Staff", "Students", "Parents", "Admin_Only"] as const;
const MEET = ["Principal", "V_Principal", "Registrar", "Technician", "Librarian", "Secretary"] as const;
const ROUTES = ["Principal", "V_Principal", "Registrar", "Technician", "Librarian"] as const;
const STATUS_TONE = {
  Draft: "info",
  Pending: "warning",
  Approved: "success",
  Issued: "success",
  Rejected: "danger",
  Scheduled: "info",
  Done: "success",
  Cancelled: "danger",
  Open: "warning",
  Routed: "brand",
  Closed: "success",
} as const;

function QrMark({ svg }: { svg: string }) {
  if (!svg.startsWith("<svg")) return null;
  return <div className="h-24 w-24" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function SecretaryHomePage() {
  const { t } = useTranslation("secretary");
  const query = useSecretaryDesk();
  const steps = [
    { icon: UserPlus, title: t("stepRegister"), to: "/secretary/registration" },
    { icon: Megaphone, title: t("stepNotices"), to: "/secretary/notices" },
    { icon: CalendarDays, title: t("stepAppointments"), to: "/secretary/appointments" },
    { icon: IdCard, title: t("stepCards"), to: "/secretary/id-cards" },
  ];
  return (
    <>
      <PageHeader title={t("homeTitle")} description={t("homeHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("draftStudents")} value={String(data.draftStudents)} icon={UserPlus} />
              <StatCard label={t("pendingNotices")} value={String(data.pendingNotices)} icon={Megaphone} tone="warning" />
              <StatCard label={t("openTickets")} value={String(data.openTickets)} icon={Wrench} tone="danger" />
              <StatCard label={t("appointments")} value={String(data.appointments)} icon={CalendarDays} tone="success" />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {steps.map((step) => (
                <Link key={step.to} to={step.to} className="rounded-card border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-raised">
                  <step.icon aria-hidden="true" className="mb-3 size-5 text-brand-700" />
                  <p className="text-sm font-semibold text-ink-strong">{step.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

export function RegistrationPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const [filters, setFilters] = useState({ search: "", grade: "", section: "" });
  const query = useSecretaryStudents(filters);
  const register = useRegisterStudent();
  const { setNotice, view } = useNotice();
  const [login, setLogin] = useState<{ username: string; password: string } | null>(null);

  function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = readForm(event.currentTarget);
    register.mutate(
      {
        fullName: textOf(data, "fullName"),
        gender: textOf(data, "gender") as "M" | "F",
        age: Number(textOf(data, "age")),
        gradeLevel: Number(textOf(data, "gradeLevel")),
        stream: (textOf(data, "stream") || null) as "Common" | "Natural" | "Social" | null,
        registrationType: textOf(data, "registrationType") as (typeof TYPES)[number],
        previousSchool: textOf(data, "previousSchool"),
        kebele: textOf(data, "kebele"),
        gote: textOf(data, "gote"),
        houseNumber: textOf(data, "houseNumber"),
      },
      {
        onSuccess: (result) => {
          const body = result as { username: string; password: string };
          setLogin({ username: body.username, password: body.password });
          saved(setNotice, t("savedLogin", { username: body.username, password: body.password }));
          event.currentTarget.reset();
        },
        onError: (error) => fail(setNotice, t, error),
      },
    );
  }

  return (
    <>
      <PageHeader title={t("registerTitle")} description={t("registerHelp")} />
      {view}
      {login ? (
        <Alert tone="success" className="mb-4">
          {t("savedLogin", { username: login.username, password: login.password })}
        </Alert>
      ) : null}
      <Card className="mb-4">
        <CardHeader title={t("registerTitle")} />
        <CardBody>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={onRegister}>
            <Input name="fullName" label={t("fullName")} required />
            <Select name="gender" label={t("gender")} options={[{ value: "M", label: t("male") }, { value: "F", label: t("female") }]} required />
            <Input name="age" type="number" label={t("age")} required />
            <Select name="gradeLevel" label={t("grade")} options={GRADES.map((grade) => ({ value: String(grade), label: String(grade) }))} required />
            <Select
              name="stream"
              label={t("stream")}
              placeholder={t("choose")}
              options={[
                { value: "Common", label: t("common") },
                { value: "Natural", label: t("natural") },
                { value: "Social", label: t("social") },
              ]}
            />
            <Select name="registrationType" label={t("registrationType")} options={TYPES.map((type) => ({ value: type, label: type }))} required />
            <Input name="previousSchool" label={t("previousSchool")} />
            <Input name="kebele" label={t("kebele")} />
            <Input name="gote" label={t("gote")} />
            <Input name="houseNumber" label={t("houseNumber")} />
            <div className="flex items-end md:col-span-3">
              <Button type="submit" loading={register.isPending}>
                {t("register")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = readForm(event.currentTarget);
              setFilters({ search: textOf(data, "search"), grade: textOf(data, "grade"), section: textOf(data, "section") });
            }}
          >
            <Input name="search" label={t("search")} defaultValue={filters.search} />
            <Select name="grade" label={t("grade")} placeholder={t("allGrades")} options={GRADES.map((grade) => ({ value: String(grade), label: String(grade) }))} />
            <Input name="section" label={t("section")} defaultValue={filters.section} />
            <div className="flex items-end">
              <Button type="submit">{t("search")}</Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Table
            columns={[
              { key: "id", header: t("id"), render: (row) => String(row.id) },
              { key: "name", header: t("fullName"), render: (row) => row.fullName },
              { key: "place", header: t("grade"), render: (row) => `${row.gradeLevel}${row.section ?? ""}` },
              { key: "year", header: t("year"), render: (row) => row.academicYear ?? "" },
              { key: "user", header: t("username"), render: (row) => row.username ?? "—" },
              { key: "status", header: t("status"), render: (row) => row.submissionStatus },
            ]}
            rows={data.rows}
            empty={<EmptyState title={t("empty")} description={t("emptyStudents")} />}
          />
        )}
      </Panel>
    </>
  );
}

export function CleanupPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const query = useCleanup();
  const run = useRunCleanup();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("cleanupTitle")} description={t("cleanupHelp")} />
      {view}
      <Card className="mb-4">
        <CardBody>
          <Button
            type="button"
            loading={run.isPending}
            onClick={() =>
              run.mutate(
                {},
                {
                  onSuccess: (result) => saved(setNotice, t("cleanupDone", { count: (result as { fixedCount: number }).fixedCount })),
                  onError: (error) => fail(setNotice, t, error),
                },
              )
            }
          >
            {t("runCleanup")}
          </Button>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Table
            columns={[
              { key: "fixed", header: t("fixed"), render: (row) => String(row.fixedCount) },
              { key: "note", header: t("note"), render: (row) => row.note },
              { key: "when", header: t("date"), render: (row) => row.createdAt },
            ]}
            rows={data.rows}
            empty={<EmptyState title={t("empty")} />}
          />
        )}
      </Panel>
    </>
  );
}

export function RenewalPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const query = useRenewals();
  const renew = useRenew();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("renewTitle")} description={t("renewHelp")} />
      {view}
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = readForm(event.currentTarget);
              const grade = textOf(data, "gradeLevel");
              renew.mutate(
                {
                  code: textOf(data, "code") || undefined,
                  toYear: textOf(data, "toYear") || undefined,
                  gradeLevel: grade ? Number(grade) : undefined,
                  section: textOf(data, "section") || undefined,
                },
                {
                  onSuccess: () => saved(setNotice, t("saved")),
                  onError: (error) => fail(setNotice, t, error),
                },
              );
            }}
          >
            <Input name="code" label={t("oldId")} placeholder={t("oldIdHelp")} />
            <Input name="toYear" label={t("year")} />
            <Select name="gradeLevel" label={t("grade")} placeholder={t("choose")} options={GRADES.map((grade) => ({ value: String(grade), label: String(grade) }))} />
            <Input name="section" label={t("section")} />
            <div className="md:col-span-4">
              <Button type="submit" loading={renew.isPending}>
                {t("renew")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Table
            columns={[
              { key: "student", header: t("fullName"), render: (row) => row.student ?? String(row.studentId) },
              { key: "from", header: t("fromYear"), render: (row) => row.fromYear },
              { key: "to", header: t("toYear"), render: (row) => row.toYear },
              { key: "when", header: t("date"), render: (row) => row.createdAt },
            ]}
            rows={data.rows}
            empty={<EmptyState title={t("empty")} />}
          />
        )}
      </Panel>
    </>
  );
}

export function NoticesPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const query = useNotices();
  const create = useCreateNotice();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("noticesTitle")} description={t("noticesHelp")} />
      {view}
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = readForm(event.currentTarget);
              create.mutate(
                { title: textOf(data, "title"), content: textOf(data, "content"), targetRole: textOf(data, "targetRole") },
                {
                  onSuccess: () => {
                    saved(setNotice, t("pendingPrincipal"));
                    event.currentTarget.reset();
                  },
                  onError: (error) => fail(setNotice, t, error),
                },
              );
            }}
          >
            <Input name="title" label={t("title")} required />
            <Input name="content" label={t("content")} required />
            <Select name="targetRole" label={t("target")} options={TARGETS.map((value) => ({ value, label: t(`target${value}`) }))} required />
            <Button type="submit" loading={create.isPending}>
              {t("submitNotice")}
            </Button>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Table
            columns={[
              { key: "title", header: t("title"), render: (row) => row.title },
              { key: "target", header: t("target"), render: (row) => t(`target${row.targetRole}` as "targetAll") },
              {
                key: "status",
                header: t("status"),
                render: (row) => <Badge tone={STATUS_TONE[row.status as keyof typeof STATUS_TONE] ?? "info"}>{row.status}</Badge>,
              },
              { key: "when", header: t("date"), render: (row) => row.createdAt },
            ]}
            rows={data.rows}
            empty={<EmptyState title={t("empty")} />}
          />
        )}
      </Panel>
    </>
  );
}

export function DocumentsPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const query = useDocuments();
  const create = useCreateDocument();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("documentsTitle")} description={t("documentsHelp")} />
      {view}
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = readForm(event.currentTarget);
              create.mutate(
                { title: textOf(data, "title"), audience: textOf(data, "audience"), fileNote: textOf(data, "fileNote") },
                {
                  onSuccess: () => {
                    saved(setNotice, t("pendingPrincipal"));
                    event.currentTarget.reset();
                  },
                  onError: (error) => fail(setNotice, t, error),
                },
              );
            }}
          >
            <Input name="title" label={t("title")} required />
            <Input name="audience" label={t("audience")} />
            <Input name="fileNote" label={t("fileNote")} />
            <Button type="submit" loading={create.isPending}>
              {t("submitDocument")}
            </Button>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Table
            columns={[
              { key: "title", header: t("title"), render: (row) => row.title },
              { key: "audience", header: t("audience"), render: (row) => row.audience },
              {
                key: "status",
                header: t("status"),
                render: (row) => <Badge tone={STATUS_TONE[row.status as keyof typeof STATUS_TONE] ?? "info"}>{row.status}</Badge>,
              },
            ]}
            rows={data.rows}
            empty={<EmptyState title={t("empty")} />}
          />
        )}
      </Panel>
    </>
  );
}

export function ApprovalsPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const can = useCan();
  const pending = usePendingApprovals();
  const decideNotice = useDecideNotice();
  const decideDocument = useDecideDocument();
  const { setNotice, view } = useNotice();
  if (!can("secretary.authorize")) {
    return <Alert tone="danger">{t("errors:forbidden")}</Alert>;
  }
  return (
    <>
      <PageHeader title={t("approvalsTitle")} description={t("approvalsHelp")} />
      {view}
      <Panel query={pending}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("noticesTitle")} />
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "status", header: t("status"), render: (row) => row.status },
                  {
                    key: "action",
                    header: t("action"),
                    render: (row) => (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          loading={decideNotice.isPending}
                          onClick={() =>
                            decideNotice.mutate(
                              { id: row.id, decision: "approve" },
                              { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
                            )
                          }
                        >
                          {t("approve")}
                        </Button>
                        <Button
                          type="button"
                          loading={decideNotice.isPending}
                          onClick={() =>
                            decideNotice.mutate(
                              { id: row.id, decision: "reject" },
                              { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
                            )
                          }
                        >
                          {t("reject")}
                        </Button>
                      </div>
                    ),
                  },
                ]}
                rows={data.notices}
                empty={<EmptyState title={t("empty")} />}
              />
            </Card>
            <Card>
              <CardHeader title={t("documentsTitle")} />
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "status", header: t("status"), render: (row) => row.status },
                  {
                    key: "action",
                    header: t("action"),
                    render: (row) => (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          loading={decideDocument.isPending}
                          onClick={() =>
                            decideDocument.mutate(
                              { id: row.id, decision: "approve" },
                              { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
                            )
                          }
                        >
                          {t("approve")}
                        </Button>
                        <Button
                          type="button"
                          loading={decideDocument.isPending}
                          onClick={() =>
                            decideDocument.mutate(
                              { id: row.id, decision: "reject" },
                              { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) },
                            )
                          }
                        >
                          {t("reject")}
                        </Button>
                      </div>
                    ),
                  },
                ]}
                rows={data.documents}
                empty={<EmptyState title={t("empty")} />}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function AppointmentsPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const query = useAppointments();
  const create = useCreateAppointment();
  const status = useAppointmentStatus();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("appointmentsTitle")} description={t("appointmentsHelp")} />
      {view}
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = readForm(event.currentTarget);
              create.mutate(
                {
                  visitorName: textOf(data, "visitorName"),
                  purpose: textOf(data, "purpose"),
                  withRole: textOf(data, "withRole"),
                  startsOn: textOf(data, "startsOn"),
                  startsAt: textOf(data, "startsAt"),
                },
                {
                  onSuccess: () => {
                    saved(setNotice, t("saved"));
                    event.currentTarget.reset();
                  },
                  onError: (error) => fail(setNotice, t, error),
                },
              );
            }}
          >
            <Input name="visitorName" label={t("visitor")} required />
            <Input name="purpose" label={t("purpose")} required />
            <Select name="withRole" label={t("withRole")} options={MEET.map((value) => ({ value, label: t(`role${value}`) }))} required />
            <Input name="startsOn" type="date" label={t("date")} required />
            <Input name="startsAt" type="time" label={t("time")} required />
            <div className="flex items-end">
              <Button type="submit" loading={create.isPending}>
                {t("schedule")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Table
            columns={[
              { key: "visitor", header: t("visitor"), render: (row) => row.visitorName },
              { key: "purpose", header: t("purpose"), render: (row) => row.purpose },
              { key: "with", header: t("withRole"), render: (row) => t(`role${row.withRole}` as "rolePrincipal") },
              { key: "when", header: t("date"), render: (row) => `${row.startsOn} ${row.startsAt}` },
              {
                key: "status",
                header: t("status"),
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={STATUS_TONE[row.status as keyof typeof STATUS_TONE] ?? "info"}>{row.status}</Badge>
                    {row.status === "Scheduled" ? (
                      <>
                        <Button type="button" onClick={() => status.mutate({ id: row.id, status: "Done" }, { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) })}>
                          {t("done")}
                        </Button>
                        <Button type="button" onClick={() => status.mutate({ id: row.id, status: "Cancelled" }, { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) })}>
                          {t("cancel")}
                        </Button>
                      </>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={data.rows}
            empty={<EmptyState title={t("empty")} />}
          />
        )}
      </Panel>
    </>
  );
}

export function HelpdeskPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const query = useTickets();
  const create = useCreateTicket();
  const status = useTicketStatus();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("helpdeskTitle")} description={t("helpdeskHelp")} />
      {view}
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = readForm(event.currentTarget);
              create.mutate(
                { subject: textOf(data, "subject"), details: textOf(data, "details"), routeTo: textOf(data, "routeTo") },
                {
                  onSuccess: () => {
                    saved(setNotice, t("saved"));
                    event.currentTarget.reset();
                  },
                  onError: (error) => fail(setNotice, t, error),
                },
              );
            }}
          >
            <Input name="subject" label={t("subject")} required />
            <Input name="details" label={t("details")} required />
            <Select name="routeTo" label={t("routeTo")} options={ROUTES.map((value) => ({ value, label: t(`role${value}`) }))} required />
            <Button type="submit" loading={create.isPending}>
              {t("route")}
            </Button>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Table
            columns={[
              { key: "subject", header: t("subject"), render: (row) => row.subject },
              { key: "route", header: t("routeTo"), render: (row) => t(`role${row.routeTo}` as "rolePrincipal") },
              {
                key: "status",
                header: t("status"),
                render: (row) => (
                  <div className="flex gap-2">
                    <Badge tone={STATUS_TONE[row.status as keyof typeof STATUS_TONE] ?? "info"}>{row.status}</Badge>
                    {row.status !== "Closed" ? (
                      <Button type="button" onClick={() => status.mutate({ id: row.id, status: "Closed" }, { onSuccess: () => saved(setNotice, t("saved")), onError: (error) => fail(setNotice, t, error) })}>
                        {t("close")}
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={data.rows}
            empty={<EmptyState title={t("empty")} />}
          />
        )}
      </Panel>
    </>
  );
}

export function IdCardsPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const [filters, setFilters] = useState({ search: "", grade: "", section: "" });
  const query = useIdCards(filters);
  return (
    <div className="print:bg-white">
      <div className="print:hidden">
        <PageHeader title={t("cardsTitle")} description={t("cardsHelp")} />
      </div>
      <Card className="mb-4 print:hidden">
        <CardBody>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              const data = readForm(event.currentTarget);
              setFilters({ search: textOf(data, "search"), grade: textOf(data, "grade"), section: textOf(data, "section") });
            }}
          >
            <Input name="search" label={t("search")} />
            <Select name="grade" label={t("grade")} placeholder={t("allGrades")} options={GRADES.map((grade) => ({ value: String(grade), label: String(grade) }))} />
            <Input name="section" label={t("section")} />
            <div className="flex items-end gap-2">
              <Button type="submit">{t("search")}</Button>
              <Button type="button" variant="secondary" onClick={() => window.print()}>
                {t("print")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4 md:grid-cols-2">
            {data.rows.length === 0 ? <EmptyState title={t("empty")} description={t("emptyStudents")} /> : null}
            {data.rows.map((card) => (
              <Card key={card.id} className="overflow-hidden border-2 border-[#1e3c72]">
                <CardBody className="grid grid-cols-[1fr_auto] gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#1e3c72]">{data.schoolName || t("school")}</p>
                    <p className="mt-2 text-lg font-bold text-ink-strong">{card.fullName}</p>
                    <p className="text-sm text-ink">{t("id")}: {card.id}</p>
                    <p className="text-sm text-ink">
                      {t("grade")} {card.gradeLevel}
                      {card.section ?? ""} · {card.academicYear}
                    </p>
                    <p className="text-sm text-ink">
                      {t("username")}: {card.username ?? "—"}
                    </p>
                    <p className="text-xs text-ink-muted">{card.code}</p>
                  </div>
                  <QrMark svg={card.qrSvg} />
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ParsedPreview({ parsed }: { parsed: ParsedForm }) {
  const { t } = useTranslation("secretary");
  return (
    <dl className="grid gap-1 text-sm md:grid-cols-2">
      <div>
        <dt className="text-ink-muted">{t("fullName")}</dt>
        <dd>{parsed.fullName || "—"}</dd>
      </div>
      <div>
        <dt className="text-ink-muted">{t("gender")}</dt>
        <dd>{parsed.gender ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-ink-muted">{t("age")}</dt>
        <dd>{parsed.age ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-ink-muted">{t("grade")}</dt>
        <dd>{parsed.gradeLevel ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-ink-muted">{t("registrationType")}</dt>
        <dd>{parsed.registrationType ?? "—"}</dd>
      </div>
    </dl>
  );
}

export function OcrPage() {
  const { t } = useTranslation(["secretary", "errors"]);
  const query = useOcrScans();
  const scan = useScanForm();
  const register = useRegisterScan();
  const { setNotice, view } = useNotice();
  const [preview, setPreview] = useState<{ id: number; parsed: ParsedForm; ready: boolean } | null>(null);
  return (
    <>
      <PageHeader title={t("ocrTitle")} description={t("ocrHelp")} />
      {view}
      <Card className="mb-4">
        <CardHeader title={t("ocrTitle")} />
        <CardBody>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const data = readForm(event.currentTarget);
              scan.mutate(
                { rawText: textOf(data, "rawText") },
                {
                  onSuccess: (result) => {
                    const body = result as { id: number; parsed: ParsedForm; ready: boolean };
                    setPreview(body);
                    saved(setNotice, body.ready ? t("parseReady") : t("parseIncomplete"));
                  },
                  onError: (error) => fail(setNotice, t, error),
                },
              );
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-ink-strong">{t("formText")}</span>
              <textarea name="rawText" rows={8} className="rounded-control border border-border bg-surface px-3 py-2" required placeholder={t("formTextHelp")} />
            </label>
            <Button type="submit" loading={scan.isPending}>
              <ScanLine className="mr-2 size-4" />
              {t("scan")}
            </Button>
          </form>
          {preview ? (
            <div className="mt-4 rounded-card border border-border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-strong">
                <Sparkles className="size-4 text-brand-700" />
                {t("preview")}
              </div>
              <ParsedPreview parsed={preview.parsed} />
              {preview.ready ? (
                <Button
                  className="mt-3"
                  type="button"
                  loading={register.isPending}
                  onClick={() =>
                    register.mutate(
                      { scanId: preview.id },
                      {
                        onSuccess: (result) => {
                          const body = result as { username: string; password: string };
                          saved(setNotice, t("savedLogin", { username: body.username, password: body.password }));
                          setPreview(null);
                        },
                        onError: (error) => fail(setNotice, t, error),
                      },
                    )
                  }
                >
                  {t("register")}
                </Button>
              ) : (
                <Alert tone="warning" className="mt-3">
                  {t("parseIncomplete")}
                </Alert>
              )}
            </div>
          ) : null}
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Table
            columns={[
              { key: "id", header: t("id"), render: (row) => String(row.id) },
              { key: "name", header: t("fullName"), render: (row) => row.parsed.fullName || "—" },
              { key: "student", header: t("studentId"), render: (row) => (row.studentId ? String(row.studentId) : "—") },
              { key: "when", header: t("date"), render: (row) => row.createdAt },
            ]}
            rows={data.rows}
            empty={<EmptyState title={t("empty")} />}
          />
        )}
      </Panel>
    </>
  );
}
