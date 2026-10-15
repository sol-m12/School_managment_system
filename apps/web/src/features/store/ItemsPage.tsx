import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Modal, Spinner, Table } from "@/components/ui";
import { fieldControlClass, fieldLabelClass } from "@/components/ui/Input";
import { toErrorKey } from "@/lib/apiError";
import {
  etb,
  useCreateCategory,
  useCreateItem,
  useNextItemCode,
  useStoreCategories,
  useStoreItems,
  whole,
  type ItemBody,
  type StockStatus,
  type StoreItem,
} from "./storeApi";

const emptyItem = (): ItemBody => ({
  itemName: "",
  categoryId: 0,
  itemCode: "",
  modelNo: "",
  unitOfMeasure: "",
  unitCost: 0,
  reorderLevel: 5,
  storeNo: "Store A",
  shelfNo: "Shelf 1",
  isPerishable: false,
  expiryDate: null,
  specification: "",
  itemType: "consumable",
});

function statusClass(status: StockStatus): string {
  if (status === "critical") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "low") return "bg-[#fef3c7] text-[#b45309]";
  return "bg-[#dcfce7] text-[#15803d]";
}

export function ItemsPage() {
  const { t } = useTranslation(["store", "errors", "common"]);
  const items = useStoreItems();
  const categories = useStoreCategories();
  const createItem = useCreateItem();
  const createCategory = useCreateCategory();
  const nextCode = useNextItemCode();
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [form, setForm] = useState<ItemBody>(emptyItem);
  const [categoryForm, setCategoryForm] = useState({ categoryCode: "", categoryName: "", description: "" });
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(0);
  const [status, setStatus] = useState<"" | StockStatus>("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (items.data?.rows ?? []).filter((row) => {
      if (categoryId && row.categoryId !== categoryId) return false;
      if (status && row.status !== status) return false;
      if (!needle) return true;
      return row.name.toLowerCase().includes(needle) || row.code.toLowerCase().includes(needle);
    });
  }, [items.data, search, categoryId, status]);

  async function onCategory(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createCategory.mutateAsync(categoryForm);
      setCategoryForm({ categoryCode: "", categoryName: "", description: "" });
      setCategoryOpen(false);
      setNotice(t("store:savedCategory"));
    } catch (caught) {
      setError(t(`errors:${toErrorKey(caught)}`));
    }
  }

  async function onItem(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createItem.mutateAsync({ ...form, categoryId: Number(form.categoryId) });
      setForm(emptyItem());
      setOpen(false);
      setNotice(t("store:savedItem"));
    } catch (caught) {
      setError(t(`errors:${toErrorKey(caught)}`));
    }
  }

  async function fillCode(id: number) {
    setForm((current) => ({ ...current, categoryId: id, itemCode: "" }));
    if (!id) return;
    try {
      const itemCode = await nextCode.mutateAsync({ categoryId: id, style: "str" });
      setForm((current) => ({ ...current, categoryId: id, itemCode }));
    } catch (caught) {
      setError(t(`errors:${toErrorKey(caught)}`));
    }
  }

  if (items.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (items.isError || !items.data) return <Alert tone="danger">{t(`errors:${toErrorKey(items.error)}`)}</Alert>;

  const stats = items.data.stats;
  return (
    <div className="-m-3 min-h-full bg-[#f4f7fb] p-4 sm:-m-4 md:-m-6">
      <div className="mb-3">
        <h1 className="text-2xl font-bold text-[#0f172a]">{t("store:storesTitle")}</h1>
        <p className="text-sm text-ink-muted">{t("store:storesSubtitle")}</p>
      </div>
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-sm font-bold text-[#2563eb]">{t("store:profileBanner")}</span>
          <span className="text-sm text-ink-muted">{t("store:directive")}</span>
        </div>
        <p className="text-sm text-ink-muted">
          {t("store:keeperValue")} <strong className="text-[#2563eb]">ETB {etb.format(stats.totalValue)}</strong>
        </p>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-lg bg-[#eff6ff] px-4 py-2 text-sm font-semibold text-[#2563eb]">
          {t("store:tabInventory")} {stats.totalSkus}
        </span>
        <Button type="button" onClick={() => setOpen((value) => !value)}>
          {t("store:addItem")}
        </Button>
      </div>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {open ? (
        <form onSubmit={onItem} className="mb-4 rounded-xl border border-[#e2e8f0] bg-white p-4">
          <h2 className="mb-3 font-bold text-[#2563eb]">{t("store:formTitle")}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm">
              <span className={fieldLabelClass}>{t("store:itemName")}</span>
              <input className={fieldControlClass} required value={form.itemName} onChange={(event) => setForm({ ...form, itemName: event.target.value })} />
            </label>
            <label className="block text-sm">
              <span className={fieldLabelClass}>{t("store:category")}</span>
              <div className="flex gap-2">
                <select className={fieldControlClass} required value={form.categoryId || ""} onChange={(event) => void fillCode(Number(event.target.value))}>
                  <option value="">{t("store:chooseCategory")}</option>
                  {(categories.data ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      [{category.code}] {category.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={() => setCategoryOpen(true)}>
                  +
                </Button>
              </div>
            </label>
            <label className="block text-sm">
              <span className={fieldLabelClass}>{t("store:itemCode")}</span>
              <input className={fieldControlClass} required readOnly value={form.itemCode} placeholder={t("store:codePlaceholder")} onChange={(event) => setForm({ ...form, itemCode: event.target.value })} />
            </label>
            <label className="block text-sm">
              <span className={fieldLabelClass}>{t("store:modelNo")}</span>
              <input className={fieldControlClass} value={form.modelNo} onChange={(event) => setForm({ ...form, modelNo: event.target.value })} />
            </label>
            <label className="block text-sm">
              <span className={fieldLabelClass}>{t("store:uom")}</span>
              <input className={fieldControlClass} required value={form.unitOfMeasure} onChange={(event) => setForm({ ...form, unitOfMeasure: event.target.value })} />
            </label>
            <label className="block text-sm">
              <span className={fieldLabelClass}>{t("store:unitCost")}</span>
              <input className={fieldControlClass} type="number" min="0" step="0.01" value={form.unitCost} onChange={(event) => setForm({ ...form, unitCost: Number(event.target.value) })} />
            </label>
            <label className="block text-sm">
              <span className={fieldLabelClass}>{t("store:reorder")}</span>
              <input className={fieldControlClass} type="number" min="0" value={form.reorderLevel} onChange={(event) => setForm({ ...form, reorderLevel: Number(event.target.value) })} />
            </label>
            <label className="block text-sm">
              <span className={fieldLabelClass}>{t("store:store")}</span>
              <input className={fieldControlClass} value={form.storeNo} onChange={(event) => setForm({ ...form, storeNo: event.target.value })} />
            </label>
            <label className="block text-sm">
              <span className={fieldLabelClass}>{t("store:shelf")}</span>
              <input className={fieldControlClass} value={form.shelfNo} onChange={(event) => setForm({ ...form, shelfNo: event.target.value })} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={form.isPerishable} onChange={(event) => setForm({ ...form, isPerishable: event.target.checked })} />
              {t("store:perishable")}
            </label>
            {form.isPerishable ? (
              <label className="block text-sm">
                <span className={fieldLabelClass}>{t("store:expiry")}</span>
                <input className={fieldControlClass} type="date" value={form.expiryDate ?? ""} onChange={(event) => setForm({ ...form, expiryDate: event.target.value || null })} />
              </label>
            ) : null}
            <label className="block text-sm md:col-span-3">
              <span className={fieldLabelClass}>{t("store:specification")}</span>
              <textarea className={fieldControlClass} rows={2} value={form.specification} onChange={(event) => setForm({ ...form, specification: event.target.value })} />
            </label>
          </div>
          <div className="mt-3 text-end">
            <Button type="submit" loading={createItem.isPending}>
              {t("store:save")}
            </Button>
          </div>
        </form>
      ) : null}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat title={t("store:totalSkus")} value={String(stats.totalSkus)} hint={t("store:activeItems")} />
        <Stat title={t("store:adequate")} value={String(stats.adequate)} hint={t("store:wellStocked")} tone="text-[#15803d]" />
        <Stat title={t("store:lowStock")} value={String(stats.low)} hint={t("store:needsReorder")} tone="text-[#b45309]" />
        <Stat title={t("store:critical")} value={String(stats.critical)} hint={t("store:urgent")} tone="text-[#b91c1c]" />
        <Stat title={t("store:totalValue")} value={`ETB ${whole.format(stats.totalValue)}`} hint={t("store:atCost")} tone="text-[#1e40af]" />
      </div>
      <div className="rounded-xl border border-[#e2e8f0] bg-white">
        <div className="flex flex-wrap gap-2 border-b border-[#e2e8f0] p-3">
          <input className={fieldControlClass} placeholder={t("store:search")} value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className={fieldControlClass} value={categoryId || ""} onChange={(event) => setCategoryId(Number(event.target.value))}>
            <option value="">{t("store:allCategories")}</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select className={fieldControlClass} value={status} onChange={(event) => setStatus(event.target.value as "" | StockStatus)}>
            <option value="">{t("store:allStatus")}</option>
            <option value="adequate">{t("store:statusAdequate")}</option>
            <option value="low">{t("store:statusLow")}</option>
            <option value="critical">{t("store:statusCritical")}</option>
          </select>
        </div>
        <Table
          rows={rows}
          rowKey={(row) => row.id}
          empty={t("store:emptyItems")}
          columns={[
            { key: "code", header: t("store:colCode"), render: (row) => row.code },
            {
              key: "name",
              header: t("store:colName"),
              render: (row: StoreItem) => (
                <div>
                  <div className="font-bold">{row.name}</div>
                  <div className="text-xs text-ink-muted">{row.modelNo || "-"}</div>
                </div>
              ),
            },
            { key: "category", header: t("store:colCategory"), render: (row) => row.categoryName || t("store:uncategorized") },
            { key: "stock", header: t("store:colStock"), render: (row) => row.currentStock },
            { key: "minmax", header: t("store:colMinMax"), render: (row) => `${row.reorderLevel} / ${row.maxLevel}` },
            { key: "cost", header: t("store:colUnitCost"), render: (row) => `ETB ${etb.format(row.unitCost)}` },
            { key: "value", header: t("store:colTotal"), render: (row) => `ETB ${etb.format(row.totalValue)}` },
            { key: "location", header: t("store:colLocation"), render: (row) => `${row.storeNo} - ${row.shelfNo}` },
            {
              key: "status",
              header: t("store:colStatus"),
              render: (row) => (
                <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                  {row.status === "critical" ? t("store:statusCritical") : row.status === "low" ? t("store:statusLow") : t("store:statusAdequate")}
                </span>
              ),
            },
          ]}
        />
      </div>
      <Modal open={categoryOpen} onClose={() => setCategoryOpen(false)} title={t("store:categoryTitle")}>
        <form onSubmit={onCategory} className="grid gap-3">
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:categoryCode")}</span>
            <input className={fieldControlClass} required value={categoryForm.categoryCode} onChange={(event) => setCategoryForm({ ...categoryForm, categoryCode: event.target.value })} />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:categoryName")}</span>
            <input className={fieldControlClass} required value={categoryForm.categoryName} onChange={(event) => setCategoryForm({ ...categoryForm, categoryName: event.target.value })} />
          </label>
          <label className="text-sm">
            <span className={fieldLabelClass}>{t("store:description")}</span>
            <textarea className={fieldControlClass} rows={2} value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCategoryOpen(false)}>
              {t("store:cancel")}
            </Button>
            <Button type="submit" loading={createCategory.isPending}>
              {t("store:saveCategory")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Stat({ title, value, hint, tone = "text-[#0f172a]" }: { title: string; value: string; hint: string; tone?: string }) {
  return (
    <article className="rounded-xl border border-[#e2e8f0] bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748b]">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-[#94a3b8]">{hint}</p>
    </article>
  );
}
