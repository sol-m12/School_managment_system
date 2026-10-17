import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Bell, BookMarked, Camera, LockKeyhole, ScanLine, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { Panel, readForm, textOf, useNotice } from "@/features/principal/officeUi";
import { toErrorKey } from "@/lib/apiError";
import {
  useAddBook,
  useAddResource,
  useApplyClearance,
  useCancelReservation,
  useCatalog,
  useCheckout,
  useCirculation,
  useClearance,
  useCollectReservation,
  useCompetition,
  useIntake,
  useLibraryDesk,
  useLiteracy,
  useLogPatron,
  useLookup,
  usePatrons,
  useReadyReservation,
  useRecommend,
  useReminders,
  useReservations,
  useResources,
  useReturnLoan,
  useSaveLiteracy,
  useScanCheckout,
  useSeeReminder,
  useTakeIn,
} from "./api/useLibrary";

function fail(setNotice: (value: { tone: "success" | "danger"; text: string }) => void, t: (key: "errors:server") => string, error: unknown) {
  setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}` as "errors:server") });
}

function whole(data: FormData, name: string): number {
  const value = Number(textOf(data, name));
  return Number.isFinite(value) ? value : 0;
}

function optionalId(data: FormData, name: string): number | null {
  const value = textOf(data, name);
  return value ? Number(value) : null;
}

function MissingChoice({ title, help, to, label }: { title: string; help: string; to: string; label: string }) {
  return (
    <EmptyState
      title={title}
      description={help}
      action={
        <Link className="text-sm font-semibold text-brand-700 underline" to={to}>
          {label}
        </Link>
      }
    />
  );
}

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const REASON = { teacher: "reasonTeacher", weak: "reasonWeak", grade: "reasonGrade" } as const;
const RESERVE = { Open: "open", Ready: "ready", Collected: "collected", Cancelled: "cancelled" } as const;

export function LibraryHomePage() {
  const { t } = useTranslation("library");
  const query = useLibraryDesk();
  const steps = [
    { icon: BookMarked, title: t("stepCatalog"), to: "/library/catalog" },
    { icon: Undo2, title: t("stepLoans"), to: "/library/circulation" },
    { icon: Bell, title: t("stepReminders"), to: "/library/reminders" },
    { icon: LockKeyhole, title: t("stepClearance"), to: "/library/clearance" },
  ];
  return (
    <>
      <PageHeader title={t("homeTitle")} description={t("homeHelp")} />
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label={t("books")} value={String(data.books)} icon={BookMarked} />
              <StatCard label={t("borrowed")} value={String(data.borrowed)} icon={Undo2} tone="success" />
              <StatCard label={t("overdue")} value={String(data.overdue)} icon={Bell} tone="danger" />
              <StatCard label={t("reservations")} value={String(data.reservations)} icon={LockKeyhole} />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {steps.map((step) => (
                <Link key={step.to} to={step.to} className="rounded-card border border-border bg-surface p-4 shadow-soft transition-shadow hover:shadow-raised">
                  <step.icon aria-hidden="true" className="mb-3 size-5 text-brand-700" />
                  <p className="text-sm font-semibold text-ink-strong">{step.title}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

export function CatalogPage() {
  const { t } = useTranslation(["library", "errors"]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [label, setLabel] = useState<{ accession: string; qrSvg: string } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);
  const query = useCatalog(q);
  const save = useAddBook();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("catalogTitle")} description={t("catalogHelp")} />
      {view}
      <div className="mb-4 max-w-xl">
        <Input label={t("search")} value={text} placeholder={t("searchPlaceholder")} onChange={(event) => setText(event.target.value)} />
      </div>
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            {data.subjects.length === 0 ? <MissingChoice title={t("noSubjects")} help={t("noSubjectsHelp")} to="/subjects" label={t("goSubjects")} /> : null}
            <Card>
              <CardHeader title={t("catalogTitle")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      {
                        bookName: textOf(form, "bookName"),
                        author: textOf(form, "author"),
                        publishedYear: textOf(form, "year"),
                        pageCount: textOf(form, "pages") ? whole(form, "pages") : null,
                        accessionNumber: textOf(form, "accession"),
                        gradeLevel: optionalId(form, "grade"),
                        subjectId: optionalId(form, "subjectId"),
                        quantity: whole(form, "quantity"),
                        remarks: textOf(form, "remarks"),
                      },
                      {
                        onSuccess: (body) => {
                          setLabel({ accession: body.accession, qrSvg: body.qrSvg });
                          setNotice({ tone: "success", text: t("saved") });
                          event.currentTarget.reset();
                        },
                        onError: (error) => fail(setNotice, t, error),
                      },
                    );
                  }}
                >
                  <Input name="bookName" label={t("title")} required />
                  <Input name="author" label={t("author")} />
                  <Input name="year" label={t("year")} />
                  <Input name="pages" label={t("pages")} type="number" min={1} />
                  <Input name="accession" label={t("accession")} required />
                  <Input name="quantity" label={t("quantity")} type="number" min={1} required />
                  <Select name="grade" label={t("grade")} placeholder={t("anyGrade")} options={GRADES.map((grade) => ({ value: String(grade), label: String(grade) }))} />
                  {data.subjects.length > 0 ? (
                    <Select name="subjectId" label={t("subject")} placeholder={t("general")} options={data.subjects.map((row) => ({ value: String(row.id), label: `${row.gradeLevel ?? ""} ${row.name}`.trim() }))} />
                  ) : null}
                  <Input name="remarks" label={t("remarks")} />
                  <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                </form>
                {label ? (
                  <div className="mt-4 flex items-center gap-4">
                    <div className="h-28 w-28" dangerouslySetInnerHTML={{ __html: label.qrSvg.startsWith("<svg") ? label.qrSvg : "" }} />
                    <p className="font-semibold text-ink-strong">{label.accession}</p>
                  </div>
                ) : null}
              </CardBody>
            </Card>
            <Card>
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "author", header: t("author"), render: (row) => row.author },
                  { key: "accession", header: t("accession"), render: (row) => row.accession ?? "" },
                  { key: "free", header: t("free"), render: (row) => `${row.free} / ${row.quantity}` },
                  { key: "grade", header: t("grade"), render: (row) => row.gradeLevel ?? t("anyGrade") },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function CirculationPage() {
  const { t } = useTranslation(["library", "errors"]);
  const query = useCirculation();
  const lend = useCheckout();
  const back = useReturnLoan();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("circulationTitle")} description={t("circulationHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            {data.books.length === 0 ? <MissingChoice title={t("noBooks")} help={t("noBooksHelp")} to="/library/catalog" label={t("goCatalog")} /> : null}
            {data.patrons.length === 0 ? <MissingChoice title={t("noPatrons")} help={t("noPatronsHelp")} to="/students" label={t("goStudents")} /> : null}
            {data.books.length > 0 && data.patrons.length > 0 ? (
              <Card>
                <CardBody>
                  <form
                    className="grid gap-3 md:grid-cols-3"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      lend.mutate(
                        { bookId: whole(form, "bookId"), userId: whole(form, "userId") },
                        { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
                      );
                    }}
                  >
                    <Select name="bookId" label={t("title")} placeholder={t("general")} options={data.books.map((row) => ({ value: String(row.id), label: `${row.title} (${row.free})` }))} required />
                    <Select name="userId" label={t("patron")} placeholder={t("general")} options={data.patrons.map((row) => ({ value: String(row.id), label: row.name }))} required />
                    <Button type="submit" loading={lend.isPending}>{t("checkout")}</Button>
                  </form>
                </CardBody>
              </Card>
            ) : null}
            <Card>
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "patron", header: t("patron"), render: (row) => row.patron },
                  { key: "due", header: t("due"), render: (row) => row.dueOn ?? "" },
                  { key: "status", header: t("status"), render: (row) => (row.overdue ? t("overdue") : row.status === "Borrowed" ? t("out") : t("returned")) },
                  {
                    key: "action",
                    header: t("returnBook"),
                    render: (row) =>
                      row.status === "Borrowed" ? (
                        <Button type="button" variant="secondary" loading={back.isPending} onClick={() => back.mutate(row.id, { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) })}>
                          {t("returnBook")}
                        </Button>
                      ) : (
                        t("returned")
                      ),
                  },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function IntakePage() {
  const { t } = useTranslation(["library", "errors"]);
  const query = useIntake();
  const save = useTakeIn();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("intakeTitle")} description={t("intakeHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            {data.items.length === 0 ? (
              <MissingChoice title={t("noItems")} help={t("noItemsHelp")} to="/store/items" label={t("goItems")} />
            ) : (
              <Card>
                <CardBody>
                  <form
                    className="grid gap-3 md:grid-cols-3"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      save.mutate(
                        { itemId: whole(form, "itemId"), copies: whole(form, "copies") },
                        { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
                      );
                    }}
                  >
                    <Select name="itemId" label={t("item")} placeholder={t("general")} options={data.items.map((row) => ({ value: String(row.id), label: `${row.code} ${row.name} (${row.stock})` }))} required />
                    <Input name="copies" label={t("copies")} type="number" min={1} required />
                    <Button type="submit" loading={save.isPending}>{t("takeIn")}</Button>
                  </form>
                </CardBody>
              </Card>
            )}
            <Card>
              <Table
                columns={[
                  { key: "item", header: t("item"), render: (row) => `${row.code} ${row.name}` },
                  { key: "copies", header: t("copies"), render: (row) => row.copies },
                  { key: "when", header: t("date"), render: (row) => row.createdAt },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function RemindersPage() {
  const { t } = useTranslation(["library", "errors"]);
  const query = useReminders();
  const see = useSeeReminder();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("remindersTitle")} description={t("remindersHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "title", header: t("title"), render: (row) => row.title },
                { key: "patron", header: t("patron"), render: (row) => row.patron },
                { key: "due", header: t("due"), render: (row) => row.dueOn },
                { key: "kind", header: t("kind"), render: (row) => t(row.kind === "due" ? "dueKind" : "overdueKind") },
                {
                  key: "seen",
                  header: t("seen"),
                  render: (row) => (
                    <Button type="button" variant="secondary" loading={see.isPending} onClick={() => see.mutate(row.id, { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) })}>
                      {t("seen")}
                    </Button>
                  ),
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function PatronsPage() {
  const { t } = useTranslation(["library", "errors"]);
  const query = usePatrons();
  const save = useLogPatron();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("patronsTitle")} description={t("patronsHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            {data.patrons.length === 0 ? (
              <MissingChoice title={t("noPatrons")} help={t("noPatronsHelp")} to="/students" label={t("goStudents")} />
            ) : (
              <Card>
                <CardBody>
                  <form
                    className="grid gap-3 md:grid-cols-4"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      save.mutate(
                        { userId: whole(form, "userId"), action: textOf(form, "action") as "In" | "Out", bookTitle: textOf(form, "bookTitle") },
                        { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
                      );
                    }}
                  >
                    <Select name="userId" label={t("patron")} placeholder={t("general")} options={data.patrons.map((row) => ({ value: String(row.id), label: row.name }))} required />
                    <Select name="action" label={t("action")} options={[{ value: "In", label: t("enter") }, { value: "Out", label: t("exit") }]} required />
                    <Input name="bookTitle" label={t("reading")} />
                    <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                  </form>
                </CardBody>
              </Card>
            )}
            <Card>
              <Table
                columns={[
                  { key: "patron", header: t("patron"), render: (row) => row.patron },
                  { key: "action", header: t("action"), render: (row) => (row.action === "In" ? t("enter") : t("exit")) },
                  { key: "book", header: t("reading"), render: (row) => row.bookTitle },
                  { key: "date", header: t("date"), render: (row) => row.loggedOn },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function ResourcesPage() {
  const { t } = useTranslation(["library", "errors"]);
  const query = useResources();
  const save = useAddResource();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("resourcesTitle")} description={t("resourcesHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4">
            {data.subjects.length === 0 ? <MissingChoice title={t("noSubjects")} help={t("noSubjectsHelp")} to="/subjects" label={t("goSubjects")} /> : null}
            <Card>
              <CardHeader title={t("resourcesTitle")} />
              <CardBody>
                <form
                  className="grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    const form = readForm(event);
                    save.mutate(
                      { title: textOf(form, "title"), subjectId: optionalId(form, "subjectId"), note: textOf(form, "note"), recommendationId: null },
                      { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
                    );
                  }}
                >
                  <Input name="title" label={t("title")} required />
                  {data.subjects.length > 0 ? (
                    <Select name="subjectId" label={t("subject")} placeholder={t("general")} options={data.subjects.map((row) => ({ value: String(row.id), label: row.name }))} />
                  ) : null}
                  <Input name="note" label={t("note")} />
                  <Button type="submit" loading={save.isPending}>{t("save")}</Button>
                </form>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("waiting")} />
              <Table
                columns={[
                  { key: "subject", header: t("subject"), render: (row) => row.subject },
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "reason", header: t("note"), render: (row) => row.reason },
                  {
                    key: "file",
                    header: t("file"),
                    render: (row) => (
                      <Button type="button" variant="secondary" loading={save.isPending} onClick={() => save.mutate({ title: "", subjectId: null, note: "", recommendationId: row.id }, { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) })}>
                        {t("file")}
                      </Button>
                    ),
                  },
                ]}
                rows={data.waiting}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
            <Card>
              <CardHeader title={t("shelf")} />
              <Table
                columns={[
                  { key: "title", header: t("title"), render: (row) => row.title },
                  { key: "subject", header: t("subject"), render: (row) => row.subject },
                  { key: "note", header: t("note"), render: (row) => row.note },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function LiteracyPage() {
  const { t } = useTranslation(["library", "errors"]);
  const query = useLiteracy();
  const save = useSaveLiteracy();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("literacyTitle")} description={t("literacyHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <div className="grid gap-4 print:block">
            {data.students.length === 0 ? (
              <MissingChoice title={t("noStudents")} help={t("noStudentsHelp")} to="/students" label={t("goStudents")} />
            ) : (
              <Card className="print:hidden">
                <CardBody>
                  <form
                    className="grid gap-3 md:grid-cols-3"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      save.mutate(
                        { studentId: whole(form, "studentId"), note: textOf(form, "note") },
                        { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
                      );
                    }}
                  >
                    <Select name="studentId" label={t("student")} placeholder={t("general")} options={data.students.map((row) => ({ value: String(row.id), label: `${row.name} ${row.gradeLevel}${row.section ?? ""}` }))} required />
                    <Input name="note" label={t("note")} />
                    <Button type="submit" loading={save.isPending}>{t("writeReport")}</Button>
                  </form>
                </CardBody>
              </Card>
            )}
            <div className="print:hidden">
              <Button type="button" variant="secondary" onClick={() => window.print()}>{t("print")}</Button>
            </div>
            <Card>
              <Table
                columns={[
                  { key: "name", header: t("student"), render: (row) => row.name },
                  { key: "year", header: t("year"), render: (row) => row.year },
                  { key: "visits", header: t("visits"), render: (row) => row.visits },
                  { key: "returned", header: t("returnedCount"), render: (row) => row.returned },
                  { key: "open", header: t("openLoans"), render: (row) => row.openLoans },
                  { key: "note", header: t("note"), render: (row) => row.note },
                ]}
                rows={data.rows}
                rowKey={(row) => row.id}
                empty={t("empty")}
              />
            </Card>
          </div>
        )}
      </Panel>
    </>
  );
}

export function RecommendPage() {
  const { t } = useTranslation(["library", "errors"]);
  const people = useLiteracy();
  const [studentId, setStudentId] = useState(0);
  const query = useRecommend(studentId);
  return (
    <>
      <PageHeader title={t("recommendTitle")} description={t("recommendHelp")} />
      <Panel query={people}>
        {(data) =>
          data.students.length === 0 ? (
            <MissingChoice title={t("noStudents")} help={t("noStudentsHelp")} to="/students" label={t("goStudents")} />
          ) : (
            <div className="grid gap-4">
              <Card>
                <CardBody>
                  <form
                    className="grid max-w-md gap-3"
                    onSubmit={(event) => {
                      const form = readForm(event);
                      setStudentId(whole(form, "studentId"));
                    }}
                  >
                    <Select name="studentId" label={t("student")} placeholder={t("general")} options={data.students.map((row) => ({ value: String(row.id), label: row.name }))} required />
                    <Button type="submit">{t("show")}</Button>
                  </form>
                </CardBody>
              </Card>
              {query.isPending && studentId > 0 ? <Spinner /> : null}
              {query.isError ? <Alert tone="danger">{t(`errors:${toErrorKey(query.error)}` as "errors:server")}</Alert> : null}
              {query.data ? (
                <Card>
                  <CardHeader title={query.data.student} />
                  <Table
                    columns={[
                      { key: "title", header: t("title"), render: (row) => row.title },
                      { key: "reason", header: t("kind"), render: (row) => t(REASON[row.reason]) },
                    ]}
                    rows={query.data.rows}
                    rowKey={(row) => row.id}
                    empty={t("empty")}
                  />
                </Card>
              ) : null}
            </div>
          )
        }
      </Panel>
    </>
  );
}

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

export function CheckoutPage() {
  const { t } = useTranslation(["library", "errors"]);
  const lookup = useLookup();
  const lend = useScanCheckout();
  const { setNotice, view } = useNotice();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [bookCode, setBookCode] = useState("");
  const [patronCode, setPatronCode] = useState("");
  const target = useRef<"book" | "patron">("book");
  const onCode = useRef<(code: string) => void>(() => undefined);

  function accept(code: string) {
    const value = code.trim();
    if (!value) return;
    if (target.current === "book") {
      setBookCode(value);
      target.current = "patron";
    } else {
      setPatronCode(value);
      target.current = "book";
      setLive(false);
    }
    lookup.mutate(value, {
      onSuccess: (hit) => setNotice({ tone: "success", text: `${t("found")}: ${hit.kind === "book" ? hit.title : hit.name}` }),
      onError: (error) => fail(setNotice, t, error),
    });
  }

  onCode.current = accept;

  useEffect(() => {
    if (!live) return;
    const host = window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector };
    if (!host.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setCameraNote(t("scanMissing"));
      setLive(false);
      return;
    }
    let stop = false;
    let stream: MediaStream | null = null;
    const detector = new host.BarcodeDetector({ formats: ["qr_code"] });
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const tick = async () => {
          if (stop || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            if (raw) onCode.current(raw);
          } catch {
            // The frame is not ready yet.
          }
          if (!stop) window.setTimeout(() => void tick(), 700);
        };
        void tick();
      } catch {
        if (!stop) {
          setCameraNote(t("scanMissing"));
          setLive(false);
        }
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [live, t]);

  return (
    <>
      <PageHeader title={t("checkoutTitle")} description={t("checkoutHelp")} />
      {view}
      {cameraNote ? <Alert tone="danger" className="mb-4">{cameraNote}</Alert> : null}
      <Card className="mb-4">
        <CardHeader title={t("scan")} description={t("scanHelp")} />
        <CardBody className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="overflow-hidden rounded-card bg-shell">
            <video ref={videoRef} className={live ? "aspect-[4/3] w-full object-cover" : "hidden"} muted playsInline />
            {live ? null : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-shell-text">
                <ScanLine className="size-10" />
                <p className="text-sm">{t("scanIdle")}</p>
              </div>
            )}
          </div>
          <form
            className="grid gap-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              lend.mutate(
                { bookCode, patronCode },
                { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) },
              );
            }}
          >
            <Input label={t("bookCode")} value={bookCode} onChange={(event) => setBookCode(event.target.value)} required />
            <Input label={t("patronCode")} value={patronCode} onChange={(event) => setPatronCode(event.target.value)} required />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" leftIcon={<Camera className="size-4" />} onClick={() => { target.current = bookCode ? "patron" : "book"; setCameraNote(null); setLive((value) => !value); }}>
                {t("scan")}
              </Button>
              <Button type="submit" loading={lend.isPending}>{t("lend")}</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </>
  );
}

export function ReservationsPage() {
  const { t } = useTranslation(["library", "errors"]);
  const query = useReservations();
  const ready = useReadyReservation();
  const collect = useCollectReservation();
  const cancel = useCancelReservation();
  const { setNotice, view } = useNotice();
  function done(error?: unknown) {
    if (error) fail(setNotice, t, error);
    else setNotice({ tone: "success", text: t("saved") });
  }
  return (
    <>
      <PageHeader title={t("reservationsTitle")} description={t("reservationsHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "title", header: t("title"), render: (row) => row.title },
                { key: "patron", header: t("patron"), render: (row) => row.patron },
                { key: "status", header: t("status"), render: (row) => <Badge tone={row.status === "Ready" ? "success" : row.status === "Cancelled" ? "danger" : "info"}>{t(RESERVE[row.status])}</Badge> },
                {
                  key: "action",
                  header: t("action"),
                  render: (row) =>
                    row.status === "Open" || row.status === "Ready" ? (
                      <div className="flex flex-wrap gap-2">
                        {row.status === "Open" ? <Button type="button" variant="secondary" loading={ready.isPending} onClick={() => ready.mutate(row.id, { onSuccess: () => done(), onError: done })}>{t("ready")}</Button> : null}
                        {row.status === "Ready" ? <Button type="button" loading={collect.isPending} onClick={() => collect.mutate(row.id, { onSuccess: () => done(), onError: done })}>{t("collect")}</Button> : null}
                        <Button type="button" variant="secondary" loading={cancel.isPending} onClick={() => cancel.mutate(row.id, { onSuccess: () => done(), onError: done })}>{t("cancel")}</Button>
                      </div>
                    ) : (
                      t(RESERVE[row.status])
                    ),
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function CompetitionPage() {
  const { t } = useTranslation("library");
  const query = useCompetition();
  return (
    <>
      <PageHeader title={t("competitionTitle")} description={t("competitionHelp")} />
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "name", header: t("student"), render: (row) => row.name },
                { key: "grade", header: t("grade"), render: (row) => row.gradeLevel },
                { key: "points", header: t("points"), render: (row) => row.points },
                { key: "rank", header: t("rank"), render: (row) => (row.ranks.length === 0 ? t("reader") : row.ranks.map((rank) => t(rank)).join(", ")) },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}

export function ClearancePage() {
  const { t } = useTranslation(["library", "errors"]);
  const query = useClearance();
  const apply = useApplyClearance();
  const { setNotice, view } = useNotice();
  return (
    <>
      <PageHeader title={t("clearanceTitle")} description={t("clearanceHelp")} />
      {view}
      <Panel query={query}>
        {(data) => (
          <Card>
            <Table
              columns={[
                { key: "name", header: t("student"), render: (row) => row.name },
                { key: "open", header: t("openLoans"), render: (row) => row.openLoans },
                { key: "state", header: t("status"), render: (row) => (row.blocked ? t("blocked") : row.libraryClear ? t("cleared") : t("open")) },
                {
                  key: "action",
                  header: t("clear"),
                  render: (row) => (
                    <Button
                      type="button"
                      variant="secondary"
                      loading={apply.isPending}
                      onClick={() => apply.mutate(row.id, { onSuccess: () => setNotice({ tone: "success", text: t("saved") }), onError: (error) => fail(setNotice, t, error) })}
                    >
                      {t("clear")}
                    </Button>
                  ),
                },
              ]}
              rows={data.rows}
              rowKey={(row) => row.id}
              empty={t("empty")}
            />
          </Card>
        )}
      </Panel>
    </>
  );
}
