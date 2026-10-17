import { useEffect, useState, type FormEvent } from "react";
import { Boxes, Bell, Package, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { toErrorKey } from "@/lib/apiError";
import {
  useAlerts,
  useAssets,
  useDisposals,
  useForecast,
  useInventorySearch,
  useLendAsset,
  useLoans,
  useProcurement,
  useRecordDisposal,
  useRegisterAsset,
  useReturnAsset,
  useRouteAlert,
  useRoutePurchase,
  useSeeAlert,
  useStoreReport,
} from "./api/useStoreOffice";

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

function numOf(data: FormData, name: string): number {
  return Number(textOf(data, name));
}

const STATUS_KEY = { critical: "officeCritical", low: "officeLow", adequate: "officeAdequate" } as const;
const ASSET_KEY = { InStore: "officeInStore", OnLoan: "officeOnLoan", Disposed: "officeDisposed" } as const;
const ACTION_KEY: Record<string, "actionRoute" | "actionAlert" | "actionAsset" | "actionDispose" | "actionLoan" | "actionReturn"> = {
  "store.route": "actionRoute",
  "store.alert": "actionAlert",
  "store.asset": "actionAsset",
  "store.dispose": "actionDispose",
  "store.loan": "actionLoan",
  "store.return": "actionReturn",
};

export function ProcurementPage() {
  const { t } = useTranslation(["store", "errors"]);
  const query = useProcurement();
  const route = useRoutePurchase();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("officeProcurementTitle")} description={t("officeProcurementHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("officeProcurementTitle")} />
              <Table
                columns={[
                  { key: "item", header: t("officeItem"), render: (row) => `${row.code} ${row.name}` },
                  { key: "stock", header: t("officeStock"), render: (row) => row.stock },
                  { key: "reorder", header: t("officeReorder"), render: (row) => row.reorder },
                  { key: "suggested", header: t("officeSuggested"), render: (row) => row.suggested },
                  {
                    key: "action",
                    header: t("officeRoute"),
                    render: (row) =>
                      row.routed ? (
                        t("officeRouted")
                      ) : (
                        <Button
                          type="button"
                          loading={route.isPending}
                          onClick={() =>
                            route.mutate(
                              { itemId: row.id, quantity: row.suggested, note: "" },
                              {
                                onSuccess: () => setNotice({ tone: "success", text: t("officeSaved") }),
                                onError: (error) => fail(setNotice, t, error),
                              },
                            )
                          }
                        >
                          {t("officeRoute")}
                        </Button>
                      ),
                  },
                ]}
                rows={data.low}
                rowKey={(row) => row.id}
                empty={t("officeEmpty")}
              />
            </Card>
            <Card>
              <CardHeader title={t("officeRequests")} />
              <Table
                columns={[
                  { key: "item", header: t("officeItem"), render: (row) => `${row.code} ${row.name}` },
                  { key: "qty", header: t("officeQuantity"), render: (row) => row.quantity },
                  { key: "note", header: t("officeNote"), render: (row) => row.note },
                  { key: "when", header: t("officeWhen"), render: (row) => row.createdAt },
                ]}
                rows={data.requests}
                rowKey={(row) => row.id}
                empty={t("officeEmpty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function InventorySearchPage() {
  const { t } = useTranslation("store");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);
  const query = useInventorySearch(q);
  const { t: errors } = useTranslation("errors");
  return (
    <>
      <PageHeader title={t("officeSearchTitle")} description={t("officeSearchHelp")} />
      <div className="mb-4 max-w-xl">
        <Input label={t("officeSearchTitle")} value={text} placeholder={t("officeSearchPlaceholder")} onChange={(event) => setText(event.target.value)} />
      </div>
      {q && query.isPending ? <Spinner /> : null}
      {query.isError ? <Alert tone="danger">{errors(toErrorKey(query.error))}</Alert> : null}
      <Card>
        <Table
          columns={[
            { key: "item", header: t("officeItem"), render: (row) => `${row.code} ${row.name}` },
            { key: "stock", header: t("officeStock"), render: (row) => `${row.stock} ${row.unit}` },
            { key: "store", header: t("officeStore"), render: (row) => row.storeNo },
            { key: "shelf", header: t("officeShelf"), render: (row) => row.shelfNo },
            { key: "status", header: t("officeStatus"), render: (row) => t(STATUS_KEY[row.status]) },
          ]}
          rows={query.data?.rows ?? []}
          rowKey={(row) => row.id}
          empty={t("officeEmpty")}
        />
      </Card>
    </>
  );
}

export function AlertsPage() {
  const { t } = useTranslation(["store", "errors"]);
  const query = useAlerts();
  const see = useSeeAlert();
  const route = useRouteAlert();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("officeAlertsTitle")} description={t("officeAlertsHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "item", header: t("officeItem"), render: (row) => `${row.code} ${row.name}` },
                { key: "kind", header: t("officeKind"), render: (row) => t(row.kind === "reorder" ? "officeKindReorder" : "officeKindForecast") },
                { key: "stock", header: t("officeStock"), render: (row) => row.stock },
                { key: "days", header: t("officeDays"), render: (row) => (row.daysLeft == null ? "—" : row.daysLeft) },
                {
                  key: "action",
                  header: t("officeSeen"),
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      {row.kind === "reorder" ? (
                        <Button
                          type="button"
                          loading={route.isPending}
                          onClick={() =>
                            route.mutate(row.id, {
                              onSuccess: () => setNotice({ tone: "success", text: t("officeSaved") }),
                              onError: (error) => fail(setNotice, t, error),
                            })
                          }
                        >
                          {t("officeRouteAlert")}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        loading={see.isPending}
                        onClick={() =>
                          see.mutate(row.id, {
                            onSuccess: () => setNotice({ tone: "success", text: t("officeSaved") }),
                            onError: (error) => fail(setNotice, t, error),
                          })
                        }
                      >
                        {t("officeSeen")}
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("officeEmpty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function AssetsPage() {
  const { t } = useTranslation(["store", "errors"]);
  const query = useAssets();
  const save = useRegisterAsset();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("officeAssetsTitle")} description={t("officeAssetsHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("officeRegister")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-3"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      { itemId: numOf(form, "itemId"), serialNo: textOf(form, "serialNo"), location: textOf(form, "location") },
                      {
                        onSuccess: () => {
                          setNotice({ tone: "success", text: t("officeSaved") });
                          event.currentTarget.reset();
                        },
                        onError: (error) => fail(setNotice, t, error),
                      },
                    );
                  }}
                >
                  <Select
                    name="itemId"
                    label={t("officeItem")}
                    required
                    options={data.items.map((item) => ({ value: String(item.id), label: `${item.code} ${item.name}` }))}
                    placeholder={t("officeItem")}
                  />
                  <Input name="serialNo" label={t("officeSerial")} />
                  <Input name="location" label={t("officeLocation")} />
                  <Button type="submit" loading={save.isPending}>
                    {t("officeRegister")}
                  </Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "tag", header: t("officeTag"), render: (row) => row.tag },
                  { key: "item", header: t("officeItem"), render: (row) => `${row.code} ${row.name}` },
                  { key: "serial", header: t("officeSerial"), render: (row) => row.serialNo },
                  { key: "place", header: t("officeLocation"), render: (row) => row.location },
                  { key: "status", header: t("officeStatus"), render: (row) => t(ASSET_KEY[row.status]) },
                  {
                    key: "qr",
                    header: t("officeQr"),
                    render: (row) => (
                      <div className="h-16 w-16" dangerouslySetInnerHTML={{ __html: row.qrSvg.startsWith("<svg") ? row.qrSvg : "" }} />
                    ),
                  },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("officeEmpty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function DisposalPage() {
  const { t } = useTranslation(["store", "errors"]);
  const query = useDisposals();
  const save = useRecordDisposal();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("officeDisposalTitle")} description={t("officeDisposalHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-3"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    const asset = textOf(form, "assetId");
                    const kind = textOf(form, "kind");
                    save.mutate(
                      {
                        itemId: numOf(form, "itemId"),
                        assetId: asset ? Number(asset) : null,
                        quantity: numOf(form, "quantity"),
                        kind: kind === "disposal" ? "disposal" : "damage",
                        note: textOf(form, "note"),
                      },
                      {
                        onSuccess: () => {
                          setNotice({ tone: "success", text: t("officeSaved") });
                          event.currentTarget.reset();
                        },
                        onError: (error) => fail(setNotice, t, error),
                      },
                    );
                  }}
                >
                  <Select
                    name="itemId"
                    label={t("officeItem")}
                    required
                    options={data.items.map((item) => ({ value: String(item.id), label: `${item.code} ${item.name} (${item.stock})` }))}
                    placeholder={t("officeItem")}
                  />
                  <Select
                    name="assetId"
                    label={t("officeAssetOptional")}
                    options={data.assets.map((asset) => ({ value: String(asset.id), label: `${asset.tag} ${asset.name}` }))}
                    placeholder={t("officeNone")}
                  />
                  <Input name="quantity" label={t("officeQuantity")} type="number" min={0.01} step="0.01" required />
                  <Select
                    name="kind"
                    label={t("officeKind")}
                    required
                    options={[
                      { value: "damage", label: t("officeDamage") },
                      { value: "disposal", label: t("officeDisposal") },
                    ]}
                  />
                  <Input name="note" label={t("officeReason")} required />
                  <Button type="submit" loading={save.isPending}>
                    {t("officeDispose")}
                  </Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "item", header: t("officeItem"), render: (row) => `${row.code} ${row.name}` },
                  { key: "tag", header: t("officeTag"), render: (row) => row.tag },
                  { key: "qty", header: t("officeQuantity"), render: (row) => row.quantity },
                  { key: "kind", header: t("officeKind"), render: (row) => t(row.kind === "damage" ? "officeDamage" : "officeDisposal") },
                  { key: "note", header: t("officeReason"), render: (row) => row.note },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("officeEmpty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function LoansPage() {
  const { t } = useTranslation(["store", "errors"]);
  const query = useLoans();
  const lend = useLendAsset();
  const giveBack = useReturnAsset();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("officeLoansTitle")} description={t("officeLoansHelp")} />
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
                    lend.mutate(
                      {
                        assetId: numOf(form, "assetId"),
                        borrowerName: textOf(form, "borrowerName"),
                        purpose: textOf(form, "purpose"),
                        dueOn: textOf(form, "dueOn"),
                      },
                      {
                        onSuccess: () => {
                          setNotice({ tone: "success", text: t("officeSaved") });
                          event.currentTarget.reset();
                        },
                        onError: (error) => fail(setNotice, t, error),
                      },
                    );
                  }}
                >
                  <Select
                    name="assetId"
                    label={t("officeTag")}
                    required
                    options={data.assets.map((asset) => ({ value: String(asset.id), label: `${asset.tag} ${asset.name}` }))}
                    placeholder={t("officeTag")}
                  />
                  <Input name="borrowerName" label={t("officeBorrower")} required />
                  <Input name="purpose" label={t("officePurpose")} />
                  <Input name="dueOn" label={t("officeDue")} type="date" required />
                  <Button type="submit" loading={lend.isPending}>
                    {t("officeLoan")}
                  </Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "tag", header: t("officeTag"), render: (row) => `${row.tag} ${row.name}` },
                  { key: "who", header: t("officeBorrower"), render: (row) => row.borrowerName },
                  { key: "due", header: t("officeDue"), render: (row) => row.dueOn },
                  {
                    key: "status",
                    header: t("officeStatus"),
                    render: (row) => (row.overdue ? t("officeOverdue") : t(row.status === "Out" ? "officeOut" : "officeReturned")),
                  },
                  {
                    key: "action",
                    header: t("officeReturn"),
                    render: (row) =>
                      row.status === "Out" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          loading={giveBack.isPending}
                          onClick={() =>
                            giveBack.mutate(row.id, {
                              onSuccess: () => setNotice({ tone: "success", text: t("officeSaved") }),
                              onError: (error) => fail(setNotice, t, error),
                            })
                          }
                        >
                          {t("officeReturn")}
                        </Button>
                      ) : (
                        row.returnedOn
                      ),
                  },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("officeEmpty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function ForecastPage() {
  const { t } = useTranslation("store");
  const query = useForecast();
  return (
    <>
      <PageHeader title={t("officeForecastTitle")} description={t("officeForecastHelp")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "item", header: t("officeItem"), render: (row) => `${row.code} ${row.name}` },
                { key: "stock", header: t("officeStock"), render: (row) => row.stock },
                { key: "issued", header: t("officeIssued"), render: (row) => row.issued },
                { key: "days", header: t("officeDaysLeft"), render: (row) => (row.daysLeft == null ? t("officeNoUsage") : row.daysLeft) },
                { key: "alert", header: t("officeAlertsTitle"), render: (row) => (row.alert ? t("officeAlertYes") : t("officeAlertNo")) },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("officeEmpty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function StoreReportPage() {
  const { t } = useTranslation("store");
  const query = useStoreReport();
  return (
    <>
      <PageHeader
        title={t("officeReportsTitle")}
        description={t("officeReportsHelp")}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              {t("officePrint")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                const data = query.data;
                if (!data) return;
                const lines = [
                  [t("officeGenerated"), data.generatedOn],
                  [t("officeSkus"), String(data.skus)],
                  [t("officeAdequate"), String(data.adequate)],
                  [t("officeLow"), String(data.low)],
                  [t("officeCritical"), String(data.critical)],
                  [t("officeValue"), String(data.totalValue)],
                  [t("officeRequests"), String(data.routed)],
                  [t("officeOpenLoans"), String(data.openLoans)],
                  [t("officeOverdueLoans"), String(data.overdueLoans)],
                  [t("officeDisposals"), String(data.disposals)],
                  [],
                  [t("officeCategory"), t("officeSkus"), t("officeValue")],
                  ...data.categories.map((row) => [row.name, String(row.skus), String(row.value)]),
                  [],
                  [t("officeWhen"), t("officeAction"), t("officeDescription")],
                  ...data.audit.map((row) => [row.timestamp, t(ACTION_KEY[row.actionType] ?? "officeAction"), row.description]),
                ];
                const blob = new Blob([`\uFEFF${lines.map((line) => line.map(csvCell).join(",")).join("\n")}`], {
                  type: "text/csv;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `store-report-${data.generatedOn}.csv`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              {t("officeDownload")}
            </Button>
          </div>
        }
      />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <p className="text-sm text-ink-muted">{t("officeLanguage")}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("officeSkus")} value={String(data.skus)} icon={Boxes} />
              <StatCard label={t("officeValue")} value={data.totalValue.toLocaleString()} icon={ScrollText} />
              <StatCard label={t("officeLow")} value={String(data.low)} icon={Bell} />
              <StatCard label={t("officeCritical")} value={String(data.critical)} icon={Package} tone="danger" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("officeAdequate")} value={String(data.adequate)} icon={Boxes} tone="success" />
              <StatCard label={t("officeRequests")} value={String(data.routed)} icon={ScrollText} />
              <StatCard label={t("officeOpenLoans")} value={String(data.openLoans)} icon={Package} />
              <StatCard label={t("officeOverdueLoans")} value={String(data.overdueLoans)} icon={Bell} tone="danger" />
            </div>
            <Card>
              <CardHeader title={t("officeCategories")} description={`${t("officeGenerated")}: ${data.generatedOn}`} />
              <Table
                columns={[
                  { key: "name", header: t("officeCategory"), render: (row) => row.name },
                  { key: "skus", header: t("officeSkus"), render: (row) => row.skus },
                  { key: "value", header: t("officeValue"), render: (row) => row.value.toLocaleString() },
                ]}
                rows={data.categories}
                rowKey={(row) => row.name}
                empty={t("officeEmpty")}
              />
            </Card>
            <Card>
              <CardHeader title={t("officeAudit")} />
              <Table
                columns={[
                  { key: "when", header: t("officeWhen"), render: (row) => row.timestamp },
                  { key: "action", header: t("officeAction"), render: (row) => t(ACTION_KEY[row.actionType] ?? "officeAction") },
                  { key: "detail", header: t("officeDescription"), render: (row) => row.description },
                ]}
                rows={data.audit}
                rowKey={(row) => row.id}
                empty={t("officeEmpty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}
