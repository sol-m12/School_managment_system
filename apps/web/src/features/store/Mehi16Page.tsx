import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { birr, birrOrBlank, financeErrorText, useMehi16Card, type CodePair } from "./financeApi";

export function Mehi16Page() {
  const { t } = useTranslation(["store", "errors", "common"]);
  const [params] = useSearchParams();
  const raw = Number(params.get("cardId"));
  const cardId = Number.isInteger(raw) && raw > 0 ? raw : null;
  const detail = useMehi16Card(cardId);

  useEffect(() => {
    if (params.get("print") === "1" && detail.data) window.print();
  }, [params, detail.data]);

  if (detail.isPending) return <div className="flex justify-center py-10"><Spinner size="lg" label={t("common:loading")} /></div>;
  if (detail.isError || !detail.data) return <Alert tone="danger">{financeErrorText(t, detail.error)}</Alert>;

  const card = detail.data.card;
  return (
    <div className="-m-3 min-h-full bg-[#f1f5f9] p-3 font-serif text-black sm:-m-4 md:-m-6 print:m-0 print:bg-white print:p-0">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <Link to="/store/ledger-cards" className="rounded border border-[#0f172a] px-3 py-2 font-bold">{t("store:backToCards")}</Link>
        <button type="button" className="rounded bg-[#0d6efd] px-4 py-2 font-bold text-white shadow-sm" onClick={() => window.print()}>{t("store:printAction")}</button>
      </div>
      <article className="mx-auto max-w-[1400px] rounded border border-[#cbd5e1] bg-white p-6 shadow print:border-0 print:p-0 print:shadow-none">
        <div className="mb-3 grid grid-cols-3 items-start">
          <div>
            <div className="inline-block border-2 border-black px-3 py-1 text-center font-bold">
              {t("store:mehiBox")}<br /><small className="text-xs">{t("store:mehiBoxEn")}</small>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold uppercase">{t("store:cardTitle")}</h1>
            <div className="font-bold">{t("store:cardTitleEn")}</div>
          </div>
          <div className="text-end font-bold">
            {t("store:pageLabel")} <span className="border-b border-black px-4">{card.pageNo || "1"}</span>
          </div>
        </div>
        <div className="mb-4 grid gap-4 border-b-2 border-black pb-3 md:grid-cols-2">
          <div>
            <Dotted label={t("store:publicBody")} hint={t("store:publicBodyHint")} pair={card.publicBody} codeWord={t("store:codeWord")} />
            <Dotted label={t("store:programName")} hint={t("store:programHint")} pair={card.program} codeWord={t("store:codeWord")} />
            <Dotted label={t("store:subAgency")} hint={t("store:subAgencyHint")} pair={card.subAgency} codeWord={t("store:codeWord")} />
            <Dotted label={t("store:subProgram")} hint={t("store:subProgramHint")} pair={card.subProgram} codeWord={t("store:codeWord")} />
            <Dotted label={t("store:projectName")} hint={t("store:projectHint")} pair={card.project} codeWord={t("store:codeWord")} />
          </div>
          <div>
            <Dotted label={t("store:sourceName")} hint={t("store:sourceHint")} pair={card.source} codeWord={t("store:codeWord")} />
            <Dotted label={t("store:budgetTypeName")} hint={t("store:budgetTypeHint")} pair={card.budgetType} codeWord={t("store:codeWord")} />
            <Dotted label={t("store:accountName")} hint={t("store:accountHint")} pair={card.account} codeWord={t("store:codeWord")} />
            <div className="mt-3 flex items-end text-sm">
              <span className="font-bold">{t("store:fiscalYearLine")}</span>
              <div className="mx-2 min-h-5 flex-1 border-b border-dotted border-black font-bold text-[#0d6efd]">{card.fiscalYear} {t("store:yearSuffix")}</div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-2 border-black text-xs">
            <thead>
              <tr>
                <th rowSpan={2} className="border border-black bg-[#f8fafc] p-1">{t("store:colNo")}</th>
                <th rowSpan={2} className="border border-black bg-[#f8fafc] p-1">{t("store:colDate")}</th>
                <th rowSpan={2} className="border border-black bg-[#f8fafc] p-1">{t("store:colDescription")}</th>
                <th rowSpan={2} className="border border-black bg-[#f8fafc] p-1">{t("store:colRef")}</th>
                <th colSpan={4} className="border border-black bg-[#f8fafc] p-1">{t("store:budgetGroup")}</th>
                <th rowSpan={2} className="border border-black bg-[#f8fafc] p-1">{t("store:colCommitted")}</th>
                <th rowSpan={2} className="border border-black bg-[#f8fafc] p-1">{t("store:colExpenditure")}</th>
                <th rowSpan={2} className="border border-black bg-[#f8fafc] p-1">{t("store:colBalance")}</th>
              </tr>
              <tr>
                <th className="border border-black bg-[#f8fafc] p-1">{t("store:colApproved")}</th>
                <th className="border border-black bg-[#f8fafc] p-1">{t("store:colAddition")}</th>
                <th className="border border-black bg-[#f8fafc] p-1">{t("store:colReduction")}</th>
                <th className="border border-black bg-[#f8fafc] p-1">{t("store:colAdjusted")}</th>
              </tr>
            </thead>
            <tbody>
              {detail.data.lines.length === 0 ? (
                <tr><td colSpan={11} className="border border-black py-4 text-center text-[#64748b]">{t("store:emptyLines")}</td></tr>
              ) : detail.data.lines.map((line, index) => (
                <tr key={line.id}>
                  <td className="border border-black p-1 text-center">{index + 1}</td>
                  <td className="border border-black p-1 text-center">{line.date}</td>
                  <td className="border border-black p-1">{line.description}</td>
                  <td className="border border-black p-1 text-center font-bold">{line.refNo}</td>
                  <td className="border border-black p-1 text-right font-mono">{birrOrBlank(line.approved)}</td>
                  <td className="border border-black p-1 text-right font-mono">{birrOrBlank(line.addition)}</td>
                  <td className="border border-black p-1 text-right font-mono">{birrOrBlank(line.reduction)}</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{birr(line.adjusted)}</td>
                  <td className="border border-black p-1 text-right font-mono">{birrOrBlank(line.committed)}</td>
                  <td className="border border-black p-1 text-right font-mono">{birrOrBlank(line.expenditure)}</td>
                  <td className="border border-black p-1 text-right font-mono font-bold">{birr(line.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function Dotted({ label, hint, pair, codeWord }: { label: string; hint: string; pair: CodePair; codeWord: string }) {
  return (
    <div className="mb-1">
      <div className="flex items-end text-sm">
        <span className="whitespace-nowrap font-bold">{label}</span>
        <div className="mx-2 min-h-5 flex-1 border-b border-dotted border-black pl-1 font-semibold">{pair.name}</div>
        <span className="font-bold">{codeWord}</span>
        <div className="min-w-[70px] border-b border-black text-center font-bold">{pair.code}</div>
      </div>
      <div className="-mt-1 text-xs text-[#64748b]">{hint}</div>
    </div>
  );
}
