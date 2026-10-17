import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, CardHeader, Input, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useOpac, useReserveBook } from "./api/useLibrary";

export function OpacPanel() {
  const { t } = useTranslation(["library", "errors"]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);
  const query = useOpac(q);
  const reserve = useReserveBook();
  return (
    <div className="grid gap-4">
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      <Card>
        <CardHeader title={t("opacTitle")} description={t("opacHelp")} />
        <CardBody className="grid gap-3">
          <Input label={t("search")} value={text} placeholder={t("searchPlaceholder")} onChange={(event) => setText(event.target.value)} />
          {query.isError ? <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}` as "errors:server")}</Alert> : null}
          <Table
            columns={[
              { key: "title", header: t("title"), render: (row) => row.title },
              { key: "author", header: t("author"), render: (row) => row.author },
              { key: "free", header: t("free"), render: (row) => row.free },
              {
                key: "reserve",
                header: t("reserve"),
                render: (row) =>
                  row.reserved ? (
                    t("reserved")
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      loading={reserve.isPending}
                      onClick={() =>
                        reserve.mutate(row.id, {
                          onSuccess: () => setNotice({ tone: "success", text: t("saved") }),
                          onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") }),
                        })
                      }
                    >
                      {t("reserve")}
                    </Button>
                  ),
              },
            ]}
            rows={query.data?.rows ?? []}
            rowKey={(row) => row.id}
            empty={t("empty")}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={t("teacherShelf")} />
        <Table
          columns={[
            { key: "title", header: t("title"), render: (row) => row.title },
            { key: "subject", header: t("subject"), render: (row) => row.subject },
            { key: "note", header: t("note"), render: (row) => row.note },
          ]}
          rows={query.data?.resources ?? []}
          rowKey={(row) => row.id}
          empty={t("empty")}
        />
      </Card>
    </div>
  );
}
