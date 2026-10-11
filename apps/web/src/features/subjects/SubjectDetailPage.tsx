import type { ReactNode } from "react";
import { ArrowLeft, CheckCircle2, GraduationCap, Info, Lightbulb, Pencil, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Badge, Button, Card, CardHeader, Spinner } from "@/components/ui";
import { useCan } from "@/features/auth/authContext";
import { toErrorKey } from "@/lib/apiError";
import { useSubject } from "./api/useSubject";
import { StreamBadge } from "./components/StreamBadge";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <th scope="row" className="w-[35%] bg-canvas px-4 py-3 text-left font-semibold text-ink-muted sm:px-5">
        {label}
      </th>
      <td className="px-4 py-3 sm:px-5">{children}</td>
    </tr>
  );
}

export function SubjectDetailPage() {
  const { t } = useTranslation(["subjects", "errors", "common"]);
  const can = useCan();
  const navigate = useNavigate();
  const id = Number(useParams().id);
  const subject = useSubject(id);

  const backButton = (
    <Button
      variant="secondary"
      leftIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
      onClick={() => navigate("/academics/subjects")}
    >
      {t("subjects:view.back")}
    </Button>
  );

  if (!Number.isInteger(id) || id <= 0 || subject.isError) {
    const errorKey = subject.isError ? toErrorKey(subject.error) : "subjectNotFound";
    return (
      <>
        <div className="mb-4">{backButton}</div>
        <Alert tone="danger">{t(`errors:${errorKey}`)}</Alert>
      </>
    );
  }

  if (subject.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }

  const s = subject.data;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>{backButton}</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">{t("subjects:view.subjectId")}</span>
          <Badge tone="neutral">#{s.id}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader
            title={
              <span className="inline-flex items-center gap-2 text-brand-700">
                <Info aria-hidden="true" className="size-4" />
                {t("subjects:view.title")}
              </span>
            }
            actions={
              <div className="text-right">
                <span className="block text-[0.7rem] text-ink-muted">{t("subjects:view.order")}</span>
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-700 font-bold text-white shadow-soft">
                  {s.sortOrder ?? 0}
                </span>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                <DetailRow label={t("subjects:view.subjectName")}>
                  <span className="font-bold text-ink-strong uppercase">{s.subjectName}</span>
                </DetailRow>
                <DetailRow label={t("subjects:view.grade")}>
                  <Badge>{t("subjects:gradeLong", { grade: s.gradeLevel })}</Badge>
                </DetailRow>
                <DetailRow label={t("subjects:view.stream")}>
                  <StreamBadge stream={s.stream} />
                </DetailRow>
                <DetailRow label={t("subjects:view.sortOrder")}>
                  <span className="font-bold text-brand-700">{s.sortOrder ?? t("subjects:view.sortOrderMissing")}</span>
                </DetailRow>
                <DetailRow label={t("subjects:view.creditHours")}>
                  <span className="font-medium">{t("subjects:view.hours", { count: s.creditHours })}</span>
                </DetailRow>
                <DetailRow label={t("subjects:view.type")}>
                  {s.isVocational ? (
                    <span className="inline-flex items-center gap-1 font-bold text-brand-700">
                      <Wrench aria-hidden="true" className="size-4" />
                      {t("subjects:view.vocational")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-ink-muted">
                      <GraduationCap aria-hidden="true" className="size-4" />
                      {t("subjects:view.academic")}
                    </span>
                  )}
                </DetailRow>
              </tbody>
            </table>
          </div>
          {can("subjects.update") ? (
            <footer className="flex justify-end border-t border-border px-4 py-3 sm:px-5">
              <Button
                leftIcon={<Pencil aria-hidden="true" className="size-4" />}
                onClick={() => navigate(`/academics/subjects/${s.id}/edit`)}
                className="px-8"
              >
                {t("subjects:view.edit")}
              </Button>
            </footer>
          ) : null}
        </Card>

        <Card className="border-brand-100 bg-brand-50 shadow-none xl:col-span-4">
          <div className="p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-700">
              <Lightbulb aria-hidden="true" className="size-4" />
              {t("subjects:view.tipTitle")}
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-ink-strong">{t("subjects:view.tipBody")}</p>
            <ul className="space-y-2 border-t border-brand-100 pt-3 text-sm text-ink-muted">
              <li className="flex gap-2">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
                {t("subjects:view.tipLowNumber")}
              </li>
              <li className="flex gap-2">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
                {t("subjects:view.tipEditButton")}
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </>
  );
}
