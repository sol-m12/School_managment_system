import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  classes,
  classSchedule,
  grades,
  staff,
  students,
  subjects,
  subjectWeightings,
  systemSettings,
  teacherAssignments,
} from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import type { PlanBody, ScoreBody } from "./teacher.schema.js";

const YEAR_KEY = "current_academic_year";
const SEMESTER_KEY = "current_semester";

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
type DayName = (typeof DAY_ORDER)[number];

const DAY_LABEL: Record<DayName, string> = {
  Monday: "ሰኞ",
  Tuesday: "ማክሰኞ",
  Wednesday: "ረቡዕ",
  Thursday: "ሐሙስ",
  Friday: "አርብ",
  Saturday: "ቅዳሜ",
  Sunday: "እሑድ",
};

export type TeacherCode =
  | "NOT_ASSIGNED"
  | "GRADES_LOCKED"
  | "GRADES_NO_PLAN"
  | "WEIGHT_OVER"
  | "SCORE_OVER"
  | "PLAN_NOT_FOUND"
  | "ATTENDANCE_LOCKED"
  | "EXAM_NOT_FOUND"
  | "EXAM_PASSWORD"
  | "EXAM_WEIGHT"
  | "STORE_UNAVAILABLE";

export class TeacherError extends Error {
  constructor(
    readonly code: TeacherCode,
    readonly extra?: Record<string, unknown>,
  ) {
    super(code);
  }
}

export type TeacherContext = {
  staffId: number;
  teacherName: string;
  academicYear: string;
  semester: "1" | "2";
};

export async function loadTeacherContext(tenantId: number, userId: number): Promise<TeacherContext | null> {
  return contextOf(tenantId, userId);
}

function asNumber(value: unknown): number {
  return Number(value ?? 0);
}

function money(value: number): string {
  return value.toFixed(2);
}

export function parseClassSelect(value: string): { gradeLevel: number; section: string } | null {
  const parts = value.split("-");
  const gradeLevel = Number(parts[0]);
  const section = (parts[1] ?? "").trim();
  if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 12 || section.length === 0) return null;
  return { gradeLevel, section };
}

async function settingValue(tenantId: number, key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, key)))
    .limit(1);
  return row?.value ?? null;
}

async function contextOf(tenantId: number, userId: number): Promise<TeacherContext | null> {
  const [teacher] = await db
    .select({ staffId: staff.staffId, firstName: staff.firstName, lastName: staff.lastName })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.userId, userId)))
    .limit(1);
  if (!teacher) return null;
  const year = (await settingValue(tenantId, YEAR_KEY)) ?? String(new Date().getFullYear());
  const semesterRaw = (await settingValue(tenantId, SEMESTER_KEY)) ?? "1";
  const semester: "1" | "2" = semesterRaw === "2" ? "2" : "1";
  return {
    staffId: teacher.staffId,
    teacherName: `${teacher.firstName} ${teacher.lastName}`.trim(),
    academicYear: year,
    semester,
  };
}

async function taughtClasses(tenantId: number, staffId: number, year: string) {
  const rows = await db
    .select({ gradeLevel: teacherAssignments.gradeLevel, section: teacherAssignments.section })
    .from(teacherAssignments)
    .where(
      scoped(teacherAssignments, tenantId, and(eq(teacherAssignments.staffId, staffId), eq(teacherAssignments.academicYear, year))),
    );
  const seen = new Map<string, { value: string; label: string; gradeLevel: number; section: string }>();
  for (const row of rows) {
    const section = row.section?.trim() ? row.section.trim() : "Vocational";
    const value = `${row.gradeLevel}-${section}`;
    if (!seen.has(value)) {
      seen.set(value, {
        value,
        label: `Grade ${row.gradeLevel} - ${section}`,
        gradeLevel: row.gradeLevel,
        section,
      });
    }
  }
  return [...seen.values()];
}

async function taughtSubjects(tenantId: number, staffId: number, year: string) {
  const rows = await db
    .select({ id: subjects.subjectId, name: subjects.subjectName, isVocational: subjects.isVocational })
    .from(teacherAssignments)
    .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      scoped(teacherAssignments, tenantId, and(eq(teacherAssignments.staffId, staffId), eq(teacherAssignments.academicYear, year))),
    )
    .orderBy(asc(subjects.subjectName));
  const seen = new Map<number, { id: number; name: string; isVocational: boolean }>();
  for (const row of rows) {
    if (!seen.has(row.id)) seen.set(row.id, { id: row.id, name: row.name, isVocational: row.isVocational === 1 });
  }
  return [...seen.values()];
}

async function requireContext(tenantId: number, userId: number): Promise<TeacherContext> {
  const context = await contextOf(tenantId, userId);
  if (!context) throw new TeacherError("NOT_ASSIGNED");
  return context;
}

async function assertOwns(tenantId: number, context: TeacherContext, classSelect: string, subjectId: number) {
  const parsed = parseClassSelect(classSelect);
  if (!parsed) throw new TeacherError("NOT_ASSIGNED");
  const classesTaught = await taughtClasses(tenantId, context.staffId, context.academicYear);
  const subjectsTaught = await taughtSubjects(tenantId, context.staffId, context.academicYear);
  if (!classesTaught.some((item) => item.value === classSelect)) throw new TeacherError("NOT_ASSIGNED");
  if (!subjectsTaught.some((item) => item.id === subjectId)) throw new TeacherError("NOT_ASSIGNED");
  return { ...parsed, vocational: subjectsTaught.find((item) => item.id === subjectId)?.isVocational ?? false };
}

export async function scheduleBoard(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  if (!context) {
    return { academicYear: String(new Date().getFullYear()), assignments: [], classSchedule: [], examSchedule: [] };
  }

  const assignmentRows = await db
    .select({
      gradeLevel: teacherAssignments.gradeLevel,
      section: teacherAssignments.section,
      subjectName: subjects.subjectName,
    })
    .from(teacherAssignments)
    .innerJoin(subjects, and(eq(subjects.subjectId, teacherAssignments.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(teacherAssignments, tenantId, eq(teacherAssignments.staffId, context.staffId)))
    .orderBy(asc(teacherAssignments.gradeLevel), asc(teacherAssignments.section), asc(subjects.subjectName));

  const slots = await db
    .select({
      dayOfWeek: classSchedule.dayOfWeek,
      startTime: classSchedule.startTime,
      endTime: classSchedule.endTime,
      subjectName: subjects.subjectName,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
      type: classSchedule.type,
    })
    .from(classSchedule)
    .leftJoin(classes, and(eq(classes.classId, classSchedule.classId), eq(classes.tenantId, tenantId)))
    .leftJoin(subjects, and(eq(subjects.subjectId, classSchedule.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      scoped(
        classSchedule,
        tenantId,
        and(eq(classSchedule.teacherStaffId, context.staffId), eq(classSchedule.academicYear, context.academicYear)),
      ),
    );

  const rank = new Map<string, number>(DAY_ORDER.map((day, index) => [day, index]));
  const mapSlot = (row: (typeof slots)[number]) => ({
    day: row.dayOfWeek,
    dayLabel: DAY_LABEL[row.dayOfWeek],
    startTime: row.startTime.slice(0, 5),
    endTime: row.endTime.slice(0, 5),
    subjectName: row.subjectName ?? "",
    gradeLevel: row.gradeLevel,
    section: row.section ?? "",
  });
  const ordered = (type: "Class" | "Exam") =>
    slots
      .filter((row) => row.type === type)
      .sort((a, b) => (rank.get(a.dayOfWeek) ?? 0) - (rank.get(b.dayOfWeek) ?? 0) || a.startTime.localeCompare(b.startTime))
      .map(mapSlot);

  return {
    academicYear: context.academicYear,
    assignments: assignmentRows.map((row) => ({
      gradeLevel: row.gradeLevel,
      section: row.section ?? "",
      subjectName: row.subjectName,
    })),
    classSchedule: ordered("Class"),
    examSchedule: ordered("Exam"),
  };
}

export async function gradeOptions(tenantId: number, userId: number) {
  const context = await contextOf(tenantId, userId);
  if (!context) {
    return {
      academicYear: String(new Date().getFullYear()),
      semester: "1" as const,
      teacherName: "",
      classes: [],
      subjects: [],
    };
  }
  const [classRows, subjectRows] = await Promise.all([
    taughtClasses(tenantId, context.staffId, context.academicYear),
    taughtSubjects(tenantId, context.staffId, context.academicYear),
  ]);
  return {
    academicYear: context.academicYear,
    semester: context.semester,
    teacherName: context.teacherName,
    classes: classRows.map(({ value, label }) => ({ value, label })),
    subjects: subjectRows.map(({ id, name }) => ({ id, name })),
  };
}

async function classStudents(
  tenantId: number,
  year: string,
  gradeLevel: number,
  section: string,
  subjectId: number,
  vocational: boolean,
) {
  if (section === "Vocational" || vocational) {
    return db
      .select({ id: students.studentId, fullName: students.fullName })
      .from(students)
      .where(
        scoped(
          students,
          tenantId,
          and(eq(students.academicYear, year), eq(students.gradeLevel, gradeLevel), eq(students.vocationalId, subjectId)),
        ),
      )
      .orderBy(asc(students.fullName));
  }
  return db
    .select({ id: students.studentId, fullName: students.fullName })
    .from(students)
    .where(
      scoped(
        students,
        tenantId,
        and(eq(students.academicYear, year), eq(students.gradeLevel, gradeLevel), eq(students.section, section)),
      ),
    )
    .orderBy(asc(students.fullName));
}

async function plansFor(
  tenantId: number,
  subjectId: number,
  gradeLevel: number,
  section: string,
  year: string,
  semester: "1" | "2",
) {
  return db
    .select({
      id: subjectWeightings.weightingId,
      name: subjectWeightings.weightingType,
      percent: subjectWeightings.percentage,
    })
    .from(subjectWeightings)
    .where(
      scoped(
        subjectWeightings,
        tenantId,
        and(
          eq(subjectWeightings.subjectId, subjectId),
          eq(subjectWeightings.gradeLevel, String(gradeLevel)),
          eq(subjectWeightings.section, section),
          eq(subjectWeightings.academicYear, year),
          eq(subjectWeightings.semester, semester),
        ),
      ),
    )
    .orderBy(asc(subjectWeightings.weightingId));
}

export async function gradeSheet(tenantId: number, userId: number, classSelect: string, subjectId: number) {
  const context = await requireContext(tenantId, userId);
  const owned = await assertOwns(tenantId, context, classSelect, subjectId);
  const plans = await plansFor(tenantId, subjectId, owned.gradeLevel, owned.section, context.academicYear, context.semester);
  const roster = await classStudents(
    tenantId,
    context.academicYear,
    owned.gradeLevel,
    owned.section,
    subjectId,
    owned.vocational,
  );
  const studentIds = roster.map((row) => row.id);
  const scoreRows =
    studentIds.length === 0
      ? []
      : await db
          .select({
            studentId: grades.studentId,
            weightingType: grades.weightingType,
            score: grades.score,
            submissionStatus: grades.submissionStatus,
          })
          .from(grades)
          .where(
            scoped(
              grades,
              tenantId,
              and(
                inArray(grades.studentId, studentIds),
                eq(grades.subjectId, subjectId),
                eq(grades.semester, context.semester),
                eq(grades.academicYear, context.academicYear),
              ),
            ),
          );

  const planNames = new Set(plans.map((plan) => plan.name));
  const locked = scoreRows.some((row) => planNames.has(row.weightingType) && row.submissionStatus === "Approved");
  const byStudent = new Map<number, { scores: Record<string, number>; status: string }>();
  for (const row of scoreRows) {
    const current = byStudent.get(row.studentId) ?? { scores: {}, status: "Draft" };
    if (planNames.has(row.weightingType)) current.scores[row.weightingType] = asNumber(row.score);
    if (row.submissionStatus === "Approved") current.status = "Approved";
    else if (current.status === "Draft" && row.submissionStatus && row.submissionStatus !== "Draft") {
      current.status = row.submissionStatus;
    }
    byStudent.set(row.studentId, current);
  }

  const totalPercent = plans.reduce((sum, plan) => sum + asNumber(plan.percent), 0);
  return {
    academicYear: context.academicYear,
    semester: context.semester,
    teacherName: context.teacherName,
    classSelect,
    subjectId,
    locked,
    totalPercent,
    plans: plans.map((plan) => ({ id: plan.id, name: plan.name, percent: asNumber(plan.percent) })),
    students: roster.map((student) => {
      const entry = byStudent.get(student.id);
      const status = entry?.status ?? "Draft";
      const scores = entry?.scores ?? {};
      const total = plans.reduce((sum, plan) => sum + (scores[plan.name] ?? 0), 0);
      return {
        id: student.id,
        fullName: student.fullName,
        status,
        locked: locked || status !== "Draft",
        scores,
        total,
      };
    }),
  };
}

export async function savePlans(tenantId: number, userId: number, input: PlanBody) {
  const context = await requireContext(tenantId, userId);
  const owned = await assertOwns(tenantId, context, input.classSelect, input.subjectId);
  const sheet = await gradeSheet(tenantId, userId, input.classSelect, input.subjectId);
  if (sheet.locked) throw new TeacherError("GRADES_LOCKED");

  let total = sheet.totalPercent;
  let added = 0;
  let rejectedName: string | null = null;
  for (const item of input.items) {
    const name = item.name.trim();
    if (!name || item.percent <= 0) continue;
    if (total + item.percent > 100.01) {
      rejectedName = name;
      continue;
    }
    await db.insert(subjectWeightings).values(
      withTenant(
        {
          subjectId: input.subjectId,
          gradeLevel: String(owned.gradeLevel),
          section: owned.section,
          weightingType: name.startsWith(`${input.classSelect}:`) ? name : `${input.classSelect}:${name}`,
          percentage: money(item.percent),
          academicYear: context.academicYear,
          semester: context.semester,
          staffId: context.staffId,
        },
        tenantId,
      ),
    );
    total += item.percent;
    added += 1;
  }
  return { added, rejectedName };
}

export async function deletePlan(tenantId: number, userId: number, weightingId: number, classSelect: string, subjectId: number) {
  const context = await requireContext(tenantId, userId);
  const owned = await assertOwns(tenantId, context, classSelect, subjectId);
  const sheet = await gradeSheet(tenantId, userId, classSelect, subjectId);
  if (sheet.locked) throw new TeacherError("GRADES_LOCKED");
  const plan = sheet.plans.find((item) => item.id === weightingId);
  if (!plan) throw new TeacherError("PLAN_NOT_FOUND");

  const roster = await classStudents(
    tenantId,
    context.academicYear,
    owned.gradeLevel,
    owned.section,
    subjectId,
    owned.vocational,
  );
  const studentIds = roster.map((row) => row.id);
  await db.transaction(async (tx) => {
    if (studentIds.length > 0) {
      await tx
        .delete(grades)
        .where(
          scoped(
            grades,
            tenantId,
            and(
              inArray(grades.studentId, studentIds),
              eq(grades.subjectId, subjectId),
              eq(grades.weightingType, plan.name),
              eq(grades.semester, context.semester),
              eq(grades.academicYear, context.academicYear),
            ),
          ),
        );
    }
    await tx
      .delete(subjectWeightings)
      .where(scoped(subjectWeightings, tenantId, eq(subjectWeightings.weightingId, weightingId)));
  });
}

export async function saveScores(tenantId: number, userId: number, input: ScoreBody) {
  const context = await requireContext(tenantId, userId);
  await assertOwns(tenantId, context, input.classSelect, input.subjectId);
  const sheet = await gradeSheet(tenantId, userId, input.classSelect, input.subjectId);
  if (sheet.locked) throw new TeacherError("GRADES_LOCKED");
  if (sheet.plans.length === 0) throw new TeacherError("GRADES_NO_PLAN");

  const planByName = new Map(sheet.plans.map((plan) => [plan.name, plan.percent]));
  const allowedStudents = new Set(sheet.students.map((student) => student.id));
  for (const mark of input.marks) {
    if (!allowedStudents.has(mark.studentId)) throw new TeacherError("NOT_ASSIGNED");
    const max = planByName.get(mark.weightingType);
    if (max === undefined) throw new TeacherError("PLAN_NOT_FOUND");
    if (mark.score !== null && mark.score > max + 0.001) throw new TeacherError("SCORE_OVER", { max });
  }

  const existing = new Map<string, number>();
  for (const student of sheet.students) {
    for (const [name, score] of Object.entries(student.scores)) existing.set(`${student.id}\0${name}`, score);
  }
  const posted = new Map<string, number | null>();
  for (const mark of input.marks) posted.set(`${mark.studentId}\0${mark.weightingType}`, mark.score);

  await db.transaction(async (tx) => {
    for (const mark of input.marks) {
      const where = scoped(
        grades,
        tenantId,
        and(
          eq(grades.studentId, mark.studentId),
          eq(grades.subjectId, input.subjectId),
          eq(grades.weightingType, mark.weightingType),
          eq(grades.semester, context.semester),
          eq(grades.academicYear, context.academicYear),
        ),
      );
      if (mark.score === null) {
        await tx.delete(grades).where(where);
        continue;
      }
      const filled = sheet.plans.filter((plan) => {
        const key = `${mark.studentId}\0${plan.name}`;
        const value = posted.has(key) ? posted.get(key) : existing.get(key);
        return value !== undefined && value !== null;
      }).length;
      const status = input.finalize && filled === sheet.plans.length ? "Submitted" : "Draft";
      const [current] = await tx
        .select({ id: grades.gradeEntryId })
        .from(grades)
        .where(where)
        .limit(1);
      const values = {
        score: money(mark.score),
        maxScore: money(planByName.get(mark.weightingType) ?? mark.score),
        recordedBy: context.staffId,
        submissionStatus: status as "Draft" | "Submitted",
        isSubmitted: status === "Submitted" ? 1 : 0,
        status: "Complete" as const,
      };
      if (current) {
        await tx.update(grades).set(values).where(scoped(grades, tenantId, eq(grades.gradeEntryId, current.id)));
      } else {
        await tx.insert(grades).values(
          withTenant(
            {
              studentId: mark.studentId,
              subjectId: input.subjectId,
              semester: context.semester,
              weightingType: mark.weightingType,
              assessmentName: mark.weightingType,
              academicYear: context.academicYear,
              ...values,
            },
            tenantId,
          ),
        );
      }
    }

    if (input.finalize) {
      const studentIds = [...new Set(input.marks.map((mark) => mark.studentId))];
      for (const studentId of studentIds) {
        const filled = sheet.plans.filter((plan) => {
          const key = `${studentId}\0${plan.name}`;
          const value = posted.has(key) ? posted.get(key) : existing.get(key);
          return value !== undefined && value !== null;
        }).length;
        if (filled !== sheet.plans.length) continue;
        await tx
          .update(grades)
          .set({ submissionStatus: "Submitted", isSubmitted: 1 })
          .where(
            scoped(
              grades,
              tenantId,
              and(
                eq(grades.studentId, studentId),
                eq(grades.subjectId, input.subjectId),
                eq(grades.semester, context.semester),
                eq(grades.academicYear, context.academicYear),
              ),
            ),
          );
      }
    }
  });

  return { saved: true };
}
