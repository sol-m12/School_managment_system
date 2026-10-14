import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, Input, Modal, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { fieldControlClass, fieldLabelClass } from "@/components/ui/Input";
import { toErrorKey } from "@/lib/apiError";
import {
  useAddRole,
  useCreateStaff,
  useCreateTeacher,
  useRegistrationOptions,
  useTechnicianStaff,
  useTechnicianTeachers,
} from "./api/useTechnician";

const PASS_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomPassword(): string {
  let pass = "";
  for (let i = 0; i < 8; i += 1) pass += PASS_CHARS[Math.floor(Math.random() * PASS_CHARS.length)];
  return pass;
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function money(value: string | null): string {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Notice = { tone: "success" | "danger"; text: string };

export function StaffRegistrationPage() {
  const { t } = useTranslation(["technician", "errors", "common"]);
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "staff" ? "staff" : "teachers";

  return (
    <>
      <PageHeader title={view === "staff" ? t("staffFormTitle") : t("teacherPageTitle")} />
      <div className="mb-4">
        {view === "staff" ? (
          <Button type="button" variant="secondary" onClick={() => setParams({})}>
            {t("toTeachers")}
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setParams({ view: "staff" })}>
            {t("toStaff")}
          </Button>
        )}
      </div>
      {view === "staff" ? <StaffForm /> : <TeacherForm />}
    </>
  );
}

function TeacherForm() {
  const { t } = useTranslation(["technician", "errors", "common"]);
  const options = useRegistrationOptions();
  const teachers = useTechnicianTeachers();
  const create = useCreateTeacher();
  const [notice, setNotice] = useState<Notice | null>(null);
  const subjectOptions = useMemo(
    () => (options.data?.subjects ?? []).map((subject) => ({ value: String(subject.id), label: subject.name })),
    [options.data],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const subject = String(form.get("subjectId") ?? "");
    create.mutate(
      {
        firstName: String(form.get("firstName") ?? ""),
        lastName: String(form.get("lastName") ?? ""),
        gender: String(form.get("gender") ?? "Male"),
        jobTitle: String(form.get("jobTitle") ?? "Teacher"),
        phoneNumber: String(form.get("phoneNumber") ?? ""),
        hireDate: String(form.get("hireDate") ?? "") || null,
        salary: Number(form.get("salary") ?? 0),
        experienceYears: Number(form.get("experienceYears") ?? 0),
        subjectId: subject ? Number(subject) : null,
      },
      {
        onSuccess: (result) => {
          setNotice({
            tone: "success",
            text: t("teacherSaved", { username: result.username, password: result.temporaryPassword }),
          });
          formEl.reset();
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  return (
    <>
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <CardBody>
          <h2 className="mb-4 text-lg font-bold text-ink-strong">{t("teacherFormTitle")}</h2>
          <form className="grid gap-4 md:grid-cols-3" onSubmit={onSubmit}>
            <Input name="firstName" label={t("firstName")} required />
            <Input name="lastName" label={t("fatherName")} required />
            <Select
              name="gender"
              label={t("gender")}
              options={[
                { value: "Male", label: t("male") },
                { value: "Female", label: t("female") },
                { value: "Other", label: t("other") },
              ]}
            />
            <Input name="jobTitle" label={t("jobTitle")} defaultValue="Teacher" required />
            <Input name="phoneNumber" label={t("phone")} />
            <Input name="hireDate" label={t("hireDate")} type="date" defaultValue={today()} />
            <Input name="salary" label={t("salary")} type="number" step="0.01" min="0" defaultValue="0.00" required />
            <Input
              name="experienceYears"
              label={t("experience")}
              type="number"
              step="0.5"
              min="0"
              defaultValue="0.00"
              required
            />
            <Select name="subjectId" label={t("category")} placeholder={t("choose")} options={subjectOptions} />
            <div className="md:col-span-3 md:text-end">
              <Button type="submit" loading={create.isPending}>
                {t("registerTeacher")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <h2 className="mb-3 font-bold text-ink-strong">{t("teacherTableTitle")}</h2>
      {teachers.isPending ? (
        <Spinner label={t("common:loading")} />
      ) : teachers.isError ? (
        <Alert tone="danger">{t(`errors:${toErrorKey(teachers.error)}`)}</Alert>
      ) : (
        <Card>
          <Table
            columns={[
              {
                key: "n",
                header: t("number"),
                render: (row) => String(teachers.data.rows.findIndex((item) => item.id === row.id) + 1),
              },
              { key: "name", header: t("fullName"), render: (row) => row.name },
              { key: "user", header: t("username"), render: (row) => row.username ?? "" },
              { key: "approval", header: t("approval"), render: (row) => (row.approved ? t("approved") : "") },
              {
                key: "password",
                header: t("passwordStatus"),
                render: (row) => (row.passwordChanged ? t("passwordChanged") : t("passwordExpired")),
              },
              {
                key: "pay",
                header: t("payExperience"),
                render: (row) => (
                  <span>
                    {t("birr", { amount: money(row.salary) })}
                    <br />
                    <span className="text-ink-muted">{t("years", { years: money(row.experienceYears) })}</span>
                  </span>
                ),
              },
              { key: "phone", header: t("phone"), render: (row) => row.phoneNumber ?? "" },
              { key: "actions", header: t("actions"), render: () => t("noAction") },
            ]}
            rows={teachers.data.rows}
            rowKey={(row) => row.id}
          />
        </Card>
      )}
    </>
  );
}

function StaffForm() {
  const { t } = useTranslation(["technician", "errors", "common"]);
  const options = useRegistrationOptions();
  const staff = useTechnicianStaff();
  const create = useCreateStaff();
  const addRole = useAddRole();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [password, setPassword] = useState(randomPassword);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleNote, setRoleNote] = useState("");

  useEffect(() => {
    setPassword(randomPassword());
  }, []);

  const roleOptions = (options.data?.roles ?? []).map((role) => ({ value: role, label: role }));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const salary = String(form.get("salary") ?? "");
    create.mutate(
      {
        firstName: String(form.get("firstName") ?? ""),
        lastName: String(form.get("lastName") ?? ""),
        role: String(form.get("role") ?? ""),
        jobTitle: String(form.get("jobTitle") ?? ""),
        gender: String(form.get("gender") ?? "Male"),
        phoneNumber: String(form.get("phoneNumber") ?? ""),
        salary: salary === "" ? null : Number(salary),
        hireDate: String(form.get("hireDate") ?? "") || null,
        password,
      },
      {
        onSuccess: (result) => {
          setNotice({ tone: "success", text: t("staffSaved", { username: result.username }) });
          setPassword(randomPassword());
          formEl.reset();
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  }

  return (
    <>
      {notice ? (
        <Alert tone={notice.tone} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card className="mb-6">
        <CardBody>
          <form className="grid gap-4 md:grid-cols-4" onSubmit={onSubmit}>
            <Input name="firstName" label={`${t("givenName")} *`} required />
            <Input name="lastName" label={`${t("fatherName")} *`} required />
            <div>
              <Select name="role" label={`${t("role")} *`} placeholder={t("chooseRole")} options={roleOptions} required />
              <button type="button" className="mt-1 text-sm font-bold text-brand-700" onClick={() => setRoleOpen(true)}>
                {t("addRole")}
              </button>
            </div>
            <Input name="jobTitle" label={t("jobTitleShort")} placeholder={t("jobExample")} />
            <Select
              name="gender"
              label={t("gender")}
              options={[
                { value: "Male", label: t("male") },
                { value: "Female", label: t("female") },
              ]}
            />
            <Input name="phoneNumber" label={t("phone")} placeholder={t("phoneExample")} />
            <Input name="salary" label={t("pay")} type="number" min="0" step="0.01" />
            <Input name="hireDate" label={t("hireDate")} type="date" />
            <div className="md:col-span-2">
              <label className={fieldLabelClass}>{`${t("initialPassword")} *`}</label>
              <div className="flex gap-2">
                <input className={fieldControlClass} value={password} onChange={(event) => setPassword(event.target.value)} required />
                <Button type="button" variant="secondary" onClick={() => setPassword(randomPassword())}>
                  {t("generate")}
                </Button>
              </div>
              <p className="mt-1 text-xs text-ink-muted">{t("passwordNote")}</p>
            </div>
            <div className="md:col-span-4">
              <Button type="submit" loading={create.isPending}>
                {t("registerStaff")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <h2 className="mb-3 font-bold text-ink-strong">{t("staffTableTitle")}</h2>
      {staff.isPending ? (
        <Spinner label={t("common:loading")} />
      ) : staff.isError ? (
        <Alert tone="danger">{t(`errors:${toErrorKey(staff.error)}`)}</Alert>
      ) : (
        <Card>
          <Table
            columns={[
              { key: "name", header: t("staffName"), render: (row) => row.name },
              { key: "role", header: t("staffRole"), render: (row) => row.role },
              { key: "job", header: t("staffJob"), render: (row) => row.jobTitle },
              { key: "user", header: t("username"), render: (row) => row.username ?? "" },
              { key: "status", header: t("status"), render: (row) => (row.active ? t("active") : t("closed")) },
            ]}
            rows={staff.data.rows}
            rowKey={(row) => row.id}
          />
        </Card>
      )}
      <Modal
        open={roleOpen}
        title={t("roleModalTitle")}
        onClose={() => {
          setRoleOpen(false);
          setRoleNote("");
        }}
        footer={
          <Button
            type="button"
            loading={addRole.isPending}
            onClick={() => {
              const name = roleName.trim();
              if (!name) {
                setRoleNote(t("roleNameRequired"));
                return;
              }
              addRole.mutate(name, {
                onError: () => setRoleNote(t("roleError")),
              });
            }}
          >
            {t("saveRole")}
          </Button>
        }
      >
        {roleNote ? (
          <Alert tone="danger" className="mb-3">
            {roleNote}
          </Alert>
        ) : null}
        <div className="grid gap-3">
          <Input label={`${t("roleName")} *`} value={roleName} placeholder={t("roleNameExample")} onChange={(event) => setRoleName(event.target.value)} />
          <Select
            label={`${t("dashboardRedirect")} *`}
            options={[
              { value: "staff", label: t("dashStaff") },
              { value: "admin", label: t("dashAdmin") },
              { value: "teacher", label: t("dashTeacher") },
            ]}
          />
          <label>
            <span className={fieldLabelClass}>{t("roleDescription")}</span>
            <textarea className={fieldControlClass} rows={3} placeholder={t("roleDescriptionPlaceholder")} />
          </label>
        </div>
      </Modal>
    </>
  );
}
