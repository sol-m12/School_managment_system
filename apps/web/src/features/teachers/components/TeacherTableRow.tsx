import { memo, type ReactNode } from "react";
import { Eye, Lock, LockOpen, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { TeacherRow } from "../api/useTeachers";
import { formatMoney, formatYears, fullName, initialOf } from "../teacherFormat";

const cell = "border-b border-border bg-white px-[15px] py-2.5 align-middle text-[0.9rem] text-black";

const actionBase =
  "inline-flex cursor-pointer items-center gap-[5px] rounded-lg border border-transparent px-3 py-1.5 text-[0.8rem] leading-normal font-semibold no-underline transition-all duration-200";
const actionView = "bg-[#ecfeff] text-[#06b6d4] hover:bg-[#06b6d4] hover:text-white";
const actionEdit = "bg-[#fffbeb] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-white";
const actionDelete = "bg-[#fef2f2] text-[#ef4444] hover:bg-[#ef4444] hover:text-white";
// Legacy quirk: the block link only has the "btn-warning" class without ".btn", so it is a plain blue icon.
const actionBlock = "text-[#0d6efd] hover:text-[#0a58ca]";

function ActionButton({ label, className, onClick, children }: { label: string; className: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={cn(actionBase, className)}>
      {children}
    </button>
  );
}

type TeacherTableRowProps = {
  row: TeacherRow;
  academicYear: string;
  onView: (row: TeacherRow) => void;
  onEdit: (row: TeacherRow) => void;
  onToggle: (row: TeacherRow) => void;
  onDelete: (row: TeacherRow) => void;
};

export const TeacherTableRow = memo(function TeacherTableRow({ row, academicYear, onView, onEdit, onToggle, onDelete }: TeacherTableRowProps) {
  const { t } = useTranslation("admin");
  const barWidth = Math.min((row.loadHours / 24) * 100, 100);

  return (
    <tr>
      <td className={cn(cell, "pl-6")}>
        <div className="flex items-center">
          <div className="me-4 flex size-10 items-center justify-center rounded-[10px] bg-[#dbeafe] font-bold text-[#1e40af]">
            {initialOf(row.firstName)}
          </div>
          <div>
            <div className="font-bold">{fullName(row)}</div>
            <small className="text-[0.875em] text-[#6c757d]">{row.phoneNumber}</small>
          </div>
        </div>
      </td>
      <td className={cell}>
        <div className="font-semibold text-[#212529]">{row.jobTitle}</div>
        <small className="text-[0.875em] text-[#6c757d]">
          {t("teacherCategory")} {row.subjects || t("teacherUnset")}
        </small>
      </td>
      <td className={cell}>
        <span className="font-bold text-[#198754]">{t("teacherBirr", { amount: formatMoney(row.salary) })}</span>
      </td>
      <td className={cell}>
        <span className="font-semibold text-[#6c757d]">{t("teacherYears", { years: formatYears(row.experienceYears) })}</span>
      </td>
      <td className={cell}>
        <div className="mb-1 flex h-[5px] w-[100px] overflow-hidden rounded-md bg-[#e9ecef] text-xs" title={t("teacherLoadTooltip", { year: academicYear })}>
          <div className={cn("flex-none", row.loadHours > 24 ? "bg-[#dc3545]" : "bg-[#0d6efd]")} style={{ width: `${barWidth}%` }} />
        </div>
        <small className="text-[0.875em] font-bold">{t("teacherHours", { hours: row.loadHours })}</small>
      </td>
      <td className={cell}>{row.homeroom ?? <span className="text-[0.875em] text-[#6c757d]">{t("teacherNone")}</span>}</td>
      <td className={cell}>
        {row.isActive ? (
          <span className="inline-block rounded border border-[#a3cfbb] bg-[#d1e7dd] px-2 py-1 text-[0.8rem] leading-none font-semibold whitespace-nowrap text-[#198754]">
            {t("teacherActive")}
          </span>
        ) : (
          <span className="inline-block rounded border border-[#f1aeb5] bg-[#f8d7da] px-2 py-1 text-[0.8rem] leading-none font-semibold whitespace-nowrap text-[#dc3545]">
            {t("teacherInactive")}
          </span>
        )}
      </td>
      <td className={cn(cell, "text-center")}>
        <div className="flex justify-center gap-1">
          <ActionButton label={t("teacherActionView")} className={actionView} onClick={() => onView(row)}>
            <Eye aria-hidden="true" className="size-[1em]" />
          </ActionButton>
          <ActionButton label={t("teacherActionEdit")} className={actionEdit} onClick={() => onEdit(row)}>
            <Pencil aria-hidden="true" className="size-[1em]" />
          </ActionButton>
          {row.isActive ? (
            <ActionButton label={t("teacherActionBlock")} className={actionBlock} onClick={() => onToggle(row)}>
              <Lock aria-hidden="true" className="size-[1em]" />
            </ActionButton>
          ) : (
            <ActionButton label={t("teacherActionUnblock")} className={actionView} onClick={() => onToggle(row)}>
              <LockOpen aria-hidden="true" className="size-[1em]" />
            </ActionButton>
          )}
          <ActionButton label={t("teacherActionDelete")} className={actionDelete} onClick={() => onDelete(row)}>
            <Trash2 aria-hidden="true" className="size-[1em]" />
          </ActionButton>
        </div>
      </td>
    </tr>
  );
});
