import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Spinner } from "@/components/ui";
import {
  birr,
  codeLabel,
  financeErrorText,
  schoolToday,
  useAccountHint,
  useM16Balance,
  useMehi7Options,
  useSaveMehi7,
} from "./financeApi";

const field = "w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm";

type DebitRow = {
  key: number;
  accountCodeId: number;
  budgetCategoryId: number;
  budgetSourceId: number;
  debitAmount: number;
  hint: string;
  over: boolean;
};

export function Mehi7Page() {
  const { t } = useTranslation(["store", "errors", "common"]);
  const options = useMehi7Options();
  const hint = useAccountHint();
  const balance = useM16Balance();
  const save = useSaveMehi7();
  const [serialNo, setSerialNo] = useState("");
  const [voucherDate, setVoucherDate] = useState(schoolToday());
  const [payeeName, setPayeeName] = useState("");
  const [mode, setMode] = useState<"Check" | "Bank_Transfer" | "Cash">("Check");
  const [checkNo, setCheckNo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [rows, setRows] = useState<DebitRow[]>([{ key: 1, accountCodeId: 0, budgetCategoryId: 0, budgetSourceId: 0, debitAmount: 0, hint: "", over: false }]);
  const [nextKey, setNextKey] = useState(2);
  const [m17CardId, setM17CardId] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const total = rows.reduce((sum, row) => sum + (Number(row.debitAmount) || 0), 0);
  const selected = options.data?.cards.find((card) => card.id === m17CardId);
  const cashShort = Boolean(selected && total > selected.balance);
  const blocked = rows.some((row) => row.over) || cashShort;

  const m17Budget = selected?.budgetTypeName || "";
  const m17Source = selected ? `${selected.sourceCode} - ${selected.sourceName}` : "";

  const rowSignature = useMemo(() => rows.map((row) => row.key).join(","), [rows]);

  async function detect(row: DebitRow, accountCodeId: number) {
    const next = { ...row, accountCodeId };
    if (!accountCodeId) {
      update(row.key, { accountCodeId, hint: "", over: false });
      return;
    }
    const found = await hint.mutateAsync(accountCodeId);
    next.budgetCategoryId = found.budgetTypeId ?? row.budgetCategoryId;
    next.sourceCodeId = found.sourceCodeId ?? row.sourceCodeId;
    update(row.key, next);
    await checkBalance({ ...next, accountCodeId });
  }

  async function checkBalance(row: DebitRow) {
    if (!row.accountCodeId || !row.budgetCategoryId || !row.budgetSourceId) {
      update(row.key, { hint: "", over: false, accountCodeId: row.accountCodeId, budgetCategoryId: row.budgetCategoryId, budgetSourceId: row.budgetSourceId, debitAmount: row.debitAmount });
      return;
    }
    const result = await balance.mutateAsync({
      accountId: row.accountCodeId,
      sourceId: row.budgetSourceId,
      budgetTypeId: row.budgetCategoryId,
    });
    const over = row.debitAmount > result.currentBalance;
    update(row.key, {
      ...row,
      over,
      hint: over
        ? t("store:notEnoughBudget", { balance: birr(result.currentBalance) })
        : t("store:remainingBudget", { balance: birr(result.currentBalance) }),
    });
  }

  function update(key: number, patch: Partial<DebitRow>) {
    setRows((current) => current.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (blocked || !options.data) return;
    setError(null);
    setNotice(null);
    try {
      await save.mutateAsync({
        serialNo,
        voucherDate,
        payeeName,
        modeOfPayment: mode,
        checkNo,
        purpose,
        publicBodyCodeId: 1,
        programCodeId: 1,
        lines: [
          ...rows.map((row) => ({
            entryType: "debit" as const,
            accountCodeId: row.accountCodeId,
            budgetCategoryId: row.budgetCategoryId,
            budgetSourceId: row.budgetSourceId,
            m17CardId: null,
            debitAmount: row.debitAmount,
            creditAmount: 0,
          })),
          {
            entryType: "credit" as const,
            accountCodeId: null,
            budgetCategoryId: selected?.budgetTypeId ?? null,
            budgetSourceId: selected?.sourceCodeId ?? null,
            m17CardId,
            debitAmount: 0,
            creditAmount: total,
          },
        ],
      });
      setNotice(t("store:mehi7Saved"));
      clearForm();
    } catch (caught) {
      setError(financeErrorText(t, caught));
    }
  }

  function clearForm() {
    setSerialNo("");
    setVoucherDate(schoolToday());
    setPayeeName("");
    setMode("Check");
    setCheckNo("");
    setPurpose("");
    setRows([{ key: nextKey, accountCodeId: 0, budgetCategoryId: 0, budgetSourceId: 0, debitAmount: 0, hint: "", over: false }]);
    setNextKey((value) => value + 1);
    setM17CardId(0);
  }

  if (options.isPending) return <div className="flex justify-center py-10"><Spinner size="lg" label={t("common:loading")} /></div>;
  if (options.isError || !options.data) return <Alert tone="danger">{financeErrorText(t, options.error)}</Alert>;
  const data = options.data;

  return (
    <div className="-m-3 min-h-full bg-[#f1f5f9] p-3 text-[#1e293b] sm:-m-4 md:-m-6">
      <section className="rounded-xl border-t-[6px] border-[#0e2a47] bg-white p-6 shadow">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-[#cbd5e1] pb-4">
          <div>
            <h1 className="text-xl font-bold uppercase text-[#0e2a47]">{t("store:mehi7Title")}</h1>
            <p className="text-sm text-[#64748b]">{t("store:mehi7Year", { year: data.fiscalYear })}</p>
          </div>
          <span className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${blocked ? "bg-[#dc2626]" : "bg-[#16a34a]"}`}>
            {blocked ? t("store:unbalanced") : t("store:balanced")}
          </span>
        </div>
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <form onSubmit={(event) => void onSubmit(event)}>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[#0e2a47]">{t("store:mainInfo")}</h2>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <label className="text-sm font-bold">{t("store:serialNo")}<input className={`${field} mt-1 font-mono font-bold`} required placeholder={t("store:serialExample")} value={serialNo} onChange={(event) => setSerialNo(event.target.value)} /></label>
            <label className="text-sm font-bold">{t("store:noticeDate")}<input type="date" className={`${field} mt-1 font-bold`} required value={voucherDate} onChange={(event) => setVoucherDate(event.target.value)} /></label>
            <label className="text-sm font-bold">{t("store:payee")}<input className={`${field} mt-1`} required placeholder={t("store:payeePlaceholder")} value={payeeName} onChange={(event) => setPayeeName(event.target.value)} /></label>
            <label className="text-sm font-bold">{t("store:payMode")}
              <select className={`${field} mt-1 font-semibold`} value={mode} onChange={(event) => setMode(event.target.value as "Check" | "Bank_Transfer" | "Cash")}>
                <option value="Check">{t("store:modeCheck")}</option>
                <option value="Bank_Transfer">{t("store:modeTransfer")}</option>
                <option value="Cash">{t("store:modeCash")}</option>
              </select>
            </label>
            <label className="text-sm font-bold">{t("store:checkNo")}<input className={`${field} mt-1 font-mono`} placeholder="CHK-XXXX" value={checkNo} onChange={(event) => setCheckNo(event.target.value)} /></label>
            <label className="text-sm font-bold md:col-span-1">{t("store:purpose")}<input className={`${field} mt-1`} required placeholder={t("store:purposePlaceholder")} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#0e2a47]">{t("store:linesTitle")}</h2>
            <button type="button" className="rounded-full border border-[#0f172a] px-3 py-1 text-sm font-bold" onClick={() => { setRows((current) => [...current, { key: nextKey, accountCodeId: 0, budgetCategoryId: 0, budgetSourceId: 0, debitAmount: 0, hint: "", over: false }]); setNextKey((value) => value + 1); }}>{t("store:addDebit")}</button>
          </div>
          <div className="mb-4 overflow-x-auto" data-rows={rowSignature}>
            <table className="w-full border-collapse overflow-hidden rounded-lg border border-[#cbd5e1] text-sm">
              <thead className="bg-[#0e2a47] text-white">
                <tr>
                  <th className="p-2">{t("store:accountCodeCol")}</th>
                  <th className="p-2">{t("store:categoryCol")}</th>
                  <th className="p-2">{t("store:sourceCol")}</th>
                  <th className="p-2">{t("store:debitAmountCol")}</th>
                  <th className="p-2">{t("store:creditAmountCol")}</th>
                  <th className="p-2">#</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td className="border p-1">
                      <select className={`${field} border-[#0d6efd] font-semibold`} required value={row.accountCodeId || ""} onChange={(event) => void detect(row, Number(event.target.value))}>
                        <option value="">{t("store:chooseExpense")}</option>
                        {data.accounts.map((code) => <option key={code.id} value={code.id}>{codeLabel(code)}</option>)}
                      </select>
                    </td>
                    <td className="border p-1">
                      <select className={field} required value={row.budgetCategoryId || ""} onChange={(event) => { const budgetCategoryId = Number(event.target.value); const next = { ...row, budgetCategoryId }; update(row.key, { budgetCategoryId }); void checkBalance(next); }}>
                        <option value="">{t("store:chooseBudgetType")}</option>
                        {data.budgetTypes.map((code) => <option key={code.id} value={code.id}>{code.name}</option>)}
                      </select>
                    </td>
                    <td className="border p-1">
                      <select className={field} required value={row.budgetSourceId || ""} onChange={(event) => { const budgetSourceId = Number(event.target.value); const next = { ...row, budgetSourceId }; update(row.key, { budgetSourceId }); void checkBalance(next); }}>
                        <option value="">{t("store:chooseSource")}</option>
                        {data.sources.map((code) => <option key={code.id} value={code.id}>{codeLabel(code)}</option>)}
                      </select>
                    </td>
                    <td className="border p-1">
                      <input type="number" step="0.01" min="0" required className={`${field} text-right font-mono font-bold text-[#16a34a] ${row.over ? "border-[#dc2626] text-[#dc2626]" : ""}`} value={row.debitAmount || ""} placeholder="0.00" onChange={(event) => { const debitAmount = Number(event.target.value) || 0; const next = { ...row, debitAmount }; update(row.key, { debitAmount }); void checkBalance(next); }} />
                      {row.hint ? <div className={`mt-1 text-xs font-semibold ${row.over ? "text-[#dc2626]" : "text-[#16a34a]"}`}>{row.hint}</div> : null}
                    </td>
                    <td className="border p-1 text-center font-bold text-[#64748b]">—</td>
                    <td className="border p-1 text-center">
                      <button type="button" className="rounded-full border border-[#dc2626] px-2 py-1 text-[#dc2626]" onClick={() => setRows((current) => current.length > 1 ? current.filter((item) => item.key !== row.key) : current)} title={t("store:deleteCard")}>×</button>
                    </td>
                  </tr>
                ))}
                <tr className="border-l-4 border-[#c59b27] bg-[#fffbeb]">
                  <td className="border p-2">
                    <div className="mb-1 text-xs font-bold text-[#dc2626]">{t("store:m17Label")}</div>
                    <select className={`${field} border-[#dc2626] font-bold`} required value={m17CardId || ""} onChange={(event) => setM17CardId(Number(event.target.value))}>
                      <option value="">{t("store:chooseM17")}</option>
                      {data.cards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {t("store:m17Option", { name: card.accountName || t("store:cashBoxName"), account: card.bankAccountNo, balance: birr(card.balance) })}
                        </option>
                      ))}
                    </select>
                    {selected ? <div className="mt-1 text-xs font-semibold text-[#16a34a]">{t("store:bankRemaining", { balance: birr(selected.balance) })}</div> : null}
                  </td>
                  <td className="border p-2">
                    <div className="mb-1 text-xs text-[#64748b]">{t("store:autoBudget")}</div>
                    <input className={`${field} bg-[#f8fafc] text-center font-bold`} readOnly value={m17Budget} placeholder="Auto" />
                  </td>
                  <td className="border p-2">
                    <div className="mb-1 text-xs text-[#64748b]">{t("store:autoSource")}</div>
                    <input className={`${field} bg-[#f8fafc] text-center font-bold`} readOnly value={m17Source} placeholder="Auto" />
                  </td>
                  <td className="border p-2 text-center font-bold text-[#64748b]">—</td>
                  <td className="border p-2">
                    <div className="mb-1 text-xs text-[#64748b]">{t("store:totalCredit")}</div>
                    <input className={`${field} bg-white text-right font-mono font-bold text-[#dc2626]`} readOnly value={total.toFixed(2)} />
                  </td>
                  <td />
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-[#0f172a] font-bold text-white">
                  <td colSpan={3} className="p-2 text-end uppercase">{t("store:totalAmount")}</td>
                  <td className="p-2 text-end font-mono text-[#22c55e]">{birr(total)}</td>
                  <td className="p-2 text-end font-mono text-[#facc15]">{birr(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="rounded border bg-white px-4 py-2 font-bold" onClick={() => setResetOpen(true)}>{t("store:startOver")}</button>
            {blocked ? null : <button type="submit" className="rounded-lg bg-[#0e2a47] px-5 py-2 font-semibold text-white shadow" disabled={save.isPending}>{save.isPending ? t("store:saving") : t("store:saveMehi7")}</button>}
          </div>
        </form>
      </section>
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title={t("store:startOver")} footer={
        <>
          <button type="button" className="rounded bg-[#6c757d] px-3 py-1 text-white" onClick={() => setResetOpen(false)}>{t("store:back")}</button>
          <button type="button" className="rounded bg-[#0e2a47] px-3 py-1 font-bold text-white" onClick={() => { clearForm(); setResetOpen(false); }}>{t("store:resetYes")}</button>
        </>
      }>
        <p>{t("store:resetAsk")}</p>
      </Modal>
    </div>
  );
}
