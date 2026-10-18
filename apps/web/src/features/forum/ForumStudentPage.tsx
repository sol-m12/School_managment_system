import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useForumQuestion,
  useForumQuestions,
  usePostAnswer,
  usePostQuestion,
  useUpvoteAnswer,
} from "./api/useForum";

export function ForumStudentPage() {
  const { t } = useTranslation(["forum", "errors", "common"]);
  const list = useForumQuestions();
  const postQ = usePostQuestion();
  const postA = usePostAnswer();
  const upvote = useUpvoteAnswer();
  const [selectedId, setSelectedId] = useState(0);
  const detail = useForumQuestion(selectedId);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [qForm, setQForm] = useState({ title: "", body: "" });
  const [answer, setAnswer] = useState("");

  function submitQuestion(event: FormEvent) {
    event.preventDefault();
    postQ.mutate(qForm, {
      onSuccess: () => {
        setNotice({ tone: "success", text: t("questionPosted") });
        setQForm({ title: "", body: "" });
      },
      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
    });
  }

  return (
    <>
      <PageHeader title={t("studentTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardBody>
          <form className="grid gap-3" onSubmit={submitQuestion}>
            <Input
              label={t("questionTitle")}
              value={qForm.title}
              onChange={(e) => setQForm({ ...qForm, title: e.target.value })}
              required
            />
            <Input
              label={t("questionBody")}
              value={qForm.body}
              onChange={(e) => setQForm({ ...qForm, body: e.target.value })}
              required
            />
            <Button type="submit" loading={postQ.isPending}>
              {t("postQuestion")}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardBody>
          {list.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : list.isError ? (
            <Alert tone="danger">{t(`errors:${toErrorKey(list.error)}`)}</Alert>
          ) : (
            <Table
              columns={[
                { key: "title", header: t("questionTitle"), render: (r) => r.title },
                { key: "student", header: t("author"), render: (r) => r.studentName },
                { key: "points", header: t("points"), render: (r) => String(r.points) },
                {
                  key: "open",
                  header: t("actions"),
                  render: (r) => (
                    <Button type="button" onClick={() => setSelectedId(r.id)}>
                      {t("open")}
                    </Button>
                  ),
                },
              ]}
              rows={list.data?.rows ?? []}
              empty={t("emptyQuestions")}
            />
          )}
        </CardBody>
      </Card>

      {selectedId > 0 ? (
        <Card>
          <CardBody className="space-y-4">
            {detail.isPending ? (
              <Spinner label={t("common:loading")} />
            ) : detail.isError ? (
              <Alert tone="danger">{t(`errors:${toErrorKey(detail.error)}`)}</Alert>
            ) : detail.data ? (
              <>
                <h2 className="text-lg font-bold">{detail.data.title}</h2>
                <p>{detail.data.body}</p>
                <div className="space-y-2">
                  {(detail.data.answers ?? []).map((a) => (
                    <div key={a.id} className="rounded border border-border p-3">
                      <p>{a.body}</p>
                      <p className="text-sm text-ink-muted">
                        {a.studentName} · {a.points} {t("points")}
                        {a.isEndorsed ? ` · ${t("endorsed")}` : ""}
                      </p>
                      <Button
                        type="button"
                        className="mt-2"
                        loading={upvote.isPending}
                        onClick={() =>
                          upvote.mutate(a.id, {
                            onSuccess: () => setNotice({ tone: "success", text: t("upvoted") }),
                            onError: (error) =>
                              setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                          })
                        }
                      >
                        {t("upvote")}
                      </Button>
                    </div>
                  ))}
                </div>
                <form
                  className="grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    postA.mutate(
                      { questionId: selectedId, body: answer },
                      {
                        onSuccess: () => {
                          setAnswer("");
                          setNotice({ tone: "success", text: t("answerPosted") });
                        },
                        onError: (error) =>
                          setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                      },
                    );
                  }}
                >
                  <Input
                    label={t("yourAnswer")}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    required
                  />
                  <Button type="submit" loading={postA.isPending}>
                    {t("postAnswer")}
                  </Button>
                </form>
              </>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
