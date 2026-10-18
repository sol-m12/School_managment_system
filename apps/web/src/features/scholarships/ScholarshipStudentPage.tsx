import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, PageHeader, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useApplyScholarship,
  useRequestLetter,
  useStudentScholarships,
} from "./api/useScholarships";

export function ScholarshipStudentPage() {
  const { t } = useTranslation(["scholarships", "errors", "common"]);
  const portal = useStudentScholarships();
  const apply = useApplyScholarship();
  const requestLetter = useRequestLetter();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  return (
    <>
      <PageHeader title={t("studentTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      {portal.isPending ? (
        <Spinner label={t("common:loading")} />
      ) : portal.isError ? (
        <Alert tone="danger">{t(`errors:${toErrorKey(portal.error)}`)}</Alert>
      ) : !portal.data?.unlocked ? (
        <Alert tone="info">{t("locked")}</Alert>
      ) : (
        <div className="space-y-6">
          <Alert tone="success">
            {t("eligible", { score: portal.data.score ?? 0, cutoff: portal.data.cutoff ?? 0 })}
          </Alert>
          <Card>
            <CardBody>
              <h2 className="mb-3 font-semibold">{t("opportunities")}</h2>
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (r) => r.title },
                  {
                    key: "url",
                    header: t("link"),
                    render: (r) => (r.url ? <a href={r.url}>{r.url}</a> : "—"),
                  },
                  {
                    key: "apply",
                    header: t("actions"),
                    render: (r) => (
                      <Button
                        type="button"
                        loading={apply.isPending}
                        onClick={() =>
                          apply.mutate(
                            { opportunityId: r.id, note: "" },
                            {
                              onSuccess: () =>
                                setNotice({ tone: "success", text: t("applied") }),
                              onError: (error) =>
                                setNotice({
                                  tone: "danger",
                                  text: t(`errors:${toErrorKey(error)}`),
                                }),
                            },
                          )
                        }
                      >
                        {t("apply")}
                      </Button>
                    ),
                  },
                ]}
                rows={portal.data.opportunities}
                empty={t("emptyOpportunities")}
              />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h2 className="mb-3 font-semibold">{t("myApplications")}</h2>
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (r) => r.title },
                  { key: "status", header: t("status"), render: (r) => r.status },
                  {
                    key: "letter",
                    header: t("actions"),
                    render: (r) =>
                      r.status === "Submitted" ? (
                        <Button
                          type="button"
                          loading={requestLetter.isPending}
                          onClick={() =>
                            requestLetter.mutate(r.id, {
                              onSuccess: () =>
                                setNotice({ tone: "success", text: t("letterRequested") }),
                              onError: (error) =>
                                setNotice({
                                  tone: "danger",
                                  text: t(`errors:${toErrorKey(error)}`),
                                }),
                            })
                          }
                        >
                          {t("requestLetter")}
                        </Button>
                      ) : (
                        "—"
                      ),
                  },
                ]}
                rows={portal.data.applications}
                empty={t("emptyApplications")}
              />
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
