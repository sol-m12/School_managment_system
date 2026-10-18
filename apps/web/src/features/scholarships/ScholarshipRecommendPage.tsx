import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useDraftRecommendation,
  useRecommendQueue,
  useSignRecommendation,
} from "./api/useScholarships";

export function ScholarshipRecommendPage() {
  const { t } = useTranslation(["scholarships", "errors", "common"]);
  const queue = useRecommendQueue();
  const draft = useDraftRecommendation();
  const sign = useSignRecommendation();
  const [bodies, setBodies] = useState<Record<number, string>>({});
  const [draftIds, setDraftIds] = useState<Record<number, number>>({});
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  return (
    <>
      <PageHeader title={t("recommendTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card>
        <CardBody>
          {queue.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : (
            <Table
              columns={[
                { key: "student", header: t("student"), render: (r) => r.studentName },
                { key: "title", header: t("title"), render: (r) => r.title },
                {
                  key: "letter",
                  header: t("recommendation"),
                  render: (r) => (
                    <div className="grid gap-2">
                      <Input
                        label={t("letterBody")}
                        value={bodies[r.id] ?? ""}
                        onChange={(e) => setBodies({ ...bodies, [r.id]: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          loading={draft.isPending}
                          onClick={() =>
                            draft.mutate(
                              { applicationId: r.id, body: bodies[r.id] ?? "" },
                              {
                                onSuccess: (res) => {
                                  setDraftIds({ ...draftIds, [r.id]: res.id });
                                  setNotice({ tone: "success", text: t("draftSaved") });
                                },
                                onError: (error) =>
                                  setNotice({
                                    tone: "danger",
                                    text: t(`errors:${toErrorKey(error)}`),
                                  }),
                              },
                            )
                          }
                        >
                          {t("saveDraft")}
                        </Button>
                        {draftIds[r.id] ? (
                          <Button
                            type="button"
                            loading={sign.isPending}
                            onClick={() =>
                              sign.mutate(draftIds[r.id], {
                                onSuccess: () =>
                                  setNotice({ tone: "success", text: t("letterSigned") }),
                                onError: (error) =>
                                  setNotice({
                                    tone: "danger",
                                    text: t(`errors:${toErrorKey(error)}`),
                                  }),
                              })
                            }
                          >
                            {t("signLetter")}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ),
                },
              ]}
              rows={queue.data?.rows ?? []}
              empty={t("emptyQueue")}
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}
