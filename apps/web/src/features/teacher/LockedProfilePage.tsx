import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Card, CardBody, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { toErrorKey } from "@/lib/apiError";
import { useTeacherProfile } from "./api/useTeacherProfile";

export function LockedProfilePage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const query = useTeacherProfile();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoName = query.data?.profile.photo;

  useEffect(() => {
    if (!photoName) {
      setPhotoUrl(null);
      return;
    }
    let url = "";
    let cancel = false;
    void api
      .get("/admin/profile/photo", { responseType: "blob" })
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
  }, [photoName]);

  if (query.isPending) return <p className="py-8 text-center text-sm text-ink-muted">{t("common:loading")}</p>;
  if (query.isError || !query.data) return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;
  const profile = query.data.profile;
  const fields = [
    [t("teacher:fieldFirstName"), profile.firstName],
    [t("teacher:fieldLastName"), profile.lastName],
    [t("teacher:fieldGender"), profile.gender ?? ""],
    [t("teacher:fieldRole"), profile.role],
    [t("teacher:fieldJob"), profile.jobTitle],
    [t("teacher:fieldSpecialization"), profile.specialization ?? ""],
    [t("teacher:fieldPhone"), profile.phoneNumber ?? ""],
    [t("teacher:fieldEmail"), profile.email ?? ""],
    [t("teacher:fieldHireDate"), profile.hireDate ?? ""],
    [t("teacher:fieldUsername"), profile.username],
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader title={t("teacher:profileLockedTitle")} description={t("teacher:profileLockedHint")} />
      <Card>
        <CardBody>
          <div className="mb-4 flex items-center gap-4">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="size-20 rounded-full object-cover" />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full bg-brand-700 font-bold text-white">
                {profile.firstName.slice(0, 1)}
              </div>
            )}
            <p className="font-semibold">
              {profile.firstName} {profile.lastName}
            </p>
          </div>
          <div className="grid max-w-lg gap-4">
            {fields.map(([label, value]) => (
              <Input key={label} label={label} value={value} readOnly />
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
