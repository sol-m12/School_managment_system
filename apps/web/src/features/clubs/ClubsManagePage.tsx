import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useClubOptions,
  useManageClubs,
  useSaveClub,
  useSubmitCharter,
  type ClubBody,
  type ClubRow,
} from "./api/useClubs";

const emptyForm = (): ClubBody => ({
  name: "",
  description: "",
  year: String(new Date().getFullYear()),
  patronStaffId: 0,
  presidentStudentId: 0,
  isStudentCouncil: false,
  isActive: true,
});

export function ClubsManagePage() {
  const { t } = useTranslation(["clubs", "errors", "common"]);
  const clubs = useManageClubs();
  const options = useClubOptions();
  const save = useSaveClub();
  const submit = useSubmitCharter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClubBody>(emptyForm);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  function beginEdit(row: ClubRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      description: row.description,
      year: row.year,
      patronStaffId: row.patronStaffId ?? 0,
      presidentStudentId: row.presidentStudentId ?? 0,
      isStudentCouncil: row.isStudentCouncil,
      isActive: row.isActive,
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.patronStaffId || !form.presidentStudentId) {
      setNotice({ tone: "danger", text: t("errors:required") });
      return;
    }
    save.mutate(
      { id: editingId ?? undefined, body: form },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: t("clubSaved") });
          setEditingId(null);
          setForm(emptyForm());
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  const teachers = options.data?.teachers ?? [];
  const students = options.data?.students ?? [];

  return (
    <>
      <PageHeader title={t("manageTitle")} />
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <CardBody>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <Input
              label={t("clubName")}
              value={form.name}
              required
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Input
              label={t("year")}
              value={form.year}
              required
              onChange={(event) => setForm({ ...form, year: event.target.value })}
            />
            <Select
              label={t("patron")}
              value={form.patronStaffId ? String(form.patronStaffId) : ""}
              required
              onChange={(event) =>
                setForm({ ...form, patronStaffId: Number(event.target.value) || 0 })
              }
            >
              <option value="">{t("choosePatron")}</option>
              {teachers.length === 0 ? (
                <option value="" disabled>
                  {t("noTeachers")}
                </option>
              ) : (
                teachers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))
              )}
            </Select>
            <Select
              label={t("president")}
              value={form.presidentStudentId ? String(form.presidentStudentId) : ""}
              required
              onChange={(event) =>
                setForm({ ...form, presidentStudentId: Number(event.target.value) || 0 })
              }
            >
              <option value="">{t("choosePresident")}</option>
              {students.length === 0 ? (
                <option value="" disabled>
                  {t("noStudents")}
                </option>
              ) : (
                students.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))
              )}
            </Select>
            <Input
              label={t("description")}
              value={form.description ?? ""}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.isStudentCouncil ?? false}
                onChange={(event) =>
                  setForm({ ...form, isStudentCouncil: event.target.checked })
                }
              />
              {t("studentCouncil")}
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2 md:justify-end">
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
                {editingId ? t("updateClub") : t("createClub")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {clubs.isPending ? (
        <div className="flex justify-center py-8 text-brand-700">
          <Spinner label={t("common:loading")} />
        </div>
      ) : clubs.isError ? (
        <Alert tone="danger">{t(`errors:${toErrorKey(clubs.error)}`)}</Alert>
      ) : (
        <Card>
          <Table
            columns={[
              {
                key: "name",
                header: t("clubName"),
                render: (row) =>
                  `${row.name}${row.isStudentCouncil ? ` · ${t("studentCouncil")}` : ""}`,
              },
              { key: "year", header: t("year"), render: (row) => row.year },
              { key: "patron", header: t("patron"), render: (row) => row.patronName || "—" },
              {
                key: "president",
                header: t("president"),
                render: (row) => row.presidentName || "—",
              },
              {
                key: "charter",
                header: t("charter"),
                render: (row) => t(`charter_${row.charterStatus}`),
              },
              {
                key: "actions",
                header: t("actions"),
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => beginEdit(row)}>
                      {t("editClub")}
                    </Button>
                    {row.charterStatus === "Draft" || row.charterStatus === "Suspended" ? (
                      <Button
                        type="button"
                        loading={submit.isPending}
                        onClick={() =>
                          submit.mutate(row.id, {
                            onSuccess: () =>
                              setNotice({ tone: "success", text: t("charterSubmitted") }),
                            onError: (error) =>
                              setNotice({
                                tone: "danger",
                                text: t(`errors:${toErrorKey(error)}`),
                              }),
                          })
                        }
                      >
                        {t("submitCharter")}
                      </Button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            rows={clubs.data?.rows ?? []}
            rowKey={(row) => row.id}
            empty={t("emptyClubs")}
          />
        </Card>
      )}
    </>
  );
}
