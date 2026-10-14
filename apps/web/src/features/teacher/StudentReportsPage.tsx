import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useSubjectReport } from "./api/useTeacherPages";

const field = "mt-1 w-full rounded border border-[#ced4da] bg-white px-3 py-2 text-sm shadow-sm";

export function StudentReportsPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [combined, setCombined] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [load, setLoad] = useState(false);
  const report = useSubjectReport(load ? combined : "", load ? year : "", load ? semester : "");

  if (report.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (report.isError || !report.data) return <Alert tone="danger">{t(`errors:${toErrorKey(report.error)}`)}</Alert>;
  const data = report.data;
  const sheet = data.sheet;
  const chosenYear = year || data.academicYear;
  const chosenSemester = semester || data.semester;

  return (
    <div className="-m-4 bg-[#f8fafc] p-4 text-[#212529] md:-m-6 print:m-0 print:bg-white print:p-0">
      <style>{`@media print { @page { size: portrait; margin: 1cm; } }`}</style>
      <form
        className="mb-4 grid items-end gap-3 rounded-[15px] bg-white p-4 shadow-[0_5px_20px_rgba(0,0,0,0.05)] print:hidden md:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!combined) return;
          setLoad(true);
        }}
      >
        <label className="text-sm font-bold md:col-span-2">
          {t("teacher:reportPick")}
          <select
            required
            className={field}
            value={combined}
            onChange={(event) => {
              setCombined(event.target.value);
              setLoad(false);
            }}
          >
            <option value="">{t("teacher:reportChoose")}</option>
            {data.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:reportYear")}
          <select
            className={field}
            value={chosenYear}
            onChange={(event) => {
              setYear(event.target.value);
              setLoad(false);
            }}
          >
            {data.years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:reportSemester")}
          <select
            className={field}
            value={chosenSemester}
            onChange={(event) => {
              setSemester(event.target.value);
              setLoad(false);
            }}
          >
            <option value="1">{t("teacher:reportSem1")}</option>
            <option value="2">{t("teacher:reportSem2")}</option>
          </select>
        </label>
        <button type="submit" className="rounded bg-[#0d6efd] px-3 py-2 font-bold text-white shadow-sm">
          {t("teacher:reportGenerate")}
        </button>
        <button type="button" className="rounded bg-[#212529] px-3 py-2 font-bold text-white shadow-sm" onClick={() => window.print()}>
          {t("teacher:reportPrint")}
        </button>
      </form>

      {sheet ? (
        <section className="mb-5 rounded-[15px] border border-[#dee2e6] bg-white p-4 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <header className="mb-4 border-b border-[#dee2e6] pb-3 text-center">
            <h2 className="text-2xl font-bold text-[#1a237e]">{t("teacher:transferSheet")}</h2>
            <div className="mt-3 grid gap-2 px-3 text-sm font-bold md:grid-cols-3">
              <div className="text-start">
                {t("teacher:reportSubject")} {sheet.subjectName}
              </div>
              <div className="text-center">
                {t("teacher:reportClass")} {sheet.classLabel}
              </div>
              <div className="text-end">
                {t("teacher:reportYearSem", { year: data.academicYear, semester: data.semester })}
              </div>
            </div>
          </header>
          <h3 className="mb-2 text-sm font-bold text-[#1a237e]">{t("teacher:officialRecord")}</h3>
          <MarkTable weights={sheet.weights} showPercent rows={sheet.rows} totalLabel={t("teacher:reportTotal")} nameLabel={t("teacher:colFullName")} sexLabel={t("teacher:colSex")} noLabel={t("teacher:colNo")} />
          <Signatures teacher={t("teacher:reportTeacher", { name: data.teacherName })} right={t("teacher:reportDirector")} />
          <div className="mt-5 border-t-2 border-dashed border-[#eee] pt-5">
            <h3 className="mb-2 text-sm font-bold text-[#dc3545]">{t("teacher:incompleteCheck")}</h3>
            <table className="mb-6 w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="border border-[#333] bg-[#1a237e] px-1 py-1.5 text-center text-white uppercase">{t("teacher:colNo")}</th>
                  <th className="w-[220px] border border-[#333] bg-[#1a237e] px-2 py-1.5 text-left text-white uppercase">{t("teacher:colFullName")}</th>
                  {sheet.weights.map((weight) => (
                    <th key={weight.label} className="border border-[#333] bg-[#1a237e] px-1 py-1.5 text-center text-white uppercase">
                      {weight.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.every((row) => row.missing.every((item) => !item)) ? (
                  <tr>
                    <td colSpan={sheet.weights.length + 2} className="border border-[#dee2e6] py-3 text-center font-bold text-[#198754]">
                      {t("teacher:allComplete")}
                    </td>
                  </tr>
                ) : (
                  sheet.rows
                    .filter((row) => row.missing.some(Boolean))
                    .map((row, index) => (
                      <tr key={row.id}>
                        <td className="border border-[#dee2e6] px-1 py-1 text-center">{index + 1}</td>
                        <td className="border border-[#dee2e6] px-2 py-1 text-left font-semibold">{row.fullName}</td>
                        {row.missing.map((missing, markIndex) => (
                          <td
                            key={markIndex}
                            className={`border border-[#dee2e6] px-1 py-1 text-center font-bold ${missing ? "bg-[#ffebee] text-[#d32f2f]" : "text-[#388e3c]"}`}
                          >
                            {missing ? t("teacher:markMissing") : t("teacher:markOk")}
                          </td>
                        ))}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
            <Signatures teacher={t("teacher:reportTeacher", { name: data.teacherName })} right={t("teacher:reportDate")} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MarkTable({
  weights,
  rows,
  showPercent,
  totalLabel,
  nameLabel,
  sexLabel,
  noLabel,
}: {
  weights: { label: string; percent: string }[];
  rows: { id: number; fullName: string; sex: string; scores: string[]; total: string }[];
  showPercent: boolean;
  totalLabel: string;
  nameLabel: string;
  sexLabel: string;
  noLabel: string;
}) {
  return (
    <table className="mb-6 w-full border-collapse text-[11px]">
      <thead>
        <tr>
          <th className="w-[35px] border border-[#333] bg-[#1a237e] px-1 py-1.5 text-center text-white uppercase">{noLabel}</th>
          <th className="w-[220px] border border-[#333] bg-[#1a237e] px-2 py-1.5 text-left text-white uppercase">{nameLabel}</th>
          <th className="w-[35px] border border-[#333] bg-[#1a237e] px-1 py-1.5 text-center text-white uppercase">{sexLabel}</th>
          {weights.map((weight) => (
            <th key={weight.label} className="border border-[#333] bg-[#1a237e] px-1 py-1.5 text-center text-white uppercase">
              {weight.label}
              {showPercent ? ` (${weight.percent}%)` : ""}
            </th>
          ))}
          <th className="w-[60px] border border-[#333] bg-[#f0f0f0] px-1 py-1.5 text-center font-bold text-[#1a237e] uppercase">{totalLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.id}>
            <td className="border border-[#dee2e6] px-1 py-1 text-center">{index + 1}</td>
            <td className="border border-[#dee2e6] px-2 py-1 text-left font-semibold">{row.fullName}</td>
            <td className="border border-[#dee2e6] px-1 py-1 text-center">{row.sex}</td>
            {row.scores.map((score, scoreIndex) => (
              <td key={scoreIndex} className="border border-[#dee2e6] px-1 py-1 text-center">
                {score}
              </td>
            ))}
            <td className="border border-[#dee2e6] px-1 py-1 text-center font-bold">{row.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Signatures({ teacher, right }: { teacher: string; right: string }) {
  return (
    <div className="mt-4 mb-8 grid grid-cols-5 text-center">
      <div className="col-span-2 border-t-[1.5px] border-[#333] pt-1 text-xs font-bold">{teacher}</div>
      <div />
      <div className="col-span-2 border-t-[1.5px] border-[#333] pt-1 text-xs font-bold">{right}</div>
    </div>
  );
}
