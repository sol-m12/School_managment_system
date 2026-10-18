import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useLostBoard, useLostMine, usePostLostItem } from "./api/useLostFound";

export function LostFoundBoardPage() {
  const { t } = useTranslation(["lostfound", "errors", "common"]);
  const board = useLostBoard();
  const mine = useLostMine();
  const post = usePostLostItem();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [form, setForm] = useState({
    kind: "Lost" as "Lost" | "Found",
    title: "",
    description: "",
    locationText: "",
    contactText: "",
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    post.mutate(form, {
      onSuccess: () => {
        setNotice({ tone: "success", text: t("posted") });
        setForm({ kind: "Lost", title: "", description: "", locationText: "", contactText: "" });
      },
      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
    });
  }

  return (
    <>
      <PageHeader title={t("boardTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}

      <Card className="mb-6">
        <CardBody>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="grid gap-1 text-sm">
              <span>{t("kind")}</span>
              <select
                className="rounded border border-border px-3 py-2"
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as "Lost" | "Found" })
                }
              >
                <option value="Lost">{t("kind_Lost")}</option>
                <option value="Found">{t("kind_Found")}</option>
              </select>
            </label>
            <Input
              label={t("title")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Input
              label={t("description")}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Input
              label={t("location")}
              value={form.locationText}
              onChange={(e) => setForm({ ...form, locationText: e.target.value })}
            />
            <Input
              label={t("contact")}
              value={form.contactText}
              onChange={(e) => setForm({ ...form, contactText: e.target.value })}
            />
            <div className="md:col-span-2">
              <Button type="submit" loading={post.isPending}>
                {t("postItem")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardBody>
          <h2 className="mb-3 font-semibold">{t("approvedBoard")}</h2>
          {board.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : board.isError ? (
            <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>
          ) : (
            <Table
              columns={[
                { key: "kind", header: t("kind"), render: (r) => t(`kind_${r.kind}`) },
                { key: "title", header: t("title"), render: (r) => r.title },
                { key: "location", header: t("location"), render: (r) => r.locationText || "—" },
              ]}
              rows={board.data?.rows ?? []}
              empty={t("emptyBoard")}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="mb-3 font-semibold">{t("myPosts")}</h2>
          {mine.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : (
            <Table
              columns={[
                { key: "title", header: t("title"), render: (r) => r.title },
                { key: "status", header: t("status"), render: (r) => t(`status_${r.status}`) },
              ]}
              rows={mine.data?.rows ?? []}
              empty={t("emptyMine")}
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}
