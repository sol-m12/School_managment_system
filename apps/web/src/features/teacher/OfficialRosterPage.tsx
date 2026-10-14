import { EyeOff, FileText, Printer, RefreshCw, Shield } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useRoster, type RosterStudent, type RosterTerm } from "./api/useTeacherPages";

const remarkClass: Record<RosterStudent["remark"], string> = {
  Promoted: "text-[#198754]",
  Detained: "text-[#dc3545]",
  Pending: "text-[#0d6efd]",
  Incomplete: "text-[#6c757d]",
};

function cellClass(mark: string): string {
  return `border border-[#333] px-1 py-1 text-center align-middle${mark === "!" ? " text-sm font-bold text-[#d32f2f]" : ""}`;
}

function MarkCells({ term, showVocational }: { term: RosterTerm; showVocational: boolean }) {
  return (
    <>
      {term.marks.map((mark, index) => (
        <td key={index} className={cellClass(mark)}>
          {mark}
        </td>
      ))}
      {showVocational ? <td className={cellClass(term.vocational ?? "")}>{term.vocational}</td> : null}
      <td className={cellClass("")}>{term.total}</td>
      <td className={cellClass("")}>{term.average}</td>
      <td className={cellClass("")}>{term.rank}</td>
    </>
  );
}

export function ClassRosterPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [classId, setClassId] = useState("");
  const [hideIncomplete, setHideIncomplete] = useState(false);
  const roster = useRoster(classId);

  if (roster.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (roster.isError || !roster.data) return <Alert tone="danger">{t(`errors:${toErrorKey(roster.error)}`)}</Alert>;
  if (!roster.data.allowed) return <Alert tone="danger">{t("teacher:unauthorizedAccess")}</Alert>;
  const data = roster.data;

  return (
    <div className="-m-4 bg-[#eef2f5] text-[11.5px] text-black md:-m-6 print:m-0 print:bg-white print:text-[10.5px]">
      <style>{`@media print { @page { size: landscape; margin: 0.4in; } }`}</style>
      <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#dee2e6] bg-white p-2 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 flex items-center text-lg font-bold text-[#0d6efd]">
            <FileText aria-hidden="true" className="me-2 size-5" />
            {t("teacher:officialRoster")}
          </h1>
          <span className="inline-flex items-center rounded bg-[#198754] px-2 py-1 text-xs font-semibold text-white">
            <Shield aria-hidden="true" className="me-1 size-3" />
            {t("teacher:rosterSynced")}
          </span>
          {data.classes.length > 1 ? (
            <label className="text-sm font-bold text-[#212529]">
              <span className="sr-only">{t("teacher:pickClass")}</span>
              <select
                className="rounded border border-[#ced4da] bg-white px-2 py-1"
                value={String(data.classId)}
                onChange={(event) => setClassId(event.target.value)}
              >
                {data.classes.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded border border-[#dc3545] px-2 py-1 text-sm font-bold text-[#dc3545]"
            onClick={() => {
              if (!window.confirm(t("teacher:recalculateConfirm"))) return;
              void roster.refetch();
            }}
          >
            <RefreshCw aria-hidden="true" className="me-1 size-3.5" />
            {t("teacher:recalculate")}
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded border border-[#6c757d] px-2 py-1 text-sm font-bold text-[#6c757d]"
            onClick={() => setHideIncomplete((value) => !value)}
          >
            <EyeOff aria-hidden="true" className="me-1 size-3.5" />
            {t("teacher:hideIncomplete")}
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded bg-[#0d6efd] px-4 py-1 text-sm font-bold text-white"
            onClick={() => window.print()}
          >
            <Printer aria-hidden="true" className="me-2 size-3.5" />
            {t("teacher:printRoster")}
          </button>
        </div>
      </div>

      <div className="mx-auto my-4 w-[99%] max-w-[1500px] rounded-lg bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.08)] print:m-0 print:w-full print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="mb-4 border-b-[3px] border-double border-[#333] pb-2 text-center">
          <h2 className="mb-1 text-2xl font-bold tracking-wide">{t("teacher:schoolName")}</h2>
          <h3 className="mb-2 text-base font-bold text-[#6c757d]">{t("teacher:rosterHeading", { year: data.academicYear })}</h3>
          <div className="mt-2 flex flex-wrap justify-around gap-2 text-xs font-bold">
            <span>
              {t("teacher:rosterGrade")} <u className="text-[#0d6efd]">{data.gradeLevel}</u>
            </span>
            <span>
              {t("teacher:rosterSection")} <u className="text-[#0d6efd]">{data.section}</u>
            </span>
            <span>
              {t("teacher:rosterStream")} <u className="text-[#0d6efd]">{data.stream}</u>
            </span>
            <span>
              {t("teacher:rosterHomeroom")} <u className="text-[#0d6efd]">{data.teacherName}</u>
            </span>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white">
            <thead className="bg-[#2c3e50] text-white print:bg-[#ddd] print:text-black">
              <tr>
                <th className="w-[30px] border border-[#333] px-1 py-1 text-center align-middle">{t("teacher:colNo")}</th>
                <th className="border border-[#333] bg-[#2c3e50] px-2 py-1 text-left whitespace-nowrap text-white print:bg-[#ddd] print:text-black">
                  {t("teacher:colFullName")}
                </th>
                <th className="w-[30px] border border-[#333] px-1 py-1">{t("teacher:colSex")}</th>
                <th className="w-[30px] border border-[#333] px-1 py-1">{t("teacher:colAge")}</th>
                <th className="w-10 border border-[#333] px-1 py-1">{t("teacher:colSem")}</th>
                {data.subjects.map((subject) => (
                  <th key={subject.id} className="h-[120px] w-[34px] border border-[#333] align-bottom">
                    <div className="mx-auto pb-1 text-[11px] font-bold [writing-mode:vertical-lr] rotate-180">{subject.name}</div>
                  </th>
                ))}
                {data.showVocational ? (
                  <th className="h-[120px] w-[34px] border border-[#333] align-bottom">
                    <div className="mx-auto pb-1 text-[11px] font-bold [writing-mode:vertical-lr] rotate-180">{t("teacher:vocational")}</div>
                  </th>
                ) : null}
                <th className="w-[45px] border border-[#333] px-1 py-1">{t("teacher:colTotal")}</th>
                <th className="w-[45px] border border-[#333] px-1 py-1">{t("teacher:colAvg")}</th>
                <th className="w-10 border border-[#333] px-1 py-1">{t("teacher:colRank")}</th>
                <th className="w-[50px] border border-[#333] px-1 py-1">{t("teacher:colRemark")}</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((student, index) => (
                <StudentRows
                  key={student.id}
                  index={index}
                  student={student}
                  showVocational={data.showVocational}
                  hideIncomplete={hideIncomplete}
                  remarkLabel={t(`teacher:remark${student.remark}`)}
                  transferLabel={t("teacher:transferBadge")}
                  averageLabel={t("teacher:averageRow")}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 text-center md:grid-cols-2">
          <SignBox
            title={t("teacher:endorseFirst")}
            titleClass="text-[#0d6efd]"
            teacher={data.teacherName}
            homeroom={t("teacher:signHomeroom")}
            registrar={t("teacher:signRegistrar")}
            director={t("teacher:signDirector")}
            blank={t("teacher:signBlank")}
            seal={t("teacher:signSeal")}
          />
          <SignBox
            title={t("teacher:endorseFinal")}
            titleClass="text-[#198754]"
            teacher={t("teacher:signBlank")}
            homeroom={t("teacher:signHomeroom")}
            registrar={t("teacher:signRegistrar")}
            director={t("teacher:signDirector")}
            blank={t("teacher:signBlank")}
            seal={t("teacher:signSeal")}
          />
        </div>
      </div>
    </div>
  );
}

function StudentRows({
  index,
  student,
  showVocational,
  hideIncomplete,
  remarkLabel,
  transferLabel,
  averageLabel,
}: {
  index: number;
  student: RosterStudent;
  showVocational: boolean;
  hideIncomplete: boolean;
  remarkLabel: string;
  transferLabel: string;
  averageLabel: string;
}) {
  const hidden = (term: RosterTerm) => (hideIncomplete && term.incomplete ? "hidden" : "");
  return (
    <>
      <tr className={`${hidden(student.sem1)} ${student.sem1.incomplete ? "bg-[#fffde7]" : ""}`}>
        <td rowSpan={3} className="border border-[#333] px-1 py-1 text-center align-middle">
          {index + 1}
        </td>
        <td rowSpan={3} className="border border-[#333] bg-white px-2 py-1 text-left font-bold whitespace-nowrap text-black">
          {student.fullName}
          {student.transfer ? (
            <span className="ms-1 rounded bg-[#0288d1] px-1 text-[9px] font-normal text-white print:hidden">{transferLabel}</span>
          ) : null}
        </td>
        <td rowSpan={3} className="border border-[#333] text-center align-middle">
          {student.sex}
        </td>
        <td rowSpan={3} className="border border-[#333] text-center align-middle font-bold">
          {student.age}
        </td>
        <td className="border border-[#333] text-center font-bold">
          1<sup>st</sup>
        </td>
        <MarkCells term={student.sem1} showVocational={showVocational} />
        <td rowSpan={3} className="border border-[#333] text-center align-middle">
          <div className={`mx-auto flex h-[75px] items-center justify-center text-xs font-bold [writing-mode:vertical-lr] rotate-180 ${remarkClass[student.remark]}`}>
            {remarkLabel}
          </div>
        </td>
      </tr>
      <tr className={`${hidden(student.sem2)} ${student.sem2.incomplete ? "bg-[#fffde7]" : ""}`}>
        <td className="border border-[#333] text-center font-bold">
          2<sup>nd</sup>
        </td>
        <MarkCells term={student.sem2} showVocational={showVocational} />
      </tr>
      <tr className="bg-[#f0f7ff] font-bold">
        <td className="border border-[#333] text-center">{averageLabel}</td>
        {student.year.marks.map((mark, markIndex) => (
          <td key={markIndex} className="border border-[#333] text-center">
            {mark}
          </td>
        ))}
        {showVocational ? <td className="border border-[#333] text-center">{student.year.vocational}</td> : null}
        <td className="border border-[#333] text-center">{student.year.total}</td>
        <td className="border border-[#333] bg-white text-center">{student.year.average}</td>
        <td className="border border-[#333] bg-white text-center">{student.year.rank}</td>
      </tr>
    </>
  );
}

function SignBox({
  title,
  titleClass,
  teacher,
  homeroom,
  registrar,
  director,
  blank,
  seal,
}: {
  title: string;
  titleClass: string;
  teacher: string;
  homeroom: string;
  registrar: string;
  director: string;
  blank: string;
  seal: string;
}) {
  return (
    <div className="rounded-md border border-[#b0bec5] bg-[#fafafa] p-3">
      <div className={`mb-2 border-b border-dashed border-[#555] text-[11.5px] font-bold uppercase ${titleClass}`}>{title}</div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <small className="mb-3 block text-[#6c757d]">{homeroom}</small>
          <div className="border-t border-black pt-1 font-bold">{teacher}</div>
        </div>
        <div>
          <small className="mb-3 block text-[#6c757d]">{registrar}</small>
          <div className="border-t border-black pt-1">{blank}</div>
        </div>
        <div>
          <small className="mb-3 block text-[#6c757d]">{director}</small>
          <div className="border-t border-black pt-1">{seal}</div>
        </div>
      </div>
    </div>
  );
}
