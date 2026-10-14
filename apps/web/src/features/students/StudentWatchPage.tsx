import { useTranslation } from "react-i18next";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useStudentBoard } from "./useStudentBoard";

const field =
  "w-full rounded-md border border-[#ced4da] bg-white px-3 py-1.5 text-base text-[#212529] focus:border-[#86b7fe] focus:outline-none";

export function StudentWatchPage() {
  const { t } = useTranslation(["admin", "errors", "common"]);
  const board = useStudentBoard();

  if (board.query.isPending || !board.ready) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }

  if (board.query.isError) {
    return <Alert tone="danger">{t(`errors:${toErrorKey(board.query.error)}`)}</Alert>;
  }

  const { filters, setFilters } = board;

  return (
    <div className="bg-[#f8fafc] px-4 py-6 sm:px-8">
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <h3 className="mb-3 text-xl font-extrabold text-[#0f172a]">{t("admin:studentWatchAll")}</h3>
        <form className="grid grid-cols-2 gap-3 md:grid-cols-5" onSubmit={(event) => event.preventDefault()}>
          <label className="text-sm font-bold text-[#6c757d]">
            {t("admin:studentSearchLabel")}
            <input className={`${field} mt-1`} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          </label>
          <label className="text-sm font-bold text-[#6c757d]">
            {t("admin:studentYearLabel")}
            <select className={`${field} mt-1`} value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })}>
              {board.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-[#6c757d]">
            {t("admin:grade")}
            <select className={`${field} mt-1`} value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })}>
              <option value="">{t("admin:all")}</option>
              {board.grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-[#6c757d]">
            {t("admin:studentStreamLabel")}
            <select className={`${field} mt-1`} value={filters.stream} onChange={(event) => setFilters({ ...filters, stream: event.target.value })}>
              <option value="">{t("admin:all")}</option>
              {board.streams.map((stream) => (
                <option key={stream} value={stream}>
                  {stream}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-[#6c757d]">
            {t("admin:type")}
            <select
              className={`${field} mt-1`}
              value={filters.registrationType}
              onChange={(event) => setFilters({ ...filters, registrationType: event.target.value })}
            >
              <option value="">{t("admin:all")}</option>
              {board.registrationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="mb-0 w-full text-sm">
            <thead className="border-b-2 border-[#e2e8f0] bg-[#f8fafc] text-left text-xs font-bold tracking-wide text-[#475569] uppercase">
              <tr>
                <th className="px-4 py-4">{t("admin:studentPerson")}</th>
                <th className="px-4 py-4">{t("admin:studentGenderAge")}</th>
                <th className="px-4 py-4">{t("admin:studentClassSection")}</th>
                <th className="px-4 py-4">{t("admin:studentStreamCol")}</th>
                <th className="px-4 py-4">{t("admin:studentRegType")}</th>
                <th className="px-4 py-4">{t("admin:status")}</th>
              </tr>
            </thead>
            <tbody>
              {board.filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center font-bold text-[#6c757d]">
                    {t("admin:studentWatchEmpty")}
                  </td>
                </tr>
              ) : (
                board.filtered.map((row) => (
                  <tr key={row.id} className="border-t border-[#e2e8f0] text-[#1e293b]">
                    <td className="px-4 py-3">
                      <div className="font-bold">{row.fullName}</div>
                      <div className="text-xs text-[#6c757d]">{t("admin:studentIdLine", { id: row.id })}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="me-1 rounded border bg-[#f8f9fa] px-2 py-0.5">{row.gender}</span>
                      <span className="text-xs text-[#6c757d]">{t("admin:studentAgeYears", { age: row.age })}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0d6efd]">
                      {t("admin:studentClassLine", { grade: row.gradeLevel, section: row.section || "-" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded border border-[#cff4fc] bg-[#cff4fc] px-2 py-1 text-[#055160]">{row.stream || "Common"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded border bg-[#e2e3e5] px-2 py-1">{row.registrationType || "መደበኛ"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.isActive === 1 ? (
                        <span className="rounded-full border border-[#d1e7dd] bg-[#d1e7dd] px-3 py-1 text-[#0f5132]">Active</span>
                      ) : (
                        <span className="rounded-full border border-[#f8d7da] bg-[#f8d7da] px-3 py-1 text-[#842029]">Inactive</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
