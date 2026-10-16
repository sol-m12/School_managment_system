import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Spinner } from "@/components/ui";
import { financeErrorText, birr, useDeleteLedgerCard, useLedgerCards, useLedgerLookups, codeLabel, type LedgerCard } from "./financeApi";

const field = "w-full rounded border border-[#cbd5e1] bg-white px-3 py-2 text-sm";

export function LedgerCardsPage() {
  const { t } = useTranslation(["store", "errors", "common"]);
  const lookups = useLedgerLookups();
  const [search, setSearch] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [programId, setProgramId] = useState(0);
  const [budgetTypeId, setBudgetTypeId] = useState(0);
  const [sourceCodeId, setSourceCodeId] = useState(0);
  const [draft, setDraft] = useState({ search: "", fiscalYear: "", programId: 0, budgetTypeId: 0, sourceCodeId: 0 });
  const cards = useLedgerCards(draft);
  const remove = useDeleteLedgerCard();
  const [pending, setPending] = useState<LedgerCard | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    setDraft({ search, fiscalYear, programId, budgetTypeId, sourceCodeId });
  }

  async function confirmDelete() {
    if (!pending) return;
    setError(null);
    try {
      await remove.mutateAsync(pending.id);
      setNotice(t("store:deletedCard"));
      setPending(null);
    } catch (caught) {
      setPending(null);
      setError(financeErrorText(t, caught));
    }
  }

  if (lookups.isPending || cards.isPending) {
    return <div className="flex justify-center py-10"><Spinner size="lg" label={t("common:loading")} /></div>;
  }
  if (lookups.isError || cards.isError || !cards.data || !lookups.data) {
    return <Alert tone="danger">{financeErrorText(t, lookups.error ?? cards.error)}</Alert>;
  }

  const totals = cards.data.totals;
  return (
    <div className="-m-3 min-h-full bg-[#f1f5f9] p-4 text-[#0f172a] sm:-m-4 md:-m-6 print:m-0 print:bg-white">
      <div className="mb-4 flex flex-col gap-3 rounded-lg border-b-4 border-[#c59b27] bg-gradient-to-br from-[#0e2a47] to-[#1e3a8a] p-5 text-white shadow md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl text-[#facc15]" aria-hidden="true">🏛</span>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide">{t("store:ledgerBanner")}</h1>
            <p className="text-sm text-white/80">{t("store:ledgerSubtitle")}</p>
          </div>
        </div>
        <Link to="/store/budget" className="rounded bg-[#facc15] px-4 py-2 text-center font-bold text-[#1e293b] shadow-sm">
          + {t("store:newBudget")}
        </Link>
      </div>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label={t("store:kpiCards")} value={birr(totals.cards).replace(".00", "")} tone="border-[#0e2a47]" valueClass="text-[#0f172a]" />
        <Kpi label={t("store:kpiApproved")} value={birr(totals.approved)} tone="border-[#16a34a]" valueClass="text-[#16a34a]" />
        <Kpi label={t("store:kpiSpent")} value={birr(totals.expenditure)} tone="border-[#dc2626]" valueClass="text-[#dc2626]" />
        <Kpi label={t("store:kpiBalance")} value={birr(totals.balance)} tone="border-[#0284c7]" valueClass="text-[#0284c7]" />
      </div>
      <form onSubmit={applyFilters} className="mb-4 grid gap-2 rounded-lg bg-white p-3 shadow-sm md:grid-cols-6">
        <input className={field} value={search} placeholder={t("store:searchCards")} onChange={(event) => setSearch(event.target.value)} />
        <select className={field} value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)}>
          <option value="">{t("store:yearAll")}</option>
          {lookups.data.years.map((year) => <option key={year} value={year}>{year} {t("store:yearSuffix")}</option>)}
        </select>
        <select className={field} value={programId || ""} onChange={(event) => setProgramId(Number(event.target.value))}>
          <option value="">{t("store:programAll")}</option>
          {lookups.data.programs.map((code) => <option key={code.id} value={code.id}>{codeLabel(code)}</option>)}
        </select>
        <select className={field} value={budgetTypeId || ""} onChange={(event) => setBudgetTypeId(Number(event.target.value))}>
          <option value="">{t("store:budgetTypeAll")}</option>
          {lookups.data.budgetTypes.map((code) => <option key={code.id} value={code.id}>{codeLabel(code)}</option>)}
        </select>
        <select className={field} value={sourceCodeId || ""} onChange={(event) => setSourceCodeId(Number(event.target.value))}>
          <option value="">{t("store:sourceAll")}</option>
          {lookups.data.sources.map((code) => <option key={code.id} value={code.id}>{codeLabel(code)}</option>)}
        </select>
        <div className="flex gap-1">
          <button type="submit" className="w-full rounded bg-[#0e2a47] px-3 py-2 font-bold text-white">{t("store:filter")}</button>
          <button type="button" className="w-full rounded border bg-white px-3 py-2" onClick={() => { setSearch(""); setFiscalYear(""); setProgramId(0); setBudgetTypeId(0); setSourceCodeId(0); setDraft({ search: "", fiscalYear: "", programId: 0, budgetTypeId: 0, sourceCodeId: 0 }); }}>{t("store:clearFilters")}</button>
        </div>
      </form>
      {cards.data.cards.length === 0 ? (
        <div className="rounded bg-white p-10 text-center shadow-sm">
          <h2 className="font-bold text-[#64748b]">{t("store:emptyCards")}</h2>
          <p className="text-sm text-[#64748b]">{t("store:emptyCardsHint")}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.data.cards.map((card) => (
            <article key={card.id} className="flex flex-col justify-between rounded-[10px] border border-[#cbd5e1] bg-white shadow-sm">
              <div>
                <div className="flex items-center justify-between border-b-2 border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded bg-[#0e2a47] px-2 py-1 text-xs font-semibold text-white">{t("store:accountBadge", { code: card.accountCode })}</span>
                    <span className="rounded bg-[#6b7280] px-2 py-1 text-xs text-white">{t("store:yearBadge", { year: card.fiscalYear })}</span>
                  </div>
                  <span className="rounded border border-[#bae6fd] bg-[#e0f2fe] px-2 py-1 text-xs font-semibold text-[#0369a1]">{card.budgetTypeName || t("store:regularBudget")}</span>
                </div>
                <div className="p-3">
                  <h3 className="truncate font-bold" title={card.accountName}>{card.accountName}</h3>
                  <p className="truncate text-sm text-[#64748b]">{t("store:publicBodyLine")} {card.publicBodyName || "-"}</p>
                  <p className="truncate text-sm text-[#64748b]">{t("store:programLine")} {card.programName || "-"}</p>
                  <p className="mb-3 truncate text-sm text-[#64748b]">{t("store:sourceLine")} {card.sourceName || "-"}</p>
                  <div className="grid grid-cols-3 rounded border bg-[#f8fafc] p-2 text-center text-xs">
                    <div className="border-r"><span className="block text-[#64748b]">{t("store:approvedShort")}</span><strong>{birr(card.initialBudget)}</strong></div>
                    <div className="border-r"><span className="block text-[#64748b]">{t("store:spentShort")}</span><strong className="text-[#dc2626]">{birr(card.totalExpenditure)}</strong></div>
                    <div><span className="block text-[#64748b]">{t("store:balanceShort")}</span><strong className="text-[#16a34a]">{birr(card.currentBalance)}</strong></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t bg-[#f8fafc] p-3">
                <Link to={`/store/mehi-16?cardId=${card.id}`} className="rounded bg-[#0e2a47] px-3 py-1 text-sm font-bold text-white">{t("store:openCard")}</Link>
                <div className="flex gap-1">
                  <Link to={`/store/mehi-16?cardId=${card.id}&print=1`} className="rounded border px-2 py-1 text-sm" title={t("store:printCard")}>⎙</Link>
                  <button type="button" className="rounded border border-[#fecaca] px-2 py-1 text-sm text-[#dc2626]" title={t("store:deleteCard")} onClick={() => setPending(card)}>⌫</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t("store:deleteTitle")}
        footer={
          <>
            <button type="button" className="rounded bg-[#6b7280] px-3 py-1 text-sm text-white" onClick={() => setPending(null)}>{t("store:back")}</button>
            <button type="button" className="rounded bg-[#dc2626] px-3 py-1 text-sm font-bold text-white" onClick={() => void confirmDelete()}>{t("store:yesDelete")}</button>
          </>
        }
      >
        <p className="font-bold">{t("store:deleteAsk")}</p>
        <p className="text-sm text-[#64748b]">{t("store:deleteName", { name: `${pending?.accountCode ?? ""} - ${pending?.accountName ?? ""}` })}</p>
        <p className="mt-3 rounded bg-[#fef3c7] p-2 text-sm">{t("store:deleteNote")}</p>
      </Modal>
    </div>
  );
}

function Kpi({ label, value, tone, valueClass }: { label: string; value: string; tone: string; valueClass: string }) {
  return (
    <div className={`rounded-lg border border-[#cbd5e1] border-t-4 bg-white p-3 ${tone}`}>
      <span className="text-xs font-bold text-[#64748b]">{label}</span>
      <h3 className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</h3>
    </div>
  );
}
