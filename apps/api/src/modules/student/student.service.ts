import { and, asc, desc, eq, inArray, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../../db/index.js";
import {
  attendance,
  classes,
  examResultsOnline,
  fileShares,
  grades,
  groupMembers,
  groupMessages,
  groupSubmissions,
  groupTasks,
  groupsInfo,
  liveQuizQuestions,
  onlineExams,
  simulations,
  staff,
  staffFiles,
  students,
  subjects,
  systemSettings,
  users,
} from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";

export class StudentError extends Error {
  constructor(readonly code: "NOT_FOUND") {
    super(code);
  }
}

type Semester = "1" | "2";

type Learner = {
  studentId: number;
  fullName: string;
  gradeLevel: number;
  section: string;
  stream: string;
  vocationalId: number | null;
  isTransfer: boolean;
  academicYear: string;
  photo: string | null;
};

type SubjectTotal = {
  studentId: number;
  subjectId: number;
  semester: string;
  total: number;
  recorded: boolean;
};

const YEAR_KEY = "current_academic_year";
const SEMESTER_KEY = "current_semester";

function num(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function externalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

async function setting(tenantId: number, key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, key)))
    .limit(1);
  return row?.value ?? null;
}

async function schoolYear(tenantId: number): Promise<string> {
  const saved = await setting(tenantId, YEAR_KEY);
  if (saved) return saved;
  const [latest] = await db
    .select({ academicYear: students.academicYear })
    .from(students)
    .where(scoped(students, tenantId))
    .orderBy(desc(students.studentId))
    .limit(1);
  return latest?.academicYear ?? String(new Date().getFullYear());
}

async function schoolSemester(tenantId: number): Promise<Semester> {
  const saved = await setting(tenantId, SEMESTER_KEY);
  return saved === "2" ? "2" : "1";
}

async function learner(tenantId: number, userId: number): Promise<Learner> {
  const [row] = await db
    .select({
      studentId: students.studentId,
      fullName: students.fullName,
      gradeLevel: students.gradeLevel,
      section: students.section,
      stream: students.stream,
      vocationalId: students.vocationalId,
      isTransfer: students.isTransfer,
      academicYear: students.academicYear,
      photo: students.photo,
    })
    .from(students)
    .where(scoped(students, tenantId, eq(students.userId, userId)))
    .limit(1);
  if (!row) throw new StudentError("NOT_FOUND");
  return {
    studentId: row.studentId,
    fullName: row.fullName,
    gradeLevel: row.gradeLevel,
    section: row.section ?? "",
    stream: row.stream ?? "",
    vocationalId: row.vocationalId,
    isTransfer: Number(row.isTransfer ?? 0) === 1,
    academicYear: row.academicYear,
    photo: row.photo,
  };
}

function greetingPart(date = new Date()): "morning" | "afternoon" | "evening" {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Africa/Addis_Ababa",
    }).format(date),
  );
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

async function classSims(tenantId: number, gradeLevel: number, section: string) {
  return db
    .select({
      id: simulations.id,
      subjectName: simulations.subjectName,
      title: simulations.simTitle,
      simUrl: simulations.simUrl,
      simFile: simulations.simFile,
      createdAt: simulations.createdAt,
    })
    .from(simulations)
    .where(
      scoped(
        simulations,
        tenantId,
        and(eq(simulations.gradeLevel, gradeLevel), eq(simulations.section, section)),
      ),
    )
    .orderBy(desc(simulations.createdAt));
}

function simRow(row: {
  id: number;
  subjectName: string | null;
  title: string | null;
  simUrl: string | null;
  simFile: string | null;
  createdAt: string | null;
}) {
  return {
    id: row.id,
    subjectName: row.subjectName ?? "",
    title: row.title ?? "",
    createdAt: row.createdAt,
    externalUrl: row.simFile ? null : externalUrl(row.simUrl),
    hasFile: Boolean(row.simFile),
  };
}

export async function studentHome(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const rows = await classSims(tenantId, me.gradeLevel, me.section);
  const today = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Addis_Ababa",
  }).format(new Date());
  return {
    fullName: me.fullName,
    gradeLevel: me.gradeLevel,
    section: me.section,
    greeting: greetingPart(),
    today,
    simulationCount: rows.length,
    simulations: rows.map(simRow),
  };
}

export async function studentSimulations(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const rows = await classSims(tenantId, me.gradeLevel, me.section);
  return { gradeLevel: me.gradeLevel, section: me.section, rows: rows.map(simRow) };
}

async function ownedSimFile(tenantId: number, userId: number, simId: number): Promise<string> {
  const me = await learner(tenantId, userId);
  const [row] = await db
    .select({ simFile: simulations.simFile })
    .from(simulations)
    .where(
      scoped(
        simulations,
        tenantId,
        and(eq(simulations.id, simId), eq(simulations.gradeLevel, me.gradeLevel), eq(simulations.section, me.section)),
      ),
    )
    .limit(1);
  if (!row?.simFile) throw new StudentError("NOT_FOUND");
  return row.simFile;
}

export async function readSimulationFile(tenantId: number, userId: number, simId: number) {
  const fileName = await ownedSimFile(tenantId, userId, simId);
  return readStoredFile(fileName, "simulations");
}

async function readStoredFile(fileName: string, folder: "simulations" | "staff_documents") {
  const safe = path.basename(fileName);
  const dir = path.resolve(process.cwd(), "uploads", folder);
  const full = path.resolve(dir, safe);
  if (!full.startsWith(dir + path.sep)) throw new StudentError("NOT_FOUND");
  try {
    const bytes = await readFile(full);
    return { fileName: safe, bytes };
  } catch {
    throw new StudentError("NOT_FOUND");
  }
}

type RankCell = { id: number; average: number };

function position(studentId: number, cells: RankCell[]): number | null {
  const ordered = [...cells].sort((left, right) => right.average - left.average || left.id - right.id);
  let rank = 1;
  for (const cell of ordered) {
    if (cell.id === studentId) return cell.average >= 0 ? rank : null;
    if (cell.average >= 0) rank += 1;
  }
  return null;
}

export async function studentResults(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const academicYear = await schoolYear(tenantId);
  const semester = await schoolSemester(tenantId);

  const subjectFilters = [eq(subjects.gradeLevel, me.gradeLevel), eq(subjects.isVocational, 0)];
  if (me.gradeLevel >= 11) {
    const stream = me.stream === "Natural" || me.stream === "Social" || me.stream === "Common" ? me.stream : null;
    subjectFilters.push(stream ? or(eq(subjects.stream, "Common"), eq(subjects.stream, stream))! : eq(subjects.stream, "Common"));
  }
  const subjectRows = await db
    .select({ id: subjects.subjectId, name: subjects.subjectName })
    .from(subjects)
    .where(scoped(subjects, tenantId, and(...subjectFilters)))
    .orderBy(asc(subjects.sortOrder), asc(subjects.subjectId));

  const classmates = await db
    .select({
      id: students.studentId,
      vocationalId: students.vocationalId,
      isTransfer: students.isTransfer,
    })
    .from(students)
    .where(
      scoped(
        students,
        tenantId,
        and(eq(students.gradeLevel, me.gradeLevel), eq(students.section, me.section)),
      ),
    );

  const ids = classmates.map((row) => row.id);
  const gradeRows =
    ids.length === 0
      ? []
      : await db
          .select({
            studentId: grades.studentId,
            subjectId: grades.subjectId,
            semester: grades.semester,
            totalScore: sql<string>`sum(${grades.score})`,
            recorded: sql<number>`count(${grades.score})`,
          })
          .from(grades)
          .where(
            scoped(
              grades,
              tenantId,
              and(
                inArray(grades.studentId, ids),
                eq(grades.academicYear, academicYear),
                inArray(grades.submissionStatus, ["Submitted", "Approved"]),
              ),
            ),
          )
          .groupBy(grades.studentId, grades.subjectId, grades.semester);

  const hits = new Map<string, SubjectTotal>();
  for (const row of gradeRows) {
    hits.set(`${row.studentId}:${row.subjectId}:${row.semester}`, {
      studentId: row.studentId,
      subjectId: row.subjectId,
      semester: row.semester,
      total: num(row.totalScore),
      recorded: num(row.recorded) > 0,
    });
  }

  const sem1: RankCell[] = [];
  const sem2: RankCell[] = [];
  const yearly: RankCell[] = [];
  for (const person of classmates) {
    const transfer = Number(person.isTransfer ?? 0) === 1;
    const averages: Record<Semester, number> = { "1": -1, "2": -1 };
    for (const term of ["1", "2"] as const) {
      const expected = subjectRows.length + (me.gradeLevel >= 11 && person.vocationalId ? 1 : 0);
      let total = 0;
      let recorded = 0;
      const watch = [
        ...subjectRows.map((subject) => subject.id),
        ...(me.gradeLevel >= 11 && person.vocationalId ? [person.vocationalId] : []),
      ];
      for (const subjectId of watch) {
        const hit = hits.get(`${person.id}:${subjectId}:${term}`);
        if (hit?.recorded) {
          total += hit.total;
          recorded += 1;
        }
      }
      if (recorded === expected && expected > 0) averages[term] = total / expected;
    }
    sem1.push({ id: person.id, average: transfer ? -1 : averages["1"] });
    sem2.push({ id: person.id, average: averages["2"] });
    const yearAverage = transfer
      ? averages["2"]
      : averages["1"] >= 0 && averages["2"] >= 0
        ? (averages["1"] + averages["2"]) / 2
        : -1;
    yearly.push({ id: person.id, average: yearAverage });
  }

  const semesterCells = semester === "2" ? sem2 : sem1;
  const semesterAverage = semesterCells.find((cell) => cell.id === me.studentId)?.average ?? -1;
  const yearlyAverage = yearly.find((cell) => cell.id === me.studentId)?.average ?? -1;

  const ownRows = await db
    .select({
      subjectName: subjects.subjectName,
      weightingType: grades.weightingType,
      score: grades.score,
      maxScore: grades.maxScore,
      submissionStatus: grades.submissionStatus,
    })
    .from(grades)
    .innerJoin(subjects, eq(grades.subjectId, subjects.subjectId))
    .where(
      and(
        scoped(grades, tenantId, and(eq(grades.studentId, me.studentId), eq(grades.academicYear, academicYear), eq(grades.semester, semester))),
        scoped(subjects, tenantId),
      ),
    )
    .orderBy(asc(subjects.subjectName));

  type Item = { label: string; score: number; maxScore: number };
  const draft = new Map<string, Item[]>();
  const locked = new Map<string, Item[]>();
  const chart = new Map<string, number>();
  for (const row of ownRows) {
    const parts = row.weightingType.split(":");
    const label = parts[1]?.trim() || row.weightingType;
    const item = { label, score: num(row.score), maxScore: num(row.maxScore) };
    const done = row.submissionStatus === "Submitted" || row.submissionStatus === "Approved";
    const bucket = done ? locked : draft;
    const list = bucket.get(row.subjectName) ?? [];
    list.push(item);
    bucket.set(row.subjectName, list);
    chart.set(row.subjectName, (chart.get(row.subjectName) ?? 0) + item.score);
  }

  const expected = subjectRows.length + (me.gradeLevel >= 11 && me.vocationalId ? 1 : 0);
  const pack = (groups: Map<string, Item[]>) =>
    [...groups.entries()].map(([subject, items]) => ({
      subject,
      earned: items.reduce((sum, item) => sum + item.score, 0),
      maxScore: items.reduce((sum, item) => sum + item.maxScore, 0),
      items,
    }));

  const [att] = await db
    .select({
      present: sql<number>`sum(case when ${attendance.status} = 'P' then 1 else 0 end)`,
      absent: sql<number>`sum(case when ${attendance.status} = 'A' then 1 else 0 end)`,
      late: sql<number>`sum(case when ${attendance.status} = 'T' then 1 else 0 end)`,
      total: sql<number>`count(*)`,
    })
    .from(attendance)
    .where(scoped(attendance, tenantId, and(eq(attendance.studentId, me.studentId), eq(attendance.approvalStatus, "Approved"))));

  const history = await db
    .select({
      date: attendance.date,
      status: attendance.status,
      subjectName: subjects.subjectName,
    })
    .from(attendance)
    .leftJoin(subjects, and(eq(attendance.subjectId, subjects.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(attendance, tenantId, eq(attendance.studentId, me.studentId)))
    .orderBy(desc(attendance.date))
    .limit(30);

  const present = num(att?.present);
  const totalDays = num(att?.total);
  return {
    fullName: me.fullName,
    gradeLevel: me.gradeLevel,
    section: me.section,
    academicYear,
    semester,
    rosterReady: semesterAverage >= 0 && locked.size === expected && expected > 0,
    completedCount: locked.size,
    expectedCount: expected,
    semesterAverage: semesterAverage >= 0 ? semesterAverage : null,
    semesterRank: position(me.studentId, semesterCells),
    hideSemesterRank: me.isTransfer && semester === "1",
    yearlyAverage: yearlyAverage >= 0 ? yearlyAverage : null,
    yearlyRank: position(me.studentId, yearly),
    chart: [...chart.entries()].map(([subject, total]) => ({ subject, total })),
    draft: pack(draft),
    locked: pack(locked),
    attendance: {
      present,
      absent: num(att?.absent),
      late: num(att?.late),
      total: totalDays,
      percent: totalDays > 0 ? (present / totalDays) * 100 : 0,
      history: history.map((row) => ({
        date: row.date,
        status: row.status,
        subjectName: row.subjectName,
      })),
    },
  };
}

export async function studentGroups(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const rows = await db
    .select({
      id: groupsInfo.groupId,
      groupName: groupsInfo.groupName,
      subjectName: subjects.subjectName,
      isLeader: groupMembers.isLeader,
    })
    .from(groupMembers)
    .innerJoin(groupsInfo, eq(groupMembers.groupId, groupsInfo.groupId))
    .innerJoin(subjects, eq(groupsInfo.subjectId, subjects.subjectId))
    .where(
      and(
        scoped(groupMembers, tenantId, eq(groupMembers.studentId, me.studentId)),
        scoped(groupsInfo, tenantId),
        scoped(subjects, tenantId),
      ),
    )
    .orderBy(asc(subjects.subjectName));
  return {
    rows: rows.map((row) => ({
      id: row.id,
      groupName: row.groupName,
      subjectName: row.subjectName,
      isLeader: Number(row.isLeader ?? 0) === 1,
    })),
  };
}

async function memberGroup(tenantId: number, userId: number, groupId: number) {
  const me = await learner(tenantId, userId);
  const [row] = await db
    .select({
      id: groupsInfo.groupId,
      groupName: groupsInfo.groupName,
      subjectName: subjects.subjectName,
      subjectId: subjects.subjectId,
      isLeader: groupMembers.isLeader,
    })
    .from(groupMembers)
    .innerJoin(groupsInfo, eq(groupMembers.groupId, groupsInfo.groupId))
    .innerJoin(subjects, eq(groupsInfo.subjectId, subjects.subjectId))
    .where(
      and(
        scoped(groupMembers, tenantId, and(eq(groupMembers.studentId, me.studentId), eq(groupMembers.groupId, groupId))),
        scoped(groupsInfo, tenantId),
        scoped(subjects, tenantId),
      ),
    )
    .limit(1);
  if (!row) throw new StudentError("NOT_FOUND");
  return row;
}

export async function studentGroup(tenantId: number, userId: number, groupId: number) {
  const group = await memberGroup(tenantId, userId, groupId);
  const members = await db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      isLeader: groupMembers.isLeader,
    })
    .from(groupMembers)
    .innerJoin(students, eq(groupMembers.studentId, students.studentId))
    .where(and(scoped(groupMembers, tenantId, eq(groupMembers.groupId, groupId)), scoped(students, tenantId)))
    .orderBy(asc(students.fullName));

  const tasks = await db
    .select({
      id: groupTasks.taskId,
      title: groupTasks.taskTitle,
      maxScore: groupTasks.maxScore,
      deadline: groupTasks.deadline,
      fileName: groupTasks.fileAttachment,
    })
    .from(groupTasks)
    .where(scoped(groupTasks, tenantId, eq(groupTasks.subjectId, group.subjectId)))
    .orderBy(desc(groupTasks.createdAt));

  const scored = await db
    .select({
      id: groupSubmissions.submissionId,
      title: groupTasks.taskTitle,
      points: groupSubmissions.gradePoints,
      feedback: groupSubmissions.feedback,
    })
    .from(groupSubmissions)
    .innerJoin(groupTasks, eq(groupSubmissions.taskId, groupTasks.taskId))
    .where(
      and(
        scoped(groupSubmissions, tenantId, and(eq(groupSubmissions.groupId, groupId), isNotNull(groupSubmissions.gradePoints))),
        scoped(groupTasks, tenantId),
      ),
    );

  const messages = await db
    .select({
      id: groupMessages.messageId,
      text: groupMessages.messageContent,
      sentAt: groupMessages.sentAt,
      sender: students.fullName,
      username: users.username,
    })
    .from(groupMessages)
    .leftJoin(users, and(eq(groupMessages.senderUserId, users.userId), eq(users.tenantId, tenantId)))
    .leftJoin(students, and(eq(groupMessages.senderUserId, students.userId), eq(students.tenantId, tenantId)))
    .where(scoped(groupMessages, tenantId, eq(groupMessages.groupId, groupId)))
    .orderBy(desc(groupMessages.sentAt))
    .limit(80);

  return {
    id: group.id,
    groupName: group.groupName,
    subjectName: group.subjectName,
    isLeader: Number(group.isLeader ?? 0) === 1,
    members: members.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      isLeader: Number(row.isLeader ?? 0) === 1,
    })),
    tasks: tasks.map((row) => ({
      id: row.id,
      title: row.title,
      maxScore: num(row.maxScore),
      deadline: row.deadline,
      hasFile: Boolean(row.fileName),
    })),
    scores: scored.map((row) => ({
      id: row.id,
      title: row.title,
      points: num(row.points),
      feedback: row.feedback,
    })),
    messages: messages.reverse().map((row) => ({
      id: row.id,
      text: row.text ?? "",
      sentAt: row.sentAt,
      sender: row.sender ?? row.username ?? "",
    })),
  };
}

export async function postGroupMessage(tenantId: number, userId: number, groupId: number, text: string) {
  await memberGroup(tenantId, userId, groupId);
  await db.insert(groupMessages).values(
    withTenant({ groupId, senderUserId: userId, messageContent: text }, tenantId),
  );
  return studentGroup(tenantId, userId, groupId);
}

async function classIdFor(tenantId: number, me: Learner): Promise<number | null> {
  const stream = me.stream === "Natural" || me.stream === "Social" ? me.stream : null;
  const streamFilter = stream ? or(eq(classes.stream, stream), isNull(classes.stream)) : undefined;
  const [row] = await db
    .select({ id: classes.classId })
    .from(classes)
    .where(
      scoped(
        classes,
        tenantId,
        and(eq(classes.gradeLevel, me.gradeLevel), eq(classes.section, me.section), streamFilter),
      ),
    )
    .orderBy(asc(classes.classId))
    .limit(1);
  return row?.id ?? null;
}

export async function studentResources(
  tenantId: number,
  userId: number,
  filters: { search?: string; semester?: string; year?: string },
) {
  const me = await learner(tenantId, userId);
  const classId = await classIdFor(tenantId, me);
  if (!classId) {
    return { gradeLevel: me.gradeLevel, section: me.section, stream: me.stream, rows: [] };
  }
  const search = filters.search?.replace(/[%_]/g, "").trim();
  const rows = await db
    .select({
      id: staffFiles.fileId,
      title: staffFiles.fileTitle,
      fileType: staffFiles.fileType,
      semester: staffFiles.semester,
      academicYear: staffFiles.academicYear,
      content: staffFiles.content,
      sharedAt: fileShares.sharedAt,
      teacherFirst: staff.firstName,
      teacherLast: staff.lastName,
      subjectName: subjects.subjectName,
      hasFile: staffFiles.fileName,
    })
    .from(fileShares)
    .innerJoin(staffFiles, eq(fileShares.fileId, staffFiles.fileId))
    .innerJoin(staff, eq(fileShares.senderId, staff.staffId))
    .leftJoin(subjects, and(eq(staff.subjectId, subjects.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      and(
        scoped(fileShares, tenantId, eq(fileShares.classId, classId)),
        scoped(staffFiles, tenantId),
        scoped(staff, tenantId),
        search ? like(staffFiles.fileTitle, `%${search}%`) : undefined,
        filters.semester ? eq(staffFiles.semester, filters.semester) : undefined,
        filters.year ? eq(staffFiles.academicYear, filters.year) : undefined,
      ),
    )
    .orderBy(desc(fileShares.sharedAt));

  return {
    gradeLevel: me.gradeLevel,
    section: me.section,
    stream: me.stream,
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title ?? "",
      fileType: row.fileType ?? "DOC",
      semester: row.semester,
      academicYear: row.academicYear,
      sharedAt: row.sharedAt,
      teacherName: [row.teacherFirst, row.teacherLast].filter(Boolean).join(" "),
      subjectName: row.subjectName,
      content: row.fileType === "EDITOR" ? row.content : null,
      hasFile: row.fileType !== "EDITOR" && Boolean(row.hasFile),
    })),
  };
}

export async function readResourceFile(tenantId: number, userId: number, fileId: number) {
  const me = await learner(tenantId, userId);
  const classId = await classIdFor(tenantId, me);
  if (!classId) throw new StudentError("NOT_FOUND");
  const [row] = await db
    .select({ fileName: staffFiles.fileName })
    .from(fileShares)
    .innerJoin(staffFiles, eq(fileShares.fileId, staffFiles.fileId))
    .where(
      and(
        scoped(fileShares, tenantId, and(eq(fileShares.classId, classId), eq(fileShares.fileId, fileId))),
        scoped(staffFiles, tenantId),
      ),
    )
    .limit(1);
  if (!row?.fileName) throw new StudentError("NOT_FOUND");
  return readStoredFile(row.fileName, "staff_documents");
}

export async function studentExams(tenantId: number, userId: number, sebHeader: string | undefined) {
  const me = await learner(tenantId, userId);
  if (!sebHeader) {
    return { locked: true as const };
  }
  const classMatch = and(
    eq(classes.gradeLevel, me.gradeLevel),
    sql`lower(trim(${classes.section})) = ${me.section.trim().toLowerCase()}`,
  );
  const audience = me.vocationalId
    ? or(classMatch, and(eq(subjects.isVocational, 1), eq(onlineExams.subjectId, me.vocationalId)))
    : classMatch;
  const rows = await db
    .select({
      id: onlineExams.examId,
      title: onlineExams.examTitle,
      description: onlineExams.examDescription,
      durationMinutes: onlineExams.durationMinutes,
      subjectName: subjects.subjectName,
      isVocational: subjects.isVocational,
      takenId: examResultsOnline.examId,
    })
    .from(onlineExams)
    .innerJoin(subjects, eq(onlineExams.subjectId, subjects.subjectId))
    .leftJoin(classes, eq(onlineExams.classId, classes.classId))
    .leftJoin(
      examResultsOnline,
      and(eq(examResultsOnline.examId, onlineExams.examId), eq(examResultsOnline.studentId, me.studentId), eq(examResultsOnline.tenantId, tenantId)),
    )
    .where(and(scoped(onlineExams, tenantId, eq(onlineExams.status, "Published")), scoped(subjects, tenantId), audience))
    .orderBy(desc(onlineExams.createdAt));

  return {
    locked: false as const,
    gradeLevel: me.gradeLevel,
    section: me.section,
    stream: me.stream,
    vocational: Boolean(me.vocationalId),
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      durationMinutes: row.durationMinutes,
      subjectName: row.subjectName,
      vocational: Number(row.isVocational ?? 0) === 1,
      taken: row.takenId != null,
    })),
  };
}

export async function studentQuiz(tenantId: number, userId: number) {
  const me = await learner(tenantId, userId);
  const [membership] = await db
    .select({ groupId: groupsInfo.groupId, groupName: groupsInfo.groupName })
    .from(groupMembers)
    .innerJoin(groupsInfo, eq(groupMembers.groupId, groupsInfo.groupId))
    .where(and(scoped(groupMembers, tenantId, eq(groupMembers.studentId, me.studentId)), scoped(groupsInfo, tenantId)))
    .limit(1);
  if (!membership) return { inGroup: false as const };

  const exams = await db
    .select({
      examId: liveQuizQuestions.examId,
      startTime: sql<string>`max(${liveQuizQuestions.createdAt})`,
    })
    .from(liveQuizQuestions)
    .where(
      scoped(
        liveQuizQuestions,
        tenantId,
        and(
          eq(liveQuizQuestions.quizStatus, "active"),
          eq(liveQuizQuestions.gradeLevel, String(me.gradeLevel)),
          eq(liveQuizQuestions.section, me.section),
        ),
      ),
    )
    .groupBy(liveQuizQuestions.examId)
    .orderBy(desc(sql`max(${liveQuizQuestions.createdAt})`));

  return {
    inGroup: true as const,
    groupName: membership.groupName,
    exams: exams
      .filter((row) => row.examId != null)
      .map((row) => ({ examId: Number(row.examId), startTime: row.startTime })),
  };
}

const LABS = [
  {
    id: "physics",
    url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html",
  },
  {
    id: "chemistry",
    url: "https://phet.colorado.edu/sims/html/build-an-atom/latest/build-an-atom_all.html",
  },
  {
    id: "biology",
    url: "https://phet.colorado.edu/sims/html/natural-selection/latest/natural-selection_all.html",
  },
] as const;

export function virtualLabs() {
  return { labs: LABS.map((lab) => ({ id: lab.id, url: lab.url })) };
}
