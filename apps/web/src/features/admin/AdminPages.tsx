import { Printer } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Spinner, Table, type TableColumn } from "@/components/ui";
import { api } from "@/lib/api";
import { toErrorKey } from "@/lib/apiError";
import {
  useBackupCheck,
  useDownloadSchoolBackup,
  useGradeProtocol,
  useMonitoring,
  useRecordNotice,
  useResetToId,
  useYearAction,
} from "@/features/operations/api/useOperations";
import { useSessionUser } from "@/features/auth/authContext";
import { CourseFilesPage } from "@/features/teacher/CourseFilesPage";
import { LockedProfilePage } from "@/features/teacher/LockedProfilePage";
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
  useDecideStoreApproval,
  useSchoolInfo,
  useStoreApprovals,
  useStudents,
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

const studentColumns = (t: TFunction<"admin">): TableColumn<StudentRow>[] => [
  { key: "name", header: t("name"), render: (row) => row.fullName },
  { key: "gender", header: t("gender"), render: (row) => (row.gender === "M" ? t("male") : t("female")) },
  { key: "grade", header: t("grade"), render: (row) => row.gradeLevel },
  { key: "section", header: t("section"), render: (row) => row.section ?? "" },
  { key: "year", header: t("year"), render: (row) => row.academicYear },
  { key: "type", header: t("type"), render: (row) => row.registrationType ?? "" },
  { key: "status", header: t("status"), render: (row) => row.submissionStatus ?? "" },
];

const filterControl = "w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#334155] outline-none focus:border-[#009B48]";

export function StudentStatusPage() {
  const { t } = useTranslation(["admin", "common", "errors"]);
  const [draft, setDraft] = useState({ academicYear: "", gradeLevel: "", section: "", gender: "" });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState(false);
  const query = useRepeaters(filters);

  useEffect(() => {
    if (seeded || !query.data) return;
    const academicYear = query.data.academicYear ?? "";
    setDraft((current) => ({ ...current, academicYear }));
    setSeeded(true);
    if (academicYear) setFilters({ academicYear });
  }, [seeded, query.data]);

  function apply(next: typeof draft) {
    setDraft(next);
    setFilters(Object.fromEntries(Object.entries(next).filter(([, value]) => value)));
  }

  if (query.isPending && !query.data) {
    return (
      <div className="flex justify-center py-10 text-brand-700">
        <Spinner size="lg" label={t("common:loading")} />
      </div>
    );
  }
  if (query.isError || !query.data) return <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}`)}</Alert>;

  const data = query.data;
  const yearLabel = draft.academicYear || data.academicYear;
  const genderLabel = draft.gender === "M" ? t("admin:repeaterMaleOption") : draft.gender === "F" ? t("admin:repeaterFemaleOption") : "";

  return (
    <div className="-m-4 bg-[#f8fafc] px-4 py-5 font-sans text-[#334155] md:-m-6 md:px-6 print:m-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[#0B192C] px-5 py-4 text-white print:hidden">
          <div>
            <h1 className="m-0 text-xl font-bold">{t("admin:repeaterTitle")}</h1>
            <p className="mt-1 text-[0.82rem] text-[#94a3b8]">
              {t("admin:repeaterYearLine")}: <b>{yearLabel}</b>
            </p>
          </div>
          <span className="rounded-md border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.2)] px-3 py-1.5 text-sm">
            {t("admin:repeaterCount")}: <b className="text-[#F59E0B]">{data.total}</b>
          </span>
        </div>

        <form className="mb-5 flex flex-wrap items-end gap-4 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-[0_2px_6px_rgba(0,0,0,0.04)] print:hidden">
          <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm font-semibold">
            {t("admin:repeaterYearLabel")}
            <input className={filterControl} value={draft.academicYear} onChange={(event) => apply({ ...draft, academicYear: event.target.value })} />
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm font-semibold">
            {t("admin:repeaterGradeLabel")}
            <select className={filterControl} value={draft.gradeLevel} onChange={(event) => apply({ ...draft, gradeLevel: event.target.value })}>
              <option value="">{t("admin:repeaterAllGrades")}</option>
              {data.grades.map((grade) => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm font-semibold">
            {t("admin:repeaterSectionLabel")}
            <select className={filterControl} value={draft.section} onChange={(event) => apply({ ...draft, section: event.target.value })}>
              <option value="">{t("admin:repeaterAllSections")}</option>
              {data.sections.filter(Boolean).map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm font-semibold">
            {t("admin:repeaterGenderLabel")}
            <select className={filterControl} value={draft.gender} onChange={(event) => apply({ ...draft, gender: event.target.value })}>
              <option value="">{t("admin:repeaterAllGenders")}</option>
              <option value="M">{t("admin:repeaterMaleOption")}</option>
              <option value="F">{t("admin:repeaterFemaleOption")}</option>
            </select>
          </label>
          <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#0B192C] px-4 text-sm font-semibold text-white" onClick={() => window.print()}>
            <Printer aria-hidden="true" className="size-4" />
            {t("admin:repeaterPrint")}
          </button>
        </form>

        <table className="mb-5 w-full max-w-[400px] overflow-hidden rounded-md border border-[#E2E8F0] bg-white text-center text-sm">
          <thead>
            <tr className="bg-[#1e293b] text-white">
              <th className="px-4 py-2.5 font-semibold">{t("admin:repeaterMaleHead")}</th>
              <th className="px-4 py-2.5 font-semibold">{t("admin:repeaterFemaleHead")}</th>
              <th className="px-4 py-2.5 font-semibold">{t("admin:repeaterTotalHead")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-bold">
              <td className="border-t border-[#E2E8F0] px-4 py-2.5 text-[#2563eb]">{data.male}</td>
              <td className="border-t border-[#E2E8F0] px-4 py-2.5 text-[#db2777]">{data.female}</td>
              <td className="border-t border-[#E2E8F0] px-4 py-2.5 text-[#d97706]">{data.total}</td>
            </tr>
          </tbody>
        </table>

        <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0B192C] px-4 py-3 text-sm font-semibold text-white">
            <span>{t("admin:repeaterTableTitle", { year: yearLabel })}</span>
            <span className="text-[0.85rem] text-[#cbd5e1]">
              {draft.gradeLevel ? t("admin:repeaterChipGrade", { value: draft.gradeLevel }) : ""}
              {draft.section ? ` ${t("admin:repeaterChipSection", { value: draft.section })}` : ""}
              {genderLabel ? ` ${t("admin:repeaterChipGender", { value: genderLabel })}` : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap border-collapse text-sm">
              <thead>
                <tr className="bg-[#0B192C] text-left text-white">
                  <th className="w-12 px-4 py-3 font-semibold">{t("admin:repeaterColNo")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin:repeaterColName")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin:repeaterColGender")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin:repeaterColKebele")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin:repeaterColGote")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin:repeaterColGrade")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin:repeaterColSection")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#64748b]">{t("admin:repeaterEmpty")}</td>
                  </tr>
                ) : data.rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-[#E2E8F0] hover:bg-[#F1F5F9]">
                    <td className="px-4 py-2.5">{index + 1}</td>
                    <td className="px-4 py-2.5">{row.fullName}</td>
                    <td className="px-4 py-2.5">{row.gender}</td>
                    <td className="px-4 py-2.5">{row.kebele ?? ""}</td>
                    <td className="px-4 py-2.5">{row.gote ?? ""}</td>
                    <td className="px-4 py-2.5">{row.gradeLevel}</td>
                    <td className="px-4 py-2.5">{row.section ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
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

export function AcademicYearPage() {
  const { t } = useTranslation(["admin", "operations", "errors"]);
  const query = useAcademicYear();
  const save = useSaveAcademicYear();
  const yearAction = useYearAction();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const run = (action: "lock" | "archive" | "rollover", text: string) => {
    yearAction.mutate(action, {
      onSuccess: () => setNotice({ tone: "success", text }),
      onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
    });
  };
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
                <p className="text-sm text-ink-muted">
                  {t("operations:gateLabel")}: <strong>{data.gate === "locked" ? t("operations:gateLocked") : t("operations:gateOpen")}</strong>
                  {" · "}
                  {t("operations:archivedYears")}: <strong>{data.archived.length > 0 ? data.archived.join(", ") : t("operations:noneArchived")}</strong>
                </p>
                <p className="text-sm text-ink-muted">{t("operations:ecYearHint")}</p>
                <Input name="academicYear" label={t("changeYear")} defaultValue={data.academicYear ?? ""} required />
                <Select
                  name="semester"
                  label={t("chooseSemester")}
                  defaultValue={data.semester}
                  options={[
                    { value: "1", label: t("operations:semester1Range") },
                    { value: "2", label: t("operations:semester2Range") },
                  ]}
                />
                <Button type="submit" loading={save.isPending}>
                  {t("updateSettings")}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" loading={yearAction.isPending} onClick={() => run("lock", t("operations:yearLockedDone"))}>
                    {t("operations:lockYear")}
                  </Button>
                  <Button type="button" variant="secondary" loading={yearAction.isPending} onClick={() => run("archive", t("operations:yearArchivedDone"))}>
                    {t("operations:archiveYear")}
                  </Button>
                  <Button type="button" variant="secondary" loading={yearAction.isPending} onClick={() => run("rollover", t("operations:yearRolled"))}>
                    {t("operations:rolloverYear")}
                  </Button>
                </div>
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
  const { t } = useTranslation(["admin", "operations", "errors"]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const users = useUsers(search);
  const reset = useResetPassword();
  const resetToId = useResetToId();
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
                <Input name="password" type="password" label={t("newPassword")} autoComplete="new-password" />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" loading={reset.isPending}>
                    {t("reset")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={resetToId.isPending}
                    onClick={(event) => {
                      const form = event.currentTarget.form;
                      const userId = Number(new FormData(form ?? undefined).get("userId"));
                      if (!userId) return;
                      resetToId.mutate(userId, {
                        onSuccess: () => setNotice({ tone: "success", text: t("operations:resetToIdDone") }),
                        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                      });
                    }}
                  >
                    {t("operations:resetToId")}
                  </Button>
                </div>
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
  const { t } = useTranslation(["admin", "operations", "errors"]);
  const protocol = useGradeProtocol();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  return (
    <>
      <PageHeader title={t("unlockTitle")} description={t("unlockSubtitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Card>
        <CardBody>
          <p className="mb-4 text-sm text-ink-muted">{t("operations:protocolHelp")}</p>
          <form
            className="grid max-w-lg gap-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const action = form.get("action") === "lock" ? "lock" : "unlock";
              if (action === "unlock" && !window.confirm(t("unlockConfirm"))) return;
              const rawStudent = String(form.get("studentId") ?? "").trim();
              protocol.mutate(
                {
                  action,
                  studentId: rawStudent === "" || rawStudent === "0" ? null : Number(rawStudent),
                  subjectId: Number(form.get("subjectId")),
                  academicYear: String(form.get("academicYear") ?? ""),
                  semester: form.get("semester") === "2" ? "2" : "1",
                  reason: String(form.get("reason") ?? ""),
                },
                {
                  onSuccess: () => setNotice({ tone: "success", text: action === "lock" ? t("operations:marksLocked") : t("operations:marksUnlocked") }),
                  onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                },
              );
            }}
          >
            <Select
              name="action"
              label={t("operations:action")}
              defaultValue="unlock"
              options={[
                { value: "unlock", label: t("operations:unlockMarks") },
                { value: "lock", label: t("operations:lockMarks") },
              ]}
            />
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
            <Input name="reason" label={t("operations:reason")} required minLength={8} />
            <Button type="submit" loading={protocol.isPending}>
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
  const { t } = useTranslation(["admin", "errors"]);
  const query = useStoreApprovals();
  const decide = useDecideStoreApproval();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const run = (id: number, action: "approve" | "reject") => {
    if (action === "reject" && !window.confirm(t("storeRejectConfirm"))) return;
    decide.mutate(
      { id, action },
      {
        onSuccess: () => setNotice({ tone: "success", text: action === "approve" ? t("approved") : t("storeRejected") }),
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  };

  return (
    <>
      <PageHeader title={t("storeTitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "ref", header: t("storeRef"), render: (row) => row.refCode },
                { key: "who", header: t("storeRequester"), render: (row) => row.requesterName },
                { key: "dept", header: t("storeDepartment"), render: (row) => row.department },
                { key: "item", header: t("storeItem"), render: (row) => `${row.itemName} [${row.itemCode}]` },
                { key: "qty", header: t("storeQty"), render: (row) => row.quantityRequested },
                { key: "stock", header: t("storeStock"), render: (row) => row.currentStock },
                { key: "why", header: t("storePurpose"), render: (row) => row.purpose },
                { key: "date", header: t("date"), render: (row) => row.createdAt },
                {
                  key: "act",
                  header: t("approve"),
                  render: (row) => (
                    <div className="flex gap-2">
                      <Button type="button" loading={decide.isPending} onClick={() => run(row.id, "approve")}>
                        {t("approve")}
                      </Button>
                      <Button type="button" variant="danger" loading={decide.isPending} onClick={() => run(row.id, "reject")}>
                        {t("storeReject")}
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("storeEmpty")}
            />
          </Card>
        )}
      </Panel>
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
  const user = useSessionUser();
  if (user.role === "Teacher") return <CourseFilesPage />;
  return <SchoolFilesPage />;
}

function SchoolFilesPage() {
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
  const user = useSessionUser();
  if (user.role === "Teacher") return <LockedProfilePage />;
  return <EditableProfilePage />;
}

function EditableProfilePage() {
  const { t } = useTranslation(["admin", "errors"]);
  const query = useProfile();
  const save = useSaveProfile();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoName = query.data?.profile.photo;
  useEffect(() => {
    if (!photoName || photoName === "default_profile.png") {
      setPhotoUrl(null);
      return;
    }
    let url = "";
    let cancel = false;
    void api
      .get("/admin/profile/photo", { responseType: "blob" })
      .then((response) => {
        if (cancel) return;
        url = URL.createObjectURL(response.data);
        setPhotoUrl(url);
      })
      .catch(() => setPhotoUrl(null));
    return () => {
      cancel = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photoName]);
  return (
    <>
      <PageHeader title={t("profileTitle")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <CardBody>
              <div className="mb-4 flex items-center gap-4">
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="size-20 rounded-full object-cover" />
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-full bg-brand-700 font-bold text-white">{data.profile.name.slice(0, 1)}</div>
                )}
                <div>
                  <p className="font-semibold">{data.profile.name}</p>
                  <label className="mt-2 block text-sm font-bold">
                    {t("profilePhoto")}
                    <input
                      className="mt-1 block text-sm"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const body = new FormData();
                        body.append("photo", file);
                        void api
                          .post("/admin/profile/photo", body)
                          .then(() => {
                            setNotice({ tone: "success", text: t("profilePhotoSaved") });
                            void query.refetch();
                          })
                          .catch((error: unknown) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }));
                      }}
                    />
                  </label>
                </div>
              </div>
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
  const { t } = useTranslation(["admin", "operations", "errors"]);
  const action = useBackupAction();
  const downloadBackup = useDownloadSchoolBackup();
  const monitoring = useMonitoring();
  const recordCheck = useBackupCheck();
  const recordNotice = useRecordNotice();
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "warning"; text: string } | null>(null);
  return (
    <>
      <PageHeader title={restore ? t("restoreTitle") : t("backupTitle")} description={t("operations:monitorHelp")} />
      {notice ? (
        <Alert tone={notice.tone === "success" ? "success" : notice.tone === "danger" ? "danger" : "warning"} className="mb-4">
          {notice.text}
        </Alert>
      ) : null}
      <Card className="mb-4">
        <CardBody>
          <p className="mb-4 text-sm text-ink-muted">
            {restore ? t("backupBlocked") : t("operations:schoolBackupHelp")}
          </p>
          <div className="flex flex-wrap gap-2">
            {restore ? (
              <Button
                type="button"
                onClick={() =>
                  action.mutate("/admin/restore", {
                    onError: (error) => setNotice({ tone: "warning", text: t(`errors:${toErrorKey(error)}`) }),
                  })
                }
              >
                {t("restoreTitle")}
              </Button>
            ) : (
              <Button
                type="button"
                loading={downloadBackup.isPending}
                onClick={() =>
                  downloadBackup.mutate(undefined, {
                    onSuccess: () => setNotice({ tone: "success", text: t("operations:schoolBackupDone") }),
                    onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                  })
                }
              >
                {t("operations:downloadSchoolBackup")}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              loading={recordCheck.isPending}
              onClick={() =>
                recordCheck.mutate(restore ? "restore" : "backup", {
                  onSuccess: () => setNotice({ tone: "success", text: t("operations:checkRecorded") }),
                  onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                })
              }
            >
              {t("operations:recordCheck")}
            </Button>
          </div>
        </CardBody>
      </Card>
      <Panel query={monitoring}>
        {(data) => (
          <div className="grid gap-4">
            <Card>
              <CardHeader title={t("operations:monitorTitle")} />
              <CardBody>
                <p className="text-sm text-ink-muted">
                  {t("operations:emailChannel")}: {data.channels.emailReady ? t("operations:ready") : t("operations:missingChannel")}
                </p>
                <p className="text-sm text-ink-muted">
                  {t("operations:phoneChannel")}: {data.channels.phoneReady ? t("operations:ready") : t("operations:missingChannel")}
                </p>
              </CardBody>
            </Card>
            {restore ? null : (
              <Card>
                <CardHeader title={t("operations:noticeForm")} />
                <CardBody>
                  <form
                    className="grid max-w-xl gap-4"
                    onSubmit={(event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const rawChannel = String(form.get("channel") ?? "letter");
                      const channel = rawChannel === "phone" || rawChannel === "email" ? rawChannel : "letter";
                      recordNotice.mutate(
                        {
                          channel,
                          recipient: String(form.get("recipient") ?? ""),
                          referenceNo: String(form.get("referenceNo") ?? ""),
                          subject: String(form.get("subject") ?? ""),
                          sentOn: String(form.get("sentOn") ?? ""),
                        },
                        {
                          onSuccess: () => setNotice({ tone: "success", text: t("operations:noticeSaved") }),
                          onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                        },
                      );
                    }}
                  >
                    <Select
                      name="channel"
                      label={t("operations:channel")}
                      defaultValue="letter"
                      options={[
                        { value: "letter", label: t("operations:letter") },
                        { value: "phone", label: t("operations:phone") },
                        { value: "email", label: t("operations:email") },
                      ]}
                    />
                    <Input name="recipient" label={t("operations:recipient")} required />
                    <Input name="referenceNo" label={t("operations:referenceNo")} required />
                    <Input name="subject" label={t("operations:subjectLabel")} required />
                    <Input name="sentOn" type="date" label={t("operations:sentOn")} required />
                    <Button type="submit" loading={recordNotice.isPending}>
                      {t("operations:recordNotice")}
                    </Button>
                  </form>
                </CardBody>
              </Card>
            )}
            <Card>
              <CardHeader title={t("operations:runsTitle")} />
              <Table
                columns={[
                  { key: "when", header: t("operations:when"), render: (row) => row.createdAt },
                  { key: "action", header: t("operations:action"), render: (row) => row.action },
                  { key: "note", header: t("operations:description"), render: (row) => row.note ?? row.status },
                ]}
                rows={data.runs}
                rowKey={(row) => row.id}
                empty={t("operations:noRuns")}
              />
            </Card>
            <Card>
              <CardHeader title={t("operations:noticesTitle")} />
              <Table
                columns={[
                  { key: "when", header: t("operations:sentOn"), render: (row) => row.sentOn },
                  { key: "channel", header: t("operations:channel"), render: (row) => row.channel },
                  { key: "who", header: t("operations:recipient"), render: (row) => row.recipient },
                  { key: "ref", header: t("operations:referenceNo"), render: (row) => row.referenceNo },
                  { key: "subject", header: t("operations:subjectLabel"), render: (row) => row.subject },
                ]}
                rows={data.notices}
                rowKey={(row) => row.id}
                empty={t("operations:noNotices")}
              />
            </Card>
          </div>
        )}
      </Panel>
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
