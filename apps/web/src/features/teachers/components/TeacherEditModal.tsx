import { useId, useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { TeacherGender, TeacherRow, TeacherUpdateBody } from "../api/useTeachers";
import { LegacyModal } from "./LegacyModal";

const labelClass = "mb-2 inline-block text-[0.875em] font-bold";
const fieldClass =
  "block w-full rounded-md border border-[#dee2e6] bg-white px-3 py-1.5 text-base leading-normal text-[#212529] focus:border-[#86b7fe] focus:shadow-[0_0_0_0.25rem_rgba(13,110,253,0.25)] focus:outline-none";

type TeacherEditModalProps = {
  teacher: TeacherRow | null;
  onClose: () => void;
  onSubmit: (id: number, body: TeacherUpdateBody) => void;
};

function toGender(value: string | null): TeacherGender | "" {
  return value === "Male" || value === "Female" ? value : "";
}

function Form({ teacher, formId, onSubmit }: { teacher: TeacherRow; formId: string; onSubmit: TeacherEditModalProps["onSubmit"] }) {
  const { t } = useTranslation("admin");
  const [firstName, setFirstName] = useState(teacher.firstName);
  const [lastName, setLastName] = useState(teacher.lastName);
  const [phone, setPhone] = useState(teacher.phoneNumber ?? "");
  const [gender, setGender] = useState<TeacherGender | "">(toGender(teacher.gender));
  const [job, setJob] = useState(teacher.jobTitle);
  const [salary, setSalary] = useState(teacher.salary.toFixed(2));
  const [experience, setExperience] = useState(teacher.experienceYears.toFixed(2));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(teacher.id, {
      firstName,
      lastName,
      phoneNumber: phone,
      gender: gender === "" ? null : gender,
      jobTitle: job,
      salary: Number(salary),
      experienceYears: Number(experience),
    });
  };

  return (
    <form id={formId} onSubmit={submit} className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2">
      <div>
        <label htmlFor={`${formId}-first`} className={labelClass}>
          {t("teacherFirstName")}
        </label>
        <input id={`${formId}-first`} value={firstName} onChange={(event) => setFirstName(event.target.value)} className={fieldClass} required />
      </div>
      <div>
        <label htmlFor={`${formId}-last`} className={labelClass}>
          {t("teacherLastName")}
        </label>
        <input id={`${formId}-last`} value={lastName} onChange={(event) => setLastName(event.target.value)} className={fieldClass} required />
      </div>
      <div>
        <label htmlFor={`${formId}-phone`} className={labelClass}>
          {t("teacherPhone")}
        </label>
        <input id={`${formId}-phone`} value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} required />
      </div>
      <div>
        <label htmlFor={`${formId}-gender`} className={labelClass}>
          {t("teacherGender")}
        </label>
        <div className="relative">
          <select
            id={`${formId}-gender`}
            value={gender}
            onChange={(event) => setGender(toGender(event.target.value))}
            className={cn(fieldClass, "appearance-none pr-9")}
          >
            {gender === "" ? <option value="" hidden /> : null}
            <option value="Male">{t("teacherGenderMale")}</option>
            <option value="Female">{t("teacherGenderFemale")}</option>
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#343a40]" />
        </div>
      </div>
      <div className="min-[768px]:col-span-2">
        <label htmlFor={`${formId}-job`} className={labelClass}>
          {t("teacherJob")}
        </label>
        <input id={`${formId}-job`} value={job} onChange={(event) => setJob(event.target.value)} className={fieldClass} required />
      </div>
      <div>
        <label htmlFor={`${formId}-salary`} className={labelClass}>
          {t("teacherSalary")}
        </label>
        <input
          id={`${formId}-salary`}
          type="number"
          step="0.01"
          value={salary}
          onChange={(event) => setSalary(event.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor={`${formId}-experience`} className={labelClass}>
          {t("teacherExperience")}
        </label>
        <input
          id={`${formId}-experience`}
          type="number"
          step="0.1"
          value={experience}
          onChange={(event) => setExperience(event.target.value)}
          className={fieldClass}
          required
        />
      </div>
    </form>
  );
}

/** Legacy "መረጃ ማስተካከያ" modal: yellow header, rounded-pill yellow Update button. */
export function TeacherEditModal({ teacher, onClose, onSubmit }: TeacherEditModalProps) {
  const { t } = useTranslation("admin");
  const formId = useId();

  return (
    <LegacyModal
      open={teacher !== null}
      onClose={onClose}
      title={t("teacherEditTitle")}
      headerClassName="bg-[#ffc107] text-[#212529]"
      footer={
        <button
          type="submit"
          form={formId}
          className="rounded-full border border-[#ffc107] bg-[#ffc107] px-6 py-1.5 text-base font-bold text-black hover:border-[#ffca2c] hover:bg-[#ffca2c]"
        >
          {t("teacherUpdate")}
        </button>
      }
    >
      {teacher ? <Form key={teacher.id} teacher={teacher} formId={formId} onSubmit={onSubmit} /> : null}
    </LegacyModal>
  );
}
