import { useState } from "react";
import { BadgeCheck, Landmark, Megaphone, Shield, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { toErrorKey } from "@/lib/apiError";
import {
  useCreateDocument,
  useDecide,
  useDocuments,
  useExecutive,
  useInbox,
  useMessages,
  usePolicyStatus,
  usePremium,
  useRejectDocument,
  useSavePolicy,
  useSendMessage,
  useSignDocument,
  useStaffKpis,
  useTrends,
  type InboxItem,
} from "./api/usePrincipal";
import { GradeBars, Panel, PassChart, money, pct, readForm, textOf, useNotice } from "./officeUi";

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

export function ExecutivePage() {
  const { t } = useTranslation(["principal", "errors"]);
  const query = useExecutive();
  const save = useSavePolicy();
  const status = usePolicyStatus();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("executiveTitle")} description={t("executiveHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <p className="text-sm text-ink-muted">{t("passMark")}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("passRate")} value={pct(data.passRate)} icon={BadgeCheck} />
              <StatCard label={t("presentRate")} value={pct(data.presentRate)} icon={Users} tone="success" />
              <StatCard label={t("staffApproved")} value={`${data.approvedStaff}/${data.staffTotal}`} icon={Shield} />
              <StatCard label={t("activePolicies")} value={String(data.activePolicies)} icon={Landmark} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label={t("incomeTotal")} value={money(data.incomeTotal)} icon={Landmark} />
              <StatCard label={t("expenseTotal")} value={money(data.expenseTotal)} icon={Landmark} tone="danger" />
            </div>
            <Card>
              <CardHeader title={t("policyForm")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    const effective = textOf(form, "effectiveOn");
                    save.mutate(
                      {
                        title: textOf(form, "title"),
                        body: textOf(form, "body"),
                        area: textOf(form, "area"),
                        status: textOf(form, "status"),
                        effectiveOn: effective || null,
                      },
                      {
                        onSuccess: () => {
                          setNotice({ tone: "success", text: t("saved") });
                          event.currentTarget.reset();
                        },
                        onError: (error) => fail(setNotice, t, error),
                      },
                    );
                  }}
                >
                  <Input name="title" label={t("policyTitle")} required />
                  <Input name="effectiveOn" type="date" label={t("effectiveOn")} />
                  <Select
                    name="area"
                    label={t("area")}
                    options={[
                      { value: "performance", label: t("areaPerformance") },
                      { value: "policy", label: t("areaPolicy") },
                      { value: "compliance", label: t("areaCompliance") },
                    ]}
                  />
                  <Select
                    name="status"
                    label={t("status")}
                    options={[
                      { value: "Draft", label: t("draft") },
                      { value: "Active", label: t("active") },
                      { value: "Retired", label: t("retired") },
                    ]}
                  />
                  <div className="md:col-span-2">
                    <Input name="body" label={t("policyBody")} required />
                  </div>
                  <Button type="submit" loading={save.isPending}>
                    {t("save")}
                  </Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("policies")} description={data.latestYear ? `${t("latestYear")}: ${data.latestYear}` : undefined} />
              <Table
                columns={[
                  { key: "title", header: t("policyTitle"), render: (row) => row.title },
                  { key: "area", header: t("area"), render: (row) => t(row.area === "performance" ? "areaPerformance" : row.area === "policy" ? "areaPolicy" : "areaCompliance") },
                  { key: "status", header: t("status"), render: (row) => <Badge tone={row.status === "Active" ? "success" : "neutral"}>{t(row.status === "Active" ? "active" : row.status === "Draft" ? "draft" : "retired")}</Badge> },
                  {
                    key: "set",
                    header: "",
                    render: (row) => (
                      <Select
                        label={t("status")}
                        value={row.status}
                        options={[
                          { value: "Draft", label: t("draft") },
                          { value: "Active", label: t("active") },
                          { value: "Retired", label: t("retired") },
                        ]}
                        onChange={(event) =>
                          status.mutate(
                            { id: row.id, status: event.target.value },
                            { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
                          )
                        }
                      />
                    ),
                  },
                ]}
                rows={data.policies}
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

export function TrendsPage() {
  const { t } = useTranslation("principal");
  const query = useTrends();
  return (
    <>
      <PageHeader title={t("trendsTitle")} description={t("trendsHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <p className="text-sm text-ink-muted">{t("passMark")}</p>
            <Card>
              <CardHeader title={t("passRate")} />
              <CardBody>
                <PassChart rows={data.years} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("throughput")} />
              <Table
                columns={[
                  { key: "year", header: t("year"), render: (row) => row.year },
                  { key: "students", header: t("students"), render: (row) => row.students },
                  { key: "graded", header: t("graded"), render: (row) => row.graded },
                  { key: "share", header: t("throughput"), render: (row) => pct(row.students === 0 ? null : Math.round((row.graded / row.students) * 1000) / 10) },
                  { key: "pass", header: t("passRate"), render: (row) => pct(row.passRate) },
                ]}
                rows={data.years}
                rowKey={(row) => row.year}
                empty={t("empty")}
              />
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

export function PremiumPage() {
  const { t } = useTranslation("principal");
  const query = usePremium();
  return (
    <>
      <PageHeader title={t("premiumTitle")} description={t("premiumHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard label={t("forecast")} value={pct(data.forecast.passRate)} icon={BadgeCheck} />
              <StatCard label={t("schoolRate")} value={pct(data.schoolPassRate)} icon={Landmark} />
            </div>
            <p className="text-sm text-ink-muted">
              {data.forecast.enough ? t("forecastYear", { year: data.forecast.nextYear ?? "" }) : t("forecastShort")}
            </p>
            <Card>
              <CardHeader title={t("passRate")} />
              <CardBody>
                <PassChart rows={data.years} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("benchmarks")} />
              <Table
                columns={[
                  { key: "grade", header: t("grade"), render: (row) => row.gradeLevel },
                  { key: "pass", header: t("passRate"), render: (row) => pct(row.passRate) },
                  { key: "gap", header: t("gap"), render: (row) => (row.gap == null ? "—" : `${row.gap > 0 ? "+" : ""}${row.gap}`) },
                ]}
                rows={data.benchmarks}
                rowKey={(row) => row.gradeLevel}
                empty={t("empty")}
              />
            </Card>
            <Card>
              <CardHeader title={t("auditLog")} />
              <Table
                columns={[
                  { key: "when", header: t("when"), render: (row) => row.timestamp },
                  { key: "who", header: t("who"), render: (row) => row.username ?? "—" },
                  { key: "action", header: t("action"), render: (row) => row.actionType },
                  { key: "detail", header: t("detail"), render: (row) => row.description ?? "—" },
                ]}
                rows={data.audit}
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

function MessageBoard({ scope, title, help, kinds }: { scope: "hub" | "bulk"; title: string; help: string; kinds: { value: string; label: string }[] }) {
  const { t } = useTranslation(["principal", "errors"]);
  const query = useMessages(scope);
  const send = useSendMessage(scope);
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={title} description={help} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("messages")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    send.mutate(
                      { kind: textOf(form, "kind"), audience: textOf(form, "audience"), title: textOf(form, "title"), body: textOf(form, "body") },
                      {
                        onSuccess: () => {
                          setNotice({ tone: "success", text: t("sent") });
                          event.currentTarget.reset();
                        },
                        onError: (error) => fail(setNotice, t, error),
                      },
                    );
                  }}
                >
                  <Select name="kind" label={t("kind")} options={kinds} />
                  <Input name="audience" label={t("audience")} required />
                  <Input name="title" label={t("title")} required />
                  <Input name="body" label={t("body")} required />
                  <Button type="submit" loading={send.isPending} leftIcon={<Megaphone className="size-4" />}>
                    {t("save")}
                  </Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "kind", header: t("kind"), render: (row) => t(row.kind) },
                  { key: "audience", header: t("audience"), render: (row) => row.audience },
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "body", header: t("body"), render: (row) => row.body },
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

export function HubPage() {
  const { t } = useTranslation("principal");
  return (
    <MessageBoard
      scope="hub"
      title={t("hubTitle")}
      help={t("hubHelp")}
      kinds={[
        { value: "announcement", label: t("announcement") },
        { value: "emergency", label: t("emergency") },
        { value: "memo", label: t("memo") },
      ]}
    />
  );
}

export function BulkPage() {
  const { t } = useTranslation("principal");
  return (
    <MessageBoard
      scope="bulk"
      title={t("bulkTitle")}
      help={t("bulkHelp")}
      kinds={[
        { value: "targeted", label: t("targeted") },
        { value: "bulk", label: t("bulk") },
      ]}
    />
  );
}

export function InboxPage() {
  const { t } = useTranslation(["principal", "errors"]);
  const query = useInbox();
  const decide = useDecide();
  const { setNotice, view } = useNotice();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const act = (item: InboxItem, action: string) => {
    const note = notes[`${item.source}-${item.sourceId}`] ?? "";
    decide.mutate(
      { source: item.source, sourceId: item.sourceId, action, note },
      { onSuccess: () => setNotice({ tone: "success", text: t("decided") }), onError: (error) => fail(setNotice, t, error) },
    );
  };
  return (
    <>
      <PageHeader title={t("inboxTitle")} description={t("inboxHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "source", header: t("source"), render: (row) => t(row.source === "store" ? "sourceStore" : row.source === "registration" ? "sourceRegistration" : row.source === "attendance" ? "sourceAttendance" : "sourceStaff") },
                { key: "title", header: t("title"), render: (row) => row.title },
                { key: "detail", header: t("detail"), render: (row) => row.detail },
                { key: "status", header: t("status"), render: (row) => <Badge tone={row.ready ? "info" : "warning"}>{row.status}</Badge> },
                {
                  key: "note",
                  header: t("note"),
                  render: (row) => (
                    <Input
                      label={t("note")}
                      value={notes[`${row.source}-${row.sourceId}`] ?? ""}
                      hint={t("noteHint")}
                      onChange={(event) => setNotes((current) => ({ ...current, [`${row.source}-${row.sourceId}`]: event.target.value }))}
                    />
                  ),
                },
                {
                  key: "act",
                  header: t("action"),
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => act(row, "approve")} loading={decide.isPending} disabled={!row.ready && row.source === "store"}>
                        {t("approve")}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => act(row, "clarify")} loading={decide.isPending}>
                        {t("clarify")}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => act(row, "override")} loading={decide.isPending}>
                        {t("override")}
                      </Button>
                      <Button type="button" variant="danger" onClick={() => act(row, "reject")} loading={decide.isPending}>
                        {t("reject")}
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={data.items}
              rowKey={(row) => `${row.source}-${row.sourceId}`}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function StaffKpiPage() {
  const { t } = useTranslation("principal");
  const query = useStaffKpis();
  return (
    <>
      <PageHeader title={t("kpiTitle")} description={t("kpiHelp")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "name", header: t("teacher"), render: (row) => row.name },
                { key: "periods", header: t("periods"), render: (row) => row.periods },
                { key: "attendance", header: t("attendanceMarks"), render: (row) => row.attendanceMarks },
                { key: "submitted", header: t("submitted"), render: (row) => row.submitted },
                { key: "drafts", header: t("draftMarks"), render: (row) => row.drafts },
                { key: "rate", header: t("submissionRate"), render: (row) => pct(row.submissionRate) },
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

export function DocumentsPage() {
  const { t } = useTranslation(["principal", "errors"]);
  const query = useDocuments();
  const create = useCreateDocument();
  const sign = useSignDocument();
  const reject = useRejectDocument();
  const { setNotice, view } = useNotice();
  const [names, setNames] = useState<Record<number, string>>({});
  return (
    <>
      <PageHeader title={t("documentsTitle")} description={t("documentsHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("documentsTitle")} />
              <CardBody>
                <form
                  className="grid gap-3"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    create.mutate(
                      { title: textOf(form, "title"), body: textOf(form, "body") },
                      {
                        onSuccess: () => {
                          setNotice({ tone: "success", text: t("saved") });
                          event.currentTarget.reset();
                        },
                        onError: (error) => fail(setNotice, t, error),
                      },
                    );
                  }}
                >
                  <Input name="title" label={t("title")} required />
                  <Input name="body" label={t("body")} required />
                  <Button type="submit" loading={create.isPending}>
                    {t("save")}
                  </Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "status", header: t("status"), render: (row) => <Badge tone={row.status === "Signed" ? "success" : row.status === "Rejected" ? "danger" : "neutral"}>{row.status === "Signed" ? t("signed") : row.status === "Rejected" ? t("rejectedDoc") : t("draft")}</Badge> },
                  { key: "signer", header: t("signedBy"), render: (row) => row.signerName ?? "—" },
                  {
                    key: "sign",
                    header: t("sign"),
                    render: (row) =>
                      row.status === "Draft" ? (
                        <div className="flex flex-wrap items-end gap-2">
                          <Input label={t("signerName")} value={names[row.id] ?? ""} onChange={(event) => setNames((current) => ({ ...current, [row.id]: event.target.value }))} />
                          <Button
                            type="button"
                            loading={sign.isPending}
                            onClick={() =>
                              sign.mutate(
                                { id: row.id, signerName: names[row.id] ?? "" },
                                { onSuccess: () => setNotice({ tone: "success", text: t("signed") }), onError: (error) => fail(setNotice, t, error) },
                              )
                            }
                          >
                            {t("sign")}
                          </Button>
                          <Button type="button" variant="danger" loading={reject.isPending} onClick={() => reject.mutate(row.id, { onSuccess: () => setNotice({ tone: "success", text: t("rejectedDoc") }), onError: (error) => fail(setNotice, t, error) })}>
                            {t("reject")}
                          </Button>
                        </div>
                      ) : (
                        row.signedAt ?? "—"
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
