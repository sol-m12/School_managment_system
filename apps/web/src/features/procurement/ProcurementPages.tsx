import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, ClipboardCheck, FileText, Scale, ShoppingCart, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Select, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { toErrorKey } from "@/lib/apiError";
import {
  useAward,
  useBudgets,
  useCheckRequest,
  useCreateBudget,
  useCreateOrder,
  useCreateTender,
  useCreateVendor,
  useDecide,
  useMatrix,
  useOrder,
  useOrders,
  useProcurementDesk,
  useReceive,
  useRequisitions,
  useTenders,
  useVendorStatus,
  useVendors,
  type BudgetRow,
  type StoreRequest,
  type TeacherRequest,
  type VendorRow,
} from "./api/useProcurement";

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

function amount(data: FormData, name: string): number {
  const value = Number(textOf(data, name));
  return Number.isFinite(value) ? value : 0;
}

function birr(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Missing({ title, help, to, label }: { title: string; help: string; to: string; label: string }) {
  return (
    <EmptyState
      title={title}
      description={help}
      action={
        <Link className="text-sm font-semibold text-brand-700 underline" to={to}>
          {label}
        </Link>
      }
    />
  );
}

const STEPS = [
  { icon: Building2, title: "stepVendors", to: "/procurement/vendors" },
  { icon: ClipboardCheck, title: "stepRequests", to: "/procurement/requisitions" },
  { icon: Wallet, title: "stepBudgets", to: "/procurement/budgets" },
  { icon: FileText, title: "stepOrders", to: "/procurement/orders" },
  { icon: Scale, title: "stepTenders", to: "/procurement/tenders" },
] as const;

export function ProcurementHomePage() {
  const { t } = useTranslation("procurement");
  const query = useProcurementDesk();
  return (
    <>
      <PageHeader title={t("homeTitle")} description={t("homeHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label={t("vendors")} value={String(data.vendors)} icon={Building2} />
              <StatCard label={t("checks")} value={String(data.checks)} icon={ClipboardCheck} />
              <StatCard label={t("budgets")} value={String(data.budgets)} icon={Wallet} />
              <StatCard label={t("openOrders")} value={String(data.openOrders)} icon={FileText} tone="success" />
              <StatCard label={t("openTenders")} value={String(data.openTenders)} icon={Scale} />
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {STEPS.map((step) => (
                <Link key={step.to} to={step.to} className="rounded-card border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-raised">
                  <step.icon aria-hidden="true" className="mb-3 size-5 text-brand-700" />
                  <p className="text-sm font-semibold text-ink-strong">{t(step.title)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

export function VendorsPage() {
  const { t } = useTranslation(["procurement", "errors"]);
  const query = useVendors();
  const create = useCreateVendor();
  const status = useVendorStatus();
  const { setNotice, view } = useNotice();
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);

  function onCreate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = readForm(event);
    create.mutate(
      {
        supplierName: textOf(data, "supplierName"),
        contactName: textOf(data, "contactName"),
        phone: textOf(data, "phone"),
        email: textOf(data, "email"),
        licenseNo: textOf(data, "licenseNo"),
        licenseExpires: textOf(data, "licenseExpires"),
      },
      {
        onSuccess: (result) => {
          const login = result as { username: string; password: string };
          setIssued({ username: login.username, password: login.password });
          setNotice({ tone: "success", text: t("saved") });
          form.reset();
        },
        onError: (error) => fail(setNotice, t, error),
      },
    );
  }

  return (
    <>
      <PageHeader title={t("vendorsTitle")} description={t("vendorsHelp")} />
      {view}
      {issued ? (
        <Alert tone="success" className="mb-4">
          <p className="font-semibold">{t("passwordOnce")}</p>
          <p>
            {t("username")}: {issued.username}
          </p>
          <p>
            {t("password")}: {issued.password}
          </p>
        </Alert>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader title={t("saveVendor")} />
          <CardBody>
            <form className="grid gap-3" onSubmit={onCreate}>
              <Input label={t("name")} name="supplierName" required />
              <Input label={t("contact")} name="contactName" />
              <Input label={t("phone")} name="phone" />
              <Input label={t("email")} name="email" />
              <Input label={t("license")} name="licenseNo" />
              <Input label={t("licenseExpires")} name="licenseExpires" type="date" required />
              <Button type="submit" loading={create.isPending}>
                {t("saveVendor")}
              </Button>
            </form>
          </CardBody>
        </Card>
        <Panel query={query}>
          {(data) =>
            data.rows.length === 0 ? (
              <Missing title={t("emptyVendors")} help={t("vendorsHelp")} to="/procurement/vendors" label={t("addVendor")} />
            ) : (
              <Table
                rows={data.rows}
                rowKey={(row) => row.id}
                columns={[
                  { key: "name", header: t("name"), render: (row: VendorRow) => row.name },
                  { key: "user", header: t("username"), render: (row: VendorRow) => row.username },
                  { key: "license", header: t("license"), render: (row: VendorRow) => row.licenseNo || "—" },
                  {
                    key: "expires",
                    header: t("licenseExpires"),
                    render: (row: VendorRow) => (
                      <Badge tone={row.licenseCurrent ? "success" : "danger"}>
                        {row.licenseExpires} · {row.licenseCurrent ? t("licenseCurrent") : t("licenseClosed")}
                      </Badge>
                    ),
                  },
                  {
                    key: "status",
                    header: t("status"),
                    render: (row: VendorRow) => (
                      <Button
                        variant="secondary"
                        loading={status.isPending}
                        onClick={() =>
                          status.mutate(
                            { id: row.id, status: row.status === "Active" ? "Suspended" : "Active" },
                            { onError: (error) => fail(setNotice, t, error) },
                          )
                        }
                      >
                        {row.status === "Active" ? t("suspend") : t("restore")}
                      </Button>
                    ),
                  },
                ]}
              />
            )
          }
        </Panel>
      </div>
    </>
  );
}

function DecisionForm({
  kind,
  row,
  budgets,
}: {
  kind: "store" | "teacher";
  row: { id: number; quantity: number; decision: "Approved" | "Refused" | null; ordered: boolean; checked: boolean };
  budgets: BudgetRow[];
}) {
  const { t } = useTranslation(["procurement", "errors"]);
  const decide = useDecide();
  const { setNotice, view } = useNotice();
  if (!row.checked) return <Badge tone="warning">{t("waiting")}</Badge>;
  if (row.ordered) return <Badge tone="success">{t("ordered")}</Badge>;
  if (row.decision === "Refused") return <Badge tone="danger">{t("refused")}</Badge>;
  if (row.decision === "Approved") return <Badge tone="success">{t("approved")}</Badge>;
  if (budgets.length === 0) return <Missing title={t("emptyBudgets")} help={t("budgetsHelp")} to="/procurement/budgets" label={t("addBudget")} />;

  function send(form: HTMLFormElement, decision: "Approved" | "Refused") {
    const data = new FormData(form);
    const budgetId = textOf(data, "budgetId");
    decide.mutate(
      {
        sourceKind: kind,
        sourceId: row.id,
        budgetId: budgetId ? Number(budgetId) : null,
        quantity: amount(data, "quantity") || row.quantity,
        unitPrice: decision === "Approved" ? amount(data, "unitPrice") : 0,
        decision,
        note: textOf(data, "note"),
      },
      { onError: (error) => fail(setNotice, t, error) },
    );
  }

  return (
    <form
      className="grid min-w-56 gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        send(event.currentTarget, "Approved");
      }}
    >
      {view}
      <Select
        label={t("budget")}
        name="budgetId"
        placeholder={t("choose")}
        options={budgets.map((budget) => ({ value: String(budget.id), label: `${budget.code} · ${birr(budget.remaining)}` }))}
      />
      <Input label={t("quantity")} name="quantity" type="number" min="0.01" step="0.01" defaultValue={row.quantity} />
      <Input label={t("unitPrice")} name="unitPrice" type="number" min="0.01" step="0.01" />
      <Input label={t("note")} name="note" />
      <div className="flex gap-2">
        <Button type="submit" loading={decide.isPending}>
          {t("approve")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={decide.isPending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) send(form, "Refused");
          }}
        >
          {t("refuse")}
        </Button>
      </div>
    </form>
  );
}

export function RequisitionsPage() {
  const { t } = useTranslation(["procurement", "errors"]);
  const query = useRequisitions();
  const budgets = useBudgets();
  const check = useCheckRequest();
  const { setNotice, view } = useNotice();
  const lines = budgets.data?.rows ?? [];

  function verify(sourceKind: "store" | "teacher", sourceId: number) {
    check.mutate({ sourceKind, sourceId }, { onError: (error) => fail(setNotice, t, error) });
  }

  return (
    <>
      <PageHeader title={t("requestsTitle")} description={t("requestsHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("storeRequests")} />
              <CardBody>
                {data.store.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("emptyRequests")}</p>
                ) : (
                  <Table
                    rows={data.store}
                    rowKey={(row) => row.id}
                    columns={[
                      { key: "item", header: t("item"), render: (row: StoreRequest) => `${row.code} · ${row.name}` },
                      { key: "stock", header: t("stock"), render: (row: StoreRequest) => `${row.stock} / ${row.reorder}` },
                      { key: "qty", header: t("quantity"), render: (row: StoreRequest) => row.quantity },
                      {
                        key: "check",
                        header: t("check"),
                        render: (row: StoreRequest) =>
                          row.checked ? (
                            <Badge tone="success">{t("checked")}</Badge>
                          ) : (
                            <Button variant="secondary" loading={check.isPending} onClick={() => verify("store", row.id)}>
                              {t("check")}
                            </Button>
                          ),
                      },
                      { key: "decision", header: t("budget"), render: (row: StoreRequest) => <DecisionForm kind="store" row={row} budgets={lines} /> },
                    ]}
                  />
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("teacherRequests")} />
              <CardBody>
                {data.teacher.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("emptyRequests")}</p>
                ) : (
                  <Table
                    rows={data.teacher}
                    rowKey={(row) => row.id}
                    columns={[
                      { key: "item", header: t("item"), render: (row: TeacherRequest) => `${row.department} · ${row.name}` },
                      { key: "stock", header: t("stock"), render: (row: TeacherRequest) => row.stock },
                      { key: "qty", header: t("quantity"), render: (row: TeacherRequest) => row.quantity },
                      {
                        key: "check",
                        header: t("check"),
                        render: (row: TeacherRequest) =>
                          row.checked ? (
                            <Badge tone="success">{t("checked")}</Badge>
                          ) : (
                            <Button variant="secondary" loading={check.isPending} onClick={() => verify("teacher", row.id)}>
                              {t("check")}
                            </Button>
                          ),
                      },
                      {
                        key: "decision",
                        header: t("budget"),
                        render: (row: TeacherRequest) => <DecisionForm kind="teacher" row={row} budgets={lines} />,
                      },
                    ]}
                  />
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function BudgetsPage() {
  const { t } = useTranslation(["procurement", "errors"]);
  const query = useBudgets();
  const create = useCreateBudget();
  const { setNotice, view } = useNotice();

  function onCreate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = readForm(event);
    create.mutate(
      {
        fiscalYear: textOf(data, "fiscalYear"),
        code: textOf(data, "code"),
        title: textOf(data, "title"),
        allocated: amount(data, "allocated"),
      },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: t("saved") });
          form.reset();
        },
        onError: (error) => fail(setNotice, t, error),
      },
    );
  }

  return (
    <>
      <PageHeader title={t("budgetsTitle")} description={t("budgetsHelp")} />
      {view}
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader title={t("saveBudget")} />
          <CardBody>
            <form className="grid gap-3" onSubmit={onCreate}>
              <Input label={t("year")} name="fiscalYear" required maxLength={4} />
              <Input label={t("code")} name="code" required />
              <Input label={t("title")} name="title" required />
              <Input label={t("allocated")} name="allocated" type="number" min="0.01" step="0.01" required />
              <Button type="submit" loading={create.isPending}>
                {t("saveBudget")}
              </Button>
            </form>
          </CardBody>
        </Card>
        <Panel query={query}>
          {(data) =>
            data.rows.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("emptyBudgets")}</p>
            ) : (
              <Table
                rows={data.rows}
                rowKey={(row) => row.id}
                columns={[
                  { key: "code", header: t("code"), render: (row: BudgetRow) => `${row.fiscalYear} · ${row.code}` },
                  { key: "title", header: t("title"), render: (row: BudgetRow) => row.title },
                  { key: "allocated", header: t("allocated"), render: (row: BudgetRow) => birr(row.allocated) },
                  { key: "spent", header: t("spent"), render: (row: BudgetRow) => birr(row.spent) },
                  { key: "free", header: t("remaining"), render: (row: BudgetRow) => birr(row.remaining) },
                ]}
              />
            )
          }
        </Panel>
      </div>
    </>
  );
}

export function OrdersPage() {
  const { t } = useTranslation(["procurement", "errors"]);
  const orders = useOrders();
  const requests = useRequisitions();
  const vendors = useVendors();
  const tenders = useTenders();
  const create = useCreateOrder();
  const receive = useReceive();
  const { setNotice, view } = useNotice();
  const readyVendors = (vendors.data?.rows ?? []).filter((row) => row.licenseCurrent);
  const sources = [
    ...(requests.data?.store ?? [])
      .filter((row) => row.decision === "Approved" && !row.ordered)
      .map((row) => ({ value: `store:${row.id}`, label: `${row.code} · ${row.name}` })),
    ...(requests.data?.teacher ?? [])
      .filter((row) => row.decision === "Approved" && !row.ordered)
      .map((row) => ({ value: `teacher:${row.id}`, label: row.name })),
    ...(tenders.data?.rows ?? [])
      .filter((row) => row.status === "Awarded")
      .map((row) => ({ value: `tender:${row.id}`, label: row.title })),
  ];

  function onCreate(event: FormEvent<HTMLFormElement>) {
    const data = readForm(event);
    const [sourceKind, sourceId] = textOf(data, "source").split(":");
    if (sourceKind !== "store" && sourceKind !== "teacher" && sourceKind !== "tender") return;
    create.mutate(
      { sourceKind, sourceId: Number(sourceId), vendorId: Number(textOf(data, "vendorId")) },
      {
        onSuccess: () => setNotice({ tone: "success", text: t("saved") }),
        onError: (error) => fail(setNotice, t, error),
      },
    );
  }

  return (
    <>
      <PageHeader title={t("ordersTitle")} description={t("ordersHelp")} />
      {view}
      <div className="mb-4">
        {readyVendors.length === 0 ? (
          <Missing title={t("emptyVendors")} help={t("vendorsHelp")} to="/procurement/vendors" label={t("addVendor")} />
        ) : sources.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("emptyApproved")}</p>
        ) : (
          <Card>
            <CardHeader title={t("issue")} />
            <CardBody>
              <form className="grid gap-3 md:grid-cols-3" onSubmit={onCreate}>
                <Select label={t("request")} name="source" placeholder={t("choose")} options={sources} />
                <Select
                  label={t("vendor")}
                  name="vendorId"
                  placeholder={t("choose")}
                  options={readyVendors.map((row) => ({ value: String(row.id), label: row.name }))}
                />
                <div className="flex items-end">
                  <Button type="submit" loading={create.isPending}>
                    {t("issue")}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
      <Panel query={orders}>
        {(data) =>
          data.rows.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("emptyOrders")}</p>
          ) : (
            <Table
              rows={data.rows}
              rowKey={(row) => row.id}
              columns={[
                { key: "no", header: t("orderNo"), render: (row) => row.orderNo },
                { key: "vendor", header: t("vendor"), render: (row) => row.vendor },
                { key: "item", header: t("item"), render: (row) => row.itemName },
                { key: "total", header: t("total"), render: (row) => birr(row.total) },
                {
                  key: "status",
                  header: t("status"),
                  render: (row) => (
                    <Badge tone={row.status === "Delivered" ? "success" : row.status === "Partial" ? "warning" : "brand"}>{row.status}</Badge>
                  ),
                },
                {
                  key: "receive",
                  header: t("received"),
                  render: (row) =>
                    row.status === "Delivered" ? (
                      row.received
                    ) : (
                      <form
                        className="flex gap-2"
                        onSubmit={(event) => {
                          const data = readForm(event);
                          receive.mutate(
                            { id: row.id, quantity: amount(data, "quantity") },
                            { onError: (error) => fail(setNotice, t, error) },
                          );
                        }}
                      >
                        <Input label={t("quantity")} name="quantity" type="number" min="0.01" step="0.01" />
                        <Button type="submit" variant="secondary" loading={receive.isPending}>
                          {t("receive")}
                        </Button>
                      </form>
                    ),
                },
                {
                  key: "print",
                  header: t("print"),
                  render: (row) => (
                    <Link className="text-sm font-semibold text-brand-700 underline" to={`/procurement/orders/${row.id}`}>
                      {t("print")}
                    </Link>
                  ),
                },
              ]}
            />
          )
        }
      </Panel>
    </>
  );
}

export function OrderPrintPage() {
  const { t } = useTranslation("procurement");
  const params = useParams();
  const id = Number(params.id);
  const query = useOrder(Number.isInteger(id) ? id : 0);
  return (
    <div className="font-[Noto_Sans_Ethiopic,Segoe_UI,sans-serif]">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link className="text-sm font-semibold text-brand-700 underline" to="/procurement/orders">
          {t("backOffice")}
        </Link>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          {t("print")}
        </Button>
      </div>
      <Panel query={query}>
        {(row) => (
          <article className="rounded-card border border-border bg-surface p-6">
            <p className="text-sm text-ink-muted">{row.school}</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink-strong">{row.orderNo}</h1>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-ink-muted">{t("vendor")}</dt>
                <dd>{row.vendor}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-ink-muted">{t("license")}</dt>
                <dd>{row.licenseNo || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-ink-muted">{t("item")}</dt>
                <dd>{row.itemName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-ink-muted">{t("quantity")}</dt>
                <dd>{row.quantity}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-ink-muted">{t("unitPrice")}</dt>
                <dd>{birr(row.unitPrice)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-ink-muted">{t("total")}</dt>
                <dd className="text-lg font-semibold">{birr(row.total)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-ink-muted">{t("budget")}</dt>
                <dd>
                  {row.fiscalYear} · {row.budgetCode}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-ink-muted">{t("status")}</dt>
                <dd>
                  {row.status} · {t("received")} {row.received}
                </dd>
              </div>
            </dl>
          </article>
        )}
      </Panel>
    </div>
  );
}

export function TendersPage() {
  const { t } = useTranslation(["procurement", "errors"]);
  const query = useTenders();
  const budgets = useBudgets();
  const create = useCreateTender();
  const { setNotice, view } = useNotice();
  const lines = budgets.data?.rows ?? [];

  function onCreate(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = readForm(event);
    create.mutate(
      {
        title: textOf(data, "title"),
        itemName: textOf(data, "itemName"),
        quantity: amount(data, "quantity"),
        closesOn: textOf(data, "closesOn"),
        budgetId: Number(textOf(data, "budgetId")),
      },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: t("saved") });
          form.reset();
        },
        onError: (error) => fail(setNotice, t, error),
      },
    );
  }

  return (
    <>
      <PageHeader
        title={t("tendersTitle")}
        description={t("tendersHelp")}
        actions={
          <Link className="text-sm font-semibold text-brand-700 underline" to="/tenders">
            {t("publicLink")}
          </Link>
        }
      />
      {view}
      {lines.length === 0 ? <Missing title={t("emptyBudgets")} help={t("budgetsHelp")} to="/procurement/budgets" label={t("addBudget")} /> : null}
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader title={t("saveTender")} />
          <CardBody>
            <form className="grid gap-3" onSubmit={onCreate}>
              <Input label={t("title")} name="title" required />
              <Input label={t("item")} name="itemName" required />
              <Input label={t("quantity")} name="quantity" type="number" min="0.01" step="0.01" required />
              <Input label={t("closes")} name="closesOn" type="date" required />
              <Select
                label={t("budget")}
                name="budgetId"
                placeholder={t("choose")}
                options={lines.map((row) => ({ value: String(row.id), label: `${row.code} · ${birr(row.remaining)}` }))}
              />
              <Button type="submit" loading={create.isPending} disabled={lines.length === 0}>
                {t("saveTender")}
              </Button>
            </form>
          </CardBody>
        </Card>
        <Panel query={query}>
          {(data) =>
            data.rows.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("emptyTenders")}</p>
            ) : (
              <Table
                rows={data.rows}
                rowKey={(row) => row.id}
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "item", header: t("item"), render: (row) => `${row.itemName} · ${row.quantity}` },
                  { key: "closes", header: t("closes"), render: (row) => row.closesOn },
                  {
                    key: "status",
                    header: t("status"),
                    render: (row) => <Badge tone={row.status === "Awarded" ? "success" : row.open ? "brand" : "neutral"}>{row.status}</Badge>,
                  },
                  {
                    key: "matrix",
                    header: t("matrix"),
                    render: (row) => (
                      <Link className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline" to={`/procurement/tenders/${row.id}`}>
                        <ShoppingCart className="size-4" aria-hidden="true" />
                        {t("matrix")}
                      </Link>
                    ),
                  },
                ]}
              />
            )
          }
        </Panel>
      </div>
    </>
  );
}

export function TenderMatrixPage() {
  const { t } = useTranslation(["procurement", "errors"]);
  const params = useParams();
  const id = Number(params.id);
  const query = useMatrix(Number.isInteger(id) ? id : 0);
  const vendors = useVendors();
  const award = useAward();
  const order = useCreateOrder();
  const { setNotice, view } = useNotice();
  const winnerVendor = vendors.data?.rows.find((row) => row.id === query.data?.rows.find((bid) => bid.id === query.data?.winnerId)?.vendorId);

  return (
    <>
      <PageHeader title={t("matrixTitle")} description={t("matrixHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={data.tender.title} />
              <CardBody>
                <p className="text-sm text-ink-muted">
                  {data.tender.itemName} · {data.tender.quantity} · {data.tender.closesOn}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.tender.status === "Open" ? (
                    <Button
                      loading={award.isPending}
                      disabled={data.winnerId == null}
                      onClick={() => award.mutate(data.tender.id, { onError: (error) => fail(setNotice, t, error) })}
                    >
                      {t("award")}
                    </Button>
                  ) : null}
                  {data.tender.status === "Awarded" && data.orderId == null && winnerVendor ? (
                    <Button
                      variant="secondary"
                      loading={order.isPending}
                      onClick={() =>
                        order.mutate(
                          { sourceKind: "tender", sourceId: data.tender.id, vendorId: winnerVendor.id },
                          { onError: (error) => fail(setNotice, t, error) },
                        )
                      }
                    >
                      {t("issueAward")}
                    </Button>
                  ) : null}
                  {data.orderId ? (
                    <Link className="inline-flex items-center text-sm font-semibold text-brand-700 underline" to={`/procurement/orders/${data.orderId}`}>
                      {t("print")}
                    </Link>
                  ) : null}
                </div>
              </CardBody>
            </Card>
            {data.rows.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("emptyBids")}</p>
            ) : (
              <Table
                rows={data.rows}
                rowKey={(row) => row.id}
                columns={[
                  { key: "rank", header: t("rank"), render: (row) => row.rank },
                  { key: "vendor", header: t("vendor"), render: (row) => row.vendor },
                  { key: "amount", header: t("amount"), render: (row) => birr(row.amount) },
                  {
                    key: "valid",
                    header: t("valid"),
                    render: (row) => (
                      <Badge tone={row.valid ? "success" : "danger"}>{row.valid ? t("licenseCurrent") : t("licenseClosed")}</Badge>
                    ),
                  },
                ]}
              />
            )}
          </div>
        )}
      </Panel>
    </>
  );
}
