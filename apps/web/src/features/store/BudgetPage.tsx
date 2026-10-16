import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Spinner } from "@/components/ui";
import { useSessionUser } from "@/features/auth/authContext";
import {
  codeLabel,
  financeErrorText,
  schoolToday,
  useBudgetLookups,
  useCreateFinanceCode,
  useSaveBudget,
  type BudgetLine,
  type CodeOption,
} from "./financeApi";

const field = "w-full rounded border border-[#ced4da] bg-white px-3 py-2 text-sm";
const emptyLine = (): BudgetLine => ({ accountCodeId: 0, treasuryAmount: 0, retainedAmount: 0, assistanceAmount: 0, loanAmount: 0 });

export function BudgetPage() {
  const { t } = useTranslation(["store", "errors", "common"]);
  const user = useSessionUser();
  const lookups = useBudgetLookups();
  const save = useSaveBudget();
  const createCode = useCreateFinanceCode("budget");
  const [extra, setExtra] = useState(false);
  const [fiscalYear, setFiscalYear] = useState("2018");
  const [letterRefNo, setLetterRefNo] = useState("");
  const [notificationDate, setNotificationDate] = useState(schoolToday());
  const [publicBodyCodeId, setPublicBodyCodeId] = useState(0);
  const [programCodeId, setProgramCodeId] = useState(0);
  const [subProgramCodeId, setSubProgramCodeId] = useState(0);
  const [projectCodeId, setProjectCodeId] = useState(0);
  const [subAgencyCodeId, setSubAgencyCodeId] = useState(0);
  const [sourceCodeId, setSourceCodeId] = useState(0);
  const [budgetTypeId, setBudgetTypeId] = useState(0);
  const [lines, setLines] = useState<BudgetLine[]>([emptyLine()]);
  const [codeOpen, setCodeOpen] = useState<{ typeName: string; apply: (id: number) => void } | null>(null);
  const [codeNumber, setCodeNumber] = useState("");
  const [codeNameAm, setCodeNameAm] = useState("");
  const [codeNameEn, setCodeNameEn] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const saved = await save.mutateAsync({
        fiscalYear,
        letterRefNo,
        notificationDate,
        publicBodyCodeId,
        programCodeId,
        subProgramCodeId: subProgramCodeId || null,
        projectCodeId: projectCodeId || null,
        subAgencyCodeId: subAgencyCodeId || null,
        sourceCodeId: sourceCodeId || null,
        budgetTypeId: budgetTypeId || null,
        lines: lines.filter((line) => line.accountCodeId > 0),
      });
      setNotice(t("store:budgetSaved", { count: saved.cardsOpened }));
    } catch (caught) {
      setError(financeErrorText(t, caught));
    }
  }

  async function saveCode() {
    if (!codeOpen || !codeNumber.trim() || !codeNameAm.trim()) {
      setError(t("store:fillCode"));
      return;
    }
    setError(null);
    try {
      const created = await createCode.mutateAsync({
        typeName: codeOpen.typeName,
        codeNumber: codeNumber.trim(),
        codeNameAm: codeNameAm.trim(),
        codeNameEn: codeNameEn.trim(),
        match: "like",
      });
      codeOpen.apply(created.id);
      setCodeOpen(null);
    } catch (caught) {
      setError(financeErrorText(t, caught));
    }
  }

  if (lookups.isPending) return <div className="flex justify-center py-10"><Spinner size="lg" label={t("common:loading")} /></div>;
  if (lookups.isError || !lookups.data) return <Alert tone="danger">{financeErrorText(t, lookups.error)}</Alert>;
  const data = lookups.data;

  return (
    <div className="-m-3 min-h-full bg-[#f4f6f9] p-3 sm:-m-4 md:-m-6">
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
        <section className="rounded-lg border border-[#deae7e] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between bg-[#6c757d] px-3 py-2 text-white">
            <h1 className="text-sm font-bold">{t("store:budgetHead")}</h1>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded bg-[#ffc107] px-3 py-1 text-sm font-bold text-[#1e293b]" onClick={() => setExtra((value) => !value)}>{t("store:extraLedger")}</button>
              <small>{t("store:recorder")} <b>{user.username}</b></small>
            </div>
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-4">
            <label className="text-sm font-bold">{t("store:fiscalYear")}<input className={`${field} mt-1`} required value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} /></label>
            <label className="text-sm md:col-span-1">{t("store:letterRef")}<input className={`${field} mt-1`} required placeholder={t("store:letterPlaceholder")} value={letterRefNo} onChange={(event) => setLetterRefNo(event.target.value)} /></label>
            <label className="text-sm">{t("store:noticeDate")}<input type="date" className={`${field} mt-1`} required value={notificationDate} onChange={(event) => setNotificationDate(event.target.value)} /></label>
            <CodeSelect label={t("store:publicBodyField")} value={publicBodyCodeId} options={data.publicBodies} required onChange={setPublicBodyCodeId} onAdd={() => openCode("Public Body", setPublicBodyCodeId)} choose={t("store:choose")} addLabel={t("store:addNew")} />
            <CodeSelect label={t("store:programField")} value={programCodeId} options={data.programs} required onChange={setProgramCodeId} onAdd={() => openCode("Program", setProgramCodeId)} choose={t("store:choose")} addLabel={t("store:addNew")} />
            <CodeSelect label={t("store:subProgramField")} value={subProgramCodeId} options={data.subPrograms} onChange={setSubProgramCodeId} onAdd={() => openCode("Sub Program", setSubProgramCodeId)} choose={t("store:choose")} addLabel={t("store:addNew")} />
            <CodeSelect label={t("store:projectField")} value={projectCodeId} options={data.projects} onChange={setProjectCodeId} onAdd={() => openCode("Project", setProjectCodeId)} choose={t("store:choose")} addLabel={t("store:addNew")} />
          </div>
          {extra ? (
            <div className="mx-3 mb-3 rounded border border-dashed border-[#0d6efd] bg-[#f8f9fa] p-3">
              <h2 className="mb-2 text-sm font-bold text-[#0d6efd]">{t("store:extraTitle")}</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <CodeSelect label={t("store:subAgencyField")} value={subAgencyCodeId} options={data.subAgencies} onChange={setSubAgencyCodeId} onAdd={() => openCode("Sub Agency", setSubAgencyCodeId)} choose={t("store:chooseOptional")} addLabel={t("store:addNew")} />
                <CodeSelect label={t("store:sourceField")} value={sourceCodeId} options={data.sources} onChange={setSourceCodeId} onAdd={() => openCode("Source", setSourceCodeId)} choose={t("store:chooseOptional")} addLabel={t("store:addNew")} />
                <CodeSelect label={t("store:budgetTypeField")} value={budgetTypeId} options={data.budgetTypes} onChange={setBudgetTypeId} onAdd={() => openCode("Budget Type", setBudgetTypeId)} choose={t("store:chooseOptional")} addLabel={t("store:addNew")} />
              </div>
            </div>
          ) : null}
        </section>
        <section className="rounded-lg border border-[#deae7e] bg-white shadow-sm">
          <div className="flex items-center justify-between bg-[#212529] px-3 py-2 text-white">
            <h2 className="text-sm font-bold">{t("store:section3")}</h2>
            <button type="button" className="rounded bg-[#198754] px-3 py-1 text-sm text-white" onClick={() => setLines((rows) => [...rows, emptyLine()])}>{t("store:addAccount")}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#e9ecef] text-center">
                <tr>
                  <th className="border p-2">
                    {t("store:accountColumn")}
                    <button type="button" className="float-end text-[#0d6efd]" onClick={() => openCode("Account", (id) => setLines((rows) => rows.map((row, index) => index === 0 ? { ...row, accountCodeId: id } : row)))}>{t("store:addNew")}</button>
                  </th>
                  <th className="border p-2">{t("store:treasury")}</th>
                  <th className="border p-2">{t("store:retained")}</th>
                  <th className="border p-2">{t("store:assistance")}</th>
                  <th className="border p-2">{t("store:loan")}</th>
                  <th className="border p-2">#</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="border p-1">
                      <select className={field} required value={line.accountCodeId || ""} onChange={(event) => updateLine(index, { accountCodeId: Number(event.target.value) })}>
                        <option value="">{t("store:chooseAccount")}</option>
                        {data.accounts.map((code) => <option key={code.id} value={code.id}>{codeLabel(code)}</option>)}
                      </select>
                    </td>
                    <MoneyCell value={line.treasuryAmount} onChange={(treasuryAmount) => updateLine(index, { treasuryAmount })} />
                    <MoneyCell value={line.retainedAmount} onChange={(retainedAmount) => updateLine(index, { retainedAmount })} />
                    <MoneyCell value={line.assistanceAmount} onChange={(assistanceAmount) => updateLine(index, { assistanceAmount })} />
                    <MoneyCell value={line.loanAmount} onChange={(loanAmount) => updateLine(index, { loanAmount })} />
                    <td className="border p-1 text-center">
                      <button type="button" className="rounded border border-[#dc3545] px-2 py-1 text-[#dc3545]" onClick={() => setLines((rows) => rows.length > 1 ? rows.filter((_, rowIndex) => rowIndex !== index) : rows)}>{lines.length > 1 ? "×" : "×"}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-2 text-end">
            <button type="submit" className="rounded bg-[#0d6efd] px-4 py-2 font-bold text-white" disabled={save.isPending}>{t("store:saveBudgetAction")}</button>
          </div>
        </section>
      </form>
      <Modal open={codeOpen !== null} onClose={() => setCodeOpen(null)} title={t("store:newCodeTitle")} footer={<button type="button" className="rounded bg-[#0d6efd] px-3 py-2 font-bold text-white" onClick={() => void saveCode()}>{t("store:saveCode")}</button>}>
        <label className="mb-2 block text-sm">{t("store:codeNumber")}<input className={`${field} mt-1`} value={codeNumber} placeholder={t("store:codeNumberExample")} onChange={(event) => setCodeNumber(event.target.value)} /></label>
        <label className="mb-2 block text-sm">{t("store:codeNameAm")}<input className={`${field} mt-1`} value={codeNameAm} placeholder={t("store:codeNameExample")} onChange={(event) => setCodeNameAm(event.target.value)} /></label>
        <label className="block text-sm">{t("store:codeNameEn")}<input className={`${field} mt-1`} value={codeNameEn} placeholder={t("store:codeNameEnExample")} onChange={(event) => setCodeNameEn(event.target.value)} /></label>
      </Modal>
    </div>
  );

  function openCode(typeName: string, apply: (id: number) => void) {
    setCodeNumber("");
    setCodeNameAm("");
    setCodeNameEn("");
    setCodeOpen({ typeName, apply });
  }

  function updateLine(index: number, patch: Partial<BudgetLine>) {
    setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }
}

function CodeSelect({ label, value, options, required, onChange, onAdd, choose, addLabel }: {
  label: string;
  value: number;
  options: CodeOption[];
  required?: boolean;
  onChange: (id: number) => void;
  onAdd: () => void;
  choose: string;
  addLabel: string;
}) {
  return (
    <label className="text-sm">
      <span className="flex justify-between font-semibold">{label}<button type="button" className="text-[#0d6efd]" onClick={onAdd}>{addLabel}</button></span>
      <select className={`${field} mt-1`} required={required} value={value || ""} onChange={(event) => onChange(Number(event.target.value))}>
        <option value="">{choose}</option>
        {options.map((code) => <option key={code.id} value={code.id}>{codeLabel(code)}</option>)}
      </select>
    </label>
  );
}

function MoneyCell({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <td className="border p-1">
      <input type="number" step="0.01" min="0" className="w-full rounded border px-2 py-1 text-right" value={value.toFixed(2)} onChange={(event) => onChange(Number(event.target.value) || 0)} />
    </td>
  );
}
