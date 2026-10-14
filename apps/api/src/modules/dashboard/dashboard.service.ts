import { and, asc, count, desc, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { classes, classSchedule, staff, students, subjects, systemSettings, teacherAssignments, users } from "../../db/schema/index.js";
import type { Role } from "../../lib/roles.js";
import { scoped } from "../../lib/tenant.js";

const CONTROL_ROLES = new Set<Role>(["Admin", "V_Principal"]);
const STORE_ROLES = new Set<Role>(["Technician", "Store_Keeper"]);

export type RoleCount = { role: string; total: number };

export type ControlDashboard = {
  kind: "control";
  academicYear: string;
  students: number;
  teachers: number;
  staff: number;
  otherStaff: number;
  roles: RoleCount[];
};

export type StoreDashboard = {
  kind: "store";
  firstName: string;
  jobTitle: string;
  itemTypes: number;
  lowStock: number;
  todayTransactions: number;
};

export type AcademicPeriod = {
  periodNumber: number;
  subjectName: string;
  gradeLevel: number;
  section: string;
  classId: number;
};

export type AcademicDashboard = {
  kind: "academic";
  firstName: string;
  academicYear: string;
  weekday: string;
  students: number;
  classes: number;
  todayPeriods: AcademicPeriod[];
};

export type EmptyDashboard = { kind: "empty" };

export type DashboardView = ControlDashboard | StoreDashboard | AcademicDashboard | EmptyDashboard;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
type Weekday = (typeof WEEKDAYS)[number];

const YEAR_KEY = "current_academic_year";

/** English weekday in the school timezone, matching legacy `date('l')`. */
export function schoolWeekday(date = new Date()): Weekday {
  const name = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Africa/Addis_Ababa",
  }).format(date);
  if ((WEEKDAYS as readonly string[]).includes(name)) return name as Weekday;
  return "Monday";
}

function asNumber(value: unknown): number {
  return Number(value ?? 0);
}

async function controlCenter(tenantId: number): Promise<ControlDashboard> {
  const [latest] = await db
    .select({ academicYear: students.academicYear })
    .from(students)
    .where(scoped(students, tenantId))
    .orderBy(desc(students.studentId))
    .limit(1);
  const academicYear = latest?.academicYear ?? String(new Date().getFullYear());

  const approvedThisYear = and(
    eq(students.academicYear, academicYear),
    or(eq(students.isApproved, 1), eq(students.submissionStatus, "Approved")),
  );
  const [studentRow] = await db
    .select({ total: count() })
    .from(students)
    .where(scoped(students, tenantId, approvedThisYear));

  const [staffRow] = await db.select({ total: count() }).from(staff).where(scoped(staff, tenantId));

  const [teacherRow] = await db
    .select({ total: count() })
    .from(staff)
    .innerJoin(users, eq(staff.userId, users.userId))
    .where(and(scoped(staff, tenantId), scoped(users, tenantId), eq(users.role, "Teacher")));

  const roleRows = await db
    .select({ role: users.role, total: count() })
    .from(staff)
    .innerJoin(users, eq(staff.userId, users.userId))
    .where(and(scoped(staff, tenantId), scoped(users, tenantId)))
    .groupBy(users.role);

  const staffTotal = asNumber(staffRow?.total);
  const teacherTotal = asNumber(teacherRow?.total);

  return {
    kind: "control",
    academicYear,
    students: asNumber(studentRow?.total),
    teachers: teacherTotal,
    staff: staffTotal,
    otherStaff: staffTotal - teacherTotal,
    roles: roleRows.map((row) => ({ role: row.role, total: asNumber(row.total) })),
  };
}

async function storeHome(tenantId: number, userId: number): Promise<StoreDashboard> {
  const [member] = await db
    .select({ firstName: staff.firstName, jobTitle: staff.jobTitle })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.userId, userId)))
    .limit(1);

  return {
    kind: "store",
    firstName: member?.firstName ?? "",
    jobTitle: member?.jobTitle ?? "Store Keeper",
    // items and stock_ledger_card are not in this database, so the cards stay at 0.
    itemTypes: 0,
    lowStock: 0,
    todayTransactions: 0,
  };
}

async function currentYear(tenantId: number): Promise<string> {
  const [row] = await db
    .select({ value: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, YEAR_KEY)))
    .limit(1);
  if (row?.value) return row.value;
  const [latest] = await db
    .select({ academicYear: students.academicYear })
    .from(students)
    .where(scoped(students, tenantId))
    .orderBy(desc(students.studentId))
    .limit(1);
  return latest?.academicYear ?? String(new Date().getFullYear());
}

async function academicHome(tenantId: number, userId: number): Promise<AcademicDashboard> {
  const academicYear = await currentYear(tenantId);
  const weekday = schoolWeekday();
  const [teacher] = await db
    .select({ staffId: staff.staffId, firstName: staff.firstName })
    .from(staff)
    .where(scoped(staff, tenantId, eq(staff.userId, userId)))
    .limit(1);

  if (!teacher) {
    return { kind: "academic", firstName: "", academicYear, weekday, students: 0, classes: 0, todayPeriods: [] };
  }

  const assignments = await db
    .select({ gradeLevel: teacherAssignments.gradeLevel, section: teacherAssignments.section })
    .from(teacherAssignments)
    .where(
      scoped(
        teacherAssignments,
        tenantId,
        and(eq(teacherAssignments.staffId, teacher.staffId), eq(teacherAssignments.academicYear, academicYear)),
      ),
    );

  const classKeys = new Set(assignments.map((row) => `${row.gradeLevel}\0${row.section ?? ""}`));
  const matchers: SQL[] = [];
  for (const key of classKeys) {
    const [gradeText, section] = key.split("\0");
    const gradeLevel = Number(gradeText);
    matchers.push(
      section
        ? and(eq(students.gradeLevel, gradeLevel), eq(students.section, section))!
        : and(eq(students.gradeLevel, gradeLevel), or(isNull(students.section), eq(students.section, "")))!,
    );
  }

  let studentTotal = 0;
  if (matchers.length > 0) {
    const [studentRow] = await db
      .select({ total: count() })
      .from(students)
      .where(
        scoped(
          students,
          tenantId,
          and(
            eq(students.academicYear, academicYear),
            inArray(students.submissionStatus, ["Draft", "Submitted", "Approved"]),
            or(...matchers),
          ),
        ),
      );
    studentTotal = asNumber(studentRow?.total);
  }

  const periods = await db
    .select({
      periodNumber: classSchedule.periodNumber,
      subjectName: subjects.subjectName,
      gradeLevel: classes.gradeLevel,
      section: classes.section,
      classId: classes.classId,
    })
    .from(classSchedule)
    .innerJoin(classes, and(eq(classes.classId, classSchedule.classId), eq(classes.tenantId, tenantId)))
    .leftJoin(subjects, and(eq(subjects.subjectId, classSchedule.subjectId), eq(subjects.tenantId, tenantId)))
    .where(
      scoped(
        classSchedule,
        tenantId,
        and(
          eq(classSchedule.teacherStaffId, teacher.staffId),
          eq(classSchedule.academicYear, academicYear),
          eq(classSchedule.dayOfWeek, weekday),
        ),
      ),
    )
    .orderBy(asc(classSchedule.periodNumber));

  return {
    kind: "academic",
    firstName: teacher.firstName,
    academicYear,
    weekday,
    students: studentTotal,
    classes: classKeys.size,
    todayPeriods: periods.map((row) => ({
      periodNumber: row.periodNumber,
      subjectName: row.subjectName ?? "",
      gradeLevel: row.gradeLevel,
      section: row.section,
      classId: row.classId,
    })),
  };
}

export async function dashboardFor(tenantId: number, userId: number, role: Role): Promise<DashboardView> {
  if (CONTROL_ROLES.has(role)) return controlCenter(tenantId);
  if (STORE_ROLES.has(role)) return storeHome(tenantId, userId);
  if (role === "Teacher") return academicHome(tenantId, userId);
  return { kind: "empty" };
}
