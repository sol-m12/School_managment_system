import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, PageHeader, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useDeleteForumContent,
  useEndorseAnswer,
  useForumQuestion,
  useForumQuestions,
} from "./api/useForum";

export function ForumModeratePage() {
  const { t } = useTranslation(["forum", "errors", "common"]);
  const list = useForumQuestions(true);
  const [selectedId, setSelectedId] = useState(0);
  const detail = useForumQuestion(selectedId, true);
  const endorse = useEndorseAnswer();
  const del = useDeleteForumContent();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  return (
    <>
      <PageHeader title={t("moderateTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <CardBody>
          {list.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : (
            <Table
              columns={[
                { key: "title", header: t("questionTitle"), render: (r) => r.title },
                {
                  key: "open",
                  header: t("actions"),
                  render: (r) => (
                    <div className="flex gap-2">
                      <Button type="button" onClick={() => setSelectedId(r.id)}>
                        {t("open")}
                      </Button>
                      <Button
                        type="button"
                        loading={del.isPending}
                        onClick={() =>
                          del.mutate(
                            { kind: "question", id: r.id },
                            {
                              onSuccess: () =>
                                setNotice({ tone: "success", text: t("deleted") }),
                              onError: (error) =>
                                setNotice({
                                  tone: "danger",
                                  text: t(`errors:${toErrorKey(error)}`),
                                }),
                            },
                          )
                        }
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={list.data?.rows ?? []}
              empty={t("emptyQuestions")}
            />
          )}
        </CardBody>
      </Card>
      {selectedId > 0 && detail.data ? (
        <Card>
          <CardBody className="space-y-3">
            <h2 className="font-bold">{detail.data.title}</h2>
            {(detail.data.answers ?? []).map((a) => (
              <div key={a.id} className="rounded border border-border p-3">
                <p>{a.body}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    loading={endorse.isPending}
                    onClick={() =>
                      endorse.mutate(a.id, {
                        onSuccess: () => setNotice({ tone: "success", text: t("endorsedSaved") }),
                        onError: (error) =>
                          setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                      })
                    }
                  >
                    {t("endorse")}
                  </Button>
                  <Button
                    type="button"
                    loading={del.isPending}
                    onClick={() =>
                      del.mutate(
                        { kind: "answer", id: a.id },
                        {
                          onSuccess: () => setNotice({ tone: "success", text: t("deleted") }),
                          onError: (error) =>
                            setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                        },
                      )
                    }
                  >
                    {t("delete")}
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
