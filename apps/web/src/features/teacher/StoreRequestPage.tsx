import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, EmptyState, Input, PageHeader, Select, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useStoreBoard, useStoreRequest } from "./api/useStoreRequests";

function statusLabel(status: string, labels: Record<string, string>): string {
  return labels[status] ?? status;
}

export function StoreRequestPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const board = useStoreBoard();
  const send = useStoreRequest();
  const [itemId, setItemId] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  if (board.isPending) return <p className="py-8 text-center text-sm text-ink-muted">{t("common:loading")}</p>;
  if (board.isError || !board.data) return <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>;
  const data = board.data;
  if (!data.available) return <Alert tone="warning">{t("errors:notAssigned")}</Alert>;

  const labels: Record<string, string> = {
    Pending: t("teacher:statusPending"),
    Approved: t("teacher:statusApproved"),
    Rejected: t("teacher:statusRejected"),
    Forwarded: t("teacher:statusForwarded"),
    Issued: t("teacher:statusIssued"),
  };
  const stats = [
    [t("teacher:storeTotal"), data.stats.total],
    [t("teacher:storePending"), data.stats.pending],
    [t("teacher:storeApproved"), data.stats.approved],
    [t("teacher:storeHoldings"), data.stats.holdings],
  ] as const;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const price = String(form.get("estimatedUnitPrice") ?? "");
    setNotice(null);
    try {
      await send.mutateAsync({
        itemId: Number(itemId),
        customItemName: String(form.get("customItemName") ?? ""),
        estimatedUnitPrice: price === "" ? undefined : Number(price),
        quantity: Number(form.get("quantity")),
        purpose: String(form.get("purpose") ?? ""),
      });
      event.currentTarget.reset();
      setItemId("");
      setNotice({ tone: "success", text: t("teacher:storeSaved") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t("teacher:storeTitle")} description={t("teacher:storeWelcome", { name: data.teacherName })} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardBody>
              <p className="text-sm text-ink-muted">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      {data.items.length === 0 ? (
        <Alert tone="warning">{t("teacher:storeNoItems")}</Alert>
      ) : (
        <Card>
          <CardBody>
            <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
              <h2 className="font-bold md:col-span-2">{t("teacher:storeForm")}</h2>
              <Select
                label={t("teacher:storeItem")}
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
                placeholder={t("teacher:storeItemPlaceholder")}
                options={data.items.map((item) => ({ value: String(item.id), label: item.label }))}
                required
              />
              <Input name="customItemName" label={t("teacher:customItem")} placeholder={t("teacher:customItemPlaceholder")} />
              <Input name="estimatedUnitPrice" type="number" min={0} step="0.01" label={t("teacher:unitCost")} placeholder="0.00" />
              <Input name="quantity" type="number" min={1} required label={t("teacher:quantity")} placeholder={t("teacher:quantityPlaceholder")} />
              <div className="md:col-span-2">
                <Input name="purpose" label={t("teacher:purpose")} required placeholder={t("teacher:purposePlaceholder")} />
              </div>
              <Button type="submit" loading={send.isPending} disabled={itemId === ""}>
                {t("teacher:sendRequest")}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardBody>
          <h2 className="mb-3 font-bold">{t("teacher:myRequests")}</h2>
          {data.requests.length === 0 ? (
            <EmptyState title={t("teacher:storeEmpty")} />
          ) : (
            <Table
              columns={[
                { key: "ref", header: t("teacher:refCode"), render: (row) => row.ref },
                { key: "name", header: t("teacher:itemName"), render: (row) => row.name },
                { key: "qty", header: t("teacher:quantity"), render: (row) => row.quantity },
                { key: "date", header: t("teacher:requestedOn"), render: (row) => row.requestedAt },
                { key: "status", header: t("teacher:status"), render: (row) => statusLabel(row.status, labels) },
              ]}
              rows={data.requests}
              rowKey={(row) => row.ref}
            />
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h2 className="mb-3 font-bold">{t("teacher:model22")}</h2>
          {data.holdings.length === 0 ? (
            <EmptyState title={t("teacher:holdingsEmpty")} />
          ) : (
            <Table
              columns={[
                { key: "code", header: t("teacher:modelNo"), render: (row) => row.code },
                { key: "name", header: t("teacher:itemName"), render: (row) => row.name },
                { key: "kind", header: t("teacher:itemKind"), render: (row) => row.kind },
                { key: "qty", header: t("teacher:receivedQty"), render: (row) => row.quantity },
                { key: "date", header: t("teacher:issuedOn"), render: (row) => row.issuedAt },
                { key: "status", header: t("teacher:trackStatus"), render: (row) => statusLabel(row.status, labels) },
              ]}
              rows={data.holdings}
              rowKey={(row) => row.code}
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
