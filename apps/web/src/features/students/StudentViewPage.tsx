import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { toErrorKey } from "@/lib/apiError";
import { useDeleteStudent, useStudentDetail } from "./studentApi";

export function StudentViewPage() {
  const { t } = useTranslation(["admin", "errors", "common"]);
  const navigate = useNavigate();
  const params = useParams();
  const id = Number(params.studentId);
  const detail = useStudentDetail(Number.isFinite(id) ? id : null);
  const remove = useDeleteStudent();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const student = detail.data;

  useEffect(() => {
    if (!student?.photo) return;
    let url = "";
    let cancel = false;
    void api
      .get(`/admin/students/${student.id}/photo`, { responseType: "blob" })
      .then((response) => {
        if (cancel) return;
        url = URL.createObjectURL(response.data);
        setPhotoUrl(url);
      })
      .catch(() => setPhotoUrl(null));
    return () => {
      cancel = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [student?.id, student?.photo]);

  if (detail.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (detail.isError || !student) return <Alert tone="danger">{t("admin:studentMissing")}</Alert>;

  const section = student.section?.trim() ? t("admin:studentSectionBadge", { section: student.section }) : t("admin:studentNotAssigned");

  return (
    <div className="bg-[#f8fafc] px-4 py-6 sm:px-8">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link to="/academics/students/directory" className="rounded-md border px-3 py-2 text-sm font-bold text-[#0d6efd] no-underline">
          {t("admin:studentBackToList")}
        </Link>
        <Link to={`/academics/students/${student.id}/edit`} className="rounded-md bg-[#0d6efd] px-3 py-2 text-sm font-bold text-white no-underline">
          {t("admin:studentEditData")}
        </Link>
        <button
          type="button"
          className="rounded-md bg-[#dc3545] px-3 py-2 text-sm font-bold text-white"
          onClick={() => {
            if (!window.confirm(t("admin:studentDeleteConfirm"))) return;
            remove.mutate(student.id, {
              onSuccess: () => {
                window.alert(t("admin:studentDeleted"));
                void navigate("/academics/students/directory");
              },
              onError: (error) => window.alert(t(`errors:${toErrorKey(error)}`)),
            });
          }}
        >
          {t("admin:studentDeletePerson")}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl bg-white p-5 text-center shadow-sm">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="mx-auto mb-3 size-36 rounded-full object-cover" />
          ) : (
            <div className="mx-auto mb-3 flex size-36 items-center justify-center rounded-full bg-[#0d6efd] text-4xl font-bold text-white">
              {student.fullName.slice(0, 1)}
            </div>
          )}
          <h2 className="text-xl font-extrabold">{student.fullName}</h2>
          <p className="text-sm text-[#6c757d]">Student ID: #{student.id}</p>
          <p className="mt-2 font-bold">
            {t("admin:studentGradeOption", { grade: student.gradeLevel })} · {section}
          </p>
          <p className="mt-2 text-sm">{student.isActive ? t("admin:studentActive") : t("admin:studentInactive")}</p>
          <p className="text-sm text-[#6c757d]">{student.username ?? t("admin:studentNoUser")}</p>
        </aside>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-extrabold text-[#1a237e]">{t("admin:studentPersonal")}</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              [t("admin:studentFullName"), student.fullName],
              [t("admin:gender"), student.gender === "M" ? t("admin:studentMale") : t("admin:studentFemale")],
              [t("admin:studentYearLabel"), student.academicYear],
              [t("admin:studentRegType"), student.registrationType ?? t("admin:studentRegular")],
              [t("admin:studentClassSection"), `${student.gradeLevel} - ${section}`],
              [t("admin:studentStreamLabel"), student.stream || t("admin:streamCommon")],
              [t("admin:studentKebeleGote"), `${student.kebele || "---"} / ${student.gote || "---"}`],
              [t("admin:studentPreviousSchool"), student.previousSchool || t("admin:studentNone")],
              [t("admin:studentHouse"), student.houseNumber || "---"],
              [t("admin:studentAge"), String(student.age)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-bold text-[#6c757d]">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 mb-3 font-extrabold text-[#1a237e]">{t("admin:studentParent")}</h3>
          <p>{student.parentName || t("admin:studentNoParent")}</p>
          <p className="text-sm text-[#6c757d]">{student.parentPhone || "---"}</p>
          <p className="text-sm text-[#6c757d]">{student.parentEmail || t("admin:studentNone")}</p>
        </section>
      </div>
    </div>
  );
}
