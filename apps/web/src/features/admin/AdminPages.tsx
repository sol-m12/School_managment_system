import { useState, type FormEvent, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Spinner, Table, type TableColumn } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useAcademicYear,
  useAddExpense,
  useAddIncome,
  useApprove,
  useApprovals,
  useBackupAction,
  useExpenses,
  useFiles,
  useIncome,
  useProfile,
  useRepeaters,
  useReports,
  useResetPassword,
  useRoleModules,
  useSaveAcademicYear,
  useSaveProfile,
  useSaveSchool,
  useSchedule,
  useSchoolInfo,
  useStudents,
  useTeachers,
  useUnlockGrades,
  useUsers,
  type StudentRow,
} from "./api/useAdmin";

function Panel<T>({ query, children }: { query: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  const { t } = useTranslation(["errors", "common"]);
  if (query.isPending) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (query.isError || query.data === undefined) {
    return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;
  }
  return children(query.data);
}

function Notice({ tone, text }: { tone: "success" | "danger" | null; text: string }) {
  if (!tone) return null;
  return (
    <Alert tone={tone} className="mb-4">
      {text}
    </Alert>
  );
}

const studentColumns = (t: (key: string) => string): TableColumn<StudentRow>[] => [
  { key: "name", header: t("admin:name"), render: (row) => row.fullName },
  { key: "gender", header: t("admin:gender"), render: (row) => (row.gender === "M" ? t("admin:male") : t("admin:female")) },
  { key: "grade", header: t("admin:grade"), render: (row) => row.gradeLevel },
  { key: "section", header: t("admin:section"), render: (row) => row.section ?? "" },
  { key: "year", header: t("admin:year"), render: (row) => row.academicYear },
  { key: "type", header: t("admin:type"), render: (row) => row.registrationType ?? "" },
  { key: "status", header: t("admin:status"), render: (row) => row.submissionStatus ?? "" },
];

export function StudentStatusPage() {
  const { t } = useTranslation("admin");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({ academicYear: "", gradeLevel: "", section: "", gender: "" });
  const query = useRepeaters(filters);
  return (
    <>
      <PageHeader title={t("repeaterTitle")} />
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => value)));
            }}
          >
            <Input label={t("year")} value={draft.academicYear} onChange={(event) => setDraft({ ...draft, academicYear: event.target.value })} />
            <Input label={t("grade")} value={draft.gradeLevel} onChange={(event) => setDraft({ ...draft, gradeLevel: event.target.value })} />
            <Input label={t("section")} value={draft.section} onChange={(event) => setDraft({ ...draft, section: event.target.value })} />
            <Select
              label={t("gender")}
              value={draft.gender}
              options={[
                { value: "M", label: t("male") },
                { value: "F", label: t("female") },
              ]}
              placeholder={t("all")}
              onChange={(event) => setDraft({ ...draft, gender: event.target.value })}
            />
            <Button type="submit">{t("apply")}</Button>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardHeader title={`${t("total")}: ${data.total} · ${t("male")}: ${data.male} · ${t("female")}: ${data.female}`} />
            <Table columns={studentColumns(t)} rows={data.rows} rowKey={(row) => row.id} empty={t("all")} />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function StudentsPage() {
  const { t } = useTranslation("admin");
  const query = useStudents({});
  return (
    <>
      <PageHeader title={t("studentsTitle")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardHeader title={`${t("total")}: ${data.total}`} />
            <Table columns={studentColumns(t)} rows={data.rows} rowKey={(row) => row.id} />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function RosterPage() {
  const { t } = useTranslation("admin");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useStudents(filters);
  return (
    <>
      <PageHeader title={t("rosterTitle")} />
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              setFilters(Object.fromEntries(Object.entries({ gradeLevel, section }).filter(([, value]) => value)));
            }}
          >
            <Input label={t("grade")} value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} />
            <Input label={t("section")} value={section} onChange={(event) => setSection(event.target.value)} />
            <Button type="submit">{t("apply")}</Button>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table columns={studentColumns(t)} rows={data.rows} rowKey={(row) => row.id} />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function TeachersPage() {
  const { t } = useTranslation("admin");
  const query = useTeachers();
  return (
    <>
      <PageHeader title={t("teachersTitle")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "name", header: t("name"), render: (row) => `${row.firstName} ${row.lastName}` },
                { key: "job", header: t("jobTitle"), render: (row) => row.jobTitle },
                { key: "phone", header: t("phoneNumber"), render: (row) => row.phoneNumber ?? "" },
                { key: "home", header: t("homeroom"), render: (row) => (row.isHomeroomAssigned ? t("yes") : t("no")) },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function AcademicYearPage() {
  const { t } = useTranslation(["admin", "errors"]);
  const query = useAcademicYear();
  const save = useSaveAcademicYear();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return (
    <>
      <PageHeader title={t("yearTitle")} description={t("yearSubtitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardBody>
              <form
                className="grid max-w-lg gap-4"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const semester = form.get("semester") === "2" ? "2" : "1";
                  save.mutate(
                    { academicYear: String(form.get("academicYear") ?? ""), semester },
                    {
                      onSuccess: () => setNotice({ tone: "success", text: t("saved") }),
                      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                    },
                  );
                }}
              >
                <p className="text-sm text-ink-muted">
                  {t("yearLabel")}: <strong>{data.academicYear ?? "—"}</strong> · {t("semesterLabel")}: <strong>{data.semester}</strong>
                </p>
                <Input name="academicYear" label={t("changeYear")} defaultValue={data.academicYear ?? ""} required />
                <Select
                  name="semester"
                  label={t("chooseSemester")}
                  defaultValue={data.semester}
                  options={[
                    { value: "1", label: t("semester1") },
                    { value: "2", label: t("semester2") },
                  ]}
                />
                <Button type="submit" loading={save.isPending}>
                  {t("updateSettings")}
                </Button>
                <p className="text-sm text-ink-muted">{t("yearWarning")}</p>
              </form>
            </CardBody>
          </Card>
        )}
      </Panel>
    </>
  );
}

export function PasswordPage() {
  const { t } = useTranslation(["admin", "errors"]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const users = useUsers(search);
  const reset = useResetPassword();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return (
    <>
      <PageHeader title={t("passwordTitle")} description={t("passwordSubtitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Card>
        <CardBody>
          <form
            className="mb-4 flex flex-wrap gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(q);
            }}
          >
            <Input className="min-w-64 flex-1" label={t("findUser")} value={q} onChange={(event) => setQ(event.target.value)} />
            <Button type="submit">{t("apply")}</Button>
          </form>
          <Panel query={users}>
            {(data) => (
              <form
                className="grid max-w-lg gap-4"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  reset.mutate(
                    { userId: Number(form.get("userId")), password: String(form.get("password") ?? "") },
                    {
                      onSuccess: () => setNotice({ tone: "success", text: t("passwordSaved") }),
                      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                    },
                  );
                }}
              >
                <Select
                  name="userId"
                  label={t("findUser")}
                  options={data.rows.map((row) => ({ value: String(row.id), label: `${row.name} (${row.username})` }))}
                  required
                />
                <Input name="password" type="password" label={t("newPassword")} required autoComplete="new-password" />
                <Button type="submit" loading={reset.isPending}>
                  {t("reset")}
                </Button>
              </form>
            )}
          </Panel>
        </CardBody>
      </Card>
    </>
  );
}

export function SchoolInfoPage() {
  const { t } = useTranslation(["admin", "errors"]);
  const query = useSchoolInfo();
  const save = useSaveSchool();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return (
    <>
      <PageHeader title={t("schoolTitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Panel query={query}>
        {(data) => {
          const school = data.school;
          if (!school) return <Alert tone="warning">{t("errors:notFound")}</Alert>;
          return (
            <Card>
              <CardBody>
                <form
                  className="grid max-w-2xl gap-4"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const body = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
                    save.mutate(body, {
                      onSuccess: () => setNotice({ tone: "success", text: t("saved") }),
                      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                    });
                  }}
                >
                  <Input name="schoolName" label={t("schoolName")} defaultValue={school.schoolName} required />
                  <Input name="schoolVision" label={t("vision")} defaultValue={school.schoolVision ?? ""} />
                  <Input name="schoolEmail" label={t("email")} defaultValue={school.schoolEmail ?? ""} />
                  <Input name="schoolPhone" label={t("phone")} defaultValue={school.schoolPhone ?? ""} />
                  <Input name="schoolAddress" label={t("address")} defaultValue={school.schoolAddress ?? ""} />
                  <Input name="aboutText" label={t("about")} defaultValue={school.aboutText ?? ""} />
                  <Input name="schoolNeeds" label={t("needs")} defaultValue={school.schoolNeeds ?? ""} />
                  <Input name="promoVideoUrl" label={t("video")} defaultValue={school.promoVideoUrl ?? ""} />
                  <Button type="submit" loading={save.isPending}>
                    {t("save")}
                  </Button>
                </form>
              </CardBody>
            </Card>
          );
        }}
      </Panel>
    </>
  );
}

export function GradeUnlockPage() {
  const { t } = useTranslation(["admin", "errors"]);
  const unlock = useUnlockGrades();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return (
    <>
      <PageHeader title={t("unlockTitle")} description={t("unlockSubtitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Card>
        <CardBody>
          <p className="mb-4 text-sm text-ink-muted">{t("unlockHelp")}</p>
          <form
            className="grid max-w-lg gap-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!window.confirm(t("unlockConfirm"))) return;
              const form = new FormData(event.currentTarget);
              const rawStudent = String(form.get("studentId") ?? "").trim();
              unlock.mutate(
                {
                  studentId: rawStudent === "" || rawStudent === "0" ? null : Number(rawStudent),
                  subjectId: Number(form.get("subjectId")),
                  academicYear: String(form.get("academicYear") ?? ""),
                  semester: form.get("semester") === "2" ? "2" : "1",
                },
                {
                  onSuccess: () => setNotice({ tone: "success", text: t("unlocked") }),
                  onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                },
              );
            }}
          >
            <Input name="studentId" label={t("studentId")} inputMode="numeric" />
            <Input name="subjectId" label={t("subjectId")} inputMode="numeric" required />
            <Input name="academicYear" label={t("year")} required />
            <Select
              name="semester"
              label={t("semesterLabel")}
              defaultValue="1"
              options={[
                { value: "1", label: t("semester1") },
                { value: "2", label: t("semester2") },
              ]}
            />
            <Button type="submit" loading={unlock.isPending}>
              {t("unlockAction")}
            </Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}

export function ApprovalsPage() {
  const { t } = useTranslation(["admin", "errors"]);
  const query = useApprovals();
  const approve = useApprove();
  const [tab, setTab] = useState<"registration" | "attendance" | "staff">("registration");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const run = (action: Parameters<typeof approve.mutate>[0]) => {
    approve.mutate(action, {
      onSuccess: () => setNotice({ tone: "success", text: t("approved") }),
      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
    });
  };
  return (
    <>
      <PageHeader title={t("approvalsTitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["registration", "attendance", "staff"] as const).map((item) => (
          <Button key={item} type="button" variant={tab === item ? "primary" : "secondary"} onClick={() => setTab(item)}>
            {t(item === "registration" ? "registrationTab" : item === "attendance" ? "attendanceTab" : "staffTab")}
          </Button>
        ))}
      </div>
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardBody>
              {tab === "registration" ? (
                <Table
                  columns={[
                    { key: "grade", header: t("grade"), render: (row) => row.gradeLevel },
                    { key: "type", header: t("type"), render: (row) => row.registrationType },
                    { key: "m", header: t("male"), render: (row) => row.male },
                    { key: "f", header: t("female"), render: (row) => row.female },
                    { key: "t", header: t("total"), render: (row) => row.total },
                    {
                      key: "act",
                      header: t("approve"),
                      render: (row) => (
                        <Button type="button" onClick={() => run({ kind: "students", gradeLevel: row.gradeLevel })}>
                          {t("approve")}
                        </Button>
                      ),
                    },
                  ]}
                  rows={data.registration}
                  rowKey={(row) => `${row.gradeLevel}-${row.registrationType}`}
                />
              ) : null}
              {tab === "staff" ? (
                <Table
                  columns={[
                    { key: "name", header: t("name"), render: (row) => `${row.firstName} ${row.lastName}` },
                    { key: "role", header: t("roles"), render: (row) => row.role },
                    { key: "job", header: t("jobTitle"), render: (row) => row.jobTitle },
                    {
                      key: "act",
                      header: t("approve"),
                      render: (row) => (
                        <Button type="button" onClick={() => run({ kind: "staff", id: row.id })}>
                          {t("approve")}
                        </Button>
                      ),
                    },
                  ]}
                  rows={data.staff}
                  rowKey={(row) => row.id}
                />
              ) : null}
              {tab === "attendance" ? (
                <form
                  className="grid max-w-lg gap-4"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    run({
                      kind: "attendance",
                      recordedBy: Number(form.get("recordedBy")),
                      startDate: String(form.get("startDate") ?? ""),
                      endDate: String(form.get("endDate") ?? ""),
                    });
                  }}
                >
                  <Select
                    name="recordedBy"
                    label={t("recordedBy")}
                    options={data.attendance.map((row) => ({ value: String(row.recordedBy), label: `${row.recordedBy} (${row.total})` }))}
                    required
                  />
                  <Input name="startDate" type="date" label={t("startDate")} required />
                  <Input name="endDate" type="date" label={t("endDate")} required />
                  <Button type="submit">{t("approve")}</Button>
                </form>
              ) : null}
            </CardBody>
          </Card>
        )}
      </Panel>
    </>
  );
}

export function StoreApprovalsPage() {
  const { t } = useTranslation("admin");
  return (
    <>
      <PageHeader title={t("storeTitle")} />
      <Card>
        <CardBody>
          <p>{t("storeEmpty")}</p>
        </CardBody>
      </Card>
    </>
  );
}

export function SchedulePage() {
  const { t } = useTranslation("admin");
  const query = useSchedule();
  return (
    <>
      <PageHeader title={t("scheduleTitle")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardHeader title={data.academicYear ?? ""} />
            <Table
              columns={[
                { key: "day", header: t("day"), render: (row) => row.dayOfWeek },
                { key: "period", header: t("period"), render: (row) => row.periodNumber },
                { key: "time", header: t("time"), render: (row) => `${row.startTime}–${row.endTime}` },
                { key: "class", header: t("grade"), render: (row) => (row.gradeLevel ? `${row.gradeLevel}${row.section ?? ""}` : "") },
                { key: "subject", header: t("subject"), render: (row) => row.subjectName ?? "" },
                { key: "teacher", header: t("teacher"), render: (row) => row.teacherName },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function ReportsPage() {
  const { t } = useTranslation("admin");
  const query = useReports();
  return (
    <>
      <PageHeader title={t("reportsTitle")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "name", header: t("name"), render: (row) => row.studentName ?? "" },
                { key: "year", header: t("year"), render: (row) => row.academicYear ?? "" },
                { key: "avg", header: t("average"), render: (row) => row.yearlyAvg ?? "" },
                { key: "rank", header: t("rank"), render: (row) => row.finalRank ?? "" },
                { key: "remark", header: t("remark"), render: (row) => row.remark ?? "" },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function FilesPage() {
  const { t } = useTranslation("admin");
  const query = useFiles();
  return (
    <>
      <PageHeader title={t("filesTitle")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "title", header: t("fileTitle"), render: (row) => row.title ?? "" },
                { key: "cat", header: t("category"), render: (row) => row.category ?? "" },
                { key: "type", header: t("type"), render: (row) => row.fileType ?? "" },
                { key: "year", header: t("year"), render: (row) => row.academicYear ?? "" },
                { key: "role", header: t("roles"), render: (row) => row.targetRole ?? "" },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function ProfilePage() {
  const { t } = useTranslation(["admin", "errors"]);
  const query = useProfile();
  const save = useSaveProfile();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return (
    <>
      <PageHeader title={t("profileTitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardBody>
              <p className="mb-4 font-semibold">{data.profile.name}</p>
              <form
                className="grid max-w-lg gap-4"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const password = String(form.get("password") ?? "");
                  save.mutate(
                    { username: String(form.get("username") ?? ""), ...(password ? { password } : {}) },
                    {
                      onSuccess: () => setNotice({ tone: "success", text: t("profileSaved") }),
                      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                    },
                  );
                }}
              >
                <Input name="username" label={t("username")} defaultValue={data.profile.username} required />
                <Input name="password" type="password" label={t("passwordOptional")} autoComplete="new-password" />
                <Button type="submit" loading={save.isPending}>
                  {t("save")}
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </Panel>
    </>
  );
}

export function RoleModulesPage() {
  const { t } = useTranslation("admin");
  const query = useRoleModules();
  return (
    <>
      <PageHeader title={t("roleModulesTitle")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "p", header: t("permission"), render: (row) => row.permission },
                { key: "r", header: t("roles"), render: (row) => row.roles.join(", ") },
              ]}
              rows={data.rows}
              rowKey={(row) => row.permission}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function BackupPage({ restore = false }: { restore?: boolean }) {
  const { t } = useTranslation(["admin", "errors"]);
  const action = useBackupAction();
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <>
      <PageHeader title={restore ? t("restoreTitle") : t("backupTitle")} />
      {notice ? <Alert tone="warning" className="mb-4">{notice}</Alert> : null}
      <Card>
        <CardBody>
          <p className="mb-4 text-sm text-ink-muted">{t("backupBlocked")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() =>
                action.mutate(restore ? "/admin/restore" : "/admin/backup", {
                  onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)),
                })
              }
            >
              {restore ? t("restoreTitle") : t("backupFull")}
            </Button>
            {restore ? null : (
              <Button type="button" variant="secondary" onClick={() => action.mutate("/admin/backup", { onError: (error) => setNotice(t(`errors:${toErrorKey(error)}`)) })}>
                {t("backupSchema")}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
}

export function IncomePage() {
  const { t } = useTranslation(["admin", "errors"]);
  const query = useIncome();
  const add = useAddIncome();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return (
    <>
      <PageHeader title={t("incomeTitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              add.mutate(
                { source: String(form.get("source") ?? ""), amount: String(form.get("amount") ?? ""), dateReceived: String(form.get("dateReceived") ?? "") },
                {
                  onSuccess: () => setNotice({ tone: "success", text: t("incomeSaved") }),
                  onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                },
              );
            }}
          >
            <Input name="source" label={t("source")} required />
            <Input name="amount" label={t("amount")} required />
            <Input name="dateReceived" type="date" label={t("date")} required />
            <Button type="submit">{t("addIncome")}</Button>
          </form>
        </CardBody>
      </Card>
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "s", header: t("source"), render: (row) => row.source },
                { key: "a", header: t("amount"), render: (row) => row.amount },
                { key: "d", header: t("date"), render: (row) => row.dateReceived },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function ExpensePage() {
  const { t } = useTranslation(["admin", "errors"]);
  const income = useIncome();
  const expenses = useExpenses();
  const add = useAddExpense();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return (
    <>
      <PageHeader title={t("expenseTitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Card className="mb-4">
        <CardBody>
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              add.mutate(
                {
                  category: String(form.get("category") ?? ""),
                  amount: String(form.get("amount") ?? ""),
                  datePaid: String(form.get("datePaid") ?? ""),
                  description: String(form.get("description") ?? ""),
                },
                {
                  onSuccess: () => setNotice({ tone: "success", text: t("expenseSaved") }),
                  onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                },
              );
            }}
          >
            <Input name="category" label={t("category")} required />
            <Input name="amount" label={t("amount")} required />
            <Input name="datePaid" type="date" label={t("date")} required />
            <Input name="description" label={t("description")} />
            <Button type="submit">{t("addExpense")}</Button>
          </form>
        </CardBody>
      </Card>
      <Panel query={income}>
        {(data) => (
          <Card className="mb-4">
            <CardHeader title={t("incomeTitle")} />
            <Table
              columns={[
                { key: "s", header: t("source"), render: (row) => row.source },
                { key: "a", header: t("amount"), render: (row) => row.amount },
                { key: "d", header: t("date"), render: (row) => row.dateReceived },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
            />
          </Card>
        )}
      </Panel>
      <Panel query={expenses}>
        {(data) => (
          <Card>
            <CardHeader title={t("expenseTitle")} />
            <Table
              columns={[
                { key: "c", header: t("category"), render: (row) => row.category },
                { key: "a", header: t("amount"), render: (row) => row.amount },
                { key: "d", header: t("date"), render: (row) => row.datePaid },
                { key: "n", header: t("description"), render: (row) => row.description ?? "" },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}
