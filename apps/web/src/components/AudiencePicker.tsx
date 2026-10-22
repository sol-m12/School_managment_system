import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Select } from "@/components/ui";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type AudienceOptions = {
  groups: { key: string; labelKey: string }[];
  students: { id: number; label: string }[];
  teachers: { id: number; label: string }[];
  staff: { id: number; label: string }[];
};

export type AudiencePickValue = {
  audienceKey: string;
  personId?: number;
};

function isPersonKey(key: string): boolean {
  return key === "student" || key === "teacher" || key === "staff";
}

export function useAudienceOptions(path: string): UseQueryResult<AudienceOptions> {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: ["audience-options", tenantId, path],
    queryFn: async () => (await api.get<AudienceOptions>(path)).data,
  });
}

type Props = {
  options: AudienceOptions | undefined;
  isError?: boolean;
  value?: AudiencePickValue;
  onChange?: (value: AudiencePickValue) => void;
  /** When true, fields are uncontrolled via form names audienceKey / personId */
  formMode?: boolean;
  label?: string;
};

export function AudiencePicker({ options, isError, value, onChange, formMode = true, label }: Props) {
  const { t } = useTranslation("common");
  const [internalKey, setInternalKey] = useState(value?.audienceKey ?? "All");
  const audienceKey = value?.audienceKey ?? internalKey;

  const personOptions = useMemo(() => {
    if (!options) return [];
    if (audienceKey === "student") return options.students.map((row) => ({ value: String(row.id), label: row.label }));
    if (audienceKey === "teacher") return options.teachers.map((row) => ({ value: String(row.id), label: row.label }));
    if (audienceKey === "staff") return options.staff.map((row) => ({ value: String(row.id), label: row.label }));
    return [];
  }, [audienceKey, options]);

  const needsPerson = isPersonKey(audienceKey);
  const groupOptions = [
    ...(options?.groups.map((row) => ({ value: row.key, label: t(row.labelKey as "audienceAll") })) ?? []),
    { value: "student", label: t("audienceOneStudent") },
    { value: "teacher", label: t("audienceOneTeacher") },
    { value: "staff", label: t("audienceOneStaff") },
  ];

  function setKey(next: string) {
    setInternalKey(next);
    onChange?.({ audienceKey: next, personId: undefined });
  }

  return (
    <>
      <Select
        name={formMode ? "audienceKey" : undefined}
        label={label ?? t("audience")}
        options={groupOptions}
        value={audienceKey}
        onChange={(event) => setKey(event.target.value)}
        required
      />
      {needsPerson ? (
        personOptions.length === 0 || isError ? (
          <div className="md:col-span-2 rounded-control border border-border bg-surface px-3 py-3 text-sm">
            <p className="font-semibold">
              {t(audienceKey === "student" ? "noStudents" : audienceKey === "teacher" ? "noTeachers" : "noStaff")}
            </p>
            <p className="mt-1 text-ink-muted">
              {t(audienceKey === "student" ? "noStudentsHelp" : audienceKey === "teacher" ? "noTeachersHelp" : "noStaffHelp")}{" "}
              <Link
                className="font-semibold text-brand-700"
                to={audienceKey === "student" ? "/academics/students" : "/system/staff-registration"}
              >
                {t(audienceKey === "student" ? "goStudents" : "goStaff")}
              </Link>
            </p>
          </div>
        ) : (
          <Select
            name={formMode ? "personId" : undefined}
            label={t(audienceKey === "student" ? "pickStudent" : audienceKey === "teacher" ? "pickTeacher" : "pickStaff")}
            placeholder={t("choose")}
            options={personOptions}
            value={value?.personId != null ? String(value.personId) : undefined}
            onChange={(event) => {
              const personId = Number(event.target.value);
              onChange?.({ audienceKey, personId: Number.isInteger(personId) ? personId : undefined });
            }}
            required
          />
        )
      ) : null}
    </>
  );
}

export function readAudiencePick(form: FormData | HTMLFormElement): AudiencePickValue | null {
  const data = form instanceof FormData ? form : new FormData(form);
  const audienceKey = String(data.get("audienceKey") ?? "");
  if (!audienceKey) return null;
  const personRaw = String(data.get("personId") ?? "");
  const personId = personRaw ? Number(personRaw) : undefined;
  if (isPersonKey(audienceKey) && (!personId || !Number.isInteger(personId))) return null;
  return { audienceKey, personId: isPersonKey(audienceKey) ? personId : undefined };
}

export function audiencePickBlocked(options: AudienceOptions | undefined, audienceKey: string): boolean {
  if (!isPersonKey(audienceKey) || !options) return false;
  if (audienceKey === "student") return options.students.length === 0;
  if (audienceKey === "teacher") return options.teachers.length === 0;
  return options.staff.length === 0;
}
