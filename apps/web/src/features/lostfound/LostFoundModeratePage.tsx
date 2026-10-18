import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, PageHeader, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useLostQueue, useModerateLostItem } from "./api/useLostFound";

export function LostFoundModeratePage() {
  const { t } = useTranslation(["lostfound", "errors", "common"]);
  const queue = useLostQueue();
  const moderate = useModerateLostItem();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  function act(id: number, action: "Approve" | "Reject" | "Resolve") {
    moderate.mutate(
      { id, action },
      {
        onSuccess: () => setNotice({ tone: "success", text: t(`action_${action}`) }),
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  return (
    <>
      <PageHeader title={t("moderateTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card>
        <CardBody>
          {queue.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : queue.isError ? (
            <Alert tone="danger">{t(`errors:${toErrorKey(queue.error)}`)}</Alert>
          ) : (
            <Table
              columns={[
                { key: "kind", header: t("kind"), render: (r) => t(`kind_${r.kind}`) },
                { key: "title", header: t("title"), render: (r) => r.title },
                { key: "status", header: t("status"), render: (r) => t(`status_${r.status}`) },
                {
                  key: "actions",
                  header: t("actions"),
                  render: (r) => (
                    <div className="flex flex-wrap gap-2">
                      {r.status === "Pending" ? (
                        <>
                          <Button type="button" loading={moderate.isPending} onClick={() => act(r.id, "Approve")}>
                            {t("approve")}
                          </Button>
                          <Button type="button" loading={moderate.isPending} onClick={() => act(r.id, "Reject")}>
                            {t("reject")}
                          </Button>
                        </>
                      ) : null}
                      {r.status === "Approved" ? (
                        <Button type="button" loading={moderate.isPending} onClick={() => act(r.id, "Resolve")}>
                          {t("resolve")}
                        </Button>
                      ) : null}
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
