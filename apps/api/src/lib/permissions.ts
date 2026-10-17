import type { Role } from "./roles.js";

/**
 * Permission keys for the legacy sidebar.
 * A key is granted only to the roles whose legacy menu contains that page
 * (docs/legacy-menu). The API checks keys; the web app only hides items.
 */
export const PERMISSIONS = [
  "subjects.read",
  "subjects.create",
  "subjects.update",
  "subjects.delete",

  "approvals.read",
  "studentStatusReport.read",

  "students.manage",
  "teachingLoad.manage",
  "selectedRoster.read",
  "gradeCorrection.approve",
  "academicApprovals.manage",
  "periodSchedule.manage",
  "academicReports.read",

  "announcements.manage",
  "staffRegistration.manage",
  "accounts.manage",
  "academicYear.manage",
  "backup.create",
  "backup.restore",
  "passwords.reset",
  "schoolInfo.manage",
  "roleModules.manage",
  "tickets.manage",
  "audit.read",
  "users.import",
  "health.read",
  "duties.assign",

  "attendance.take",
  "storeRequests.create",
  "assignedWork.read",
  "grades.enter",
  "onlineExams.manage",
  "examResults.manage",
  "bestTeaching.manage",
  "attendance.register",
  "studentRegistration.manage",
  "classRoster.read",
  "reportCards.generate",
  "simulations.create",
  "studentReports.read",
  "teacher.subject",
  "teacher.homeroom",
  "teacher.department",

  "files.manage",

  "results.readOwn",
  "reportCard.readOwn",
  "exams.readOwn",
  "groups.readOwn",
  "quiz.readOwn",
  "resources.readOwn",
  "simulations.readOwn",
  "student.desk",

  "store.items",
  "store.receive",
  "store.binCard",
  "store.inflow",
  "store.issue",
  "store.approvals",
  "store.finance",
  "store.office",

  "finance.income",
  "finance.expense",

  "principal.office",
  "vice.office",
  "records.office",
  "records.override",
  "library.office",
  "library.opac",
  "procurement.office",
  "secretary.office",
  "secretary.authorize",

  "parent.desk",
  "parents.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const GRANTS: Record<Permission, readonly Role[]> = {
  "subjects.read": ["Principal", "V_Principal"],
  "subjects.create": ["Principal", "V_Principal"],
  "subjects.update": ["Principal", "V_Principal"],
  "subjects.delete": ["Principal", "V_Principal"],

  "approvals.read": ["Principal"],
  "studentStatusReport.read": ["Principal"],

  "students.manage": ["Principal", "V_Principal"],
  "teachingLoad.manage": ["Principal", "V_Principal"],
  "selectedRoster.read": ["Principal", "V_Principal"],
  "gradeCorrection.approve": ["Technician", "V_Principal"],
  "academicApprovals.manage": ["Principal", "V_Principal"],
  "periodSchedule.manage": ["Principal", "V_Principal"],
  "academicReports.read": ["Principal", "V_Principal"],

  "announcements.manage": ["Technician"],
  "staffRegistration.manage": ["Technician"],
  "accounts.manage": ["Technician"],
  "academicYear.manage": ["Technician"],
  "backup.create": ["Technician"],
  "backup.restore": ["Technician"],
  "passwords.reset": ["Technician"],
  "schoolInfo.manage": ["Technician"],
  "roleModules.manage": ["Technician"],
  "tickets.manage": ["Technician"],
  "audit.read": ["Technician"],
  "users.import": ["Technician"],
  "health.read": ["Technician"],
  "duties.assign": ["Technician"],

  "attendance.take": ["Teacher"],
  "storeRequests.create": ["Teacher"],
  "assignedWork.read": ["Teacher"],
  "grades.enter": ["Teacher"],
  "onlineExams.manage": ["Teacher"],
  "examResults.manage": ["Teacher"],
  "bestTeaching.manage": ["Teacher"],
  "attendance.register": ["Teacher"],
  "studentRegistration.manage": ["Teacher"],
  "classRoster.read": ["Teacher"],
  "reportCards.generate": ["Teacher"],
  "simulations.create": ["Teacher"],
  "studentReports.read": ["Teacher"],
  "teacher.subject": ["Teacher"],
  "teacher.homeroom": ["Teacher"],
  "teacher.department": ["Teacher"],

  "files.manage": ["Principal", "Teacher", "Technician", "V_Principal"],

  "results.readOwn": ["Student"],
  "reportCard.readOwn": ["Student"],
  "exams.readOwn": ["Student"],
  "groups.readOwn": ["Student"],
  "quiz.readOwn": ["Student"],
  "resources.readOwn": ["Student"],
  "simulations.readOwn": ["Student"],
  "student.desk": ["Student"],
  "store.items": ["Store_Keeper"],
  "store.receive": ["Store_Keeper"],
  "store.binCard": ["Store_Keeper"],
  "store.inflow": ["Store_Keeper"],
  "store.issue": ["Store_Keeper"],
  "store.approvals": ["Store_Keeper"],
  "store.finance": ["Store_Keeper"],
  "store.office": ["Store_Keeper"],

  "finance.income": ["Principal"],
  "finance.expense": ["Principal"],

  "principal.office": ["Principal"],
  "vice.office": ["V_Principal"],
  "records.office": ["Registrar"],
  "records.override": ["Principal"],
  "library.office": ["Librarian"],
  "library.opac": ["Librarian", "Student", "Teacher"],
  "procurement.office": ["Procurement"],
  "secretary.office": ["Secretary"],
  "secretary.authorize": ["Principal"],

  "parent.desk": ["Parent"],
  "parents.manage": ["Technician"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return GRANTS[permission].includes(role);
}

export function permissionsForRole(role: Role): Permission[] {
  return PERMISSIONS.filter((permission) => hasPermission(role, permission));
}
