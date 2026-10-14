import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { REGISTRATION_TYPES, useSaveStudent, useStudentDetail, type StudentFormBody } from "./studentApi";

const field =
  "mt-1 w-full rounded-md border border-[#ced4da] bg-white px-3 py-2 text-[#212529] focus:border-[#86b7fe] focus:outline-none";

export function StudentFormPage() {
  const { t } = useTranslation(["admin", "errors", "common"]);
  const navigate = useNavigate();
  const params = useParams();
  const id = params.studentId ? Number(params.studentId) : null;
  const detail = useStudentDetail(id);
  const save = useSaveStudent(id);
  const [notice, setNotice] = useState<string | null>(null);
  const student = detail.data;

  if (id && detail.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (id && (detail.isError || !student)) {
    return <Alert tone="danger">{t("admin:studentMissing")}</Alert>;
  }

  const streamValue = student?.stream === "Natural" || student?.stream === "Social" ? student.stream : "Common";

  return (
    <div className="bg-[#f8fafc] px-4 py-6 sm:px-8">
      <h3 className="mb-4 text-2xl font-extrabold text-[#0f172a]">{id ? t("admin:studentEditTitle") : t("admin:studentAdd")}</h3>
      {notice ? <Alert tone="danger" className="mb-4">{notice}</Alert> : null}
      <form
        key={student?.id ?? "new"}
        className="grid max-w-3xl gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-2"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const gradeLevel = Number(form.get("gradeLevel"));
          const stream = String(form.get("stream") ?? "Common") as StudentFormBody["stream"];
          const body: StudentFormBody = {
            fullName: String(form.get("fullName") ?? "").trim(),
            gender: form.get("gender") === "F" ? "F" : "M",
            age: Number(form.get("age")),
            gradeLevel,
            stream: gradeLevel >= 11 ? stream : null,
            registrationType: String(form.get("registrationType")) as StudentFormBody["registrationType"],
            previousSchool: String(form.get("previousSchool") ?? ""),
            kebele: String(form.get("kebele") ?? ""),
            gote: String(form.get("gote") ?? ""),
            houseNumber: String(form.get("houseNumber") ?? ""),
            isTransfer: form.get("isTransfer") === "on",
            academicYear: String(form.get("academicYear") ?? "") || undefined,
          };
          save.mutate(body, {
            onSuccess: (saved) => {
              if (!id) {
                window.alert(t("admin:studentCreated"));
              } else {
                window.alert(t("admin:studentUpdated"));
              }
              void navigate(`/academics/students/${saved.id}`);
            },
            onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)),
          });
        }}
      >
        <label className="text-sm font-bold text-[#6c757d] md:col-span-2">
          {t("admin:studentFullName")}
          <input className={field} name="fullName" required defaultValue={student?.fullName ?? ""} />
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentGradeLabel")}
          <select className={field} name="gradeLevel" defaultValue={student?.gradeLevel ?? 9}>
            {[9, 10, 11, 12].map((grade) => (
              <option key={grade} value={grade}>
                {t("admin:studentGradeOption", { grade })}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:gender")}
          <select className={field} name="gender" defaultValue={student?.gender ?? "M"}>
            <option value="M">{t("admin:studentMaleOption")}</option>
            <option value="F">{t("admin:studentFemaleOption")}</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentAge")}
          <input className={field} name="age" type="number" min={1} required defaultValue={student?.age ?? ""} />
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentRegType")}
          <select className={field} name="registrationType" required defaultValue={student?.registrationType ?? "አዲስ"}>
            {REGISTRATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentStreamLabel")}
          <select className={field} name="stream" defaultValue={streamValue}>
            <option value="Common">{t("admin:streamCommon")}</option>
            <option value="Natural">{t("admin:streamNatural")}</option>
            <option value="Social">{t("admin:streamSocial")}</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentYearLabel")}
          <input className={field} name="academicYear" defaultValue={student?.academicYear ?? ""} maxLength={10} />
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentPreviousSchool")}
          <input className={field} name="previousSchool" defaultValue={student?.previousSchool ?? ""} />
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentKebele")}
          <input className={field} name="kebele" defaultValue={student?.kebele ?? ""} />
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentGote")}
          <input className={field} name="gote" defaultValue={student?.gote ?? ""} />
        </label>
        <label className="text-sm font-bold text-[#6c757d]">
          {t("admin:studentHouse")}
          <input className={field} name="houseNumber" defaultValue={student?.houseNumber ?? ""} />
        </label>
        {id ? null : (
          <label className="flex items-center gap-2 text-sm font-bold text-[#212529] md:col-span-2">
            <input name="isTransfer" type="checkbox" />
            {t("admin:studentTransfer")}
          </label>
        )}
        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className="rounded-md bg-[#0d6efd] px-4 py-2 font-bold text-white" disabled={save.isPending}>
            {id ? t("admin:studentUpdate") : t("admin:studentSave")}
          </button>
          <Link to={id ? `/academics/students/${id}` : "/academics/students/directory"} className="rounded-md border px-4 py-2 font-bold text-[#6c757d] no-underline">
            {t("admin:studentBack")}
          </Link>
        </div>
      </form>
    </div>
  );
}
