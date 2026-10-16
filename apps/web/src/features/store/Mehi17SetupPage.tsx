import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Spinner } from "@/components/ui";
import {
  birr,
  codeLabel,
  financeErrorText,
  useCreateFinanceCode,
  useMehi17Board,
  useOpenMehi17,
  useSetupLookups,
  type CodeOption,
} from "./financeApi";
import { PinkCard } from "./Mehi17LedgerPage";

const field = "w-full rounded border border-[#ced4da] bg-white px-3 py-2 text-sm";

export function Mehi17SetupPage() {
  const { t } = useTranslation(["store", "errors", "common"]);
  const lookups = useSetupLookups();
  const open = useOpenMehi17();
  const createCode = useCreateFinanceCode("setup");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const board = useMehi17Board(selectedId);
  const [formOpen, setFormOpen] = useState(false);
  const [fiscalYear, setFiscalYear] = useState("2018");
  const [publicBodyCodeId, setPublicBodyCodeId] = useState(0);
  const [subAgencyCodeId, setSubAgencyCodeId] = useState(0);
  const [programCodeId, setProgramCodeId] = useState(0);
  const [subProgramCodeId, setSubProgramCodeId] = useState(0);
  const [projectCodeId, setProjectCodeId] = useState(0);
  const [sourceCodeId, setSourceCodeId] = useState(0);
  const [budgetTypeId, setBudgetTypeId] = useState(0);
  const [accountCodeId, setAccountCodeId] = useState(0);
  const [accountName, setAccountName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("CASH-BOX");
  const [registerMonth, setRegisterMonth] = useState("ሐምሌ");
  const [description, setDescription] = useState(t("store:openingDefault"));
  const [openingBalance, setOpeningBalance] = useState(0);
  const [codeOpen, setCodeOpen] = useState<{ typeName: string; apply: (id: number, name: string) => void } | null>(null);
  const [codeNumber, setCodeNumber] = useState("");
  const [codeNameAm, setCodeNameAm] = useState("");
  const [codeNameEn, setCodeNameEn] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const months = t("store:months").split(",");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await open.mutateAsync({
        fiscalYear,
        publicBodyCodeId,
        subAgencyCodeId: subAgencyCodeId || null,
        programCodeId,
        subProgramCodeId: subProgramCodeId || null,
        projectCodeId: projectCodeId || null,
        sourceCodeId,
        budgetTypeId,
        accountCodeId: accountCodeId || null,
        accountName,
        bankAccountNo,
        openingBalance,
        description,
        registerMonth,
      });
      setSelectedId(created.id);
      setNotice(t("store:mehi17Saved"));
      setFormOpen(true);
    } catch (caught) {
      setFormOpen(true);
      setError(financeErrorText(t, caught));
    }
  }

  async function saveCode() {
    if (!codeOpen || !codeNumber.trim() || !codeNameAm.trim()) {
      setError(t("store:fillRequired"));
      return;
    }
    try {
      const created = await createCode.mutateAsync({
        typeName: codeOpen.typeName,
        codeNumber: codeNumber.trim(),
        codeNameAm: codeNameAm.trim(),
        codeNameEn: codeNameEn.trim(),
        match: "exact",
      });
      codeOpen.apply(created.id, created.name);
      setCodeOpen(null);
    } catch (caught) {
      setError(financeErrorText(t, caught));
    }
  }

  if (lookups.isPending || board.isPending) return <div className="flex justify-center py-10"><Spinner size="lg" label={t("common:loading")} /></div>;
  if (lookups.isError || board.isError || !lookups.data || !board.data) return <Alert tone="danger">{financeErrorText(t, lookups.error ?? board.error)}</Alert>;
  const data = lookups.data;

  return (
    <div className="-m-3 min-h-full bg-[#f4f6f9] p-3 sm:-m-4 md:-m-6">
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <section className="mb-4 rounded-lg border border-[#de3545] bg-white shadow-sm">
        <button type="button" className="flex w-full items-center justify-between bg-[#a71d2a] px-4 py-3 text-white" onClick={() => setFormOpen((value) => !value)}>
          <h1 className="font-bold">{t("store:setupTitle")}</h1>
          <span className="rounded border border-white px-2 py-1 text-sm">{t("store:toggleForm")}</span>
        </button>
        {formOpen ? (
          <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3 p-4 md:grid-cols-3">
            <label className="text-sm font-bold">{t("store:fiscalYear")}<input className={`${field} mt-1`} required value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} /></label>
            <Pick label={t("store:setupPublic")} value={publicBodyCodeId} options={data.publicBodies} required onChange={setPublicBodyCodeId} onAdd={() => ask("Public_Body", (id) => setPublicBodyCodeId(id))} choose={t("store:choose")} add={t("store:addNew")} />
            <Pick label={t("store:setupAgency")} value={subAgencyCodeId} options={data.subAgencies} onChange={setSubAgencyCodeId} onAdd={() => ask("Sub_Agency", (id) => setSubAgencyCodeId(id))} choose={t("store:optionalChoose")} add={t("store:addNew")} />
            <Pick label={t("store:setupProgram")} value={programCodeId} options={data.programs} required onChange={setProgramCodeId} onAdd={() => ask("Program", (id) => setProgramCodeId(id))} choose={t("store:choose")} add={t("store:addNew")} />
            <Pick label={t("store:setupSubProgram")} value={subProgramCodeId} options={data.subPrograms} onChange={setSubProgramCodeId} onAdd={() => ask("Sub_Program", (id) => setSubProgramCodeId(id))} choose={t("store:optionalChoose")} add={t("store:addNew")} />
            <Pick label={t("store:setupProject")} value={projectCodeId} options={data.projects} onChange={setProjectCodeId} onAdd={() => ask("Project", (id) => setProjectCodeId(id))} choose={t("store:optionalChoose")} add={t("store:addNew")} />
            <Pick label={t("store:setupSource")} value={sourceCodeId} options={data.sources} required onChange={setSourceCodeId} onAdd={() => ask("Source_Of_Finance", (id) => setSourceCodeId(id))} choose={t("store:choose")} add={t("store:addNew")} />
            <Pick label={t("store:setupBudget")} value={budgetTypeId} options={data.budgetTypes} required onChange={setBudgetTypeId} onAdd={() => ask("Budget_Type", (id) => setBudgetTypeId(id))} choose={t("store:choose")} add={t("store:addNew")} />
            <Pick label={t("store:setupAccount")} value={accountCodeId} options={data.accounts} onChange={(id) => { setAccountCodeId(id); const match = data.accounts.find((code) => code.id === id); setAccountName(match?.name ?? ""); }} onAdd={() => ask("Account_Code", (id, name) => { setAccountCodeId(id); setAccountName(name); })} choose={t("store:optionalChoose")} add={t("store:addNew")} />
            <label className="text-sm font-bold md:col-span-1">{t("store:accountTitleField")}<input className={`${field} mt-1`} value={accountName} placeholder={t("store:accountTitlePlaceholder")} onChange={(event) => setAccountName(event.target.value)} /></label>
            <label className="text-sm font-bold md:col-span-2">{t("store:bankField")}<input className={`${field} mt-1`} required value={bankAccountNo} onChange={(event) => setBankAccountNo(event.target.value)} /></label>
            <div className="rounded border bg-[#f8f9fa] p-3 md:col-span-3">
              <h2 className="mb-2 font-bold text-[#dc3545]">{t("store:openingBlock")}</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm font-bold">{t("store:regMonth")}
                  <select className={`${field} mt-1`} value={registerMonth} onChange={(event) => setRegisterMonth(event.target.value)}>
                    {months.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold">{t("store:openingText")}<input className={`${field} mt-1`} required value={description} onChange={(event) => setDescription(event.target.value)} /></label>
                <label className="text-sm font-bold text-[#16a34a]">{t("store:openingAmount")}<input type="number" step="0.01" min="0" className={`${field} mt-1 font-bold text-[#16a34a]`} required value={openingBalance} onChange={(event) => setOpeningBalance(Number(event.target.value) || 0)} /></label>
              </div>
            </div>
            <button type="submit" className="rounded bg-[#dc3545] py-3 font-bold text-white md:col-span-3" disabled={open.isPending}>{t("store:saveMehi17")}</button>
          </form>
        ) : null}
      </section>
      <h2 className="mb-3 font-bold">{t("store:openCards", { count: board.data.cards.length })}</h2>
      {board.data.cards.length === 0 ? <Alert tone="warning">{t("store:noMehi17")}</Alert> : (
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {board.data.cards.map((card) => {
            const active = board.data?.card?.id === card.id;
            return (
              <button key={card.id} type="button" className={`rounded-lg border-2 border-l-[6px] p-3 text-left shadow-sm ${active ? "border-[#f48fb1] border-l-[#d81b60] bg-[#fff0f5]" : "border-[#e0e0e0] border-l-[#6c757d] bg-white"}`} onClick={() => setSelectedId(card.id)}>
                <div className="mb-2 flex justify-between gap-2">
                  <span className="rounded bg-[#dc3545] px-2 py-0.5 text-xs text-white">{t("store:codeBadge", { code: card.accountCode || t("store:na") })}</span>
                  <span className="rounded bg-[#6c757d] px-2 py-0.5 text-xs text-white">{t("store:yearOfBudget", { year: card.fiscalYear })}</span>
                </div>
                <h3 className="truncate font-bold text-[#0f172a]">{card.accountName || card.publicBodyName}</h3>
                <p className="truncate text-sm text-[#64748b]">{card.publicBodyName}</p>
                <p className="text-sm text-[#64748b]">{t("store:bankLine")} <b>{card.bankAccountNo}</b></p>
                <hr className="my-2" />
                <div className="flex justify-between text-sm"><span>{t("store:balanceShort")}</span><strong className="text-[#16a34a]">{t("store:balanceBirr", { amount: birr(card.balance) })}</strong></div>
              </button>
            );
          })}
        </div>
      )}
      {board.data.card ? <PinkCard card={board.data.card} lines={board.data.lines} printable /> : null}
      <Modal open={codeOpen !== null} onClose={() => setCodeOpen(null)} title={t("store:newFinanceCode")} footer={<button type="button" className="rounded bg-[#198754] px-3 py-2 font-bold text-white" onClick={() => void saveCode()}>{t("store:saveOnly")}</button>}>
        <label className="mb-2 block text-sm font-bold">{t("store:codeNumber")}<input className={`${field} mt-1`} value={codeNumber} onChange={(event) => setCodeNumber(event.target.value)} /></label>
        <label className="mb-2 block text-sm font-bold">{t("store:codeNameAmLabel")}<input className={`${field} mt-1`} value={codeNameAm} onChange={(event) => setCodeNameAm(event.target.value)} /></label>
        <label className="block text-sm font-bold">{t("store:codeNameEnLabel")}<input className={`${field} mt-1`} value={codeNameEn} onChange={(event) => setCodeNameEn(event.target.value)} /></label>
      </Modal>
    </div>
  );

  function ask(typeName: string, apply: (id: number, name: string) => void) {
    setCodeNumber("");
    setCodeNameAm("");
    setCodeNameEn("");
    setCodeOpen({ typeName, apply });
  }
}

function Pick({ label, value, options, required, onChange, onAdd, choose, add }: {
  label: string;
  value: number;
  options: CodeOption[];
  required?: boolean;
  onChange: (id: number) => void;
  onAdd: () => void;
  choose: string;
  add: string;
}) {
  return (
    <label className="text-sm font-bold">
      <span className="flex justify-between">{label}<button type="button" className="text-[#28a745]" onClick={onAdd}>{add}</button></span>
      <select className={`${field} mt-1 font-normal`} required={required} value={value || ""} onChange={(event) => onChange(Number(event.target.value))}>
        <option value="">{choose}</option>
        {options.map((code) => <option key={code.id} value={code.id}>{codeLabel(code)}</option>)}
      </select>
    </label>
  );
}
