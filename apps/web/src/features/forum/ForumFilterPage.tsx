import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useAddProfanityWord, useProfanityWords, useRemoveProfanityWord } from "./api/useForum";

export function ForumFilterPage() {
  const { t } = useTranslation(["forum", "errors", "common"]);
  const words = useProfanityWords();
  const add = useAddProfanityWord();
  const remove = useRemoveProfanityWord();
  const [word, setWord] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    add.mutate(word, {
      onSuccess: () => {
        setWord("");
        setNotice({ tone: "success", text: t("wordAdded") });
      },
      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
    });
  }

  return (
    <>
      <PageHeader title={t("filterTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <CardBody>
          <form className="flex flex-wrap items-end gap-3" onSubmit={onSubmit}>
            <Input label={t("blockedWord")} value={word} onChange={(e) => setWord(e.target.value)} required />
            <Button type="submit" loading={add.isPending}>
              {t("addWord")}
            </Button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          {words.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : (
            <Table
              columns={[
                { key: "word", header: t("blockedWord"), render: (r) => r.word },
                {
                  key: "actions",
                  header: t("actions"),
                  render: (r) => (
                    <Button
                      type="button"
                      loading={remove.isPending}
                      onClick={() =>
                        remove.mutate(r.id, {
                          onSuccess: () => setNotice({ tone: "success", text: t("wordRemoved") }),
                          onError: (error) =>
                            setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                        })
                      }
                    >
                      {t("remove")}
                    </Button>
                  ),
                },
              ]}
              rows={words.data?.rows ?? []}
              empty={t("emptyWords")}
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}
