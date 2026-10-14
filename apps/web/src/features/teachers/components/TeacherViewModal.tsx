import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TeacherRow } from "../api/useTeachers";
import { formatMoney, formatYears, fullName, initialOf } from "../teacherFormat";
import { LegacyModal } from "./LegacyModal";

type TeacherViewModalProps = {
  teacher: TeacherRow | null;
  academicYear: string;
  onClose: () => void;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[0.875em] text-[#6c757d]">{label}</div>
      <div className="font-semibold text-black">{children}</div>
    </div>
  );
}

/**
 * Legacy "የመምህር ሙሉ መረጃ" modal (cyan header). The legacy script that fills its body is not in the
 * legacy copy, so it lists the same data as the table plus gender. See docs/backlog.md.
 */
export function TeacherViewModal({ teacher, academicYear, onClose }: TeacherViewModalProps) {
  const { t } = useTranslation("admin");

  return (
    <LegacyModal
      open={teacher !== null}
      onClose={onClose}
      title={t("teacherViewTitle")}
      headerClassName="bg-[#0dcaf0] text-white"
      closeWhite
      wide
    >
      {teacher ? (
        <div>
          <div className="mb-4 flex items-center">
            <div className="me-4 flex size-10 items-center justify-center rounded-[10px] bg-[#dbeafe] font-bold text-[#1e40af]">
              {initialOf(teacher.firstName)}
            </div>
            <div className="text-xl font-bold text-black">{fullName(teacher)}</div>
          </div>
          <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2">
            <Field label={t("teacherPhone")}>{teacher.phoneNumber ?? ""}</Field>
            <Field label={t("teacherGender")}>{teacher.gender ?? ""}</Field>
            <Field label={t("teacherJob")}>{teacher.jobTitle}</Field>
            <Field label={t("teacherCategory")}>{teacher.subjects || t("teacherUnset")}</Field>
            <Field label={t("teacherColSalary")}>{t("teacherBirr", { amount: formatMoney(teacher.salary) })}</Field>
            <Field label={t("teacherColExperience")}>{t("teacherYears", { years: formatYears(teacher.experienceYears) })}</Field>
            <Field label={t("teacherColLoad", { year: academicYear })}>{t("teacherHours", { hours: teacher.loadHours })}</Field>
            <Field label={t("teacherColHomeroom")}>{teacher.homeroom ?? t("teacherNone")}</Field>
            <Field label={t("teacherColStatus")}>{teacher.isActive ? t("teacherActive") : t("teacherInactive")}</Field>
          </div>
        </div>
      ) : null}
    </LegacyModal>
  );
}
