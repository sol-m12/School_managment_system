// Mirror of the keys in apps/api/src/lib/permissions.ts. The API is the real guard;
// the web app only hides what the user cannot use.
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

  "files.manage",

  "results.readOwn",
  "reportCard.readOwn",
  "exams.readOwn",
  "groups.readOwn",
  "quiz.readOwn",
  "resources.readOwn",
  "simulations.readOwn",

  "store.items",
  "store.receive",
  "store.binCard",
  "store.inflow",
  "store.issue",
  "store.approvals",
  "store.finance",

  "finance.income",
  "finance.expense",

  "principal.office",
  "vice.office",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function can(permissions: readonly Permission[], permission: Permission): boolean {
  return permissions.includes(permission);
}
