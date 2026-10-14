import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { fieldControlClass, fieldLabelClass } from "@/components/ui/Input";
import { toErrorKey } from "@/lib/apiError";
import {
  useAnnouncements,
  useDeleteAnnouncement,
  useSaveAnnouncement,
  type AnnouncementBody,
  type AnnouncementRow,
} from "./api/useTechnician";

const TARGETS = ["All", "Staff", "Students", "Parents", "Admin_Only"] as const;

const emptyForm = (): AnnouncementBody => ({
  title: "",
  content: "",
  targetRole: "All",
  startDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date()),
  endDate: null,
  isUrgent: false,
});

export function AnnouncementsPage() {
  const { t } = useTranslation(["technician", "errors", "common"]);
  const query = useAnnouncements();
  const save = useSaveAnnouncement();
  const remove = useDeleteAnnouncement();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AnnouncementBody>(emptyForm);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  function beginEdit(row: AnnouncementRow) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      content: row.content,
      targetRole: row.targetRole,
      startDate: row.startDate,
      endDate: row.endDate,
      isUrgent: row.isUrgent,
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(
      { id: editingId ?? undefined, body: form },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: t("announcementSaved") });
          setEditingId(null);
          setForm(emptyForm());
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  return (
    <>
      <PageHeader title={t("announcementsTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <CardBody>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <Input
              label={t("title")}
              value={form.title}
              required
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <Select
              label={t("target")}
              value={form.targetRole}
              options={TARGETS.map((role) => ({ value: role, label: t(`roles.${role}`) }))}
              onChange={(event) => setForm({ ...form, targetRole: event.target.value as AnnouncementBody["targetRole"] })}
            />
            <Input
              label={t("startDate")}
              type="date"
              value={form.startDate}
              required
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
            <Input
              label={t("endDate")}
              type="date"
              value={form.endDate ?? ""}
              onChange={(event) => setForm({ ...form, endDate: event.target.value || null })}
            />
            <label className="md:col-span-2">
              <span className={fieldLabelClass}>{t("content")}</span>
              <textarea
                className={fieldControlClass}
                rows={4}
                required
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={form.isUrgent}
                onChange={(event) => setForm({ ...form, isUrgent: event.target.checked })}
              />
              {t("urgent")}
            </label>
            <div className="flex flex-wrap gap-2 md:justify-end">
              {editingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm());
                  }}
                >
                  {t("cancelEdit")}
                </Button>
              ) : null}
              <Button type="submit" loading={save.isPending}>
                {editingId ? t("updateAnnouncement") : t("saveAnnouncement")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      {query.isPending ? (
        <div className="flex justify-center py-8 text-brand-700">
          <Spinner label={t("common:loading")} />
        </div>
      ) : query.isError ? (
        <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>
      ) : (
        <Card>
          <Table
            columns={[
              { key: "title", header: t("title"), render: (row) => row.title },
              { key: "target", header: t("target"), render: (row) => t(`roles.${row.targetRole}`) },
              { key: "start", header: t("startDate"), render: (row) => row.startDate },
              { key: "end", header: t("endDate"), render: (row) => row.endDate ?? "" },
              { key: "urgent", header: t("urgent"), render: (row) => (row.isUrgent ? t("urgent") : "") },
              {
                key: "actions",
                header: t("actions"),
                render: (row) => (
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => beginEdit(row)}>
                      {t("updateAnnouncement")}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        if (!window.confirm(t("confirmDelete"))) return;
                        remove.mutate(row.id, {
                          onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                        });
                      }}
                    >
                      {t("deleteAnnouncement")}
                    </Button>
                  </div>
                ),
              },
            ]}
            rows={query.data.rows}
            rowKey={(row) => row.id}
          />
        </Card>
      )}
    </>
  );
}
