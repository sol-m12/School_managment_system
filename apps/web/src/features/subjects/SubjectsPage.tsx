import { useCallback, useMemo, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Alert, Badge, Card, CardBody, CardHeader, IconButton, Table, type TableColumn } from "@/components/ui";
import { useCan } from "@/features/auth/authContext";
import { toErrorKey } from "@/lib/apiError";
import { useDeleteSubject } from "./api/useDeleteSubject";
import { useSaveSubject } from "./api/useSaveSubject";
import { useSubjects, type Subject, type SubjectInput } from "./api/useSubjects";
import { StreamBadge } from "./components/StreamBadge";
import { SubjectForm } from "./components/SubjectForm";
import { CREATE_DEFAULTS } from "./subjectSchema";

type Notice = { tone: "success" | "danger"; text: string };

export function SubjectsPage() {
  const { t } = useTranslation(["subjects", "errors"]);
  const can = useCan();
  const navigate = useNavigate();
  const [createNotice, setCreateNotice] = useState<Notice | null>(null);
  const [listNotice, setListNotice] = useState<Notice | null>(null);

  const subjects = useSubjects();
  const { mutateAsync: createSubject } = useSaveSubject(null);
  const { mutate: deleteSubject } = useDeleteSubject();

  const rows = subjects.data?.rows ?? [];
  const total = subjects.data?.total ?? 0;

  const handleCreate = useCallback(
    async (input: SubjectInput) => {
      setCreateNotice(null);
      try {
        await createSubject(input);
        setCreateNotice({ tone: "success", text: t("subjects:create.success") });
        return true;
      } catch (error) {
        setCreateNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
        return false;
      }
    },
    [createSubject, t],
  );

  const openDelete = useCallback(
    (subject: Subject) => {
      if (!window.confirm(t("subjects:delete.confirm"))) return;
      setListNotice(null);
      deleteSubject(subject.id, {
        onError: (error) => setListNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      });
    },
    [deleteSubject, t],
  );

  const columns = useMemo<TableColumn<Subject>[]>(
    () => [
      {
        key: "id",
        header: t("subjects:list.columns.id"),
        className: "text-xs text-ink-muted",
        render: (s) => `#${s.id}`,
      },
      {
        key: "sortOrder",
        header: t("subjects:list.columns.sortOrder"),
        className: "text-center font-bold text-brand-700",
        render: (s) => s.sortOrder,
      },
      {
        key: "subject",
        header: t("subjects:list.columns.subject"),
        className: "font-semibold text-ink-strong",
        render: (s) => s.subjectName,
      },
      {
        key: "grade",
        header: t("subjects:list.columns.grade"),
        render: (s) => <Badge>{t("subjects:gradeShort", { grade: s.gradeLevel })}</Badge>,
      },
      {
        key: "stream",
        header: t("subjects:list.columns.stream"),
        render: (s) => <StreamBadge stream={s.stream} />,
      },
      {
        key: "creditHours",
        header: t("subjects:list.columns.creditHours"),
        render: (s) => s.creditHours,
      },
      {
        key: "type",
        header: t("subjects:list.columns.type"),
        render: (s) =>
          s.isVocational ? (
            <Badge tone="brand">{t("subjects:list.vocational")}</Badge>
          ) : (
            <span className="text-xs text-ink-muted">{t("subjects:list.academic")}</span>
          ),
      },
      {
        key: "actions",
        header: t("subjects:list.columns.actions"),
        className: "text-center",
        render: (s) => (
          <div className="flex justify-center gap-1">
            <IconButton
              label={t("subjects:list.view")}
              icon={<Eye className="size-4" />}
              className="text-brand-700"
              onClick={() => navigate(`/academics/subjects/${s.id}`)}
            />
            {can("subjects.update") ? (
              <IconButton
                label={t("subjects:list.edit")}
                icon={<Pencil className="size-4" />}
                className="text-info"
                onClick={() => navigate(`/academics/subjects/${s.id}/edit`)}
              />
            ) : null}
            {can("subjects.delete") ? (
              <IconButton
                label={t("subjects:list.delete")}
                icon={<Trash2 className="size-4" />}
                className="text-danger"
                onClick={() => openDelete(s)}
              />
            ) : null}
          </div>
        ),
      },
    ],
    [t, can, navigate, openDelete],
  );

  return (
    <>
      {can("subjects.create") ? (
        <Card className="mb-5">
          <CardHeader title={t("subjects:create.title")} />
          <CardBody>
            {createNotice ? (
              <Alert tone={createNotice.tone} className="mb-4">
                {createNotice.text}
              </Alert>
            ) : null}
            <SubjectForm variant="create" defaultValues={CREATE_DEFAULTS} onSubmit={handleCreate} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={t("subjects:list.title")}
          actions={<Badge tone="info">{t("subjects:list.count", { count: total })}</Badge>}
        />
        {listNotice ? (
          <div className="px-4 pt-4 sm:px-5">
            <Alert tone={listNotice.tone}>{listNotice.text}</Alert>
          </div>
        ) : null}
        {subjects.isError ? (
          <div className="p-4 sm:p-5">
            <Alert tone="danger">{t(`errors:${toErrorKey(subjects.error)}`)}</Alert>
          </div>
        ) : (
          <Table
            columns={columns}
            rows={rows}
            rowKey={(s) => s.id}
            loading={subjects.isPending}
          />
        )}
      </Card>
    </>
  );
}
