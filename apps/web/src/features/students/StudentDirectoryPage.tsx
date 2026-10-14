import { ChartPie, Eye, Filter, GraduationCap, Layers, Mars, Pencil, RotateCcw, Trash2, TriangleAlert, UserPlus, Users, Venus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { hasSection, useStudentBoard } from "./useStudentBoard";
import { useDeleteStudent } from "./studentApi";

const field =
  "w-full rounded-md border border-[#ced4da] bg-white px-3 py-1.5 text-base text-[#212529] focus:border-[#86b7fe] focus:shadow-[0_0_0_0.25rem_rgba(13,110,253,0.25)] focus:outline-none";

export function StudentDirectoryPage() {
  const { t } = useTranslation(["admin", "errors", "common"]);
  const board = useStudentBoard();
  const remove = useDeleteStudent();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

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

  const { filters, setFilters, stats } = board;

  return (
    <div className="bg-[#f8fafc] px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="mb-1 text-2xl font-extrabold tracking-tight text-[#0f172a]">{t("admin:studentDirectoryTitle")}</h3>
          <p className="mb-0 text-sm text-[#6c757d]">{t("admin:studentDirectoryYearLine", { year: filters.year })}</p>
        </div>
        <Link to="/academics/students/new" className="inline-flex items-center gap-2 rounded-md bg-[#198754] px-4 py-2 text-sm font-bold text-white no-underline">
          <UserPlus aria-hidden="true" className="size-4" />
          {t("admin:studentAdd")}
        </Link>
      </div>
      {notice ? <Alert tone={notice.tone} className="mb-4">{notice.text}</Alert> : null}

      <section className="mb-8 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
        <h4 className="mb-4 flex items-center gap-2 border-b-2 border-[#f1f5f9] pb-2 text-[0.95rem] font-extrabold tracking-wide text-[#1d4ed8] uppercase">
          <ChartPie aria-hidden="true" className="size-4" />
          {t("admin:studentStatsOverall")}
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: t("admin:studentStatsTotal"), value: stats.total, icon: Users },
            { label: t("admin:male"), value: stats.male, icon: Mars },
            { label: t("admin:female"), value: stats.female, icon: Venus },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className="rounded-xl border border-[#bfdbfe] bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_100%)] p-4 text-[#1e3a8a]">
                <div className="mb-2 flex items-center justify-between text-sm font-bold">
                  <span>{card.label}</span>
                  <Icon aria-hidden="true" className="size-4" />
                </div>
                <p className="text-3xl font-black text-[#1d4ed8]">{card.value}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)]">
        <h4 className="mb-4 flex items-center gap-2 border-b-2 border-[#f1f5f9] pb-2 text-[0.95rem] font-extrabold tracking-wide text-[#15803d] uppercase">
          <Layers aria-hidden="true" className="size-4" />
          {t("admin:studentStatsGrades")}
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.grades.map((grade) => (
            <article key={grade.grade} className="rounded-xl border border-[#a7f3d0] bg-[#ecfdf5] p-4 text-[#065f46]">
              <div className="mb-2 flex items-center justify-between text-sm font-bold">
                <span>{t("admin:studentGradeCard", { grade: grade.grade })}</span>
                <GraduationCap aria-hidden="true" className="size-4" />
              </div>
              <p className="text-3xl font-black">{grade.total}</p>
              <p className="mt-2 flex gap-3 text-sm">
                <span>
                  {t("admin:studentMaleShort")} <b>{grade.male}</b>
                </span>
                <span>
                  {t("admin:studentFemaleShort")} <b>{grade.female}</b>
                </span>
              </p>
            </article>
          ))}
          <article className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4 text-[#92400e]">
            <div className="mb-2 flex items-center justify-between text-sm font-bold">
              <span>{t("admin:studentUnassignedCard")}</span>
              <TriangleAlert aria-hidden="true" className="size-4" />
            </div>
            <p className="text-3xl font-black">{stats.unassigned.total}</p>
            <p className="mt-2 flex gap-3 text-sm">
              <span>
                {t("admin:studentMaleShort")} <b>{stats.unassigned.male}</b>
              </span>
              <span>
                {t("admin:studentFemaleShort")} <b>{stats.unassigned.female}</b>
              </span>
            </p>
          </article>
        </div>
      </section>

      <form
        className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-[#e2e8f0] bg-white p-4 md:grid-cols-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="col-span-2 text-sm font-bold text-[#6c757d] md:col-span-2">
          {t("admin:studentSearchLabel")}
          <input
            className={`${field} mt-1`}
            value={filters.search}
            placeholder={t("admin:studentSearchPlaceholder")}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentYearLabel")}
          <select className={`${field} mt-1 font-bold text-[#0d6efd]`} value={filters.year} onChange={(event) => setFilters({ ...filters, year: event.target.value })}>
            {board.years.map((year) => (
              <option key={year} value={year}>
                {t("admin:studentYearOption", { year })}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentGradeLabel")}
          <select className={`${field} mt-1`} value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })}>
            <option value="">{t("admin:all")}</option>
            {board.grades.map((grade) => (
              <option key={grade} value={grade}>
                {t("admin:studentGradeOption", { grade })}
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
          {t("admin:studentSectionLabel")}
          <select className={`${field} mt-1`} value={filters.section} onChange={(event) => setFilters({ ...filters, section: event.target.value })}>
            <option value="">{t("admin:all")}</option>
            {board.sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 text-sm font-bold text-[#6c757d] md:col-span-3">
          {t("admin:studentAssignState")}
          <select
            className={`${field} mt-1`}
            value={filters.unassigned}
            onChange={(event) => setFilters({ ...filters, unassigned: event.target.value === "1" ? "1" : "0" })}
          >
            <option value="0">{t("admin:studentAllStudents")}</option>
            <option value="1">{t("admin:studentUnassignedOnly")}</option>
          </select>
        </label>
        <div className="col-span-2 flex items-end justify-end gap-2 md:col-span-3">
          <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-[#212529] px-4 py-2 text-sm font-bold text-white">
            <Filter aria-hidden="true" className="size-4" />
            {t("admin:apply")}
          </button>
          <button type="button" className="inline-flex items-center gap-1 rounded-md border border-[#6c757d] px-4 py-2 text-sm font-bold text-[#6c757d]" onClick={board.clear}>
            <RotateCcw aria-hidden="true" className="size-4" />
            {t("admin:studentClear")}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] px-4 py-3 font-bold">
          <span>{t("admin:studentTableTitle", { year: filters.year })}</span>
          <span className="rounded-md border bg-[#f8f9fa] px-3 py-2 text-sm font-normal text-[#212529]">
            {t("admin:studentFiltered", { count: board.filtered.length })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="mb-0 w-full text-sm">
            <thead className="bg-[#f8fafc] text-left text-[#475569]">
              <tr>
                <th className="px-3 py-3">{t("admin:studentIdCol")}</th>
                <th className="px-3 py-3">{t("admin:studentFullName")}</th>
                <th className="px-3 py-3">{t("admin:grade")}</th>
                <th className="px-3 py-3">{t("admin:studentStreamLabel")}</th>
                <th className="px-3 py-3">{t("admin:section")}</th>
                <th className="px-3 py-3">{t("admin:gender")}</th>
                <th className="px-3 py-3">{t("admin:studentYearLabel")}</th>
                <th className="px-3 py-3">{t("admin:studentActions")}</th>
              </tr>
            </thead>
            <tbody>
              {board.filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center font-semibold text-[#6c757d]">
                    {t("admin:studentEmptyYear", { year: filters.year })}
                  </td>
                </tr>
              ) : (
                board.filtered.map((row) => (
                  <tr key={row.id} className="border-t border-[#e2e8f0]">
                    <td className="px-3 py-3 font-bold text-[#6c757d]">#{row.id}</td>
                    <td className="px-3 py-3 font-bold text-[#212529]">
                      <span className="me-2 inline-flex size-8 items-center justify-center rounded-full bg-[#0d6efd] text-sm text-white">
                        {row.fullName.slice(0, 1)}
                      </span>
                      {row.fullName}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-md border border-[#dbeafe] bg-[#eff6ff] px-2 py-1 font-semibold text-[#1d4ed8]">
                        {t("admin:studentGradeOption", { grade: row.gradeLevel })}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {row.stream ? (
                        <span className="rounded-md border border-[#e9d5ff] bg-[#f3e8ff] px-2 py-1 font-semibold text-[#7e22ce]">{row.stream}</span>
                      ) : (
                        <span className="text-[#6c757d]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {hasSection(row.section) ? (
                        <span className="rounded-md border border-[#dcfce7] bg-[#f0fdf4] px-2 py-1 font-semibold text-[#15803d]">
                          {t("admin:studentSectionBadge", { section: row.section })}
                        </span>
                      ) : (
                        <span className="rounded-md border border-[#fde68a] bg-[#fef3c7] px-2 py-1 font-semibold text-[#d97706]">
                          {t("admin:studentNotAssigned")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">{row.gender === "M" ? t("admin:studentMale") : t("admin:studentFemale")}</td>
                    <td className="px-3 py-3 font-semibold">{t("admin:studentYearOption", { year: row.academicYear })}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Link to={`/academics/students/${row.id}`} title={t("admin:studentView")} className="text-[#0d6efd]">
                          <Eye aria-hidden="true" className="size-4" />
                        </Link>
                        <Link to={`/academics/students/${row.id}/edit`} title={t("admin:studentEdit")} className="text-[#198754]">
                          <Pencil aria-hidden="true" className="size-4" />
                        </Link>
                        <button
                          type="button"
                          title={t("admin:studentDelete")}
                          className="text-[#dc3545]"
                          onClick={() => {
                            if (!window.confirm(t("admin:studentDeleteConfirm"))) return;
                            remove.mutate(row.id, {
                              onSuccess: () => setNotice({ tone: "success", text: t("admin:studentDeleted") }),
                              onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                            });
                          }}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
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
