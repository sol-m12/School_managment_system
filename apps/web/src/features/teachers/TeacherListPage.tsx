import { useCallback, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { cn } from "@/lib/cn";
import { useDeleteTeacher, useTeachers, useToggleTeacherStatus, useUpdateTeacher, type TeacherRow, type TeacherUpdateBody } from "./api/useTeachers";
import { TeacherEditModal } from "./components/TeacherEditModal";
import { TeacherModuleBar } from "./components/TeacherModuleBar";
import { TeacherTableRow } from "./components/TeacherTableRow";
import { TeacherViewModal } from "./components/TeacherViewModal";
import { formatMoney, formatYears, fullName } from "./teacherFormat";

type Notice = { tone: "success" | "warning" | "danger"; text: string };

// Bootstrap alert colors used by the legacy flash message.
const noticeClass: Record<Notice["tone"], string> = {
  success: "border-[#badbcc] bg-[#d1e7dd] text-[#0f5132]",
  warning: "border-[#ffecb5] bg-[#fff3cd] text-[#664d03]",
  danger: "border-[#f5c2c7] bg-[#f8d7da] text-[#842029]",
};

const headCell = "border-b-2 border-b-white bg-brand-900 px-[15px] py-[11px] text-left text-[0.9rem] font-semibold text-white";

export function TeacherListPage() {
  const { t } = useTranslation(["admin", "errors", "common"]);
  const query = useTeachers();
  const { mutate: updateTeacher } = useUpdateTeacher();
  const { mutate: toggleStatus } = useToggleTeacherStatus();
  const { mutate: deleteTeacher } = useDeleteTeacher();

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [viewing, setViewing] = useState<TeacherRow | null>(null);
  const [editing, setEditing] = useState<TeacherRow | null>(null);

  const academicYear = query.data?.academicYear ?? "";

  // The legacy search matches the text of the whole row.
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const all = query.data?.rows ?? [];
    if (!needle) return all;
    return all.filter((row) => {
      const text = [
        fullName(row),
        row.phoneNumber,
        row.jobTitle,
        row.subjects,
        formatMoney(row.salary),
        formatYears(row.experienceYears),
        `${row.loadHours}/24 hr`,
        row.homeroom,
        row.isActive ? t("admin:teacherActive") : t("admin:teacherInactive"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(needle);
    });
  }, [query.data?.rows, search, t]);

  const showError = useCallback(
    (error: unknown) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
    [t],
  );

  const onView = useCallback((row: TeacherRow) => setViewing(row), []);
  const onEdit = useCallback((row: TeacherRow) => setEditing(row), []);

  const onToggle = useCallback(
    (row: TeacherRow) => {
      const message = row.isActive ? t("admin:teacherBlockConfirm") : t("admin:teacherUnblockConfirm");
      if (!window.confirm(message)) return;
      toggleStatus(
        { id: row.id, isActive: row.isActive },
        {
          onSuccess: (data) =>
            setNotice({
              tone: data.isActive ? "success" : "warning",
              text: t(data.isActive ? "admin:teacherActivated" : "admin:teacherDeactivated", { name: data.firstName }),
            }),
          onError: showError,
        },
      );
    },
    [toggleStatus, showError, t],
  );

  const onDelete = useCallback(
    (row: TeacherRow) => {
      if (!window.confirm(t("admin:teacherDeleteConfirm"))) return;
      deleteTeacher(row.id, {
        onSuccess: (data) => setNotice({ tone: "success", text: t("admin:teacherDeleted", { name: data.name }) }),
        onError: (error) => {
          const key = toErrorKey(error);
          setNotice({ tone: "danger", text: key === "notFound" ? t("admin:teacherDeleteNotFound") : t(`errors:${key}`) });
        },
      });
    },
    [deleteTeacher, t],
  );

  const onSaveEdit = useCallback(
    (id: number, body: TeacherUpdateBody) => {
      updateTeacher(
        { id, body },
        {
          onSuccess: (data) => {
            setEditing(null);
            setNotice({ tone: "success", text: t("admin:teacherUpdated", { name: data.firstName }) });
          },
          onError: (error) => {
            setEditing(null);
            showError(error);
          },
        },
      );
    },
    [updateTeacher, showError, t],
  );

  return (
    <div className="px-3 py-4">
      <TeacherModuleBar />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="m-0 text-[calc(1.3rem+0.6vw)] leading-[1.2] font-bold text-[#212529] min-[1200px]:text-[1.75rem]">
            {t("admin:teachersTitle")}
          </h3>
          <p className="m-0 text-[0.875em] text-[#6c757d]">
            {t("admin:teacherSummary", { count: query.data?.total ?? 0 })}{" "}
            <span className="font-bold text-[#0d6efd]">{academicYear}</span>
          </p>
        </div>
      </div>

      <div className="relative mb-6 rounded-lg border border-border bg-white p-4 shadow-[0_0.125rem_0.25rem_rgba(0,0,0,0.075)]">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-8 size-4 -translate-y-1/2 text-[#6c757d]" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("admin:teacherSearch")}
          aria-label={t("admin:teacherSearch")}
          className="block w-full rounded-md border border-[#dee2e6] bg-white py-1.5 pr-3 pl-12 text-base leading-normal text-[#212529] placeholder:text-[rgba(33,37,41,0.75)] focus:border-[#86b7fe] focus:shadow-[0_0_0_0.25rem_rgba(13,110,253,0.25)] focus:outline-none"
        />
      </div>

      {notice ? (
        <div
          role={notice.tone === "danger" ? "alert" : "status"}
          className={cn("relative mb-6 rounded-lg border p-4 pr-14 shadow-[0_0.125rem_0.25rem_rgba(0,0,0,0.075)]", noticeClass[notice.tone])}
        >
          {notice.text}
          <button
            type="button"
            aria-label={t("common:close")}
            onClick={() => setNotice(null)}
            className="absolute top-0 right-0 p-4 opacity-50 hover:opacity-75"
          >
            <X aria-hidden="true" className="size-4" strokeWidth={3} />
          </button>
        </div>
      ) : null}

      {query.isPending ? (
        <div className="flex justify-center py-10 text-brand-700">
          <Spinner size="lg" label={t("common:loading")} />
        </div>
      ) : null}
      {query.isError ? (
        <div role="alert" className={cn("mb-6 rounded-lg border p-4", noticeClass.danger)}>
          {t(`errors:${toErrorKey(query.error)}`)}
        </div>
      ) : null}

      {query.data ? (
        <div className="mb-6 rounded-lg border border-border bg-white shadow-[0_0.125rem_0.25rem_rgba(0,0,0,0.075)]">
          <div className="rounded-t-[7px] border-b border-white/10 bg-brand-900 px-[18px] py-3 text-[0.95rem] font-semibold text-white">
            {t("admin:teacherTableTitle")}
          </div>
          <div className="overflow-x-auto">
            <table className="mb-0 w-full border-collapse bg-white align-middle">
              <thead>
                <tr>
                  <th scope="col" className={cn(headCell, "pl-6")}>
                    {t("admin:teacherColTeacher")}
                  </th>
                  <th scope="col" className={headCell}>
                    {t("admin:teacherColRole")}
                  </th>
                  <th scope="col" className={headCell}>
                    {t("admin:teacherColSalary")}
                  </th>
                  <th scope="col" className={headCell}>
                    {t("admin:teacherColExperience")}
                  </th>
                  <th scope="col" className={headCell}>
                    {t("admin:teacherColLoad", { year: academicYear })}
                  </th>
                  <th scope="col" className={headCell}>
                    {t("admin:teacherColHomeroom")}
                  </th>
                  <th scope="col" className={headCell}>
                    {t("admin:teacherColStatus")}
                  </th>
                  <th scope="col" className={cn(headCell, "text-center")}>
                    {t("admin:teacherColActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <TeacherTableRow
                    key={row.id}
                    row={row}
                    academicYear={academicYear}
                    onView={onView}
                    onEdit={onEdit}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <TeacherViewModal teacher={viewing} academicYear={academicYear} onClose={() => setViewing(null)} />
      <TeacherEditModal teacher={editing} onClose={() => setEditing(null)} onSubmit={onSaveEdit} />
    </div>
  );
}
