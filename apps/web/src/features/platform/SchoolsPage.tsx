import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { schoolLoginPath, schoolSiteUrl } from "@/lib/tenantSlug";
import {
  downloadPlatformSchoolBackup,
  listPlatformSchools,
  type PlatformSchool,
} from "./platformApi";

export function SchoolsPage() {
  const { t } = useTranslation("platform");
  const { t: tErrors } = useTranslation("errors");
  const [backupNotice, setBackupNotice] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const query = useQuery({
    queryKey: ["platform", "schools"],
    queryFn: listPlatformSchools,
  });
  const backup = useMutation({
    mutationFn: (school: PlatformSchool) => downloadPlatformSchoolBackup(school),
    onSuccess: () =>
      setBackupNotice({ tone: "success", text: t("schools.backupDone") }),
    onError: (error) =>
      setBackupNotice({ tone: "danger", text: tErrors(toErrorKey(error)) }),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("schools.title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("schools.subtitle")}</p>
        </div>
        <Link
          to="/platform/schools/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-teal-700 px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-teal-800"
        >
          <PlusCircle aria-hidden className="size-4" />
          {t("schools.add")}
        </Link>
      </div>

      {query.isError ? (
        <Alert tone="danger">{tErrors(toErrorKey(query.error))}</Alert>
      ) : null}
      {backupNotice ? (
        <Alert tone={backupNotice.tone} className="mb-4">
          {backupNotice.text}
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">{t("schools.colName")}</th>
              <th className="px-4 py-3 font-semibold">{t("schools.colSlug")}</th>
              <th className="px-4 py-3 font-semibold">{t("schools.colStatus")}</th>
              <th className="px-4 py-3 font-semibold">{t("schools.colSite")}</th>
              <th className="px-4 py-3 font-semibold">{t("schools.colLogin")}</th>
              <th className="px-4 py-3 font-semibold">{t("schools.colBackup")}</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-ink-muted">
                  {t("schools.loading")}
                </td>
              </tr>
            ) : null}
            {query.data?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-ink-muted">
                  {t("schools.empty")}{" "}
                  <Link to="/platform/schools/new" className="font-medium text-teal-700 hover:underline">
                    {t("schools.add")}
                  </Link>
                </td>
              </tr>
            ) : null}
            {query.data?.map((school) => {
              const siteUrl = schoolSiteUrl(school.slug);
              const loginPath = schoolLoginPath(school.slug);
              const downloading =
                backup.isPending && backup.variables?.id === school.id;
              return (
                <tr key={school.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-ink-strong">{school.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{school.slug}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                      {school.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={siteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-medium text-teal-700 hover:underline"
                    >
                      {siteUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={loginPath} className="font-medium text-teal-700 hover:underline">
                      {loginPath}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={backup.isPending}
                      onClick={() => {
                        setBackupNotice(null);
                        backup.mutate(school);
                      }}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-border bg-white px-3 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-60"
                    >
                      <Download aria-hidden className="size-3.5" />
                      {downloading ? t("schools.backupLoading") : t("schools.backup")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
