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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const GRANTS: Record<Permission, readonly Role[]> = {
  "subjects.read": ["V_Principal"],
  "subjects.create": ["V_Principal"],
  "subjects.update": ["V_Principal"],
  "subjects.delete": ["V_Principal"],

  "approvals.read": ["Admin"],
  "studentStatusReport.read": ["Admin"],

  "students.manage": ["V_Principal"],
  "teachingLoad.manage": ["V_Principal"],
  "selectedRoster.read": ["V_Principal"],
  "gradeCorrection.approve": ["V_Principal"],
  "academicApprovals.manage": ["V_Principal"],
  "periodSchedule.manage": ["V_Principal"],
  "academicReports.read": ["V_Principal"],

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

  "files.manage": ["Teacher", "Technician"],

  // No screenshot yet. Placeholder menu only.
  "results.readOwn": ["Student"],
  "reportCard.readOwn": ["Student"],
  "store.receive": ["Store_Keeper"],
  "store.binCard": ["Store_Keeper"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return GRANTS[permission].includes(role);
}

export function permissionsForRole(role: Role): Permission[] {
  return PERMISSIONS.filter((permission) => hasPermission(role, permission));
}
