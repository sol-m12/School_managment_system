import { and, count, desc, eq, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { staff, students, users } from "../../db/schema/index.js";
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

export type EmptyDashboard = { kind: "empty" };

export type DashboardView = ControlDashboard | StoreDashboard | EmptyDashboard;

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

export async function dashboardFor(tenantId: number, userId: number, role: Role): Promise<DashboardView> {
  if (CONTROL_ROLES.has(role)) return controlCenter(tenantId);
  if (STORE_ROLES.has(role)) return storeHome(tenantId, userId);
  return { kind: "empty" };
}
