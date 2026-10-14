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

  "files.manage",

  "results.readOwn",
  "reportCard.readOwn",

  "store.receive",
  "store.binCard",

  "finance.income",
  "finance.expense",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const GRANTS: Record<Permission, readonly Role[]> = {
  "subjects.read": ["Admin", "V_Principal"],
  "subjects.create": ["Admin", "V_Principal"],
  "subjects.update": ["Admin", "V_Principal"],
  "subjects.delete": ["Admin", "V_Principal"],

  "approvals.read": ["Admin"],
  "studentStatusReport.read": ["Admin"],

  "students.manage": ["Admin", "V_Principal"],
  "teachingLoad.manage": ["Admin", "V_Principal"],
  "selectedRoster.read": ["Admin", "V_Principal"],
  "gradeCorrection.approve": ["Admin", "V_Principal"],
  "academicApprovals.manage": ["Admin", "V_Principal"],
  "periodSchedule.manage": ["Admin", "V_Principal"],
  "academicReports.read": ["Admin", "V_Principal"],

  "announcements.manage": ["Technician"],
  "staffRegistration.manage": ["Technician"],
  "accounts.manage": ["Technician"],
  "academicYear.manage": ["Admin"],
  "backup.create": ["Admin"],
  "backup.restore": ["Admin"],
  "passwords.reset": ["Admin"],
  "schoolInfo.manage": ["Admin"],
  "roleModules.manage": ["Admin"],

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

  "files.manage": ["Admin", "Teacher", "Technician", "V_Principal"],

  // No screenshot yet. Placeholder menu only.
  "results.readOwn": ["Student"],
  "reportCard.readOwn": ["Student"],
  "store.receive": ["Store_Keeper"],
  "store.binCard": ["Store_Keeper"],

  "finance.income": ["Admin"],
  "finance.expense": ["Admin"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return GRANTS[permission].includes(role);
}

export function permissionsForRole(role: Role): Permission[] {
  return PERMISSIONS.filter((permission) => hasPermission(role, permission));
}
