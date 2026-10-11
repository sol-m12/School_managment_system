import { useTranslation } from "react-i18next";
import { Alert, Button, Modal } from "@/components/ui";
import type { ErrorKey } from "@/lib/apiError";
import type { Subject } from "../api/useSubjects";

type DeleteSubjectModalProps = {
  subject: Subject | null;
  deleting: boolean;
  errorKey: ErrorKey | null;
  onCancel: () => void;
  onConfirm: (subject: Subject) => void;
};

export function DeleteSubjectModal({ subject, deleting, errorKey, onCancel, onConfirm }: DeleteSubjectModalProps) {
  const { t } = useTranslation(["subjects", "errors"]);

  return (
    <Modal
      open={subject !== null}
      onClose={onCancel}
      title={t("subjects:delete.confirm")}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={deleting}>
            {t("subjects:delete.cancel")}
          </Button>
          <Button variant="danger" loading={deleting} onClick={() => subject && onConfirm(subject)}>
            {t("subjects:delete.confirmButton")}
          </Button>
        </>
      }
    >
      {errorKey ? (
        <Alert tone="danger" className="mb-3">
          {t(`errors:${errorKey}`)}
        </Alert>
      ) : null}
      {subject ? (
        <p className="text-sm text-ink-strong">
          <span className="font-semibold">{subject.subjectName}</span>
          <span className="text-ink-muted"> · {t("subjects:gradeShort", { grade: subject.gradeLevel })}</span>
          <span className="text-ink-muted"> · {t(`subjects:streams.${subject.stream}`)}</span>
        </p>
      ) : null}
    </Modal>
  );
}
