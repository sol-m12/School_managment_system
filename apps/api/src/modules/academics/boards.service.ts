import { and, asc, eq, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import type { ResultSetHeader } from "mysql2";
import { db } from "../../db/index.js";
import {
  classSchedule,
  classes,
  periodSettings,
  staff,
  studentFinalReports,
  students,
  subjects,
  systemSettings,
  teacherAssignments,
  users,
} from "../../db/schema/index.js";
import { ER_DUP_ENTRY, mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type {
  AssignmentBody,
  PlacementAuto,
  PlacementManual,
  PlacementQuery,
  PlacementReset,
  ScheduleGenerate,
  ScheduleMove,
  ScheduleSwap,
} from "./academics.schema.js";
import { planAutoAssign, TEACHER_HOUR_CAP, type AssignBlock, type PoolTeacher } from "./assignPlan.js";
import { genderKey, planEqual, planMerit, type Candidate, type SectionSeat } from "./placementPlan.js";
import {
  buildPeriodClocks,
  evalMoves,
  heatBand,
  solveSchedule,
  WEEKDAYS,
  type HeatBand,
  type PlannedLesson,
  type ScheduleTask,
  type Weekday,
} from "./schedulePlan.js";
import { AcademicsError } from "./students.service.js";

const YEAR_KEY = "current_academic_year";

function affected(result: unknown): number {
  const header = Array.isArray(result) ? (result[0] as ResultSetHeader | undefined) : (result as ResultSetHeader);
  return Number(header?.affectedRows ?? 0);
}

function blankStream(value: string | null | undefined): boolean {
  return value == null || value.trim() === "" || value === "Common";
}

function clock(value: string | null | undefined): string {
  if (!value) return "";
  const [hour = "00", minute = "00"] = value.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`;
}

async function settingYear(tenantId: number): Promise<string> {
  const [row] = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, YEAR_KEY)))
    .limit(1);
  return row?.value ?? "";
}

type StudentLite = {
  id: number;
  fullName: string;
  gender: "M" | "F";
  age: number;
  gradeLevel: number;
  stream: string | null;
  section: string | null;
  academicYear: string;
};

type ClassLite = {
  id: number;
  gradeLevel: number;
  stream: "Natural" | "Social" | null;
  section: string;
  maxCapacity: number | null;
};

function classMatchesStream(row: ClassLite, stream: "Common" | "Natural" | "Social"): boolean {
  if (stream === "Common") return row.stream == null;
  return row.stream === stream;
}

function studentInClass(student: StudentLite, row: ClassLite): boolean {
  if (!student.section || student.gradeLevel !== row.gradeLevel || student.section !== row.section) return false;
  if (row.stream == null) return blankStream(student.stream);
  return blankStream(student.stream) || student.stream === row.stream;
}

async function loadYearStudents(tenantId: number, year: string): Promise<StudentLite[]> {
  return db
    .select({
      id: students.studentId,
      fullName: students.fullName,
      gender: students.gender,
      age: students.age,
      gradeLevel: students.gradeLevel,
      stream: students.stream,
      section: students.section,
      academicYear: students.academicYear,
    })
    .from(students)
    .where(scoped(students, tenantId, eq(students.academicYear, year)))
    .orderBy(asc(students.gradeLevel), asc(students.section), asc(students.fullName));
}

async function loadClasses(tenantId: number): Promise<ClassLite[]> {
  return db
    .select({
      id: classes.classId,
      gradeLevel: classes.gradeLevel,
      stream: classes.stream,
      section: classes.section,
      maxCapacity: classes.maxCapacity,
    })
    .from(classes)
    .where(scoped(classes, tenantId))
    .orderBy(asc(classes.gradeLevel), asc(classes.section));
}

async function marksFor(tenantId: number, rosterYear: string): Promise<Map<number, { avg: number; total: number }>> {
  const rows = await db
    .select({
      studentId: studentFinalReports.studentId,
      avg: studentFinalReports.yearlyAvg,
      sem1: studentFinalReports.sem1Total,
      sem2: studentFinalReports.sem2Total,
    })
    .from(studentFinalReports)
    .where(scoped(studentFinalReports, tenantId, eq(studentFinalReports.academicYear, rosterYear)));
  const map = new Map<number, { avg: number; total: number }>();
  for (const row of rows) {
    if (row.studentId == null) continue;
    const avg = Number(row.avg ?? 0);
    const total = Number(row.sem1 ?? 0) + Number(row.sem2 ?? 0);
    const current = map.get(row.studentId);
    if (!current || avg > current.avg) map.set(row.studentId, { avg, total });
  }
  return map;
}

function unassigned(student: StudentLite): boolean {
  return student.section == null || student.section.trim() === "";
}

export async function listPlacement(tenantId: number, query: PlacementQuery) {
  const setting = await settingYear(tenantId);
  const yearRows = await db
    .selectDistinct({ academicYear: students.academicYear })
    .from(students)
    .where(scoped(students, tenantId))
    .orderBy(asc(students.academicYear));
  const years = yearRows.map((row) => row.academicYear).filter(Boolean);
  const year = query.year && years.includes(query.year) ? query.year : setting || years[years.length - 1] || "";
  const rosterYears = [...years].reverse();
  const rosterYear = query.rosterYear || (Number.parseInt(year, 10) > 0 ? String(Number.parseInt(year, 10) - 1) : year);
  const [people, rooms, marks] = await Promise.all([
    year ? loadYearStudents(tenantId, year) : Promise.resolve([]),
    loadClasses(tenantId),
    marksFor(tenantId, rosterYear),
  ]);
  const assigned = people.filter((student) => !unassigned(student)).length;
  const gradeFilter = query.grade && /^\d+$/.test(query.grade) ? Number(query.grade) : null;
  const needle = (query.search ?? "").toLowerCase();
  const rows = people
    .filter((student) => {
      if (query.grade === "unassigned" && !unassigned(student)) return false;
      if (gradeFilter != null && student.gradeLevel !== gradeFilter) return false;
      if (query.sectionId) {
        const room = rooms.find((item) => item.id === query.sectionId);
        if (!room || !studentInClass(student, room)) return false;
      }
      if (!needle) return true;
      return student.fullName.toLowerCase().includes(needle) || String(student.id).includes(needle);
    })
    .map((student) => ({
      ...student,
      genderKey: genderKey(student.gender),
      avg: marks.get(student.id)?.avg ?? 0,
      classId: rooms.find((room) => studentInClass(student, room))?.id ?? null,
    }));
  const sections = rooms
    .filter((room) => gradeFilter == null || room.gradeLevel === gradeFilter)
    .map((room) => ({
      ...room,
      maxCapacity: room.maxCapacity ?? 0,
      current: people.filter((student) => studentInClass(student, room)).length,
    }));
  return {
    year,
    rosterYear,
    years,
    rosterYears,
    stats: { total: people.length, assigned, unassigned: people.length - assigned },
    sections,
    rows,
  };
}

function seatsFor(rooms: ClassLite[], people: StudentLite[], grade: number, stream: PlacementAuto["stream"]): SectionSeat[] {
  return rooms.filter((room) => room.gradeLevel === grade && classMatchesStream(room, stream)).map((room) => ({
    id: room.id,
    gradeLevel: room.gradeLevel,
    stream: room.stream,
    section: room.section,
    maxCapacity: room.maxCapacity ?? 0,
    currentCount: people.filter((student) => studentInClass(student, room)).length,
  }));
}

export async function autoPlace(tenantId: number, input: PlacementAuto) {
  if (input.gradeLevel < 1) throw new AcademicsError("PLACEMENT_GRADE");
  const [people, rooms, marks] = await Promise.all([
    loadYearStudents(tenantId, input.year),
    loadClasses(tenantId),
    marksFor(tenantId, input.rosterYear),
  ]);
  const seats = seatsFor(rooms, people, input.gradeLevel, input.stream);
  if (seats.length === 0) throw new AcademicsError("PLACEMENT_NO_SECTION");
  const free = seats.reduce((sum, seat) => sum + Math.max(0, seat.maxCapacity - seat.currentCount), 0);
  if (free <= 0) throw new AcademicsError("PLACEMENT_FULL");
  const candidates: Candidate[] = people
    .filter((student) => {
      if (student.gradeLevel !== input.gradeLevel || !unassigned(student)) return false;
      if (!blankStream(student.stream) && student.stream !== input.stream) return false;
      return true;
    })
    .map((student) => ({
      id: student.id,
      fullName: student.fullName,
      gender: genderKey(student.gender),
      avgMark: marks.get(student.id)?.avg ?? 0,
      totalScore: marks.get(student.id)?.total ?? 0,
    }));
  if (candidates.length === 0) throw new AcademicsError("PLACEMENT_NONE");
  const plan = input.mode === "equal" ? planEqual(seats, candidates) : planMerit(seats, candidates);
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const studentById = new Map(people.map((student) => [student.id, student]));
  await db.transaction(async (tx) => {
    let written = 0;
    for (const item of plan.placed) {
      const room = roomById.get(item.sectionId);
      const student = studentById.get(item.studentId);
      if (!room || !student) continue;
      const result = await tx
        .update(students)
        .set({
          section: room.section,
          ...(room.stream && blankStream(student.stream) ? { stream: room.stream } : {}),
        })
        .where(
          scoped(
            students,
            tenantId,
            and(eq(students.studentId, item.studentId), eq(students.academicYear, input.year), or(isNull(students.section), eq(students.section, ""))),
          ),
        );
      written += affected(result);
    }
    if (written !== plan.placed.length) throw new AcademicsError("PLACEMENT_CONFLICT");
  });
  const summary = new Map<number, { added: number; male: number; female: number; max: number; min: number }>();
  for (const item of plan.placed) {
    const candidate = byId.get(item.studentId);
    const bucket = summary.get(item.sectionId) ?? { added: 0, male: 0, female: 0, max: candidate?.avgMark ?? 0, min: candidate?.avgMark ?? 0 };
    bucket.added += 1;
    if (candidate?.gender === "M") bucket.male += 1;
    if (candidate?.gender === "F") bucket.female += 1;
    bucket.max = Math.max(bucket.max, candidate?.avgMark ?? 0);
    bucket.min = Math.min(bucket.min, candidate?.avgMark ?? 0);
    summary.set(item.sectionId, bucket);
  }
  return {
    placed: plan.placed.length,
    left: plan.left,
    mode: input.mode,
    sections: [...summary.entries()].map(([classId, bucket]) => {
      const room = roomById.get(classId);
      const seat = seats.find((item) => item.id === classId);
      return {
        classId,
        gradeLevel: room?.gradeLevel ?? 0,
        stream: room?.stream,
        section: room?.section ?? "",
        ...bucket,
        total: (seat?.currentCount ?? 0) + bucket.added,
        capacity: seat?.maxCapacity ?? 0,
      };
    }),
  };
}

export async function manualPlace(tenantId: number, input: PlacementManual) {
  const [people, rooms, marks] = await Promise.all([
    loadYearStudents(tenantId, input.year),
    loadClasses(tenantId),
    marksFor(tenantId, input.rosterYear),
  ]);
  const room = rooms.find((item) => item.id === input.classId);
  if (!room) throw new AcademicsError("NOT_FOUND");
  const ids = [...new Set(input.studentIds)];
  let placed = 0;
  let bumped = 0;
  let skippedFull = 0;
  let skippedGrade = 0;
  let skippedSame = 0;
  const occupants = () => people.filter((student) => studentInClass(student, room));
  await db.transaction(async (tx) => {
    let count = occupants().length;
    const capacity = room.maxCapacity ?? 0;
    for (const studentId of ids) {
      const student = people.find((item) => item.id === studentId);
      if (!student) continue;
      if (student.gradeLevel !== room.gradeLevel) {
        skippedGrade += 1;
        continue;
      }
      if (studentInClass(student, room)) {
        skippedSame += 1;
        continue;
      }
      const incoming = marks.get(studentId)?.avg ?? 0;
      if (count < capacity) {
        await tx
          .update(students)
          .set({ section: room.section, ...(room.stream && blankStream(student.stream) ? { stream: room.stream } : {}) })
          .where(scoped(students, tenantId, eq(students.studentId, studentId)));
        student.section = room.section;
        if (room.stream && blankStream(student.stream)) student.stream = room.stream;
        count += 1;
        placed += 1;
        continue;
      }
      const lowest = occupants().sort((left, right) => {
        const diff = (marks.get(left.id)?.avg ?? 0) - (marks.get(right.id)?.avg ?? 0);
        return diff !== 0 ? diff : right.id - left.id;
      })[0];
      if (lowest && incoming > (marks.get(lowest.id)?.avg ?? 0)) {
        await tx
          .update(students)
          .set({ section: null })
          .where(scoped(students, tenantId, eq(students.studentId, lowest.id)));
        lowest.section = null;
        await tx
          .update(students)
          .set({ section: room.section, ...(room.stream && blankStream(student.stream) ? { stream: room.stream } : {}) })
          .where(scoped(students, tenantId, eq(students.studentId, studentId)));
        student.section = room.section;
        if (room.stream && blankStream(student.stream)) student.stream = room.stream;
        placed += 1;
        bumped += 1;
      } else {
        skippedFull += 1;
      }
    }
  });
  return { placed, bumped, skippedFull, skippedGrade, skippedSame };
}

export async function resetPlacement(tenantId: number, input: PlacementReset) {
  if (input.scope === "grade" && input.gradeLevel == null) throw new AcademicsError("PLACEMENT_SCOPE");
  if (input.scope === "section" && input.classId == null) throw new AcademicsError("PLACEMENT_SCOPE");
  const filled = and(isNotNull(students.section), ne(students.section, ""));
  let where = scoped(students, tenantId, and(eq(students.academicYear, input.year), filled));
  if (input.scope === "grade") {
    where = scoped(
      students,
      tenantId,
      and(eq(students.academicYear, input.year), eq(students.gradeLevel, input.gradeLevel ?? 0), filled),
    );
  }
  if (input.scope === "section") {
    const [room] = await db
      .select({ gradeLevel: classes.gradeLevel, section: classes.section })
      .from(classes)
      .where(scoped(classes, tenantId, eq(classes.classId, input.classId ?? 0)))
      .limit(1);
    if (!room) throw new AcademicsError("NOT_FOUND");
    where = scoped(
      students,
      tenantId,
      and(eq(students.academicYear, input.year), eq(students.gradeLevel, room.gradeLevel), eq(students.section, room.section)),
    );
  }
  const result = await db.update(students).set({ section: null }).where(where);
  return { cleared: affected(result), scope: input.scope };
}

async function teacherPool(tenantId: number): Promise<{ id: number; name: string; experience: number; subjectId: number | null; load: number }[]> {
  const rows = await db
    .select({
      id: staff.staffId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      experience: staff.experienceYears,
      subjectId: staff.subjectId,
      approved: staff.isApproved,
      role: staff.role,
      active: users.isActive,
    })
    .from(staff)
    .leftJoin(users, and(eq(users.userId, staff.userId), eq(users.tenantId, tenantId)))
    .where(scoped(staff, tenantId));
  return rows
    .filter((row) => row.role === "Teacher" && row.approved === 1 && (row.active == null || row.active === 1))
    .map((row) => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`.trim(),
      experience: Number(row.experience ?? 0),
      subjectId: row.subjectId,
      load: 0,
    }));
}

export async function listAssignments(tenantId: number) {
  const year = await settingYear(tenantId);
  const [pool, subjectRows, classRows, assignmentRows] = await Promise.all([
    teacherPool(tenantId),
    db
      .select({
        id: subjects.subjectId,
        name: subjects.subjectName,
        gradeLevel: subjects.gradeLevel,
        stream: subjects.stream,
        creditHours: subjects.creditHours,
        isVocational: subjects.isVocational,
      })
      .from(subjects)
      .where(scoped(subjects, tenantId))
      .orderBy(asc(subjects.gradeLevel), asc(subjects.subjectName)),
    loadClasses(tenantId),
    db
      .select({
        id: teacherAssignments.assignmentId,
        staffId: teacherAssignments.staffId,
        subjectId: teacherAssignments.subjectId,
        gradeLevel: teacherAssignments.gradeLevel,
        section: teacherAssignments.section,
        creditHours: subjects.creditHours,
        firstName: staff.firstName,
      })
      .from(teacherAssignments)
      .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
      .innerJoin(staff, and(eq(staff.staffId, teacherAssignments.staffId), eq(staff.tenantId, tenantId)))
      .where(scoped(teacherAssignments, tenantId, year ? eq(teacherAssignments.academicYear, year) : undefined)),
  ]);
  const load = new Map<number, number>();
  for (const row of assignmentRows) load.set(row.staffId, (load.get(row.staffId) ?? 0) + row.creditHours);
  return {
    year,
    cap: TEACHER_HOUR_CAP,
    teachers: pool.map((teacher) => ({ ...teacher, load: load.get(teacher.id) ?? 0 })),
    subjects: subjectRows,
    classes: classRows,
    assignments: assignmentRows.map((row) => ({
      id: row.id,
      staffId: row.staffId,
      subjectId: row.subjectId,
      gradeLevel: row.gradeLevel,
      section: row.section,
      creditHours: row.creditHours,
      firstName: row.firstName,
    })),
  };
}

function subjectApplies(subject: { stream: string; isVocational: number | null }, room: ClassLite): boolean {
  if (subject.isVocational === 1) return false;
  if (subject.stream === "Common") return true;
  return room.stream === subject.stream;
}

export async function autoAssign(tenantId: number) {
  const year = await settingYear(tenantId);
  if (!year) throw new AcademicsError("NOT_FOUND");
  const board = await listAssignments(tenantId);
  const teachers = new Map<number, PoolTeacher>();
  for (const teacher of board.teachers) teachers.set(teacher.id, { id: teacher.id, experience: teacher.experience, load: 0 });
  const categories = board.subjects.map((subject) => {
    const pool = [...teachers.values()].filter((teacher) => {
      const source = board.teachers.find((item) => item.id === teacher.id);
      return source?.subjectId == null || source.subjectId === subject.id;
    });
    const blocks: AssignBlock[] = [];
    if (subject.isVocational === 1) {
      blocks.push({ subjectId: subject.id, gradeLevel: subject.gradeLevel, section: null, creditHours: subject.creditHours });
    } else {
      for (const room of board.classes.filter((item) => item.gradeLevel === subject.gradeLevel && subjectApplies(subject, item))) {
        blocks.push({ subjectId: subject.id, gradeLevel: room.gradeLevel, section: room.section, creditHours: subject.creditHours });
      }
    }
    return { teachers: pool, blocks };
  });
  const planned = planAutoAssign(categories);
  await db.transaction(async (tx) => {
    await tx.delete(teacherAssignments).where(scoped(teacherAssignments, tenantId, eq(teacherAssignments.academicYear, year)));
    for (const item of planned) {
      await tx.insert(teacherAssignments).values(
        withTenant(
          {
            staffId: item.staffId,
            subjectId: item.block.subjectId,
            gradeLevel: item.block.gradeLevel,
            section: item.block.section,
            academicYear: year,
          },
          tenantId,
        ),
      );
    }
  });
  return { placed: planned.length };
}

async function hoursFor(tenantId: number, staffId: number, year: string, exceptId?: number): Promise<number> {
  const rows = await db
    .select({ id: teacherAssignments.assignmentId, hours: subjects.creditHours })
    .from(teacherAssignments)
    .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(teacherAssignments, tenantId, and(eq(teacherAssignments.staffId, staffId), eq(teacherAssignments.academicYear, year))));
  return rows.filter((row) => row.id !== exceptId).reduce((sum, row) => sum + row.hours, 0);
}

export async function quickAssign(tenantId: number, input: AssignmentBody) {
  const year = await settingYear(tenantId);
  if (!year) throw new AcademicsError("NOT_FOUND");
  const [subject] = await db
    .select({ hours: subjects.creditHours })
    .from(subjects)
    .where(scoped(subjects, tenantId, eq(subjects.subjectId, input.subjectId)))
    .limit(1);
  const hours = subject?.hours ?? 0;
  const current = await hoursFor(tenantId, input.staffId, year);
  if (current + hours > TEACHER_HOUR_CAP) throw new AcademicsError("TEACHER_LIMIT");
  try {
    await db.insert(teacherAssignments).values(
      withTenant(
        {
          staffId: input.staffId,
          subjectId: input.subjectId,
          gradeLevel: input.gradeLevel,
          section: input.section,
          academicYear: year,
        },
        tenantId,
      ),
    );
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new AcademicsError("ASSIGNMENT_EXISTS");
    throw error;
  }
}

export async function changeAssignment(tenantId: number, assignmentId: number, staffId: number) {
  const year = await settingYear(tenantId);
  const [row] = await db
    .select({ id: teacherAssignments.assignmentId, hours: subjects.creditHours })
    .from(teacherAssignments)
    .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(teacherAssignments, tenantId, eq(teacherAssignments.assignmentId, assignmentId)))
    .limit(1);
  if (!row) throw new AcademicsError("NOT_FOUND");
  const current = await hoursFor(tenantId, staffId, year, assignmentId);
  if (current + row.hours > TEACHER_HOUR_CAP) throw new AcademicsError("TEACHER_LIMIT");
  await db
    .update(teacherAssignments)
    .set({ staffId })
    .where(scoped(teacherAssignments, tenantId, eq(teacherAssignments.assignmentId, assignmentId)));
}

export async function removeAssignment(tenantId: number, assignmentId: number) {
  const result = await db
    .delete(teacherAssignments)
    .where(scoped(teacherAssignments, tenantId, eq(teacherAssignments.assignmentId, assignmentId)));
  if (affected(result) === 0) throw new AcademicsError("NOT_FOUND");
}

type LessonView = {
  id: number;
  classId: number;
  gradeLevel: number;
  section: string;
  stream: string | null;
  subjectId: number | null;
  subjectName: string;
  creditHours: number;
  staffId: number | null;
  teacherName: string;
  day: Weekday;
  period: number;
  start: string;
  end: string;
  shift: "Morning" | "Afternoon" | "";
};

async function lessonRows(tenantId: number, year: string): Promise<LessonView[]> {
  const [periods, rows] = await Promise.all([
    db.select({ period: periodSettings.periodNumber, start: periodSettings.startTime, end: periodSettings.endTime, shift: periodSettings.shift }).from(periodSettings).where(scoped(periodSettings, tenantId)),
    db
      .select({
        id: classSchedule.timetableId,
        classId: classSchedule.classId,
        gradeLevel: classes.gradeLevel,
        section: classes.section,
        stream: classes.stream,
        subjectId: classSchedule.subjectId,
        subjectName: subjects.subjectName,
        creditHours: subjects.creditHours,
        staffId: classSchedule.teacherStaffId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        day: classSchedule.dayOfWeek,
        period: classSchedule.periodNumber,
        start: classSchedule.startTime,
        end: classSchedule.endTime,
      })
      .from(classSchedule)
      .innerJoin(classes, and(eq(classes.classId, classSchedule.classId), eq(classes.tenantId, tenantId)))
      .leftJoin(subjects, and(eq(subjects.subjectId, classSchedule.subjectId), eq(subjects.tenantId, tenantId)))
      .leftJoin(staff, and(eq(staff.staffId, classSchedule.teacherStaffId), eq(staff.tenantId, tenantId)))
      .where(scoped(classSchedule, tenantId, eq(classSchedule.academicYear, year))),
  ]);
  return rows
    .filter((row): row is typeof row & { day: Weekday } => WEEKDAYS.includes(row.day as Weekday))
    .map((row) => {
      const start = clock(row.start);
      const match = periods.find((period) => clock(period.start) === start && period.period === row.period);
      const shift = match?.shift === "Morning" || match?.shift === "Afternoon" ? match.shift : "";
      return {
        id: row.id,
        classId: row.classId,
        gradeLevel: row.gradeLevel,
        section: row.section,
        stream: row.stream,
        subjectId: row.subjectId,
        subjectName: row.subjectName ?? "",
        creditHours: row.creditHours ?? 0,
        staffId: row.staffId,
        teacherName: [row.firstName, row.lastName].filter(Boolean).join(" "),
        day: row.day,
        period: row.period,
        start,
        end: clock(row.end),
        shift,
      };
    });
}

function heatmapOf(lessons: LessonView[]): { staffId: number; name: string; days: Record<Weekday, number>; total: number; band: HeatBand }[] {
  const map = new Map<number, { name: string; days: Record<Weekday, number> }>();
  for (const lesson of lessons) {
    if (lesson.staffId == null) continue;
    const row = map.get(lesson.staffId) ?? {
      name: lesson.teacherName,
      days: { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 },
    };
    row.days[lesson.day] += 1;
    map.set(lesson.staffId, row);
  }
  return [...map.entries()].map(([staffId, row]) => {
    const counts = WEEKDAYS.map((day) => row.days[day]);
    return { staffId, name: row.name, days: row.days, total: counts.reduce((sum, count) => sum + count, 0), band: heatBand(counts) };
  });
}

export async function scheduleBoard(tenantId: number, shift: "Morning" | "Afternoon" | "Both") {
  const year = await settingYear(tenantId);
  const periods = await db
    .select({ period: periodSettings.periodNumber, start: periodSettings.startTime, end: periodSettings.endTime, shift: periodSettings.shift })
    .from(periodSettings)
    .where(scoped(periodSettings, tenantId))
    .orderBy(asc(periodSettings.periodNumber));
  const lessons = year ? await lessonRows(tenantId, year) : [];
  const visible = shift === "Both" ? lessons : lessons.filter((lesson) => lesson.shift === shift);
  const rooms = await loadClasses(tenantId);
  return {
    year,
    shift,
    periods: periods
      .filter((period) => shift === "Both" || period.shift === shift)
      .map((period) => ({ period: period.period ?? 0, start: clock(period.start), end: clock(period.end), shift: period.shift ?? "" })),
    classes: rooms,
    lessons: visible,
    heatmap: heatmapOf(visible),
  };
}

function compareClass(left: ClassLite, right: ClassLite): number {
  if (left.gradeLevel !== right.gradeLevel) return left.gradeLevel - right.gradeLevel;
  const section = left.section.localeCompare(right.section, undefined, { numeric: true, sensitivity: "base" });
  if (section !== 0) return section;
  return (left.stream ?? "").localeCompare(right.stream ?? "") || left.id - right.id;
}

export async function generateSchedule(tenantId: number, userId: number, input: ScheduleGenerate) {
  const year = await settingYear(tenantId);
  if (!year) throw new AcademicsError("NOT_FOUND");
  const [assignmentRows, rooms, member] = await Promise.all([
    db
      .select({
        id: teacherAssignments.assignmentId,
        staffId: teacherAssignments.staffId,
        subjectId: teacherAssignments.subjectId,
        gradeLevel: teacherAssignments.gradeLevel,
        section: teacherAssignments.section,
        creditHours: subjects.creditHours,
        subjectStream: subjects.stream,
        vocational: subjects.isVocational,
        subjectName: subjects.subjectName,
        firstName: staff.firstName,
        lastName: staff.lastName,
      })
      .from(teacherAssignments)
      .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
      .innerJoin(staff, and(eq(staff.staffId, teacherAssignments.staffId), eq(staff.tenantId, tenantId)))
      .where(scoped(teacherAssignments, tenantId, eq(teacherAssignments.academicYear, year))),
    loadClasses(tenantId),
    db.select({ id: staff.staffId }).from(staff).where(scoped(staff, tenantId, eq(staff.userId, userId))).limit(1),
  ]);
  const used = rooms.filter((room) =>
    assignmentRows.some(
      (row) =>
        row.vocational !== 1 &&
        row.creditHours > 0 &&
        row.gradeLevel === room.gradeLevel &&
        row.section === room.section &&
        (row.subjectStream === "Common" || row.subjectStream === room.stream),
    ),
  );
  const shifts: ("Morning" | "Afternoon")[] = input.shift === "Both" ? ["Morning", "Afternoon"] : [input.shift];
  const plans = new Map<"Morning" | "Afternoon", { clocks: ReturnType<typeof buildPeriodClocks>; lessons: PlannedLesson[] }>();
  for (const shift of shifts) {
    const shiftRooms =
      input.shift === "Both"
        ? [...used].sort(compareClass).filter((_, index) => (shift === "Morning" ? index % 2 === 0 : index % 2 === 1))
        : used;
    const tasks: ScheduleTask[] = [];
    for (const room of shiftRooms) {
      for (const row of assignmentRows) {
        if (row.vocational === 1 || row.creditHours <= 0) continue;
        if (row.gradeLevel !== room.gradeLevel || row.section !== room.section) continue;
        if (row.subjectStream !== "Common" && row.subjectStream !== room.stream) continue;
        tasks.push({
          assignmentId: row.id,
          classId: room.id,
          subjectId: row.subjectId,
          staffId: row.staffId,
          credits: row.creditHours,
          maxPerDay: row.creditHours > 5 ? 2 : 1,
          teacherName: `${row.firstName} ${row.lastName}`.trim(),
          classLabel: `${room.gradeLevel}${room.section}`,
        });
      }
    }
    if (tasks.length === 0 && input.shift !== "Both") throw new AcademicsError("SCHEDULE_NO_CLASS");
    const start = shift === "Afternoon" ? input.afternoonStartTime : input.startTime;
    const clocks = buildPeriodClocks(input.totalPeriods, start, input.duration);
    let lessons: PlannedLesson[] = [];
    if (tasks.length > 0) {
      const solved = solveSchedule(tasks, input.totalPeriods);
      if (!Array.isArray(solved)) throw new AcademicsError(solved.code, { teachers: solved.teachers, sessions: solved.sessions });
      lessons = solved;
    }
    plans.set(shift, { clocks, lessons });
  }
  const createdBy = member[0]?.id ?? null;
  let created = 0;
  await db.transaction(async (tx) => {
    for (const shift of shifts) {
      const plan = plans.get(shift);
      if (!plan) continue;
      const existing = await tx
        .select({ start: periodSettings.startTime })
        .from(periodSettings)
        .where(scoped(periodSettings, tenantId, eq(periodSettings.shift, shift)));
      const oldTimes = existing.map((row) => clock(row.start)).filter(Boolean);
      if (oldTimes.length > 0 && plan.lessons.length > 0) {
        await tx
          .delete(classSchedule)
          .where(scoped(classSchedule, tenantId, and(eq(classSchedule.academicYear, year), inArray(classSchedule.startTime, oldTimes))));
      }
      await tx.delete(periodSettings).where(scoped(periodSettings, tenantId, eq(periodSettings.shift, shift)));
      if (plan.clocks.length > 0) {
        await tx.insert(periodSettings).values(
          plan.clocks.map((item) => withTenant({ periodNumber: item.period, startTime: item.start, endTime: item.end, shift }, tenantId)),
        );
      }
      if (plan.lessons.length === 0) continue;
      const clockByPeriod = new Map(plan.clocks.map((item) => [item.period, item]));
      await tx.insert(classSchedule).values(
          plan.lessons.map((lesson) => {
            const slot = clockByPeriod.get(lesson.period);
            return withTenant(
              {
                academicYear: year,
                dayOfWeek: lesson.day,
                periodNumber: lesson.period,
                startTime: slot?.start ?? "08:00:00",
                endTime: slot?.end ?? "08:45:00",
                classId: lesson.classId,
                subjectId: lesson.subjectId,
                teacherStaffId: lesson.staffId,
                type: "Class" as const,
                createdBy,
              },
              tenantId,
            );
          }),
        );
      created += plan.lessons.length;
    }
  });
  return { created };
}

async function shiftLessons(tenantId: number, year: string, sourceShift: string) {
  const lessons = await lessonRows(tenantId, year);
  const same = lessons.filter((lesson) => lesson.shift === sourceShift);
  const periodCount = new Set(same.map((lesson) => lesson.period)).size || (await db.select({ period: periodSettings.periodNumber }).from(periodSettings).where(scoped(periodSettings, tenantId, eq(periodSettings.shift, sourceShift)))).length;
  return { lessons: same, periodCount };
}

function asEvalRows(lessons: Awaited<ReturnType<typeof lessonRows>>) {
  return lessons.map((lesson) => ({
    id: lesson.id,
    classId: lesson.classId,
    subjectId: lesson.subjectId ?? 0,
    staffId: lesson.staffId ?? 0,
    day: lesson.day,
    period: lesson.period,
    creditHours: lesson.creditHours,
    teacherName: lesson.teacherName,
    subjectName: lesson.subjectName,
  }));
}

function offDaysFromBusy(days: Iterable<Weekday>): number {
  const busy = new Set(days);
  return WEEKDAYS.filter((day) => !busy.has(day)).length;
}

function teacherDays(staffId: number, lessons: ReturnType<typeof asEvalRows>, ignoreIds: Set<number>, extraDay?: Weekday): Weekday[] {
  const days = lessons.filter((lesson) => !ignoreIds.has(lesson.id) && lesson.staffId === staffId).map((lesson) => lesson.day);
  if (extraDay) days.push(extraDay);
  return days;
}

export async function listMoveOptions(tenantId: number, sourceId: number) {
  const year = await settingYear(tenantId);
  const all = year ? await lessonRows(tenantId, year) : [];
  const source = all.find((lesson) => lesson.id === sourceId);
  if (!source || !source.shift) throw new AcademicsError("NOT_FOUND");
  const { lessons, periodCount } = await shiftLessons(tenantId, year, source.shift);
  const rows = asEvalRows(lessons);
  const sourceRow = rows.find((lesson) => lesson.id === sourceId);
  if (!sourceRow) throw new AcademicsError("NOT_FOUND");
  const options = evalMoves(sourceId, rows, periodCount);
  const sourceOff = offDaysFromBusy(teacherDays(sourceRow.staffId, rows, new Set()));
  return {
    source: {
      id: source.id,
      subjectName: source.subjectName,
      teacherName: source.teacherName,
      day: source.day,
      period: source.period,
      classId: source.classId,
      gradeLevel: source.gradeLevel,
      section: source.section,
      offDays: sourceOff,
    },
    options: options.map((option) => {
      const target = option.targetId != null ? rows.find((lesson) => lesson.id === option.targetId) : null;
      const ignore = new Set([sourceId, option.targetId].filter((id): id is number => id != null));
      const nextSourceOff = offDaysFromBusy(teacherDays(sourceRow.staffId, rows, ignore, option.day));
      const partnerOffBefore = target ? offDaysFromBusy(teacherDays(target.staffId, rows, new Set())) : null;
      const partnerOffAfter = target ? offDaysFromBusy(teacherDays(target.staffId, rows, ignore, sourceRow.day)) : null;
      const warnings: string[] = [];
      if (nextSourceOff < sourceOff) warnings.push("SOURCE_OFF");
      if (partnerOffBefore != null && partnerOffAfter != null && partnerOffAfter < partnerOffBefore) warnings.push("PARTNER_OFF");
      for (const reason of option.reasons) warnings.push(reason);
      const rank =
        (option.ok ? 100 : 0) +
        (warnings.includes("SOURCE_OFF") ? -20 : 0) +
        (warnings.includes("PARTNER_OFF") ? -20 : 0) +
        (option.targetId == null ? 5 : 0) +
        nextSourceOff;
      return {
        day: option.day,
        period: option.period,
        targetId: option.targetId,
        ok: option.ok,
        reasons: option.reasons,
        warnings,
        rank,
        targetSubjectName: target?.subjectName ?? null,
        targetTeacherName: target?.teacherName ?? null,
        sourceOffBefore: sourceOff,
        sourceOffAfter: nextSourceOff,
        partnerOffBefore,
        partnerOffAfter,
      };
    }),
  };
}

export async function moveLesson(tenantId: number, input: ScheduleMove) {
  const year = await settingYear(tenantId);
  const all = year ? await lessonRows(tenantId, year) : [];
  const source = all.find((lesson) => lesson.id === input.sourceId);
  if (!source || !source.shift) throw new AcademicsError("NOT_FOUND");
  const { lessons, periodCount } = await shiftLessons(tenantId, year, source.shift);
  const options = evalMoves(source.id, asEvalRows(lessons), periodCount);
  const hit = options.find((option) => option.day === input.day && option.period === input.period && option.targetId == null && option.ok);
  if (!hit) throw new AcademicsError("SCHEDULE_MOVE");
  const [slot] = await db
    .select({ start: periodSettings.startTime, end: periodSettings.endTime })
    .from(periodSettings)
    .where(scoped(periodSettings, tenantId, and(eq(periodSettings.shift, source.shift), eq(periodSettings.periodNumber, input.period))))
    .limit(1);
  await db
    .update(classSchedule)
    .set({ dayOfWeek: input.day, periodNumber: input.period, startTime: clock(slot?.start) || source.start, endTime: clock(slot?.end) || source.end })
    .where(scoped(classSchedule, tenantId, eq(classSchedule.timetableId, input.sourceId)));
}

export async function swapLessons(tenantId: number, input: ScheduleSwap) {
  const year = await settingYear(tenantId);
  const all = year ? await lessonRows(tenantId, year) : [];
  const source = all.find((lesson) => lesson.id === input.sourceId);
  const target = all.find((lesson) => lesson.id === input.targetId);
  if (!source || !target || source.shift !== target.shift || source.classId !== target.classId) throw new AcademicsError("SCHEDULE_MOVE");
  const { lessons, periodCount } = await shiftLessons(tenantId, year, source.shift);
  const options = evalMoves(source.id, asEvalRows(lessons), periodCount);
  const hit = options.find((option) => option.targetId === target.id && option.ok);
  if (!hit) throw new AcademicsError("SCHEDULE_MOVE");
  const [sourceSlot] = await db
    .select({ start: periodSettings.startTime, end: periodSettings.endTime })
    .from(periodSettings)
    .where(scoped(periodSettings, tenantId, and(eq(periodSettings.shift, source.shift), eq(periodSettings.periodNumber, target.period))))
    .limit(1);
  const [targetSlot] = await db
    .select({ start: periodSettings.startTime, end: periodSettings.endTime })
    .from(periodSettings)
    .where(scoped(periodSettings, tenantId, and(eq(periodSettings.shift, source.shift), eq(periodSettings.periodNumber, source.period))))
    .limit(1);
  await db.transaction(async (tx) => {
    await tx
      .update(classSchedule)
      .set({
        dayOfWeek: target.day,
        periodNumber: target.period,
        startTime: clock(sourceSlot?.start) || target.start,
        endTime: clock(sourceSlot?.end) || target.end,
      })
      .where(scoped(classSchedule, tenantId, eq(classSchedule.timetableId, source.id)));
    await tx
      .update(classSchedule)
      .set({
        dayOfWeek: source.day,
        periodNumber: source.period,
        startTime: clock(targetSlot?.start) || source.start,
        endTime: clock(targetSlot?.end) || source.end,
      })
      .where(scoped(classSchedule, tenantId, eq(classSchedule.timetableId, target.id)));
  });
}
