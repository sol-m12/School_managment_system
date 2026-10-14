import { CheckCircle, Database, Printer, Search, TriangleAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useReportCards, type RosterStudent } from "./api/useTeacherPages";

function schoolRemark(student: RosterStudent, t: (key: string) => string): string {
  if (student.yearRemark === "Detained") return t("teacher:remarkDetainedText");
  if (student.yearAverage >= 90) return t("teacher:remarkExcellent");
  if (student.yearAverage >= 85) return t("teacher:remarkGreat");
  if (student.yearAverage >= 75) return t("teacher:remarkGood");
  return t("teacher:remarkPass");
}

export function ReportCardsPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<number> | null>(null);
  const cards = useReportCards(classId);

  const filtered = useMemo(() => {
    if (!cards.data || !cards.data.allowed) return [];
    const needle = search.trim().toLowerCase();
    if (!needle) return cards.data.students;
    return cards.data.students.filter(
      (student) => student.fullName.toLowerCase().includes(needle) || String(student.id).includes(needle),
    );
  }, [cards.data, search]);

  if (cards.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (cards.isError || !cards.data) return <Alert tone="danger">{t(`errors:${toErrorKey(cards.error)}`)}</Alert>;
  if (!cards.data.allowed) return <Alert tone="danger">{t("teacher:unauthorizedAccess")}</Alert>;
  const data = cards.data;
  const selected = picked ?? new Set(filtered.map((student) => student.id));
  const allOn = filtered.length > 0 && filtered.every((student) => selected.has(student.id));

  let promoted = 0;
  let detained = 0;
  let highest = 0;
  let lowest = 100;
  for (const student of filtered) {
    if (student.yearAverage >= 0) {
      if (student.yearAverage > highest) highest = student.yearAverage;
      if (student.yearAverage < lowest) lowest = student.yearAverage;
      if (student.yearRemark === "Promoted") promoted += 1;
      else detained += 1;
    }
  }
  if (lowest === 100) lowest = 0;

  return (
    <div className="-m-4 bg-[#cbd5e1] text-[#0f172a] md:-m-6 print:m-0 print:bg-white">
      <style>{`@media print { @page { size: portrait; margin: 0; } }`}</style>
      <div className="no-print mx-auto mt-4 max-w-[210mm] print:hidden">
        <div className="rounded-[14px] border border-white/10 bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-6 text-white shadow-[0_10px_25px_rgba(0,0,0,0.2)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-3">
            <div>
              <h1 className="m-0 flex items-center text-xl font-bold text-white">
                <Database aria-hidden="true" className="me-2 size-5 text-[#0dcaf0]" />
                {t("teacher:cardDashboard")}
              </h1>
              <p className="text-sm text-white/50">{t("teacher:cardDashboardHint")}</p>
            </div>
            <button type="button" className="rounded bg-[#198754] px-4 py-2 font-bold text-white" onClick={() => window.print()}>
              <Printer aria-hidden="true" className="me-2 inline size-4" />
              {t("teacher:printSelectedCards")}
            </button>
          </div>
          <div className="mb-4 grid gap-3 text-white md:grid-cols-4">
            <Metric label={t("teacher:cardTotalStudents")} value={t("teacher:cardStudentCount", { count: filtered.length })} />
            <Metric label={t("teacher:cardPromoted")} value={t("teacher:cardPromotedCount", { count: promoted })} success />
            <Metric label={t("teacher:cardHighest")} value={`${highest.toFixed(1)}%`} warn />
            <Metric label={t("teacher:cardLowest")} value={`${lowest.toFixed(1)}%`} danger />
          </div>
          <form
            className="rounded border border-[#6c757d] bg-[#212529] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              setPicked(null);
            }}
          >
            <div className="grid items-center gap-3 md:grid-cols-3">
              {data.classes.length > 1 ? (
                <select
                  className="rounded border-0 bg-[#6c757d] px-3 py-2 text-white"
                  value={String(data.classId)}
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setPicked(null);
                  }}
                >
                  {data.classes.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.label}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className={`flex ${data.classes.length > 1 ? "md:col-span-1" : "md:col-span-2"}`}>
                <span className="flex items-center rounded-s bg-[#6c757d] px-3 text-white">
                  <Search aria-hidden="true" className="size-4" />
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("teacher:cardSearch")}
                  className="w-full rounded-e border-0 bg-[#6c757d] px-3 py-2 text-white placeholder:text-white/70"
                />
              </div>
              <button type="submit" className="rounded bg-[#0d6efd] px-3 py-2 font-bold text-white">
                {t("teacher:cardFilter")}
              </button>
            </div>
            <div className="mt-3 max-h-[130px] overflow-y-auto rounded bg-white p-2 text-xs text-[#212529]">
              <div className="mb-2 flex items-center justify-between border-b border-[#dee2e6] pb-1 font-bold text-[#0d6efd]">
                <span>{t("teacher:cardPick")}</span>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={allOn}
                    onChange={(event) => {
                      setPicked(event.target.checked ? new Set(filtered.map((student) => student.id)) : new Set());
                    }}
                  />
                  <b>{t("teacher:cardSelectAll")}</b>
                </label>
              </div>
              <div className="grid md:grid-cols-3">
                {filtered.map((student) => (
                  <label key={student.id} className="mb-1 flex cursor-pointer items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selected.has(student.id)}
                      onChange={(event) => {
                        const next = new Set(selected);
                        if (event.target.checked) next.add(student.id);
                        else next.delete(student.id);
                        setPicked(next);
                      }}
                    />
                    <span className="truncate">{student.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>

      {filtered.map((student) =>
        selected.has(student.id) ? (
          <article
            key={student.id}
            className="mx-auto my-8 box-border min-h-[297mm] w-[210mm] max-w-full border-2 border-[#0f172a] bg-white p-[15mm] shadow-[0_10px_25px_rgba(0,0,0,0.08)] print:my-0 print:shadow-none"
          >
            <header className="mb-5 border-b-2 border-[#0f172a] pb-2.5 text-center">
              <h2 className="m-0 text-[25px] font-bold tracking-wide text-[#0f172a]">{t("teacher:schoolName")}</h2>
              <h3 className="m-1 text-[15px] font-semibold text-[#6c757d]">{t("teacher:cardSubtitle")}</h3>
              <span className="mt-1 inline-block rounded bg-[#212529] px-3 py-1 text-[11px] text-white">
                {t("teacher:cardYear", { year: data.academicYear })}
              </span>
            </header>
            <div className="mb-5 grid grid-cols-2 gap-3 border border-[#0f172a] bg-[#f8fafc] p-3 text-sm font-bold print:bg-white md:grid-cols-[2fr_1fr_1fr_1.2fr]">
              <div className="text-start">
                {t("teacher:cardName")}
                <span className="block text-[#0d6efd]">{student.fullName}</span>
              </div>
              <div>
                {t("teacher:cardGrade")}
                <span className="block text-[#212529]">
                  {data.gradeLevel}-{data.section}
                </span>
              </div>
              <div>
                {t("teacher:cardSex")}
                <span className="block">{student.sex}</span>
              </div>
              <div className="text-end">
                {student.transfer ? (
                  <span className="rounded bg-black px-1.5 py-0.5 text-[10px] text-white">{t("teacher:cardTransfer")}</span>
                ) : (
                  <>
                    {t("teacher:cardId")}
                    <span className="block text-[#6c757d]">{student.id}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
              <div className="lg:w-[51%]">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className="w-[46%] border border-[#0f172a] bg-[#f1f5f9] px-1 py-2 text-xs font-bold">{t("teacher:cardSubject")}</th>
                      <th className="w-[18%] border border-[#0f172a] bg-[#f1f5f9] px-1 py-2 text-xs font-bold">{t("teacher:cardSem1")}</th>
                      <th className="w-[18%] border border-[#0f172a] bg-[#f1f5f9] px-1 py-2 text-xs font-bold">{t("teacher:cardSem2")}</th>
                      <th className="w-[18%] border border-[#0f172a] bg-[#f1f5f9] px-1 py-2 text-xs font-bold">{t("teacher:cardAvg")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.cardSubjects.map((subject) => (
                      <tr key={subject.name}>
                        <td className="border border-[#0f172a] px-2.5 py-1.5 text-left font-semibold">{subject.name}</td>
                        <td className="border border-[#0f172a] px-1 py-1.5 text-center">{subject.first}</td>
                        <td className="border border-[#0f172a] px-1 py-1.5 text-center">{subject.second}</td>
                        <td className="border border-[#0f172a] px-1 py-1.5 text-center">{subject.average}</td>
                      </tr>
                    ))}
                    <SummaryRow label={t("teacher:cardTotalRow")} a={student.cardTotals.firstTotal} b={student.cardTotals.secondTotal} c={student.cardTotals.yearTotal} />
                    <SummaryRow label={t("teacher:cardAverageRow")} a={student.cardTotals.firstAverage} b={student.cardTotals.secondAverage} c={student.cardTotals.yearAverage} />
                    <SummaryRow label={t("teacher:cardRankRow")} a={student.cardTotals.firstRank} b={student.cardTotals.secondRank} c={student.cardTotals.yearRank} strong />
                  </tbody>
                </table>
                <div className="mt-8 flex items-end justify-between text-center text-xs font-bold">
                  <div>
                    <span>{t("teacher:cardSeal")}</span>
                    <br />
                    <span className="text-[9px] text-[#6c757d]">{t("teacher:cardSealEn")}</span>
                    <div className="mx-auto mt-10 w-[110px] border-t border-dashed border-black" />
                  </div>
                  <div>
                    <span>{t("teacher:cardPrincipal")}</span>
                    <br />
                    <span className="border-b border-black px-1">{t("teacher:cardDirectorName")}</span>
                    <div className="mx-auto mt-5 w-[130px] border-t border-dashed border-black text-[11px]">{t("teacher:cardSignature")}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col text-[13px] lg:w-[47%]">
                <div className="border-b-2 border-[#0f172a] pb-2 text-center text-[13px] font-bold">{t("teacher:cardInsights")}</div>
                <div className="mt-3.5 mb-1.5 border-l-4 border-[#0f172a] bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold">{t("teacher:cardSchoolRemark")}</div>
                <div className="rounded-md border border-[#0f172a] bg-[#fafafa] p-3 text-[12.5px] leading-normal text-black italic print:bg-white">
                  {schoolRemark(student, t)}
                </div>
                <SemesterNote title={t("teacher:cardSem1Note")} teacher={data.teacherName} teacherLabel={t("teacher:cardHomeroom")} parent={t("teacher:cardParentSign")} />
                <SemesterNote title={t("teacher:cardSem2Note")} teacher={data.teacherName} teacherLabel={t("teacher:cardHomeroom")} parent={t("teacher:cardParentSign")} />
                <div className="mt-3.5 mb-1.5 border-l-4 border-[#0f172a] bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold">{t("teacher:cardExtra")}</div>
                <table className="mt-2 w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="border border-black bg-[#f1f5f9] p-1">{t("teacher:cardPeriod")}</th>
                      <th className="border border-black bg-[#f1f5f9] p-1">{t("teacher:cardConduct")}</th>
                      <th className="border border-black bg-[#f1f5f9] p-1">{t("teacher:cardAbsent")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-1 text-center">{t("teacher:cardSem1")}</td>
                      <td className="border border-black p-1 text-center">[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</td>
                      <td className="border border-black p-1 text-center">{t("teacher:cardDays")}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1 text-center">{t("teacher:cardSem2")}</td>
                      <td className="border border-black p-1 text-center">[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</td>
                      <td className="border border-black p-1 text-center">{t("teacher:cardDays")}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-4 rounded-md border-2 border-[#0f172a] bg-[#f8fafc] p-3 text-center">
                  <div className="text-[10px] font-bold text-[#6c757d] uppercase">{t("teacher:cardFinalTitle")}</div>
                  <div className="mt-2 font-bold">
                    {student.yearRemark === "Promoted" ? (
                      <span className="inline-flex items-center text-base text-[#198754]">
                        <CheckCircle aria-hidden="true" className="me-1 size-4" />
                        {t("teacher:cardPromotedStatus")}
                      </span>
                    ) : student.yearRemark === "Detained" ? (
                      <span className="inline-flex items-center text-base text-[#dc3545]">
                        <XCircle aria-hidden="true" className="me-1 size-4" />
                        {t("teacher:cardDetainedStatus")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-sm text-[#6c757d]">
                        <TriangleAlert aria-hidden="true" className="me-1 size-4" />
                        {t("teacher:cardIncompleteStatus")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </article>
        ) : null,
      )}
    </div>
  );
}

function Metric({ label, value, success, warn, danger }: { label: string; value: string; success?: boolean; warn?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-lg border-l-4 bg-white/5 px-4 py-3 ${success ? "border-[#10b981]" : "border-[#3b82f6]"}`}>
      <small className="block text-white/50">{label}</small>
      <span className={`text-xl font-bold ${success ? "text-[#198754]" : warn ? "text-[#ffc107]" : danger ? "text-[#dc3545]" : ""}`}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, a, b, c, strong }: { label: string; a: string; b: string; c: string; strong?: boolean }) {
  return (
    <tr className="bg-[#edf2f7] font-extrabold">
      <td className="border border-[#0f172a] px-2.5 py-1.5 text-left">{label}</td>
      <td className="border border-[#0f172a] px-1 py-1.5 text-center">{a}</td>
      <td className="border border-[#0f172a] px-1 py-1.5 text-center">{b}</td>
      <td className="border border-[#0f172a] px-1 py-1.5 text-center">{strong ? <strong>{c}</strong> : c}</td>
    </tr>
  );
}

function SemesterNote({ title, teacher, teacherLabel, parent }: { title: string; teacher: string; teacherLabel: string; parent: string }) {
  return (
    <>
      <div className="mt-3.5 mb-1.5 border-l-4 border-[#0f172a] bg-[#f1f5f9] px-2.5 py-1 text-xs font-bold">{title}</div>
      <div className="mb-2 h-[26px] border-b border-dotted border-black" />
      <div className="mt-1">
        {teacherLabel} <span className="border-b border-black px-1 font-bold">{teacher}</span>
      </div>
      <div className="mt-1">{parent}</div>
    </>
  );
}
