import { db, pool } from "../db/index.js";
import { classes, students, subjects, tenants, users } from "../db/schema/index.js";
import { hashPassword } from "../lib/password.js";

export const SHARED_USERNAME = "shared_user";
export const SHARED_PASSWORD = "TestPass123!";

export type SeededTenant = {
  id: number;
  slug: string;
  name: string;
  userId: number;
  classId: number;
  studentId: number;
  subjectId: number;
};

export type IsolationSeed = {
  tenantA: SeededTenant;
  tenantB: SeededTenant;
  password: string;
  username: string;
};

const TABLES_TO_EMPTY = [
  "tc_performance_scores",
  "tc_performance",
  "tc_topic_coverage",
  "tc_grade_reviews",
  "tc_exam_standards",
  "tc_requisitions",
  "tc_participation",
  "tc_paper_items",
  "tc_papers",
  "tc_questions",
  "tc_book_recommendations",
  "tc_leave_requests",
  "tc_incidents",
  "tc_substitutions",
  "tc_swaps",
  "class_schedule",
  "vp_invigilators",
  "vp_exam_sessions",
  "vp_penalties",
  "vp_hearings",
  "vp_referrals",
  "vp_placements",
  "vp_programs",
  "principal_approval_notes",
  "principal_report_defs",
  "principal_incidents",
  "principal_training",
  "principal_transfers",
  "principal_documents",
  "principal_messages",
  "principal_policies",
  "support_tickets",
  "login_attempts",
  "backup_runs",
  "outbound_notices",
  "department_heads",
  "audit_log",
  "teacher_assignments",
  "groups_info",
  "subjects",
  "students",
  "classes",
  "staff",
  "users",
  "tenants",
] as const;

/** Empty tables used by isolation tests (test DB only). */
export async function emptyIsolationTables(): Promise<void> {
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const table of TABLES_TO_EMPTY) {
      await pool.query("TRUNCATE TABLE `" + table + "`");
    }
  } finally {
    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

async function insertTenant(slug: string, name: string): Promise<number> {
  const result = await db.insert(tenants).values({
    name,
    slug,
    status: "active",
  });
  return Number(result[0].insertId);
}

async function insertUser(
  tenantId: number,
  username: string,
  passwordHash: string,
): Promise<number> {
  const result = await db.insert(users).values({
    username,
    passwordHash,
    role: "V_Principal",
    isActive: 1,
    tenantId,
    tokenVersion: 0,
  });
  return Number(result[0].insertId);
}

async function insertClass(tenantId: number, section: string): Promise<number> {
  const result = await db.insert(classes).values({
    gradeLevel: 9,
    section,
    tenantId,
  });
  return Number(result[0].insertId);
}

async function insertStudent(
  tenantId: number,
  fullName: string,
): Promise<number> {
  const result = await db.insert(students).values({
    fullName,
    gender: "M",
    age: 15,
    gradeLevel: 9,
    academicYear: "2017",
    tenantId,
  });
  return Number(result[0].insertId);
}

async function insertSubject(tenantId: number, subjectName: string): Promise<number> {
  const result = await db.insert(subjects).values({
    subjectName,
    gradeLevel: 9,
    stream: "Common",
    creditHours: 3,
    sortOrder: 1,
    tenantId,
  });
  return Number(result[0].insertId);
}

/**
 * Truncates used tables, then seeds tenants A and B with the same username
 * and a few tenant-scoped rows (classes, students, subjects).
 */
export async function seedTwoTenants(): Promise<IsolationSeed> {
  await emptyIsolationTables();

  const passwordHash = await hashPassword(SHARED_PASSWORD);

  const tenantAId = await insertTenant("tenant-a-test", "Tenant A Test");
  const tenantBId = await insertTenant("tenant-b-test", "Tenant B Test");

  const userAId = await insertUser(tenantAId, SHARED_USERNAME, passwordHash);
  const userBId = await insertUser(tenantBId, SHARED_USERNAME, passwordHash);

  const classAId = await insertClass(tenantAId, "A");
  const classBId = await insertClass(tenantBId, "B");

  const studentAId = await insertStudent(tenantAId, "Student A");
  const studentBId = await insertStudent(tenantBId, "Student B");

  // Same subject name in both tenants: the unique key is per tenant.
  const subjectAId = await insertSubject(tenantAId, "Seed Subject");
  const subjectBId = await insertSubject(tenantBId, "Seed Subject");

  // Extra rows so list isolation is obvious
  await insertStudent(tenantAId, "Student A2");
  await insertClass(tenantAId, "C");
  await insertSubject(tenantAId, "Seed Subject A2");

  return {
    username: SHARED_USERNAME,
    password: SHARED_PASSWORD,
    tenantA: {
      id: tenantAId,
      slug: "tenant-a-test",
      name: "Tenant A Test",
      userId: userAId,
      classId: classAId,
      studentId: studentAId,
      subjectId: subjectAId,
    },
    tenantB: {
      id: tenantBId,
      slug: "tenant-b-test",
      name: "Tenant B Test",
      userId: userBId,
      classId: classBId,
      studentId: studentBId,
      subjectId: subjectBId,
    },
  };
}
