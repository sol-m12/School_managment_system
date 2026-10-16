/**
 * Sidebar transcribed from docs/legacy-menu.
 * Teacher and Technician screenshots are complete.
 * V_Principal lower group is the live menu (2026-10-13): dashboard, file management, profile.
 * TEMPORARY: the Admin screenshot is still cut off below the last item listed here.
 * Student items match the live haymi menu (2026-10-15).
 * Store_Keeper items match the live yekte menu (2026-10-15).
 *
 * TODO: replace with GET /menu once modules and role_modules exist.
 * docs/backlog.md "Menu from database".
 */
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownCircle,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ChartLine,
  CheckCheck,
  ClipboardList,
  Boxes,
  ArrowUpCircle,
  ScrollText,
  Activity,
  Headset,
  Upload,
  Wallet,
  Database,
  FileDown,
  FileText,
  FlaskConical,
  Laptop,
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
  TestTube,
  Trophy,
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
  | "studentInfo"
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
  "studentInfo",
  "main",
  "finance",
];

export const MENU_ITEMS: readonly MenuItem[] = [
  // Admin (Admin.png) — ACADEMIC
  { key: "approvalDashboard", path: "/admin/approvals", icon: Link, group: "academic", permission: "approvals.read" },
  { key: "studentStatusReport", path: "/admin/student-status", icon: Link, group: "academic", permission: "studentStatusReport.read" },

  // Teacher
  { key: "takeAttendance", path: "/teacher/take-attendance", icon: Link, group: "academic", permission: "attendance.take" },

  // Student live menu (haymi, 2026-10-15) — ተማሪ መረጃ
  { key: "onlineExam", path: "/student/exams", icon: Laptop, group: "studentInfo", permission: "exams.readOwn" },
  { key: "groupParticipation", path: "/student/groups", icon: UsersRound, group: "studentInfo", permission: "groups.readOwn" },
  { key: "groupCompetition", path: "/student/quiz", icon: Trophy, group: "studentInfo", permission: "quiz.readOwn" },
  { key: "teacherFiles", path: "/student/resources", icon: FileText, group: "studentInfo", permission: "resources.readOwn" },
  { key: "sentSimulation", path: "/student/simulations", icon: FlaskConical, group: "studentInfo", permission: "simulations.readOwn" },
  { key: "virtualLab", path: "/student/virtual-lab", icon: TestTube, group: "studentInfo", permission: "simulations.readOwn" },
  { key: "myResults", path: "/student/results", icon: ChartColumn, group: "studentInfo", permission: "results.readOwn" },

  { key: "requestItem", path: "/teacher/store-requests", icon: Link, group: "administration", permission: "storeRequests.create" },

  // V_Principal (V_Principal.png) — አስተዳደር
  { key: "students", path: "/academics/students", icon: GraduationCap, group: "administration", permission: "students.manage" },
  { key: "subjects", path: "/academics/subjects", icon: BookOpen, group: "administration", permission: "subjects.read" },
  { key: "teachingLoad", path: "/academics/teaching-load", icon: UsersRound, group: "administration", permission: "teachingLoad.manage" },

  // V_Principal — አካዳሚክ (Admin)
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

  // Technician — system and accounts. These were on the old Admin menu.
  { key: "academicYear", path: "/system/academic-year", icon: SlidersHorizontal, group: "systemSettings", permission: "academicYear.manage" },
  { key: "databaseBackup", path: "/system/backup", icon: Database, group: "systemSettings", permission: "backup.create" },
  { key: "databaseRestore", path: "/system/restore", icon: RotateCcw, group: "systemSettings", permission: "backup.restore" },
  { key: "passwordManagement", path: "/system/passwords", icon: UserCog, group: "systemSettings", permission: "passwords.reset" },
  { key: "schoolInfo", path: "/system/school-info", icon: Landmark, group: "systemSettings", permission: "schoolInfo.manage" },
  { key: "roleModules", path: "/system/role-modules", icon: SlidersHorizontal, group: "systemSettings", permission: "roleModules.manage" },
  { key: "identityAccounts", path: "/system/identity", icon: KeyRound, group: "systemSettings", permission: "accounts.manage" },
  { key: "helpdesk", path: "/system/helpdesk", icon: Headset, group: "systemSettings", permission: "tickets.manage" },
  { key: "auditTrail", path: "/system/audit", icon: ScrollText, group: "systemSettings", permission: "audit.read" },
  { key: "userImport", path: "/system/import", icon: Upload, group: "systemSettings", permission: "users.import" },
  { key: "systemHealth", path: "/system/health", icon: Activity, group: "systemSettings", permission: "health.read" },
  { key: "dutyAssignments", path: "/system/duties", icon: UsersRound, group: "systemSettings", permission: "duties.assign" },

  // Store_Keeper live menu (yekte, 2026-10-15) — ACADEMIC
  { key: "storeApprovals", path: "/store/approvals", icon: Link, group: "academic", permission: "store.approvals" },
  { key: "profileSettings", path: "/profile", icon: UserCog, group: "academic", roles: ["Store_Keeper"] },
  { key: "mehi16", path: "/store/mehi-16", icon: ScrollText, group: "academic", permission: "store.finance" },
  { key: "ledgerCards", path: "/store/ledger-cards", icon: ScrollText, group: "academic", permission: "store.finance" },

  // Store_Keeper — አስተዳደር
  { key: "propertyInflow", path: "/store/inflow", icon: ArrowDownCircle, group: "administration", permission: "store.inflow" },
  { key: "storeItems", path: "/store/items", icon: Boxes, group: "administration", permission: "store.items" },
  { key: "model19", path: "/store/model-19", icon: ArrowDownCircle, group: "administration", permission: "store.receive" },
  { key: "itemHub", path: "/store/register", icon: ClipboardList, group: "administration", permission: "store.items" },
  { key: "binCard", path: "/store/bin-card", icon: ClipboardList, group: "administration", permission: "store.binCard" },
  { key: "storeDashboard", path: "/dashboard", icon: Gauge, group: "administration", roles: ["Store_Keeper"] },
  { key: "issueModel22", path: "/store/issue", icon: ArrowUpCircle, group: "administration", permission: "store.issue" },
  { key: "saveBudget", path: "/store/budget", icon: Wallet, group: "administration", permission: "store.finance" },
  { key: "mehi17Ledger", path: "/store/mehi-17", icon: ScrollText, group: "administration", permission: "store.finance" },
  { key: "mehi17Setup", path: "/store/mehi-17-setup", icon: ScrollText, group: "administration", permission: "store.finance" },
  { key: "mehi7", path: "/store/mehi-7", icon: ScrollText, group: "administration", permission: "store.finance" },

  {
    key: "dashboard",
    path: "/dashboard",
    icon: Gauge,
    group: "main",
    roles: ["Principal", "Teacher", "Technician", "V_Principal", "Student"],
    labelByRole: {
      Principal: "dashboardPrincipal",
      Teacher: "dashboardAcademic",
      Technician: "dashboardStaff",
      V_Principal: "dashboardAdmin",
      Student: "dashboardStudent",
    },
  },
  { key: "fileManagement", path: "/files", icon: FolderOpen, group: "main", permission: "files.manage" },
  { key: "profile", path: "/profile", icon: UserCog, group: "main", roles: ["Principal", "Teacher", "Technician", "V_Principal", "Student", "Store_Keeper"] },
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
