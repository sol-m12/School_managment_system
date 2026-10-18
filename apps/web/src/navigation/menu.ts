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
  Shield,
  Inbox,
  PenLine,
  Send,
  GitCompare,
  FileOutput,
  Brain,
  FileSpreadsheet,
  LayoutTemplate,
  Siren,
  Wrench,
  Scale,
  ClipboardCheck,
  Wifi,
  CalendarOff,
  Library,
  BookMarked,
  ShoppingCart,
  Building2,
  Star,
  Hand,
  Bell,
  LifeBuoy,
  QrCode,
  Search,
  MessageCircle,
  Trash2,
  Undo2,
  Archive,
  FileCheck2,
  LockKeyhole,
  AlertTriangle,
  PieChart,
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
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  TestTube,
  Trophy,
  UserCheck,
  UserCog,
  UserPlus,
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
  | "principalOffice"
  | "viceOffice"
  | "subjectTeacher"
  | "homeroomTeacher"
  | "departmentHead"
  | "studentDesk"
  | "storeOffice"
  | "recordOffice"
  | "libraryOffice"
  | "procurementOffice"
  | "secretaryOffice"
  | "counselorOffice"
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
  /** Highlight only this path, not the pages under it. */
  end?: boolean;
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
  "principalOffice",
  "viceOffice",
  "subjectTeacher",
  "homeroomTeacher",
  "departmentHead",
  "studentDesk",
  "storeOffice",
  "recordOffice",
  "libraryOffice",
  "procurementOffice",
  "secretaryOffice",
  "counselorOffice",
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
  { key: "attendanceStatus", path: "/student/attendance", icon: UserCheck, group: "studentDesk", permission: "student.desk" },
  { key: "disciplineStatus", path: "/student/discipline", icon: Scale, group: "studentDesk", permission: "student.desk" },
  { key: "studentTimetable", path: "/student/timetable", icon: CalendarDays, group: "studentDesk", permission: "student.desk" },
  { key: "notificationCenter", path: "/student/notifications", icon: Bell, group: "studentDesk", permission: "student.desk" },
  { key: "studentAssignments", path: "/student/assignments", icon: ClipboardList, group: "studentDesk", permission: "student.desk" },
  { key: "vocationalPlacement", path: "/student/vocational", icon: Wrench, group: "studentDesk", permission: "student.desk" },
  { key: "libraryStatus", path: "/student/library", icon: Library, group: "studentDesk", permission: "student.desk" },
  { key: "libraryUsage", path: "/student/library-usage", icon: BookOpen, group: "studentDesk", permission: "student.desk" },
  { key: "documentRequest", path: "/student/documents", icon: FileText, group: "studentDesk", permission: "student.desk" },
  { key: "helpdesk", path: "/student/helpdesk", icon: LifeBuoy, group: "studentDesk", permission: "student.desk" },
  { key: "studyPlanner", path: "/student/planner", icon: Brain, group: "studentDesk", permission: "student.desk" },
  { key: "studentClubs", path: "/student/clubs", icon: Trophy, group: "studentDesk", permission: "clubs.student" },
  { key: "studentLostFound", path: "/student/lost-found", icon: Search, group: "studentDesk", permission: "lostfound.post" },
  { key: "studentForum", path: "/student/forum", icon: MessageCircle, group: "studentDesk", permission: "forum.student" },
  { key: "studentScholarships", path: "/student/scholarships", icon: GraduationCap, group: "studentDesk", permission: "scholarships.student" },
  { key: "digitalId", path: "/student/id", icon: QrCode, group: "studentDesk", permission: "student.desk" },

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

  { key: "executiveOffice", path: "/principal/executive", icon: Shield, group: "principalOffice", permission: "principal.office" },
  { key: "reportAnalysis", path: "/principal/trends", icon: ChartLine, group: "principalOffice", permission: "principal.office" },
  { key: "communicationHub", path: "/principal/communications", icon: Megaphone, group: "principalOffice", permission: "principal.office" },
  { key: "premiumOffice", path: "/principal/premium", icon: Activity, group: "principalOffice", permission: "principal.office" },
  { key: "approvalInbox", path: "/principal/inbox", icon: Inbox, group: "principalOffice", permission: "principal.office" },
  { key: "staffKpis", path: "/principal/staff", icon: UsersRound, group: "principalOffice", permission: "principal.office" },
  { key: "documentSign", path: "/principal/documents", icon: PenLine, group: "principalOffice", permission: "principal.office" },
  { key: "bulkMessages", path: "/principal/messages", icon: Send, group: "principalOffice", permission: "principal.office" },
  { key: "academicCompare", path: "/principal/analytics", icon: ChartColumn, group: "principalOffice", permission: "principal.office" },
  { key: "correlationInsights", path: "/principal/correlation", icon: GitCompare, group: "principalOffice", permission: "principal.office" },
  { key: "transferClearance", path: "/principal/transfers", icon: FileOutput, group: "principalOffice", permission: "principal.office" },
  { key: "atRiskStudents", path: "/principal/at-risk", icon: Brain, group: "principalOffice", permission: "principal.office" },
  { key: "moeReports", path: "/principal/moe", icon: FileSpreadsheet, group: "principalOffice", permission: "principal.office" },
  { key: "capacityBuilding", path: "/principal/training", icon: GraduationCap, group: "principalOffice", permission: "principal.office" },
  { key: "reportBuilder", path: "/principal/reports", icon: LayoutTemplate, group: "principalOffice", permission: "principal.office" },
  { key: "earlyWarning", path: "/principal/warnings", icon: AlertTriangle, group: "principalOffice", permission: "principal.office" },
  { key: "incidentPortal", path: "/principal/incidents", icon: Siren, group: "principalOffice", permission: "principal.office" },
  { key: "yearAnalytics", path: "/principal/demographics", icon: PieChart, group: "principalOffice", permission: "principal.office" },
  { key: "recordOverrides", path: "/principal/record-overrides", icon: LockKeyhole, group: "principalOffice", permission: "records.override" },

  { key: "vocationalTraining", path: "/vice/vocational", icon: Wrench, group: "viceOffice", permission: "vice.office" },
  { key: "viceClubs", path: "/vice/clubs", icon: Trophy, group: "viceOffice", permission: "clubs.oversee" },
  { key: "viceScholarships", path: "/vice/scholarships", icon: GraduationCap, group: "viceOffice", permission: "scholarships.post" },
  { key: "behaviorOffice", path: "/vice/behavior", icon: Scale, group: "viceOffice", permission: "vice.office" },
  { key: "examInvigilation", path: "/vice/invigilation", icon: ClipboardCheck, group: "viceOffice", permission: "vice.office" },

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

  { key: "offlineAttendance", path: "/teacher/offline-attendance", icon: Wifi, group: "subjectTeacher", permission: "teacher.subject" },
  { key: "globalTimetable", path: "/teacher/timetable", icon: CalendarDays, group: "subjectTeacher", permission: "teacher.subject" },
  { key: "incidentReports", path: "/teacher/incidents", icon: Megaphone, group: "subjectTeacher", permission: "teacher.subject" },
  { key: "leaveRequest", path: "/teacher/leave", icon: CalendarOff, group: "subjectTeacher", permission: "teacher.subject" },
  { key: "teacherClubs", path: "/teacher/clubs", icon: Trophy, group: "subjectTeacher", permission: "clubs.patron" },
  { key: "teacherLostFound", path: "/teacher/lost-found", icon: Search, group: "subjectTeacher", permission: "lostfound.post" },
  { key: "teacherForum", path: "/teacher/forum", icon: MessageCircle, group: "subjectTeacher", permission: "forum.moderate" },
  { key: "teacherScholarships", path: "/teacher/scholarships", icon: GraduationCap, group: "subjectTeacher", permission: "scholarships.recommend" },
  { key: "teacherLibrary", path: "/teacher/library", icon: Library, group: "subjectTeacher", permission: "teacher.subject" },
  { key: "questionBank", path: "/teacher/question-bank", icon: BookOpen, group: "subjectTeacher", permission: "teacher.subject" },
  { key: "participationTracker", path: "/teacher/participation", icon: Hand, group: "subjectTeacher", permission: "teacher.subject" },
  { key: "student360", path: "/teacher/student-360", icon: UsersRound, group: "homeroomTeacher", permission: "teacher.homeroom" },
  { key: "curriculumQuality", path: "/teacher/curriculum", icon: BookMarked, group: "departmentHead", permission: "teacher.department" },
  { key: "gradeWorkflow", path: "/teacher/grade-workflow", icon: ClipboardCheck, group: "departmentHead", permission: "teacher.department" },
  { key: "procurementRequest", path: "/teacher/procurement", icon: ShoppingCart, group: "departmentHead", permission: "teacher.department" },
  { key: "syllabusCoverage", path: "/teacher/coverage", icon: ChartLine, group: "departmentHead", permission: "teacher.department" },
  { key: "teacherEvaluation", path: "/teacher/evaluation", icon: Star, group: "departmentHead", permission: "teacher.department" },

  // Technician (Technician.png)
  { key: "announcements", path: "/system/announcements", icon: Megaphone, group: "techRegistration", permission: "announcements.manage" },
  { key: "clubsManage", path: "/system/clubs", icon: Trophy, group: "techRegistration", permission: "clubs.manage" },
  { key: "forumFilter", path: "/system/forum-filter", icon: Shield, group: "systemSettings", permission: "forum.filter" },
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
  { key: "parentAccounts", path: "/system/parents", icon: UserPlus, group: "systemSettings", permission: "parents.manage" },
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

  { key: "storeDesk", path: "/store/office", icon: LayoutTemplate, group: "storeOffice", permission: "store.office" },
  { key: "procurementRouting", path: "/store/procurement", icon: ShoppingCart, group: "storeOffice", permission: "store.office" },
  { key: "inventorySearch", path: "/store/search", icon: Search, group: "storeOffice", permission: "store.office" },
  { key: "reorderAlerts", path: "/store/alerts", icon: AlertTriangle, group: "storeOffice", permission: "store.office" },
  { key: "assetTags", path: "/store/assets", icon: QrCode, group: "storeOffice", permission: "store.office" },
  { key: "damageLog", path: "/store/disposal", icon: Trash2, group: "storeOffice", permission: "store.office" },
  { key: "assetLoans", path: "/store/loans", icon: Undo2, group: "storeOffice", permission: "store.office" },
  { key: "stockForecast", path: "/store/forecast", icon: Brain, group: "storeOffice", permission: "store.office" },
  { key: "storeReports", path: "/store/reports", icon: FileSpreadsheet, group: "storeOffice", permission: "store.office" },

  { key: "recordDesk", path: "/records", icon: Archive, group: "recordOffice", permission: "records.office", end: true },
  { key: "recordInbox", path: "/records/inbox", icon: FileCheck2, group: "recordOffice", permission: "records.office" },
  { key: "recordQueue", path: "/records/queue", icon: ScrollText, group: "recordOffice", permission: "records.office" },
  { key: "recordTranscripts", path: "/records/transcripts", icon: FileText, group: "recordOffice", permission: "records.office" },
  { key: "recordArchives", path: "/records/archives", icon: Archive, group: "recordOffice", permission: "records.office" },
  { key: "recordCorrections", path: "/records/corrections", icon: LockKeyhole, group: "recordOffice", permission: "records.office" },
  { key: "recordImport", path: "/records/import", icon: Upload, group: "recordOffice", permission: "records.office" },
  { key: "recordStaff", path: "/records/staff", icon: UsersRound, group: "recordOffice", permission: "records.office" },
  { key: "recordFiles", path: "/records/files", icon: FolderOpen, group: "recordOffice", permission: "records.office" },
  { key: "recordAlumni", path: "/records/alumni", icon: GraduationCap, group: "recordOffice", permission: "records.office" },
  { key: "recordExport", path: "/records/export", icon: FileSpreadsheet, group: "recordOffice", permission: "records.office" },
  { key: "recordAccess", path: "/records/access", icon: ScrollText, group: "recordOffice", permission: "records.office" },
  { key: "recordsLostFound", path: "/records/lost-found", icon: Search, group: "recordOffice", permission: "lostfound.moderate" },
  { key: "recordsScholarships", path: "/records/scholarships", icon: GraduationCap, group: "recordOffice", permission: "scholarships.records" },

  { key: "libraryDesk", path: "/library", icon: Library, group: "libraryOffice", permission: "library.office", end: true },
  { key: "libraryCatalog", path: "/library/catalog", icon: BookMarked, group: "libraryOffice", permission: "library.office" },
  { key: "libraryCirculation", path: "/library/circulation", icon: Undo2, group: "libraryOffice", permission: "library.office" },
  { key: "libraryIntake", path: "/library/intake", icon: ArrowDownCircle, group: "libraryOffice", permission: "library.office" },
  { key: "libraryReminders", path: "/library/reminders", icon: Bell, group: "libraryOffice", permission: "library.office" },
  { key: "libraryPatrons", path: "/library/patrons", icon: UsersRound, group: "libraryOffice", permission: "library.office" },
  { key: "libraryResources", path: "/library/resources", icon: FolderOpen, group: "libraryOffice", permission: "library.office" },
  { key: "libraryLiteracy", path: "/library/literacy", icon: FileText, group: "libraryOffice", permission: "library.office" },
  { key: "libraryRecommend", path: "/library/recommend", icon: Brain, group: "libraryOffice", permission: "library.office" },
  { key: "libraryCheckout", path: "/library/checkout", icon: QrCode, group: "libraryOffice", permission: "library.office" },
  { key: "libraryReservations", path: "/library/reservations", icon: ListChecks, group: "libraryOffice", permission: "library.office" },
  { key: "libraryCompetition", path: "/library/competition", icon: Trophy, group: "libraryOffice", permission: "library.office" },
  { key: "libraryClearance", path: "/library/clearance", icon: Shield, group: "libraryOffice", permission: "library.office" },

  { key: "procurementDesk", path: "/procurement", icon: ShoppingCart, group: "procurementOffice", permission: "procurement.office", end: true },
  { key: "procurementVendors", path: "/procurement/vendors", icon: Building2, group: "procurementOffice", permission: "procurement.office" },
  { key: "procurementRequisitions", path: "/procurement/requisitions", icon: ClipboardCheck, group: "procurementOffice", permission: "procurement.office" },
  { key: "procurementBudgets", path: "/procurement/budgets", icon: Wallet, group: "procurementOffice", permission: "procurement.office" },
  { key: "procurementOrders", path: "/procurement/orders", icon: FileText, group: "procurementOffice", permission: "procurement.office" },
  { key: "procurementTenders", path: "/procurement/tenders", icon: Scale, group: "procurementOffice", permission: "procurement.office" },

  { key: "secretaryDesk", path: "/secretary", icon: Megaphone, group: "secretaryOffice", permission: "secretary.office", end: true },
  { key: "secretaryRegistration", path: "/secretary/registration", icon: UserPlus, group: "secretaryOffice", permission: "secretary.office" },
  { key: "secretaryCleanup", path: "/secretary/cleanup", icon: Sparkles, group: "secretaryOffice", permission: "secretary.office" },
  { key: "secretaryRenewal", path: "/secretary/renewal", icon: RotateCcw, group: "secretaryOffice", permission: "secretary.office" },
  { key: "secretaryNotices", path: "/secretary/notices", icon: Megaphone, group: "secretaryOffice", permission: "secretary.office" },
  { key: "secretaryDocuments", path: "/secretary/documents", icon: FileText, group: "secretaryOffice", permission: "secretary.office" },
  { key: "secretaryApprovals", path: "/secretary/approvals", icon: CheckCheck, group: "secretaryOffice", permission: "secretary.authorize" },
  { key: "secretaryAppointments", path: "/secretary/appointments", icon: CalendarDays, group: "secretaryOffice", permission: "secretary.office" },
  { key: "secretaryHelpdesk", path: "/secretary/helpdesk", icon: LifeBuoy, group: "secretaryOffice", permission: "secretary.office" },
  { key: "secretaryIdCards", path: "/secretary/id-cards", icon: IdCard, group: "secretaryOffice", permission: "secretary.office" },
  { key: "secretaryOcr", path: "/secretary/ocr", icon: ScanLine, group: "secretaryOffice", permission: "secretary.office" },
  { key: "secretaryLostFound", path: "/secretary/lost-found", icon: Search, group: "secretaryOffice", permission: "lostfound.moderate" },
  { key: "counselorScholarships", path: "/counselor/scholarships", icon: GraduationCap, group: "counselorOffice", permission: "scholarships.post" },
  { key: "principalScholarships", path: "/principal/scholarships", icon: GraduationCap, group: "principalOffice", permission: "scholarships.recommend" },

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
  { key: "profile", path: "/profile", icon: UserCog, group: "main", roles: ["Principal", "Teacher", "Technician", "V_Principal", "Student", "Store_Keeper", "Registrar", "Procurement", "Secretary", "Librarian"] },
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
