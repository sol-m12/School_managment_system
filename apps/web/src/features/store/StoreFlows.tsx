import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Spinner, Table } from "@/components/ui";
import { fieldControlClass, fieldLabelClass } from "@/components/ui/Input";
import { toErrorKey } from "@/lib/apiError";
import {
  etb,
  useApprovalAction,
  useApprovals,
  useBinCard,
  useCreateItem,
  useGrnBoard,
  useIssueItem,
  useIssues,
  useNextItemCode,
  useReceiveGrn,
  useRecordInflow,
  useStoreCategories,
  useStoreItems,
  type ItemBody,
} from "./storeApi";

function Loading() {
  const { t } = useTranslation("common");
  return (
    <div className="flex justify-center py-10 text-brand-700">
      <Spinner size="lg" label={t("loading")} />
    </div>
  );
}

export function Model19Page() {
  const { t } = useTranslation(["store", "errors"]);
  const board = useGrnBoard();
  const receive = useReceiveGrn();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grnNumber, setGrnNumber] = useState("");
  const [dateReceived, setDateReceived] = useState("");
  const [department, setDepartment] = useState("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [itemId, setItemId] = useState<number | "">("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");

  if (board.isPending) return <Loading />;
  if (board.isError || !board.data) return <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>;
  const data = board.data;
  const total = (Number(quantity) || 0) * (Number(price) || 0);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await receive.mutateAsync({
        grnNumber: grnNumber || data.nextGrnNumber,
        dateReceived: dateReceived || data.dateReceived,
        department,
        supplierId: supplierId === "" ? null : supplierId,
        itemId: Number(itemId),
        quantityReceived: Number(quantity),
        unitPrice: Number(price),
      });
      setNotice(t("store:grnSaved"));
      setQuantity("");
      setPrice("");
    } catch (caught) {
      setError(t(`errors:${toErrorKey(caught)}`));
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("store:grnTitle")}</h1>
        <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-sm font-bold text-[#15803d]">{t("store:grnBadge")}</span>
      </div>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <form onSubmit={onSubmit} className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 rounded-t bg-brand-700 px-3 py-2 font-bold text-white">{t("store:grnForm")}</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:grnNumber")}</span>
            <input className={fieldControlClass} required value={grnNumber || data.nextGrnNumber} onChange={(event) => setGrnNumber(event.target.value)} />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:grnDate")}</span>
            <input className={fieldControlClass} type="date" value={dateReceived || data.dateReceived} onChange={(event) => setDateReceived(event.target.value)} />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:department")}</span>
            <input className={fieldControlClass} value={department} onChange={(event) => setDepartment(event.target.value)} />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:supplier")}</span>
            <select className={fieldControlClass} value={supplierId} onChange={(event) => setSupplierId(event.target.value ? Number(event.target.value) : "")}>
              <option value="">{t("store:choose")}</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <span className={fieldLabelClass}>{t("store:colItem")}</span>
            <select className={fieldControlClass} required value={itemId} onChange={(event) => setItemId(Number(event.target.value))}>
              <option value="">{t("store:chooseItem")}</option>
              {data.items.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.code}] {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:qty")}</span>
            <input className={fieldControlClass} required type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:price")}</span>
            <input className={fieldControlClass} required type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </label>
        </div>
        <p className="mt-3 text-end font-bold text-[#15803d]">
          {t("store:totalCost")}: {etb.format(total)} ETB
        </p>
        <div className="text-end">
          <Button type="submit" loading={receive.isPending}>
            {t("store:saveGrn")}
          </Button>
        </div>
      </form>
      <div className="rounded-xl bg-white shadow-sm">
        <h2 className="border-b px-4 py-3 font-bold">{t("store:recentGrn")}</h2>
        <Table
          rows={data.records}
          rowKey={(row) => row.id}
          empty={t("store:emptyGrn")}
          columns={[
            { key: "no", header: t("store:colGrn"), render: (row) => row.grnNumber },
            { key: "date", header: t("store:colDate"), render: (row) => row.dateReceived },
            { key: "item", header: t("store:colItem"), render: (row) => `[${row.itemCode}] ${row.itemName}` },
            { key: "qty", header: t("store:colQtyIn"), render: (row) => `+${row.quantityReceived.toFixed(2)}` },
            { key: "price", header: t("store:colUnit"), render: (row) => `${etb.format(row.unitPrice)} ETB` },
            { key: "total", header: t("store:colLineTotal"), render: (row) => `${etb.format(row.totalPrice)} ETB` },
            { key: "state", header: t("store:colState"), render: () => t("store:binUpdated") },
          ]}
        />
      </div>
    </div>
  );
}

export function BinCardPage() {
  const { t } = useTranslation(["store", "errors"]);
  const [itemId, setItemId] = useState(0);
  const [trxType, setTrxType] = useState<"" | "IN" | "OUT">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applied, setApplied] = useState({ itemId: 0, trxType: "" as "" | "IN" | "OUT", fromDate: "", toDate: "" });
  const query = useBinCard(applied);

  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;
  const data = query.data;

  return (
    <div className="grid gap-4 bg-[#f8fafc]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{t("store:binTitle")}</h1>
          <p className="text-sm text-ink-muted">{t("store:binSubtitle")}</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          {t("store:print")}
        </Button>
      </div>
      <form
        className="grid gap-3 rounded-xl bg-white p-3 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({ itemId, trxType, fromDate, toDate });
        }}
      >
        <label className="text-sm">
          <span className={fieldLabelClass}>{t("store:pickItem")}</span>
          <select className={fieldControlClass} value={itemId} onChange={(event) => setItemId(Number(event.target.value))}>
            <option value={0}>{t("store:allItems")}</option>
            {data.items.map((item) => (
              <option key={item.id} value={item.id}>
                [{item.code}] {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className={fieldLabelClass}>{t("store:trxType")}</span>
          <select className={fieldControlClass} value={trxType} onChange={(event) => setTrxType(event.target.value as "" | "IN" | "OUT")}>
            <option value="">{t("store:allTrx")}</option>
            <option value="IN">{t("store:trxIn")}</option>
            <option value="OUT">{t("store:trxOut")}</option>
          </select>
        </label>
        <label className="text-sm">
          <span className={fieldLabelClass}>{t("store:fromDate")}</span>
          <input className={fieldControlClass} type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label className="text-sm">
          <span className={fieldLabelClass}>{t("store:toDate")}</span>
          <input className={fieldControlClass} type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <div className="flex gap-2">
          <Button type="submit">{t("store:filter")}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setItemId(0);
              setTrxType("");
              setFromDate("");
              setToDate("");
              setApplied({ itemId: 0, trxType: "", fromDate: "", toDate: "" });
            }}
          >
            {t("store:clear")}
          </Button>
        </div>
      </form>
      {data.selected ? (
        <div className="rounded-xl bg-brand-700 p-4 text-white">
          <p className="text-sm">[{data.selected.code}]</p>
          <h2 className="text-lg font-bold">{data.selected.name}</h2>
          <p>
            {t("store:storeShelf")}: {data.selected.storeNo} / {data.selected.shelfNo}
          </p>
          <p>
            {t("store:onHand")}: {data.selected.currentStock} {data.selected.unitOfMeasure}
          </p>
        </div>
      ) : null}
      <p className="text-sm">
        {t("store:totalIn")}: <strong>{data.totalIn}</strong> · {t("store:totalOut")}: <strong>{data.totalOut}</strong>
      </p>
      <div className="rounded-xl bg-white">
        <Table
          rows={data.rows}
          rowKey={(row) => row.id}
          empty={t("store:emptyBin")}
          columns={[
            { key: "date", header: t("store:colDate"), render: (row) => row.transactionDate },
            { key: "ref", header: t("store:refNo"), render: (row) => row.referenceDocument },
            { key: "item", header: t("store:colItem"), render: (row) => `[${row.itemCode}] ${row.itemName}` },
            { key: "in", header: t("store:trxIn"), render: (row) => (row.receivedQty > 0 ? row.receivedQty : "-") },
            { key: "out", header: t("store:trxOut"), render: (row) => (row.issuedQty > 0 ? row.issuedQty : "-") },
            { key: "bal", header: t("store:onHand"), render: (row) => row.balanceQty },
            { key: "remark", header: t("store:remarks"), render: (row) => row.remark },
          ]}
        />
      </div>
    </div>
  );
}

export function InflowPage() {
  const { t } = useTranslation(["store", "errors"]);
  const items = useStoreItems();
  const record = useRecordInflow();
  const [itemId, setItemId] = useState(0);
  const [viewId, setViewId] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bin = useBinCard({ itemId: viewId, fromDate: "", toDate: "", trxType: "" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      const result = await record.mutateAsync({
        itemId: Number(form.get("itemId")),
        inflowType: String(form.get("inflowType")) as "DONATION" | "TRANSFER" | "LOAN_RETURN" | "FOUND_SURPLUS",
        sourceEntity: String(form.get("sourceEntity")),
        quantity: Number(form.get("quantity")),
        unitEstimatedCost: Number(form.get("unitEstimatedCost") || 0),
        referenceDocNo: String(form.get("referenceDocNo")),
        remarks: String(form.get("remarks") || ""),
      });
      setNotice(t("store:inflowSaved", { stock: result.newStockBalance }));
      setViewId(Number(form.get("itemId")));
      event.currentTarget.reset();
    } catch (caught) {
      setError(t(`errors:${toErrorKey(caught)}`));
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <form onSubmit={onSubmit} className="rounded-lg bg-white p-6 shadow">
        <h1 className="mb-4 border-b-2 border-[#3498db] pb-2 text-xl font-bold text-[#2c3e50]">{t("store:inflowTitle")}</h1>
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:inflowItem")}</span>
            <select className={fieldControlClass} name="itemId" required value={itemId || ""} onChange={(event) => setItemId(Number(event.target.value))}>
              <option value="">{t("store:chooseItem")}</option>
              {(items.data?.rows ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} — [{item.code}] {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:inflowType")}</span>
            <select className={fieldControlClass} name="inflowType" defaultValue="DONATION">
              <option value="DONATION">{t("store:donation")}</option>
              <option value="TRANSFER">{t("store:transfer")}</option>
              <option value="LOAN_RETURN">{t("store:loanReturn")}</option>
              <option value="FOUND_SURPLUS">{t("store:surplus")}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:source")}</span>
            <input className={fieldControlClass} name="sourceEntity" required />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:quantity")}</span>
            <input className={fieldControlClass} name="quantity" type="number" min="1" required />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:estimatedCost")}</span>
            <input className={fieldControlClass} name="unitEstimatedCost" type="number" min="0" step="0.01" defaultValue="0" />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:refNo")}</span>
            <input className={fieldControlClass} name="referenceDocNo" required />
          </label>
          <label className="text-sm md:col-span-2">
            <span className={fieldLabelClass}>{t("store:remarks")}</span>
            <textarea className={fieldControlClass} name="remarks" rows={2} />
          </label>
        </div>
        <Button className="mt-4" type="submit" loading={record.isPending}>
          {t("store:saveInflow")}
        </Button>
      </form>
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-3 font-bold">{t("store:binCardTitle")}</h2>
        <div className="mb-3 flex gap-2">
          <select className={fieldControlClass} value={viewId || ""} onChange={(event) => setViewId(Number(event.target.value))}>
            <option value="">{t("store:chooseItem")}</option>
            {(items.data?.rows ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                [{item.code}] {item.name}
              </option>
            ))}
          </select>
          <Button type="button" onClick={() => setViewId(viewId)}>
            {t("store:showBin")}
          </Button>
        </div>
        <Table
          rows={bin.data?.rows ?? []}
          rowKey={(row) => row.id}
          empty={t("store:emptyBin")}
          columns={[
            { key: "date", header: t("store:colDate"), render: (row) => row.transactionDate },
            { key: "ref", header: t("store:refNo"), render: (row) => row.referenceDocument },
            { key: "in", header: t("store:trxIn"), render: (row) => (row.receivedQty > 0 ? `+${row.receivedQty}` : "-") },
            { key: "out", header: t("store:trxOut"), render: (row) => (row.issuedQty > 0 ? `-${row.issuedQty}` : "-") },
            { key: "bal", header: t("store:onHand"), render: (row) => row.balanceQty },
          ]}
        />
      </div>
    </div>
  );
}

export function ApprovalsPage() {
  const { t } = useTranslation(["store", "errors", "common"]);
  const query = useApprovals();
  const action = useApprovalAction();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(id: number, kind: "forward" | "reject") {
    if (kind === "reject" && !window.confirm(t("store:rejectConfirm"))) return;
    setError(null);
    try {
      await action.mutateAsync({ id, action: kind });
      setNotice(kind === "forward" ? t("store:forwarded") : t("store:rejected"));
    } catch (caught) {
      setError(t(`errors:${toErrorKey(caught)}`));
    }
  }

  if (query.isPending) return <Loading />;
  if (query.isError) return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border-s-4 border-brand-700 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-brand-700">{t("store:approvalTitle")}</h1>
        <p className="text-sm text-ink-muted">{t("common:roles.Store_Keeper")}</p>
      </div>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="rounded-xl bg-white shadow-sm">
        <h2 className="border-b px-4 py-3 font-bold">{t("store:approvalWaiting")}</h2>
        <Table
          rows={query.data ?? []}
          rowKey={(row) => row.id}
          empty={t("store:emptyApprovals")}
          columns={[
            { key: "ref", header: "Ref Code", render: (row) => row.refCode },
            { key: "who", header: t("store:source"), render: (row) => row.requesterName },
            { key: "dept", header: t("store:department"), render: (row) => row.department },
            { key: "item", header: t("store:colItem"), render: (row) => `${row.itemName} [${row.itemCode}]` },
            { key: "qty", header: t("store:quantity"), render: (row) => row.quantityRequested },
            {
              key: "stock",
              header: t("store:onHand"),
              render: (row) =>
                row.currentStock >= row.quantityRequested
                  ? `${t("store:enough")} (${row.currentStock})`
                  : `${t("store:short")} (${row.currentStock})`,
            },
            { key: "date", header: t("store:colDate"), render: (row) => row.createdAt },
            { key: "why", header: t("store:remarks"), render: (row) => row.purpose },
            {
              key: "action",
              header: t("store:colState"),
              render: (row) => (
                <div className="flex gap-2">
                  <Button type="button" onClick={() => void run(row.id, "forward")}>
                    {t("store:forward")}
                  </Button>
                  <Button type="button" variant="danger" onClick={() => void run(row.id, "reject")}>
                    {t("store:reject")}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

export function IssuePage() {
  const { t } = useTranslation(["store", "errors"]);
  const query = useIssues();
  const issue = useIssueItem();
  const [vouchers, setVouchers] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onIssue(id: number) {
    const voucherNo = (vouchers[id] ?? "").trim();
    if (!voucherNo) return;
    if (!window.confirm(t("store:issueConfirm"))) return;
    setError(null);
    try {
      await issue.mutateAsync({ requisitionId: id, voucherNo });
      setNotice(t("store:issueSaved"));
    } catch (caught) {
      setError(t(`errors:${toErrorKey(caught)}`));
    }
  }

  if (query.isPending) return <Loading />;
  if (query.isError || !query.data) return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border-s-4 border-[#16a34a] bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-[#15803d]">{t("store:issueTitle")}</h1>
        <p className="text-sm text-ink-muted">{t("store:issueSubtitle")}</p>
      </div>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="rounded-xl bg-white shadow-sm">
        <h2 className="border-b px-4 py-3 font-bold">{t("store:pendingIssues")}</h2>
        <Table
          rows={query.data.pending}
          rowKey={(row) => row.id}
          empty={t("store:emptyIssues")}
          columns={[
            { key: "ref", header: "Ref Code", render: (row) => row.refCode },
            { key: "who", header: t("store:source"), render: (row) => `${row.requesterName} / ${row.department}` },
            { key: "item", header: t("store:colItem"), render: (row) => `${row.itemName} [${row.itemCode}]` },
            { key: "qty", header: t("store:quantity"), render: (row) => `${row.quantityRequested} ${row.unitOfMeasure}` },
            {
              key: "bin",
              header: t("store:onHand"),
              render: (row) => (row.enough ? `${t("store:enough")} (${row.binBalance})` : `${t("store:short")} (${row.binBalance})`),
            },
            { key: "head", header: t("store:forward"), render: (row) => row.approverName },
            {
              key: "act",
              header: t("store:issueButton"),
              render: (row) => (
                <div className="flex gap-2">
                  <input
                    className={fieldControlClass}
                    placeholder={t("store:voucherPlaceholder")}
                    value={vouchers[row.id] ?? ""}
                    onChange={(event) => setVouchers((current) => ({ ...current, [row.id]: event.target.value }))}
                  />
                  <Button type="button" disabled={!row.enough} loading={issue.isPending} onClick={() => void onIssue(row.id)}>
                    {t("store:issueButton")}
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>
      <div className="rounded-xl bg-white shadow-sm">
        <h2 className="border-b px-4 py-3 font-bold">{t("store:issueHistory")}</h2>
        <Table
          rows={query.data.history}
          rowKey={(row) => row.id}
          empty={t("store:emptyIssues")}
          columns={[
            { key: "no", header: t("store:voucherPlaceholder"), render: (row) => row.voucherNo },
            { key: "date", header: t("store:colDate"), render: (row) => row.issueDate },
            { key: "item", header: t("store:colItem"), render: (row) => `[${row.itemCode}] ${row.itemName}` },
            { key: "qty", header: t("store:quantity"), render: (row) => row.quantityIssued },
            { key: "who", header: t("store:source"), render: (row) => row.requesterName },
            { key: "cost", header: t("store:colLineTotal"), render: (row) => `${etb.format(row.totalCost)} ETB` },
          ]}
        />
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { t } = useTranslation(["store", "errors"]);
  const [tab, setTab] = useState<"inventory" | "assets" | "depreciation" | "requisitions">("inventory");
  const items = useStoreItems();
  const categories = useStoreCategories();
  const createItem = useCreateItem();
  const nextCode = useNextItemCode();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ItemBody>({
    itemName: "",
    categoryId: 0,
    itemCode: "",
    modelNo: "",
    unitOfMeasure: "PCS",
    unitCost: 0,
    reorderLevel: 5,
    storeNo: "Store A",
    shelfNo: "Shelf 1",
    isPerishable: false,
    expiryDate: null,
    specification: "",
    itemType: "fixed_asset",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const consumables = (items.data?.rows ?? []).filter((row) => row.itemType !== "fixed_asset");

  async function fillCode(id: number) {
    setForm((current) => ({ ...current, categoryId: id }));
    if (!id) return;
    const itemCode = await nextCode.mutateAsync({ categoryId: id, style: "category" });
    setForm((current) => ({ ...current, categoryId: id, itemCode }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createItem.mutateAsync(form);
      setNotice(t("store:savedItem"));
      setOpen(false);
    } catch (caught) {
      setError(t(`errors:${toErrorKey(caught)}`));
    }
  }

  return (
    <div className="grid gap-4 bg-[#f4f7fb]">
      <div className="flex flex-wrap gap-2 rounded-xl bg-[#f8fafc] p-1">
        {(
          [
            ["inventory", t("store:tabInventory")],
            ["assets", t("store:tabAssets")],
            ["depreciation", t("store:tabDepreciation")],
            ["requisitions", t("store:tabRequisitions")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === key ? "bg-white text-[#2563eb] shadow" : "text-[#64748b]"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {tab === "depreciation" ? <p className="text-sm text-ink-muted">{t("store:depreciationEmpty")}</p> : null}
      {tab === "requisitions" ? <p className="text-sm text-ink-muted">{t("store:requisitionEmpty")}</p> : null}
      {tab === "inventory" ? (
        <div className="rounded-xl bg-white p-4">
          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-sm font-bold text-[#2563eb]">{t("store:consumableBanner")}</span>
          <p className="mt-2 text-sm text-ink-muted">{t("store:consumableHint")}</p>
          <Table
            rows={consumables}
            rowKey={(row) => row.id}
            empty={t("store:emptyItems")}
            columns={[
              { key: "code", header: t("store:colCode"), render: (row) => row.code },
              { key: "name", header: t("store:colName"), render: (row) => row.name },
              { key: "stock", header: t("store:colStock"), render: (row) => row.currentStock },
              { key: "value", header: t("store:colTotal"), render: (row) => `ETB ${etb.format(row.totalValue)}` },
            ]}
          />
        </div>
      ) : null}
      {tab === "assets" ? (
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold">{t("store:assetTitle")}</h1>
              <p className="text-sm text-ink-muted">{t("store:assetSubtitle")}</p>
            </div>
            <Button type="button" onClick={() => setOpen((value) => !value)}>
              {t("store:addAsset")}
            </Button>
          </div>
          {open ? (
            <form onSubmit={onSubmit} className="rounded-xl border border-brand-700 bg-white p-4">
              <h2 className="mb-3 font-bold text-brand-700">{t("store:assetForm")}</h2>
              <div className="mb-3 flex flex-wrap gap-4 text-sm font-semibold">
                <label>
                  <input type="radio" checked={form.itemType === "fixed_asset"} onChange={() => setForm({ ...form, itemType: "fixed_asset" })} /> {t("store:fixedAsset")}
                </label>
                <label>
                  <input type="radio" checked={form.itemType === "consumable"} onChange={() => setForm({ ...form, itemType: "consumable" })} /> {t("store:consumable")}
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm">
                  <span className={fieldLabelClass}>{t("store:category")}</span>
                  <select className={fieldControlClass} required value={form.categoryId || ""} onChange={(event) => void fillCode(Number(event.target.value))}>
                    <option value="">{t("store:chooseCategory")}</option>
                    {(categories.data ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        [{category.code}] {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass}>{t("store:itemCode")}</span>
                  <input className={fieldControlClass} required readOnly value={form.itemCode} />
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass}>{t("store:itemName")}</span>
                  <input className={fieldControlClass} required value={form.itemName} onChange={(event) => setForm({ ...form, itemName: event.target.value })} />
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass}>{t("store:uom")}</span>
                  <input className={fieldControlClass} required value={form.unitOfMeasure} onChange={(event) => setForm({ ...form, unitOfMeasure: event.target.value })} />
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass}>{t("store:modelNo")}</span>
                  <input className={fieldControlClass} value={form.modelNo} onChange={(event) => setForm({ ...form, modelNo: event.target.value })} />
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass}>{t("store:initialQty")}</span>
                  <input className={fieldControlClass} readOnly value="0" />
                  <span className="text-xs text-brand-700">{t("store:initialHint")}</span>
                </label>
                <label className="text-sm">
                  <span className={fieldLabelClass}>{t("store:unitCost")}</span>
                  <input className={fieldControlClass} type="number" min="0" step="0.01" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: Number(event.target.value) })} />
                </label>
              </div>
              <Button className="mt-3" type="submit" loading={createItem.isPending}>
                {t("store:save")}
              </Button>
            </form>
          ) : null}
          <Table
            rows={items.data?.rows ?? []}
            rowKey={(row) => row.id}
            empty={t("store:emptyItems")}
            columns={[
              { key: "code", header: t("store:colCode"), render: (row) => row.code },
              { key: "name", header: t("store:colName"), render: (row) => row.name },
              { key: "type", header: t("store:itemType"), render: (row) => (row.itemType === "fixed_asset" ? t("store:fixedAsset") : t("store:consumable")) },
              { key: "stock", header: t("store:colStock"), render: (row) => row.currentStock },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
