import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { AudiencePicker, audiencePickBlocked, useAudienceOptions } from "@/components/AudiencePicker";
import { Alert, Button, Card, CardBody, Input, PageHeader, Spinner, Table } from "@/components/ui";
import { fieldControlClass, fieldLabelClass } from "@/components/ui/Input";
import { toErrorKey } from "@/lib/apiError";
import {
  useAnnouncements,
  useDeleteAnnouncement,
  useSaveAnnouncement,
  type AnnouncementBody,
  type AnnouncementRow,
} from "./api/useTechnician";

const emptyForm = (): AnnouncementBody => ({
  title: "",
  content: "",
  audienceKey: "All",
  personId: undefined,
  startDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date()),
  endDate: null,
  isUrgent: false,
});

export function AnnouncementsPage() {
  const { t } = useTranslation(["technician", "errors", "common"]);
  const query = useAnnouncements();
  const options = useAudienceOptions("/technician/announcement-audience-options");
  const save = useSaveAnnouncement();
  const remove = useDeleteAnnouncement();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AnnouncementBody>(emptyForm);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  function beginEdit(row: AnnouncementRow) {
    setEditingId(row.id);
    const content = row.content.replace(/^\[[^\]]+\]\n/, "");
    setForm({
      title: row.title,
      content,
      audienceKey: row.targetRole,
      personId: undefined,
      startDate: row.startDate,
      endDate: row.endDate,
      isUrgent: row.isUrgent,
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const needsPerson = form.audienceKey === "student" || form.audienceKey === "teacher" || form.audienceKey === "staff";
    if (audiencePickBlocked(options.data, form.audienceKey) || (needsPerson && !form.personId)) {
      setNotice({ tone: "danger", text: t("errors:validation") });
      return;
    }
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
            <AudiencePicker
              options={options.data}
              isError={options.isError}
              formMode={false}
              value={{ audienceKey: form.audienceKey, personId: form.personId }}
              onChange={(pick) => setForm({ ...form, audienceKey: pick.audienceKey, personId: pick.personId })}
              label={t("target")}
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
              <Button type="submit" loading={save.isPending} disabled={audiencePickBlocked(options.data, form.audienceKey)}>
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
