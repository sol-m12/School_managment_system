import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { birr, financeErrorText, useFindMehi17, type Mehi17Detail, type Mehi17Line } from "./financeApi";

export function Mehi17LedgerPage() {
  const { t } = useTranslation(["store", "errors", "common"]);
  const [fiscalYear, setFiscalYear] = useState("2018");
  const [sourceCodeId, setSourceCodeId] = useState(0);
  const [accountType, setAccountType] = useState<"" | "Bank" | "Cash">("");
  const [query, setQuery] = useState<{ fiscalYear: string; sourceCodeId: number; accountType: "" | "Bank" | "Cash" } | null>(null);
  const found = useFindMehi17(
    query ?? { fiscalYear: "2018", sourceCodeId: 0, accountType: "" },
    query !== null && query.sourceCodeId > 0 && query.accountType !== "",
  );

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sourceCodeId || !accountType) return;
    setQuery({ fiscalYear, sourceCodeId, accountType });
  }

  return (
    <div className="-m-3 min-h-full bg-[#f4f6f9] p-4 sm:-m-4 md:-m-6">
      <form onSubmit={onSubmit} className="mb-4 grid gap-3 rounded bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="text-sm">{t("store:mehi17Year")}<input className="mt-1 w-full rounded border px-3 py-2" value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)} /></label>
        <label className="text-sm">{t("store:mehi17Source")}
          <select className="mt-1 w-full rounded border px-3 py-2" required value={sourceCodeId || ""} onChange={(event) => setSourceCodeId(Number(event.target.value))}>
            <option value="">{t("store:chooseOne")}</option>
            <option value="1">{t("store:sourceTreasury")}</option>
            <option value="2">{t("store:sourceInternal")}</option>
            <option value="3">{t("store:sourceAssistance")}</option>
            <option value="4">{t("store:sourceLoan")}</option>
          </select>
        </label>
        <label className="text-sm">{t("store:mehi17Kind")}
          <select className="mt-1 w-full rounded border px-3 py-2" required value={accountType} onChange={(event) => setAccountType(event.target.value as "" | "Bank" | "Cash")}>
            <option value="">{t("store:chooseOne")}</option>
            <option value="Bank">{t("store:kindBank")}</option>
            <option value="Cash">{t("store:kindCash")}</option>
          </select>
        </label>
        <div className="flex items-end"><button type="submit" className="w-full rounded bg-[#0d6efd] py-2 font-bold text-white">{t("store:findMehi17")}</button></div>
      </form>
      {found.isPending ? <div className="flex justify-center py-6"><Spinner label={t("common:loading")} /></div> : null}
      {found.isError ? <Alert tone="danger">{financeErrorText(t, found.error)}</Alert> : null}
      {found.data && !found.data.found ? <Alert tone="warning">{t("store:mehi17Missing")}</Alert> : null}
      {found.data?.found && found.data.card ? <PinkCard card={found.data.card} lines={found.data.lines ?? []} pageBadge /> : null}
    </div>
  );
}

export function PinkCard({ card, lines, pageBadge = false, printable = false }: { card: Mehi17Detail; lines: Mehi17Line[]; pageBadge?: boolean; printable?: boolean }) {
  const { t } = useTranslation("store");
  const pair = (value: { code: string; name: string }) => {
    const text = `${value.code} - ${value.name}`.replace(/^\s*-\s*/, "").trim();
    return text || t("store:na");
  };
  return (
    <section className="rounded-lg border-2 border-[#f48fb1] bg-[#fce4ec] p-5 text-[#880e4f] shadow">
      <div className="mb-3 flex items-center justify-between border-b border-[#dc3545] pb-2">
        <h2 className="text-lg font-bold">{pageBadge ? t("store:mehi17Heading") : t("store:mehi17CardTitle")}</h2>
        {pageBadge ? <span className="rounded bg-[#dc3545] px-2 py-1 text-white">{t("store:pageOne")}</span> : null}
        {printable ? <button type="button" className="rounded border border-[#dc3545] px-3 py-1 text-sm font-bold print:hidden" onClick={() => window.print()}>{t("store:printSheet")}</button> : null}
      </div>
      <div className="mb-3 grid gap-2 font-semibold md:grid-cols-3">
        {pageBadge ? (
          <>
            <div>{t("store:govBody")} <u>{card.publicBody.name || t("store:na")}</u></div>
            <div>{t("store:programShort")} <u>{card.program.name || t("store:na")}</u></div>
            <div>{t("store:bankNo")} <u>{card.bankAccountNo || t("store:na")}</u></div>
            <div>{t("store:accountClass")} <u>{`${card.accountCode} - ${card.accountName}`.trim()}</u></div>
            <div>{t("store:budgetKind")} <u>{card.budgetTypeName}</u></div>
            <div>{t("store:cardKind")} <u>{card.accountType}</u></div>
          </>
        ) : (
          <>
            <div>{t("store:govBody")} <u>{pair(card.publicBody)}</u></div>
            <div>{t("store:subAgency")} <u>{pair(card.subAgency)}</u></div>
            <div>{t("store:programShort")} <u>{pair(card.program)}</u></div>
            <div>{t("store:subProgram")} <u>{pair(card.subProgram)}</u></div>
            <div>{t("store:projectName")} <u>{pair(card.project)}</u></div>
            <div>{t("store:sourceName")} <u>{pair(card.source)}</u></div>
            <div>{t("store:budgetKind")} <u>{card.budgetTypeName || t("store:na")}</u></div>
            <div>{t("store:accountClass")} <u className="text-[#dc3545]">{card.accountCode || t("store:na")}</u></div>
            <div>{t("store:accountTitleField")} <u>{card.accountName || t("store:na")}</u></div>
            <div>{t("store:bankNo")} <u className="text-[#0d6efd]">{card.bankAccountNo || t("store:na")}</u></div>
          </>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white text-sm">
          <thead>
            <tr>
              <th colSpan={4} className="border border-[#f48fb1] bg-[#f8bbd0] p-2">{t("store:refGroup")}</th>
              <th rowSpan={2} className="border border-[#f48fb1] bg-[#f8bbd0] p-2">{t("store:colDate")}</th>
              <th rowSpan={2} className="border border-[#f48fb1] bg-[#f8bbd0] p-2">{t("store:colDescription")}</th>
              <th rowSpan={2} className="border border-[#f48fb1] bg-[#f8bbd0] p-2">{t("store:debitCol")}</th>
              <th rowSpan={2} className="border border-[#f48fb1] bg-[#f8bbd0] p-2">{t("store:creditCol")}</th>
              <th rowSpan={2} className="border border-[#f48fb1] bg-[#f8bbd0] p-2">{t("store:colBalance")}</th>
            </tr>
            <tr>
              <th className="border border-[#f48fb1] bg-[#f8bbd0] p-1">{t("store:monthCol")}</th>
              <th className="border border-[#f48fb1] bg-[#f8bbd0] p-1">{t("store:dayCol")}</th>
              <th className="border border-[#f48fb1] bg-[#f8bbd0] p-1">{t("store:pageCol")}</th>
              <th className="border border-[#f48fb1] bg-[#f8bbd0] p-1">{t("store:itemCol")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan={9} className="border p-4 text-center text-[#64748b]">{t("store:emptyMovement")}</td></tr>
            ) : lines.map((line) => (
              <tr key={line.id}>
                <td className="border p-1 text-center font-mono">{line.registerMonth}</td>
                <td className="border p-1 text-center font-mono">{line.registerDay}</td>
                <td className="border p-1 text-center font-mono">{line.registerPage || "-"}</td>
                <td className="border p-1 text-center font-mono">{line.registerItemNo || "-"}</td>
                <td className="border p-1 text-center font-mono">{line.docDate}</td>
                <td className="border p-1 font-bold">{line.description}</td>
                <td className="border p-1 text-right font-bold text-[#16a34a]">{birr(line.debit)}</td>
                <td className="border p-1 text-right font-bold text-[#dc2626]">{birr(line.credit)}</td>
                <td className="border bg-[#f8fafc] p-1 text-right font-bold">{birr(line.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
