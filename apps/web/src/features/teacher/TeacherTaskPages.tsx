import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Button, Spinner } from "@/components/ui";
import { toErrorKey } from "@/lib/apiError";
import {
  useAddLesson,
  useAddSimulation,
  useLessonPlans,
  useRegistration,
  useReportCards,
  useRoster,
  useSaveRegistration,
  useSimulations,
  useStoreBoard,
  useStoreRequest,
  useSubjectReport,
} from "./api/useTeacherPages";

const field = "mt-1 w-full rounded-control border border-border bg-surface px-3 py-2 font-normal";

function Loading() {
  const { t } = useTranslation("common");
  return (
    <div className="flex justify-center py-10 text-brand-700">
      <Spinner size="lg" label={t("loading")} />
    </div>
  );
}

export function BestTeachingPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const plans = useLessonPlans();
  const add = useAddLesson();
  const [notice, setNotice] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState("");

  if (plans.isPending) return <Loading />;
  if (plans.isError || !plans.data) return <Alert tone="danger">{t(`errors:${toErrorKey(plans.error)}`)}</Alert>;
  const subject = plans.data.subjects.find((item) => String(item.id) === subjectId) ?? plans.data.subjects[0];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject) return;
    const form = new FormData(event.currentTarget);
    setNotice(null);
    try {
      await add.mutateAsync({
        subjectId: subject.id,
        gradeLevel: Number(form.get("gradeLevel")),
        weekNumber: Number(form.get("weekNumber")),
        topicTitle: String(form.get("topicTitle") ?? ""),
        learningObjectives: String(form.get("learningObjectives") ?? ""),
      });
      event.currentTarget.reset();
      setNotice(t("teacher:planSaved"));
    } catch (error) {
      setNotice(t(`errors:${toErrorKey(error)}`));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("teacher:bestTitle")}</h1>
      <p className="text-sm text-ink-muted">{t("teacher:regYearValue", { year: plans.data.academicYear })}</p>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-surface p-4 shadow-raised md:grid-cols-2">
        <label className="text-sm font-bold">
          {t("teacher:subject")}
          <select className={field} value={subject ? String(subject.id) : ""} onChange={(event) => setSubjectId(event.target.value)}>
            {plans.data.subjects.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:gradePick")}
          <select name="gradeLevel" className={field}>
            {(subject?.grades ?? []).map((grade) => (
              <option key={grade} value={grade}>{t("teacher:gradeN", { grade })}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">{t("teacher:week")}<input name="weekNumber" type="number" min={1} required className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:topic")}<input name="topicTitle" required className={field} /></label>
        <label className="text-sm font-bold md:col-span-2">{t("teacher:objectives")}<textarea name="learningObjectives" className={field} /></label>
        <Button type="submit" loading={add.isPending}>{t("teacher:addPlan")}</Button>
      </form>
      {plans.data.plans.length === 0 ? <Alert tone="warning">{t("teacher:noPlans")}</Alert> : (
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="px-2 py-1">{t("teacher:week")}</th>
              <th className="px-2 py-1">{t("teacher:subject")}</th>
              <th className="px-2 py-1">{t("teacher:topic")}</th>
              <th className="px-2 py-1">{t("teacher:status")}</th>
            </tr>
          </thead>
          <tbody>
            {plans.data.plans.map((plan) => (
              <tr key={plan.id} className="border-t border-border">
                <td className="px-2 py-2">{plan.weekNumber}</td>
                <td className="px-2 py-2">{plan.subjectName} · {t("teacher:gradeN", { grade: plan.gradeLevel })}</td>
                <td className="px-2 py-2">
                  <p className="font-semibold">{plan.topicTitle}</p>
                  <p className="text-ink-muted">{plan.learningObjectives}</p>
                </td>
                <td className="px-2 py-2">{plan.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const REG_TYPES = [
  { value: "አዲስ", label: "regNew" },
  { value: "ደጋሚ", label: "regRepeat" },
  { value: "አቋራጭ", label: "regTransferIn" },
  { value: "መልሶ ቅበላ", label: "regReturn" },
] as const;

export function StudentRegistrationPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [grade, setGrade] = useState(9);
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState<number | undefined>();
  const board = useRegistration(grade, query);
  const save = useSaveRegistration();
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (board.isPending) return <Loading />;
  if (board.isError || !board.data) return <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice(null);
    const registrationType = String(form.get("registrationType") ?? "");
    if (!registrationType) return;
    try {
      await save.mutateAsync({
        studentId,
        fullName: String(form.get("fullName") ?? ""),
        gender: String(form.get("gender")),
        age: Number(form.get("age")),
        gradeLevel: Number(form.get("gradeLevel")),
        registrationType,
        stream: Number(form.get("gradeLevel")) >= 11 ? String(form.get("stream")) : null,
        phoneNumber: String(form.get("phoneNumber") ?? ""),
        isTransfer: form.get("isTransfer") === "on",
        previousSchool: String(form.get("previousSchool") ?? ""),
        kebele: String(form.get("kebele") ?? ""),
        gote: String(form.get("gote") ?? ""),
        houseNumber: String(form.get("houseNumber") ?? ""),
      });
      setStudentId(undefined);
      setFormKey((value) => value + 1);
      setNotice({ tone: "success", text: t("teacher:studentSaved") });
    } catch (error) {
      setNotice({ tone: "danger", text: t(`errors:${toErrorKey(error)}`) });
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-bold">{t("teacher:regYear")}</p>
      <p className="text-lg font-bold text-brand-700">{t("teacher:regYearValue", { year: board.data.academicYear })}</p>
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-sm font-bold">{t("teacher:gradeChoice")}</span>
        {[9, 10, 11, 12].map((item) => (
          <Button key={item} type="button" variant={item === grade ? "primary" : "secondary"} onClick={() => setGrade(item)}>
            {t("teacher:gradeN", { grade: item })}
          </Button>
        ))}
      </div>
      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}
      <form key={formKey} onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-surface p-4 shadow-raised md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-bold">{t("teacher:regForm", { grade })}</h2>
        <label className="text-sm font-bold md:col-span-2">
          {t("teacher:liveSearch")}
          <input value={query} onChange={(event) => setQuery(event.target.value)} className={field} />
          {board.data.matches.length > 0 ? (
            <ul className="mt-1 rounded border border-border bg-canvas">
              {board.data.matches.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-surface"
                    onClick={() => {
                      if (!match.editable) return;
                      setStudentId(match.id);
                      setQuery(match.fullName);
                    }}
                  >
                    {match.fullName} · #{match.id}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </label>
        <label className="text-sm font-bold md:col-span-2">{t("teacher:fullName")}<input name="fullName" required defaultValue={query} className={field} /></label>
        <label className="text-sm font-bold">
          {t("teacher:regGrade")}
          <select name="gradeLevel" defaultValue={grade} className={field}>
            {[9, 10, 11, 12].map((item) => <option key={item} value={item}>{t("teacher:gradeN", { grade: item })}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:regSex")}
          <select name="gender" className={field}>
            <option value="M">{t("teacher:male")}</option>
            <option value="F">{t("teacher:female")}</option>
          </select>
        </label>
        <label className="text-sm font-bold">{t("teacher:age")}<input name="age" type="number" min={1} required className={field} /></label>
        <label className="text-sm font-bold">
          {t("teacher:regStatus")}
          <select name="registrationType" required defaultValue="" className={field}>
            <option value="">{t("teacher:regStatusPlaceholder")}</option>
            {REG_TYPES.map((item) => <option key={item.value} value={item.value}>{t(`teacher:${item.label}`)}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">{t("teacher:phone")}<input name="phoneNumber" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:fan")}<input name="fanNumber" className={field} /></label>
        <label className="text-sm font-bold">
          {t("teacher:stream")}
          <select name="stream" className={field}>
            <option value="Common">{t("teacher:streamNone")}</option>
            <option value="Natural">Natural Science</option>
            <option value="Social">Social Science</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input name="isTransfer" type="checkbox" />
          {t("teacher:transfer")}
        </label>
        <label className="text-sm font-bold">{t("teacher:previousSchool")}<input name="previousSchool" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:kebele")}<input name="kebele" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:gote")}<input name="gote" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:houseNumber")}<input name="houseNumber" className={field} /></label>
        <div className="flex gap-2">
          <Button type="submit" loading={save.isPending}>{t("teacher:saveStudent")}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setStudentId(undefined);
              setQuery("");
              setFormKey((value) => value + 1);
            }}
          >
            {t("teacher:newStudent")}
          </Button>
        </div>
      </form>
      <section className="rounded-xl bg-surface p-4 shadow-raised">
        <h2 className="mb-3 font-bold">{t("teacher:pendingTitle", { grade })}</h2>
        {board.data.pending.length === 0 ? <p>{t("teacher:pendingEmpty")}</p> : (
          <table className="w-full text-sm">
            <thead className="text-left">
              <tr>
                <th className="px-2 py-1">#ID</th>
                <th className="px-2 py-1">{t("teacher:fullName")}</th>
                <th className="px-2 py-1">{t("teacher:typeCol")}</th>
                <th className="px-2 py-1">{t("teacher:regGrade")}</th>
              </tr>
            </thead>
            <tbody>
              {board.data.pending.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-2">{row.id}</td>
                  <td className="px-2 py-2">{row.fullName}</td>
                  <td className="px-2 py-2">{row.registrationType}</td>
                  <td className="px-2 py-2">{t("teacher:gradeN", { grade: row.gradeLevel })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export function ClassRosterPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [classId, setClassId] = useState("");
  const roster = useRoster(classId);
  if (roster.isPending) return <Loading />;
  if (roster.isError || !roster.data) return <Alert tone="danger">{t(`errors:${toErrorKey(roster.error)}`)}</Alert>;
  if (!roster.data.allowed) return <Alert tone="danger">{t("teacher:unauthorizedAccess")}</Alert>;
  const data = roster.data;
  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">{t("teacher:rosterTitle")}</h1>
      <label className="mb-3 block text-sm font-bold">
        {t("teacher:pickClass")}
        <select value={String(data.classId)} onChange={(event) => setClassId(event.target.value)} className={field}>
          {data.classes.map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}
        </select>
      </label>
      <p className="mb-2 text-sm">{t("teacher:printYear", { year: data.academicYear })} · {t("teacher:printGrade", { grade: data.gradeLevel })} {t("teacher:printSec", { section: data.section })}</p>
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr>
            <th className="px-2 py-1">{t("teacher:number")}</th>
            <th className="px-2 py-1">{t("teacher:fullName")}</th>
            <th className="px-2 py-1">{t("teacher:sex")}</th>
            <th className="px-2 py-1">{t("teacher:ageCol")}</th>
            <th className="px-2 py-1">{t("teacher:kebele")}</th>
            <th className="px-2 py-1">{t("teacher:gote")}</th>
            <th className="px-2 py-1">{t("teacher:houseNumber")}</th>
          </tr>
        </thead>
        <tbody>
          {data.students.map((student, index) => (
            <tr key={student.id} className="border-t border-border">
              <td className="px-2 py-2">{index + 1}</td>
              <td className="px-2 py-2">{student.fullName}</td>
              <td className="px-2 py-2">{student.gender}</td>
              <td className="px-2 py-2">{student.age}</td>
              <td className="px-2 py-2">{student.kebele}</td>
              <td className="px-2 py-2">{student.gote}</td>
              <td className="px-2 py-2">{student.houseNumber}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportCardsPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [classId, setClassId] = useState("");
  const cards = useReportCards(classId);
  if (cards.isPending) return <Loading />;
  if (cards.isError || !cards.data) return <Alert tone="danger">{t(`errors:${toErrorKey(cards.error)}`)}</Alert>;
  if (!cards.data.allowed) return <Alert tone="danger">{t("teacher:unauthorizedAccess")}</Alert>;
  const data = cards.data;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("teacher:cardsTitle")}</h1>
      <label className="block text-sm font-bold">
        {t("teacher:pickClass")}
        <select value={classId || String(data.classes[0]?.id ?? "")} onChange={(event) => setClassId(event.target.value)} className={field}>
          {data.classes.map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}
        </select>
      </label>
      <p className="text-sm">{t("teacher:yearSemester", { year: data.academicYear, semester: data.semester })} · {t("teacher:printGrade", { grade: data.gradeLevel })} {data.section}</p>
      {data.cards.map((card) => (
        <article key={card.id} className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-bold">{card.fullName}</h2>
          <p className="text-sm">{t("teacher:average")}: {card.average.toFixed(2)} · {t("teacher:rank")}: {card.rank}</p>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {card.subjects.map((subject) => (
                <tr key={subject.name} className="border-t border-border">
                  <td className="py-1">{subject.name}</td>
                  <td className="py-1 text-right">{subject.score.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
    </div>
  );
}

export function StudentReportsPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const [classSelect, setClassSelect] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [load, setLoad] = useState(false);
  const report = useSubjectReport(classSelect, subjectId, load);
  if (report.isPending) return <Loading />;
  if (report.isError || !report.data) return <Alert tone="danger">{t(`errors:${toErrorKey(report.error)}`)}</Alert>;
  const data = report.data;
  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">{t("teacher:reportTitle")}</h1>
      <form
        className="mb-4 grid gap-3 md:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (classSelect && subjectId) setLoad(true);
        }}
      >
        <label className="text-sm font-bold">
          {t("teacher:pickClass")}
          <select value={classSelect} onChange={(event) => { setClassSelect(event.target.value); setLoad(false); }} className={field}>
            <option value="">{t("teacher:choose")}</option>
            {data.classes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">
          {t("teacher:subject")}
          <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setLoad(false); }} className={field}>
            <option value="">{t("teacher:choose")}</option>
            {data.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit">{t("teacher:showReport")}</Button>
        </div>
      </form>
      {load ? (
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="px-2 py-1">{t("teacher:number")}</th>
              <th className="px-2 py-1">{t("teacher:fullName")}</th>
              <th className="px-2 py-1">{t("teacher:totalMark")}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={3} className="px-2 py-4 text-ink-muted">{t("teacher:noStudents")}</td></tr>
            ) : data.rows.map((row, index) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-2 py-2">{index + 1}</td>
                <td className="px-2 py-2">{row.fullName}</td>
                <td className="px-2 py-2">{row.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export function SimulationsPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const board = useSimulations();
  const add = useAddSimulation();
  const [notice, setNotice] = useState<string | null>(null);
  if (board.isPending) return <Loading />;
  if (board.isError || !board.data) return <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const classSelect = String(form.get("classSelect") ?? "");
    const [grade, section] = classSelect.split("-");
    setNotice(null);
    try {
      await add.mutateAsync({
        gradeLevel: Number(grade),
        section: section ?? "",
        subjectName: String(form.get("subjectName") ?? ""),
        simTitle: String(form.get("simTitle") ?? ""),
        simUrl: String(form.get("simUrl") ?? ""),
      });
      event.currentTarget.reset();
      setNotice(t("teacher:simulationSaved"));
    } catch (error) {
      setNotice(t(`errors:${toErrorKey(error)}`));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("teacher:simTitle")}</h1>
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-surface p-4 shadow-raised md:grid-cols-2">
        <label className="text-sm font-bold">{t("teacher:gradePick")}<input name="classSelect" required placeholder="9-A" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:subject")}<input name="subjectName" required className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:simName")}<input name="simTitle" required className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:simUrl")}<input name="simUrl" className={field} /></label>
        <Button type="submit" loading={add.isPending}>{t("teacher:addSimulation")}</Button>
      </form>
      {board.data.items.length === 0 ? <Alert tone="warning">{t("teacher:noSimulations")}</Alert> : (
        <ul className="space-y-2">
          {board.data.items.map((item) => (
            <li key={item.id} className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="font-bold">{item.simTitle}</p>
              <p className="text-sm text-ink-muted">{item.subjectName} · {item.gradeLevel}{item.section}</p>
              {item.simUrl ? <a className="text-sm text-brand-700" href={item.simUrl} target="_blank" rel="noreferrer">{item.simUrl}</a> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StoreRequestPage() {
  const { t } = useTranslation(["teacher", "errors", "common"]);
  const board = useStoreBoard();
  const send = useStoreRequest();
  const [notice, setNotice] = useState<string | null>(null);
  if (board.isPending) return <Loading />;
  if (board.isError || !board.data) return <Alert tone="danger">{t(`errors:${toErrorKey(board.error)}`)}</Alert>;
  const data = board.data;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setNotice(null);
    try {
      await send.mutateAsync({
        customItemName: String(form.get("customItemName") ?? ""),
        estimatedUnitPrice: Number(form.get("estimatedUnitPrice") || 0),
        quantity: Number(form.get("quantity")),
        purpose: String(form.get("purpose") ?? ""),
      });
    } catch (error) {
      setNotice(t(`errors:${toErrorKey(error)}`));
    }
  }

  const stats = [
    [t("teacher:storeTotal"), data.stats.total],
    [t("teacher:storePending"), data.stats.pending],
    [t("teacher:storeApproved"), data.stats.approved],
    [t("teacher:storeHoldings"), data.stats.holdings],
  ] as const;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("teacher:storeTitle")}</h1>
      <p>{t("teacher:storeWelcome", { name: data.teacherName })}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <article key={label} className="rounded-xl bg-surface p-4 shadow-raised">
            <p className="text-sm text-ink-muted">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </article>
        ))}
      </div>
      {notice ? <Alert tone="danger">{notice}</Alert> : null}
      <form onSubmit={onSubmit} className="grid gap-3 rounded-xl bg-surface p-4 shadow-raised md:grid-cols-2">
        <h2 className="md:col-span-2 font-bold">{t("teacher:storeForm")}</h2>
        <label className="text-sm font-bold">
          {t("teacher:storeItem")}
          <select name="itemId" className={field}>
            <option value="">{t("teacher:storeItemPlaceholder")}</option>
            {data.items.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">{t("teacher:customItem")}<input name="customItemName" placeholder={t("teacher:customItemPlaceholder")} className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:unitCost")}<input name="estimatedUnitPrice" type="number" min={0} step="0.01" placeholder="0.00" className={field} /></label>
        <label className="text-sm font-bold">{t("teacher:quantity")}<input name="quantity" type="number" min={1} required placeholder={t("teacher:quantityPlaceholder")} className={field} /></label>
        <label className="text-sm font-bold md:col-span-2">{t("teacher:purpose")}<textarea name="purpose" required placeholder={t("teacher:purposePlaceholder")} className={field} /></label>
        <Button type="submit" loading={send.isPending}>{t("teacher:sendRequest")}</Button>
      </form>
      <section>
        <h2 className="mb-2 font-bold">{t("teacher:myRequests")}</h2>
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="px-2 py-1">{t("teacher:refCode")}</th>
              <th className="px-2 py-1">{t("teacher:itemName")}</th>
              <th className="px-2 py-1">{t("teacher:quantity")}</th>
              <th className="px-2 py-1">{t("teacher:requestedOn")}</th>
              <th className="px-2 py-1">{t("teacher:status")}</th>
            </tr>
          </thead>
          <tbody>
            {data.requests.map((row) => (
              <tr key={row.ref} className="border-t border-border">
                <td className="px-2 py-2">{row.ref}</td>
                <td className="px-2 py-2">{row.name}</td>
                <td className="px-2 py-2">{row.quantity}</td>
                <td className="px-2 py-2">{row.requestedAt}</td>
                <td className="px-2 py-2">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="mb-2 font-bold">{t("teacher:model22")}</h2>
        <table className="w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="px-2 py-1">{t("teacher:modelNo")}</th>
              <th className="px-2 py-1">{t("teacher:itemName")}</th>
              <th className="px-2 py-1">{t("teacher:itemKind")}</th>
              <th className="px-2 py-1">{t("teacher:receivedQty")}</th>
              <th className="px-2 py-1">{t("teacher:issuedOn")}</th>
              <th className="px-2 py-1">{t("teacher:trackStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {data.holdings.map((row) => (
              <tr key={row.code} className="border-t border-border">
                <td className="px-2 py-2">{row.code}</td>
                <td className="px-2 py-2">{row.name}</td>
                <td className="px-2 py-2">{row.kind}</td>
                <td className="px-2 py-2">{row.quantity}</td>
                <td className="px-2 py-2">{row.issuedAt}</td>
                <td className="px-2 py-2">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
