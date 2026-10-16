import { type FormEvent, type ReactNode, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Activity, KeyRound, Server, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { toErrorKey, type ErrorKey } from "@/lib/apiError";
import {
  useAssignHead,
  useAssignHomeroom,
  useAudit,
  useDuties,
  useHealth,
  useImportAccounts,
  useMissingAccounts,
  useOpenTicket,
  useProvisionAccount,
  useTicketStatus,
  useTickets,
  type TicketRow,
} from "./api/useOperations";

function Panel<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  const { t } = useTranslation("errors");
  if (query.isPending) return <Spinner />;
  if (query.isError) return <Alert tone="danger">{t(toErrorKey(query.error))}</Alert>;
  return <>{children(query.data)}</>;
}

function Notice({ tone, text }: { tone: "success" | "danger" | null; text: string }) {
  if (!tone || !text) return null;
  return (
    <Alert tone={tone} className="mb-4">
      {text}
    </Alert>
  );
}

const DEPT_KEY = {
  Languages: "deptLanguages",
  Mathematics: "deptMathematics",
  "Natural Science": "deptNatural",
  "Social Science": "deptSocial",
  Aesthetics: "deptAesthetics",
  Vocational: "deptVocational",
  "Physical Education": "deptPe",
} as const;

function importErrorKey(code: string): ErrorKey {
  if (code === "USERNAME_TAKEN") return "usernameTaken";
  if (code === "ALREADY_HAS_ACCOUNT") return "alreadyHasAccount";
  if (code === "NOT_FOUND") return "notFound";
  if (code === "STAFF_NOT_TEACHER") return "staffNotTeacher";
  if (code === "VALIDATION_ERROR") return "validation";
  return "unknown";
}

export function IdentityPage() {
  const { t } = useTranslation(["operations", "errors"]);
  const query = useMissingAccounts();
  const create = useProvisionAccount();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const open = (kind: "student" | "staff", id: number) => {
    create.mutate(
      { kind, id },
      {
        onSuccess: (result) => setNotice({ tone: "success", text: t("accountCreated", { username: result.data.username }) }),
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  };
  return (
    <>
      <PageHeader title={t("identityTitle")} description={t("identityHelp")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("studentsWithoutLogin")} />
              <Table
                columns={[
                  { key: "name", header: t("name"), render: (row) => row.name },
                  { key: "detail", header: t("detail"), render: (row) => `${row.gradeLevel}${row.section ? `-${row.section}` : ""}` },
                  {
                    key: "open",
                    header: "",
                    render: (row) => (
                      <Button type="button" onClick={() => open("student", row.id)} loading={create.isPending}>
                        {t("createAccount")}
                      </Button>
                    ),
                  },
                ]}
                rows={data.students}
                rowKey={(row) => row.id}
                empty={t("emptyPeople")}
              />
            </Card>
            <Card>
              <CardHeader title={t("staffWithoutLogin")} />
              <Table
                columns={[
                  { key: "name", header: t("name"), render: (row) => row.name },
                  { key: "detail", header: t("detail"), render: (row) => row.role },
                  {
                    key: "open",
                    header: "",
                    render: (row) => (
                      <Button type="button" onClick={() => open("staff", row.id)} loading={create.isPending}>
                        {t("createAccount")}
                      </Button>
                    ),
                  },
                ]}
                rows={data.staff}
                rowKey={(row) => row.id}
                empty={t("emptyPeople")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function TicketsPage() {
  const { t } = useTranslation(["operations", "errors"]);
  const query = useTickets();
  const open = useOpenTicket();
  const status = useTicketStatus();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const categories = [
    { value: "account", label: t("catAccount") },
    { value: "network", label: t("catNetwork") },
    { value: "hardware", label: t("catHardware") },
    { value: "marks", label: t("catMarks") },
    { value: "other", label: t("catOther") },
  ];
  const priorities = [
    { value: "low", label: t("priLow") },
    { value: "normal", label: t("priNormal") },
    { value: "urgent", label: t("priUrgent") },
  ];
  const statuses = [
    { value: "Open", label: t("stOpen") },
    { value: "InProgress", label: t("stProgress") },
    { value: "Resolved", label: t("stResolved") },
    { value: "Closed", label: t("stClosed") },
  ];
  return (
    <>
      <PageHeader title={t("ticketTitle")} description={t("ticketHelp")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Card className="mb-4">
        <CardHeader title={t("openTicket")} />
        <CardBody>
          <form
            className="grid max-w-xl gap-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const category = String(form.get("category"));
              const priority = String(form.get("priority"));
              open.mutate(
                {
                  title: String(form.get("title") ?? ""),
                  details: String(form.get("details") ?? ""),
                  category: category as TicketRow["category"],
                  priority: priority as TicketRow["priority"],
                },
                {
                  onSuccess: () => {
                    setNotice({ tone: "success", text: t("ticketOpened") });
                    event.currentTarget.reset();
                  },
                  onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                },
              );
            }}
          >
            <Input name="title" label={t("title")} required minLength={3} />
            <Input name="details" label={t("details")} required minLength={3} />
            <Select name="category" label={t("category")} options={categories} defaultValue="account" />
            <Select name="priority" label={t("priority")} options={priorities} defaultValue="normal" />
            <Button type="submit" loading={open.isPending}>
              {t("openTicket")}
            </Button>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "title", header: t("title"), render: (row) => row.title },
                { key: "category", header: t("category"), render: (row) => categories.find((item) => item.value === row.category)?.label ?? row.category },
                { key: "priority", header: t("priority"), render: (row) => priorities.find((item) => item.value === row.priority)?.label ?? row.priority },
                {
                  key: "status",
                  header: t("status"),
                  render: (row) => (
                    <form
                      className="flex flex-wrap items-end gap-2"
                      onSubmit={(event: FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const next = String(new FormData(event.currentTarget).get("status")) as TicketRow["status"];
                        status.mutate(
                          { id: row.id, status: next },
                          {
                            onSuccess: () => setNotice({ tone: "success", text: t("statusSaved") }),
                            onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                          },
                        );
                      }}
                    >
                      <Select name="status" label={t("status")} options={statuses} defaultValue={row.status} />
                      <Button type="submit" variant="secondary" loading={status.isPending}>
                        {t("saveStatus")}
                      </Button>
                    </form>
                  ),
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("noTickets")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function AuditPage() {
  const { t } = useTranslation(["operations", "errors"]);
  const query = useAudit();
  return (
    <>
      <PageHeader title={t("auditTitle")} description={t("auditHelp")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "when", header: t("when"), render: (row) => row.timestamp },
                { key: "who", header: t("who"), render: (row) => row.username ?? String(row.userId) },
                { key: "action", header: t("action"), render: (row) => row.actionType },
                { key: "what", header: t("description"), render: (row) => row.description ?? "" },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("emptyAudit")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function ImportPage() {
  const { t } = useTranslation(["operations", "errors"]);
  const importCsv = useImportAccounts();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [failed, setFailed] = useState<{ line: number; code: string }[]>([]);
  return (
    <>
      <PageHeader title={t("importTitle")} description={t("importHelp")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Card>
        <CardBody>
          <form
            className="grid max-w-lg gap-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const file = (event.currentTarget.elements.namedItem("file") as HTMLInputElement).files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                importCsv.mutate(String(reader.result ?? ""), {
                  onSuccess: (result) => {
                    setFailed(result.data.failed);
                    setNotice({
                      tone: result.data.failed.length > 0 ? "danger" : "success",
                      text: t("importDone", { created: result.data.created.length, failed: result.data.failed.length }),
                    });
                  },
                  onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                });
              };
              reader.readAsText(file);
            }}
          >
            <Input name="file" type="file" accept=".csv,text/csv" label={t("chooseCsv")} required />
            <Button type="submit" loading={importCsv.isPending}>
              {t("importRun")}
            </Button>
          </form>
          {failed.length > 0 ? (
            <ul className="mt-4 list-disc pl-5 text-sm text-ink-muted">
              {failed.map((row) => (
                <li key={`${row.line}-${row.code}`}>{t("failedLine", { line: row.line, code: t(`errors:${importErrorKey(row.code)}`) })}</li>
              ))}
            </ul>
          ) : null}
        </CardBody>
      </Card>
    </>
  );
}

export function HealthPage() {
  const { t } = useTranslation(["operations", "errors"]);
  const query = useHealth();
  return (
    <>
      <PageHeader title={t("healthTitle")} description={t("healthHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label={t("activeUsers")} value={String(data.activeUsers)} icon={Activity} />
            <StatCard label={t("totalUsers")} value={String(data.totalUsers)} icon={KeyRound} />
            <StatCard label={t("failedLogins")} value={String(data.failedLogins24h)} icon={ShieldAlert} tone="danger" />
            <StatCard label={t("memory")} value={String(data.memoryMb)} icon={Server} />
            <StatCard label={t("uptime")} value={t("minutes", { count: Math.round(data.uptimeSeconds / 60) })} icon={Activity} tone="success" />
            <StatCard label={t("load")} value={data.load.join(" / ")} icon={Server} />
          </div>
        )}
      </Panel>
    </>
  );
}

export function DutiesPage() {
  const { t } = useTranslation(["operations", "errors"]);
  const query = useDuties();
  const homeroom = useAssignHomeroom();
  const head = useAssignHead();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const deptLabel = (code: string) => (code in DEPT_KEY ? t(DEPT_KEY[code as keyof typeof DEPT_KEY]) : code);
  return (
    <>
      <PageHeader title={t("dutiesTitle")} description={t("dutiesHelp")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Panel query={query}>
        {(data) => {
          const teachers = data.teachers.map((row) => ({ value: String(row.id), label: row.name }));
          return (
            <div className="grid gap-4">
              <Card>
                <CardHeader title={t("homeroomTitle")} />
                <Table
                  columns={[
                    { key: "class", header: t("classLabel"), render: (row) => `${row.gradeLevel}${row.section}${row.stream ? ` ${row.stream}` : ""}` },
                    { key: "current", header: t("currentTeacher"), render: (row) => row.teacherName ?? t("unassigned") },
                    {
                      key: "assign",
                      header: t("teacher"),
                      render: (row) => (
                        <form
                          className="flex flex-wrap items-end gap-2"
                          onSubmit={(event: FormEvent<HTMLFormElement>) => {
                            event.preventDefault();
                            homeroom.mutate(
                              { classId: row.id, staffId: Number(new FormData(event.currentTarget).get("staffId")) },
                              {
                                onSuccess: () => setNotice({ tone: "success", text: t("dutySaved") }),
                                onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                              },
                            );
                          }}
                        >
                          <Select name="staffId" label={t("teacher")} options={teachers} required />
                          <Button type="submit" loading={homeroom.isPending}>
                            {t("assignHomeroom")}
                          </Button>
                        </form>
                      ),
                    },
                  ]}
                  rows={data.classes}
                  rowKey={(row) => row.id}
                  empty={t("noClasses")}
                />
              </Card>
              <Card>
                <CardBody>
                  <form
                    className="grid max-w-xl gap-4"
                    onSubmit={(event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      head.mutate(
                        { department: String(form.get("department")), staffId: Number(form.get("staffId")) },
                        {
                          onSuccess: () => setNotice({ tone: "success", text: t("dutySaved") }),
                          onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                        },
                      );
                    }}
                  >
                    <h2 className="text-base font-semibold text-ink-strong">{t("departmentTitle")}</h2>
                    <p className="text-sm text-ink-muted">
                      {data.academicYear} · {data.heads.map((row) => `${deptLabel(row.department)}: ${row.teacherName}`).join(" · ") || t("unassigned")}
                    </p>
                    <Select name="department" label={t("department")} options={data.departments.map((code) => ({ value: code, label: deptLabel(code) }))} required />
                    <Select name="staffId" label={t("teacher")} options={teachers} required />
                    <Button type="submit" loading={head.isPending}>
                      {t("assignHead")}
                    </Button>
                  </form>
                </CardBody>
              </Card>
            </div>
          );
        }}
      </Panel>
    </>
  );
}
