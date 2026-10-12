/**
 * Sidebar transcribed from docs/legacy-menu.
 * Teacher and Technician screenshots are complete.
 * TEMPORARY: the Admin and V_Principal screenshots are cut off below the last
 * item listed here. Do not add items for that missing part.
 * Student and Store_Keeper items are TEMPORARY: those screenshots were not taken.
 *
 * TODO: replace with GET /menu once modules and role_modules exist.
 * docs/backlog.md "Menu from database".
 */
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownCircle,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  ChartLine,
  CheckCheck,
  ClipboardList,
  Database,
  FileDown,
  FileText,
  FolderOpen,
  Gauge,
  GraduationCap,
  IdCard,
  KeyRound,
  Landmark,
  Link,
  ListChecks,
  Megaphone,
  RotateCcw,
  SlidersHorizontal,
  SquarePen,
  UserCheck,
  UserCog,
  UsersRound,
} from "lucide-react";
import { can, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import type amNav from "@/locales/am/nav.json";

export type NavItemKey = keyof (typeof amNav)["items"];

export type MenuGroupKey =
  | "academic"
  | "administration"
  | "academicAdmin"
  | "academicTasks"
  | "techRegistration"
  | "systemSettings"
  | "store"
  | "finance"
  | "main";

export type MenuItem = {
  /** Locale key in the `nav` namespace, also used as React key. */
  key: NavItemKey;
  path: string;
  icon: LucideIcon;
  group: MenuGroupKey;
  /** Omit only for items every signed-in user with this role sees (dashboard, profile). */
  permission?: Permission;
  /** When set, the item is shown only for these roles. */
  roles?: readonly Role[];
  /** Legacy shows a different label for the same item per role. */
  labelByRole?: Partial<Record<Role, NavItemKey>>;
};

type MenuUser = { role: Role; permissions: readonly Permission[] };

export const MENU_GROUP_ORDER: readonly MenuGroupKey[] = [
  "academic",
  "administration",
  "academicAdmin",
  "academicTasks",
  "techRegistration",
  "systemSettings",
  "store",
  "main",
  "finance",
];

export const MENU_ITEMS: readonly MenuItem[] = [
  // Admin (Admin.png) — ACADEMIC
  { key: "approvalDashboard", path: "/admin/approvals", icon: Link, group: "academic", permission: "approvals.read" },
  { key: "studentStatusReport", path: "/admin/student-status", icon: Link, group: "academic", permission: "studentStatusReport.read" },

  // Teacher
  { key: "takeAttendance", path: "/teacher/take-attendance", icon: Link, group: "academic", permission: "attendance.take" },

  // Student (TEMPORARY: no screenshot)
  { key: "academicResults", path: "/student/results", icon: BookOpenCheck, group: "academic", permission: "results.readOwn" },
  { key: "semesterReportCard", path: "/student/report-card", icon: FileText, group: "academic", permission: "reportCard.readOwn" },

  { key: "requestItem", path: "/teacher/store-requests", icon: Link, group: "administration", permission: "storeRequests.create" },

  // V_Principal (V_Principal.png) — አስተዳደር
  { key: "students", path: "/academics/students", icon: GraduationCap, group: "administration", permission: "students.manage" },
  { key: "subjects", path: "/academics/subjects", icon: BookOpen, group: "administration", permission: "subjects.read" },
  { key: "teachingLoad", path: "/academics/teaching-load", icon: UsersRound, group: "administration", permission: "teachingLoad.manage" },

  // V_Principal — አካዳሚክ (ADMIN). Lower part of the screenshot is missing.
  { key: "selectedRoster", path: "/academics/selected-roster", icon: ListChecks, group: "academicAdmin", permission: "selectedRoster.read" },
  { key: "gradeCorrection", path: "/academics/grade-correction", icon: Landmark, group: "academicAdmin", permission: "gradeCorrection.approve" },
  { key: "academicApprovals", path: "/academics/approvals", icon: CheckCheck, group: "academicAdmin", permission: "academicApprovals.manage" },
  { key: "periodSchedule", path: "/academics/schedule", icon: CalendarDays, group: "academicAdmin", permission: "periodSchedule.manage" },
  { key: "academicReports", path: "/academics/reports", icon: ChartLine, group: "academicAdmin", permission: "academicReports.read" },

  // Teacher (same menu for homeroom teachers)
  { key: "assignedWorks", path: "/teacher/assigned-works", icon: ListChecks, group: "academicTasks", permission: "assignedWork.read" },
  { key: "gradeEntry", path: "/teacher/grades", icon: SquarePen, group: "academicTasks", permission: "grades.enter" },
  { key: "onlineExams", path: "/teacher/online-exams", icon: SquarePen, group: "academicTasks", permission: "onlineExams.manage" },
  { key: "examResults", path: "/teacher/exam-results", icon: SquarePen, group: "academicTasks", permission: "examResults.manage" },
  { key: "bestTeaching", path: "/teacher/best-teaching", icon: SquarePen, group: "academicTasks", permission: "bestTeaching.manage" },
  { key: "attendanceRegistration", path: "/teacher/attendance", icon: UserCheck, group: "academicTasks", permission: "attendance.register" },
  { key: "studentRegistration", path: "/teacher/student-registration", icon: FileText, group: "academicTasks", permission: "studentRegistration.manage" },
  { key: "classRoster", path: "/teacher/class-roster", icon: FileDown, group: "academicTasks", permission: "classRoster.read" },
  { key: "reportCard", path: "/teacher/report-cards", icon: FileDown, group: "academicTasks", permission: "reportCards.generate" },
  { key: "simulations", path: "/teacher/simulations", icon: FileDown, group: "academicTasks", permission: "simulations.create" },
  { key: "studentReports", path: "/teacher/student-reports", icon: FileDown, group: "academicTasks", permission: "studentReports.read" },

  // Technician (Technician.png)
  { key: "announcements", path: "/system/announcements", icon: Megaphone, group: "techRegistration", permission: "announcements.manage" },
  { key: "staffRegistration", path: "/system/staff-registration", icon: IdCard, group: "techRegistration", permission: "staffRegistration.manage" },
  { key: "accountManagement", path: "/account/manage", icon: KeyRound, group: "techRegistration", permission: "accounts.manage" },

  // Admin — ሲስተም ሴቲንግ. The screenshot text is small; labels follow the earlier reading of Admin.png.
  { key: "academicYear", path: "/system/academic-year", icon: SlidersHorizontal, group: "systemSettings", permission: "academicYear.manage" },
  { key: "databaseBackup", path: "/system/backup", icon: Database, group: "systemSettings", permission: "backup.create" },
  { key: "databaseRestore", path: "/system/restore", icon: RotateCcw, group: "systemSettings", permission: "backup.restore" },
  { key: "passwordManagement", path: "/system/passwords", icon: UserCog, group: "systemSettings", permission: "passwords.reset" },
  { key: "schoolInfo", path: "/system/school-info", icon: Landmark, group: "systemSettings", permission: "schoolInfo.manage" },
  { key: "roleModules", path: "/system/role-modules", icon: SlidersHorizontal, group: "systemSettings", permission: "roleModules.manage" },

  // Store_Keeper (TEMPORARY: no screenshot)
  { key: "receiveItems", path: "/store/receive", icon: ArrowDownCircle, group: "store", permission: "store.receive" },
  { key: "binCard", path: "/store/bin-card", icon: ClipboardList, group: "store", permission: "store.binCard" },

  {
    key: "dashboard",
    path: "/dashboard",
    icon: Gauge,
    group: "main",
    roles: ["Admin", "Teacher", "Technician"],
    labelByRole: { Admin: "dashboardAdmin", Teacher: "dashboardAcademic", Technician: "dashboardStaff" },
  },
  { key: "fileManagement", path: "/files", icon: FolderOpen, group: "main", permission: "files.manage" },
  { key: "profile", path: "/profile", icon: UserCog, group: "main", roles: ["Admin", "Teacher", "Technician"] },
  { key: "payments", path: "/finance/payments", icon: Landmark, group: "finance", permission: "finance.income" },
  { key: "incomeExpense", path: "/finance/income", icon: Landmark, group: "finance", permission: "finance.expense" },
];

export function canAccess(item: MenuItem, user: Pick<MenuUser, "permissions">): boolean {
  return !item.permission || can(user.permissions, item.permission);
}

export type MenuEntry = MenuItem & { labelKey: NavItemKey };

export type MenuGroup = { key: MenuGroupKey; items: MenuEntry[] };

function visibleTo(item: MenuItem, user: MenuUser): boolean {
  if (item.roles && !item.roles.includes(user.role)) return false;
  return canAccess(item, user);
}

export function menuForUser(user: MenuUser): MenuGroup[] {
  return MENU_GROUP_ORDER.map((group) => ({
    key: group,
    items: MENU_ITEMS.filter((item) => item.group === group && visibleTo(item, user)).map((item) => ({
      ...item,
      labelKey: item.labelByRole?.[user.role] ?? item.key,
    })),
  })).filter((group) => group.items.length > 0);
}
