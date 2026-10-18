import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import { useSaveOpportunity, useScholarshipOpportunities } from "./api/useScholarships";

export function ScholarshipOpportunitiesPage() {
  const { t } = useTranslation(["scholarships", "errors", "common"]);
  const list = useScholarshipOpportunities();
  const save = useSaveOpportunity();
  const [form, setForm] = useState({ title: "", url: "", guidelines: "", isActive: true });
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate(form, {
      onSuccess: () => {
        setForm({ title: "", url: "", guidelines: "", isActive: true });
        setNotice({ tone: "success", text: t("opportunitySaved") });
      },
      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
    });
  }

  return (
    <>
      <PageHeader title={t("postTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <CardBody>
          <form className="grid gap-3" onSubmit={onSubmit}>
            <Input
              label={t("title")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Input
              label={t("link")}
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
            <Input
              label={t("guidelines")}
              value={form.guidelines}
              onChange={(e) => setForm({ ...form, guidelines: e.target.value })}
            />
            <Button type="submit" loading={save.isPending}>
              {t("postOpportunity")}
            </Button>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          {list.isPending ? (
            <Spinner label={t("common:loading")} />
          ) : (
            <Table
              columns={[
                { key: "title", header: t("title"), render: (r) => r.title },
                { key: "url", header: t("link"), render: (r) => r.url || "—" },
              ]}
              rows={list.data?.rows ?? []}
              empty={t("emptyOpportunities")}
            />
          )}
        </CardBody>
      </Card>
    </>
  );
}
