import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Card, CardBody, CardHeader, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useCreateParent,
  useLinkParent,
  useLookupParent,
  useManagedParents,
  useParentStudents,
  useUnlinkParent,
} from "./api/useParents";

function Notice({ tone, text }: { tone: "success" | "danger" | null; text: string }) {
  if (!tone || !text) return null;
  return (
    <Alert tone={tone} className="mb-4">
      {text}
    </Alert>
  );
}

export function ParentsPage() {
  const { t } = useTranslation(["parents", "errors"]);
  const list = useManagedParents();
  const students = useParentStudents();
  const create = useCreateParent();
  const lookup = useLookupParent();
  const link = useLinkParent();
  const unlink = useUnlinkParent();

  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [parentCode, setParentCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [lookedUp, setLookedUp] = useState<{ parentCode: string; displayName: string } | null>(null);

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      { username, password, displayName },
      {
        onSuccess: (result) => {
          setNotice({
            tone: "success",
            text: t("parentCreated", { username: result.data.username, code: result.data.parentCode }),
          });
          setUsername("");
          setPassword("");
          setDisplayName("");
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  };

  const onLookup = (event: FormEvent) => {
    event.preventDefault();
    lookup.mutate(parentCode, {
      onSuccess: (data) => {
        setLookedUp({ parentCode: data.parentCode, displayName: data.displayName });
        setParentCode(data.parentCode);
        setNotice({ tone: "success", text: t("lookupOk", { name: data.displayName }) });
      },
      onError: (error) => {
        setLookedUp(null);
        setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
      },
    });
  };

  const onLink = (event: FormEvent) => {
    event.preventDefault();
    const id = Number(studentId);
    if (!Number.isFinite(id) || id <= 0) {
      setNotice({ tone: "danger", text: t("errors:validation") });
      return;
    }
    link.mutate(
      { parentCode: parentCode.trim(), studentId: id },
      {
        onSuccess: () => {
          setNotice({ tone: "success", text: t("linkOk") });
          setStudentId("");
        },
        onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
      },
    );
  };

  return (
    <>
      <PageHeader title={t("title")} description={t("help")} />
      <Notice tone={notice?.tone ?? null} text={notice?.text ?? ""} />

      <div className="grid gap-4">
        <Card>
          <CardHeader title={t("createTitle")} />
          <CardBody>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
              <Input label={t("displayName")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              <Input label={t("username")} value={username} onChange={(e) => setUsername(e.target.value)} required />
              <Input
                label={t("password")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <div className="flex items-end">
                <Button type="submit" loading={create.isPending}>
                  {t("create")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("linkTitle")} />
          <CardBody>
            <form className="mb-3 flex flex-wrap gap-3" onSubmit={onLookup}>
              <Input label={t("parentCode")} value={parentCode} onChange={(e) => setParentCode(e.target.value)} required />
              <div className="flex items-end">
                <Button type="submit" loading={lookup.isPending}>
                  {t("lookup")}
                </Button>
              </div>
            </form>
            {lookedUp ? <p className="mb-3 text-sm">{t("lookupResult", { name: lookedUp.displayName, code: lookedUp.parentCode })}</p> : null}
            <form className="flex flex-wrap gap-3" onSubmit={onLink}>
              {students.isPending ? (
                <Spinner />
              ) : students.isError ? (
                <Alert tone="danger">{t(`errors:${toErrorKey(students.error)}`)}</Alert>
              ) : students.data && students.data.length === 0 ? (
                <Alert tone="warning">
                  {t("noStudents")}{" "}
                  <a className="underline" href="/secretary/students">
                    {t("studentsLink")}
                  </a>
                </Alert>
              ) : (
                <Select
                  label={t("student")}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  placeholder={t("chooseStudent")}
                  options={(students.data ?? []).map((row) => ({
                    value: String(row.id),
                    label: `${row.name} (${row.gradeLevel}${row.section ? `-${row.section}` : ""})`,
                  }))}
                />
              )}
              <div className="flex items-end">
                <Button type="submit" loading={link.isPending} disabled={!students.data?.length}>
                  {t("link")}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <Alert tone="danger">{t(`errors:${toErrorKey(list.error)}`)}</Alert>
        ) : (
          <>
            <Card>
              <CardHeader title={t("parentsList")} />
              <Table
                columns={[
                  { key: "name", header: t("displayName"), render: (row) => row.displayName },
                  { key: "username", header: t("username"), render: (row) => row.username },
                  { key: "code", header: t("parentCode"), render: (row) => row.parentCode },
                ]}
                rows={list.data.parents}
                rowKey={(row) => row.userId}
                empty={t("emptyParents")}
              />
            </Card>
            <Card>
              <CardHeader title={t("linksList")} />
              <Table
                columns={[
                  { key: "parent", header: t("displayName"), render: (row) => row.displayName },
                  { key: "code", header: t("parentCode"), render: (row) => row.parentCode },
                  { key: "student", header: t("student"), render: (row) => `${row.studentName} (${row.gradeLevel}${row.section ? `-${row.section}` : ""})` },
                  {
                    key: "unlink",
                    header: "",
                    render: (row) => (
                      <Button
                        type="button"
                        variant="secondary"
                        loading={unlink.isPending}
                        onClick={() =>
                          unlink.mutate(row.linkId, {
                            onSuccess: () => setNotice({ tone: "success", text: t("unlinkOk") }),
                            onError: (error) => setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) }),
                          })
                        }
                      >
                        {t("unlink")}
                      </Button>
                    ),
                  },
                ]}
                rows={list.data.links}
                rowKey={(row) => row.linkId}
                empty={t("emptyLinks")}
              />
            </Card>
          </>
        )}
      </div>
    </>
  );
}
