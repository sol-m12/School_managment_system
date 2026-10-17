import { Link } from "react-router-dom";
import { Bell, Boxes, Package, QrCode, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Card, CardBody, CardHeader, PageHeader, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { Panel } from "@/features/principal/officeUi";
import { useAlerts, useAssets, useForecast, useLoans, useStoreReport } from "./api/useStoreOffice";

const links = [
  { to: "/store/search", key: "inventorySearch" },
  { to: "/store/alerts", key: "reorderAlerts" },
  { to: "/store/procurement", key: "procurementRouting" },
  { to: "/store/assets", key: "assetTags" },
  { to: "/store/loans", key: "assetLoans" },
  { to: "/store/disposal", key: "damageLog" },
  { to: "/store/forecast", key: "stockForecast" },
  { to: "/store/reports", key: "storeReports" },
] as const;

export function StoreDeskPage() {
  const { t } = useTranslation(["store", "nav"]);
  const report = useStoreReport();
  const alerts = useAlerts();
  const loans = useLoans();
  const forecast = useForecast();
  const assets = useAssets();
  const openAlerts = alerts.data?.rows ?? [];
  const overdue = (loans.data?.rows ?? []).filter((row) => row.overdue);
  const warnings = (forecast.data?.rows ?? []).filter((row) => row.alert);
  const tags = (assets.data?.rows ?? []).slice(0, 3);

  return (
    <>
      <PageHeader title={t("officeDeskTitle")} description={t("officeDeskHelp")} />
      <div className="mb-4 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-brand-800 hover:border-brand-100 hover:bg-brand-50"
          >
            {t(`nav:items.${link.key}`)}
          </Link>
        ))}
      </div>
      <Panel query={report}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("officeSkus")} value={String(data.skus)} icon={Boxes} />
              <StatCard label={t("officeValue")} value={data.totalValue.toLocaleString()} icon={ScrollText} />
              <StatCard label={t("officeLow")} value={String(data.low + data.critical)} icon={Bell} />
              <StatCard label={t("officeOverdueLoans")} value={String(data.overdueLoans)} icon={Package} tone="danger" />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader title={t("officeAlertsTitle")} actions={<Link className="text-sm font-semibold text-brand-700" to="/store/alerts">{t("officeOpen")}</Link>} />
                <Table
                  columns={[
                    { key: "item", header: t("officeItem"), render: (row) => `${row.code} ${row.name}` },
                    { key: "kind", header: t("officeKind"), render: (row) => t(row.kind === "reorder" ? "officeKindReorder" : "officeKindForecast") },
                    { key: "stock", header: t("officeStock"), render: (row) => row.stock },
                  ]}
                  rows={openAlerts}
                  rowKey={(row) => row.id}
                  empty={t("officeEmpty")}
                />
              </Card>
              <Card>
                <CardHeader title={t("officeOverdueLoans")} actions={<Link className="text-sm font-semibold text-brand-700" to="/store/loans">{t("officeOpen")}</Link>} />
                <Table
                  columns={[
                    { key: "tag", header: t("officeTag"), render: (row) => row.tag },
                    { key: "who", header: t("officeBorrower"), render: (row) => row.borrowerName },
                    { key: "due", header: t("officeDue"), render: (row) => row.dueOn },
                  ]}
                  rows={overdue}
                  rowKey={(row) => row.id}
                  empty={t("officeEmpty")}
                />
              </Card>
            </div>
            <Card>
              <CardHeader title={t("officeForecastTitle")} description={t("officeForecastHelp")} actions={<Link className="text-sm font-semibold text-brand-700" to="/store/forecast">{t("officeOpen")}</Link>} />
              <Table
                columns={[
                  { key: "item", header: t("officeItem"), render: (row) => `${row.code} ${row.name}` },
                  { key: "stock", header: t("officeStock"), render: (row) => row.stock },
                  { key: "days", header: t("officeDaysLeft"), render: (row) => (row.daysLeft == null ? t("officeNoUsage") : row.daysLeft) },
                ]}
                rows={warnings}
                rowKey={(row) => row.id}
                empty={t("officeEmpty")}
              />
            </Card>
            <Card>
              <CardHeader title={t("officeAssetsTitle")} actions={<Link className="text-sm font-semibold text-brand-700" to="/store/assets">{t("officeOpen")}</Link>} />
              <CardBody>
                {tags.length === 0 ? <p className="text-sm text-ink-muted">{t("officeEmpty")}</p> : null}
                <div className="grid gap-3 md:grid-cols-3">
                  {tags.map((row) => (
                    <Link key={row.id} to="/store/assets" className="flex items-center gap-3 rounded-card border border-border p-3 hover:border-brand-100">
                      <QrCode className="size-8 shrink-0 text-brand-700" />
                      <span className="min-w-0">
                        <span className="block font-bold text-brand-800">{row.tag}</span>
                        <span className="block truncate text-sm text-ink-strong">{row.name}</span>
                        <Badge tone={row.status === "InStore" ? "success" : row.status === "OnLoan" ? "warning" : "danger"}>
                          {t(row.status === "InStore" ? "officeInStore" : row.status === "OnLoan" ? "officeOnLoan" : "officeDisposed")}
                        </Badge>
                      </span>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}
