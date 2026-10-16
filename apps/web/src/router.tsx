import { Navigate, createBrowserRouter, type RouteObject } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import {
  AcademicYearPage,
  ApprovalsPage,
  BackupPage,
  ExpensePage,
  FilesPage,
  GradeUnlockPage,
  IncomePage,
  PasswordPage,
  ProfilePage,
  ReportsPage,
  RoleModulesPage,
  RosterPage,
  SchoolInfoPage,
  StoreApprovalsPage,
  StudentStatusPage,
} from "@/features/admin/AdminPages";
import { ScheduleBoardPage } from "@/features/admin/ScheduleBoardPage";
import { ClassesPage } from "@/features/teachers/ClassesPage";
import { HomeroomPage } from "@/features/teachers/HomeroomPage";
import { TeacherListPage } from "@/features/teachers/TeacherListPage";
import { SystemAssignmentPage } from "@/features/teachers/SystemAssignmentPage";
import { TeacherTabPage } from "@/features/teachers/TeacherTabPage";
import { StudentDirectoryPage } from "@/features/students/StudentDirectoryPage";
import { StudentFormPage } from "@/features/students/StudentFormPage";
import { StudentHubPage } from "@/features/students/StudentHubPage";
import { StudentSectionsPage } from "@/features/students/StudentSectionsPage";
import { StudentViewPage } from "@/features/students/StudentViewPage";
import { StudentWatchPage } from "@/features/students/StudentWatchPage";
import { SubjectDetailPage } from "@/features/subjects/SubjectDetailPage";
import { SubjectEditPage } from "@/features/subjects/SubjectEditPage";
import { SubjectsPage } from "@/features/subjects/SubjectsPage";
import { BudgetPage } from "@/features/store/BudgetPage";
import { ItemsPage } from "@/features/store/ItemsPage";
import { LedgerCardsPage } from "@/features/store/LedgerCardsPage";
import { Mehi16Page } from "@/features/store/Mehi16Page";
import { Mehi17LedgerPage } from "@/features/store/Mehi17LedgerPage";
import { Mehi17SetupPage } from "@/features/store/Mehi17SetupPage";
import { Mehi7Page } from "@/features/store/Mehi7Page";
import {
  ApprovalsPage as StoreApprovalQueuePage,
  BinCardPage,
  InflowPage,
  IssuePage,
  Model19Page,
  RegisterPage,
} from "@/features/store/StoreFlows";
import { MENU_ITEMS, type NavItemKey } from "@/navigation/menu";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { HomePage } from "@/features/home/HomePage";
import { AssignedWorksPage } from "@/features/teacher/AssignedWorksPage";
import { AttendanceRegisterPage, TakeAttendancePage } from "@/features/teacher/AttendancePages";
import { ExamResultsPage } from "@/features/teacher/ExamResultsPage";
import { GradeEntryPage } from "@/features/teacher/GradeEntryPage";
import { OnlineExamsPage } from "@/features/teacher/OnlineExamsPage";
import { ClassRosterPage } from "@/features/teacher/OfficialRosterPage";
import { ReportCardsPage } from "@/features/teacher/ReportCardsPage";
import { StudentReportsPage } from "@/features/teacher/StudentReportsPage";
import {
  BestTeachingPage,
  StudentRegistrationPage,
} from "@/features/teacher/TeacherTaskPages";
import { SimulationsPage } from "@/features/teacher/SimulationsPage";
import { StoreRequestPage } from "@/features/teacher/StoreRequestPage";
import { PublicPlaceholderPage } from "@/pages/PublicPlaceholderPage";
import { ExamsPage } from "@/features/student/ExamsPage";
import { GroupHubPage } from "@/features/student/GroupHubPage";
import { GroupsPage } from "@/features/student/GroupsPage";
import { QuizPage } from "@/features/student/QuizPage";
import { ResourcesPage } from "@/features/student/ResourcesPage";
import { ResultsPage } from "@/features/student/ResultsPage";
import { SimulationsPage as StudentSimulationsPage } from "@/features/student/SimulationsPage";
import { VirtualLabPage } from "@/features/student/VirtualLabPage";
import { AnnouncementsPage } from "@/features/technician/AnnouncementsPage";
import { StaffRegistrationPage } from "@/features/technician/StaffRegistrationPage";
import { StudentIdPage } from "@/features/technician/StudentIdPage";

/** Menu items with real pages; every other item still shows the placeholder. */
const BUILT_ITEMS: readonly NavItemKey[] = [
  "dashboard",
  "subjects",
  "approvalDashboard",
  "studentStatusReport",
  "students",
  "teachingLoad",
  "selectedRoster",
  "gradeCorrection",
  "academicApprovals",
  "periodSchedule",
  "academicReports",
  "academicYear",
  "databaseBackup",
  "databaseRestore",
  "passwordManagement",
  "schoolInfo",
  "roleModules",
  "fileManagement",
  "profile",
  "payments",
  "incomeExpense",
  "assignedWorks",
  "gradeEntry",
  "takeAttendance",
  "requestItem",
  "onlineExams",
  "examResults",
  "bestTeaching",
  "attendanceRegistration",
  "studentRegistration",
  "classRoster",
  "reportCard",
  "simulations",
  "studentReports",
  "announcements",
  "staffRegistration",
  "accountManagement",
  "onlineExam",
  "groupParticipation",
  "groupCompetition",
  "teacherFiles",
  "sentSimulation",
  "virtualLab",
  "myResults",
  "storeApprovals",
  "profileSettings",
  "propertyInflow",
  "storeItems",
  "model19",
  "itemHub",
  "binCard",
  "storeDashboard",
  "issueModel22",
  "mehi16",
  "ledgerCards",
  "saveBudget",
  "mehi17Ledger",
  "mehi17Setup",
  "mehi7",
];

const placeholderRoutes: RouteObject[] = MENU_ITEMS.filter((item) => !BUILT_ITEMS.includes(item.key)).map((item) => ({
  path: item.path.slice(1),
  element: item.permission ? (
    <ProtectedRoute permission={item.permission}>
      <PlaceholderPage titleKey={item.key} />
    </ProtectedRoute>
  ) : (
    <PlaceholderPage titleKey={item.key} />
  ),
}));

const subjectRoutes: RouteObject[] = [
  {
    path: "academics/subjects",
    element: (
      <ProtectedRoute permission="subjects.read">
        <SubjectsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "academics/subjects/:id",
    element: (
      <ProtectedRoute permission="subjects.read">
        <SubjectDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "academics/subjects/:id/edit",
    element: (
      <ProtectedRoute permission="subjects.update">
        <SubjectEditPage />
      </ProtectedRoute>
    ),
  },
];

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/home", element: <HomePage /> },
  { path: "/forgot-password", element: <PublicPlaceholderPage title="forgotPassword" /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      ...subjectRoutes,
      { path: "admin/approvals", element: <ProtectedRoute permission="approvals.read"><StoreApprovalsPage /></ProtectedRoute> },
      { path: "admin/student-status", element: <ProtectedRoute permission="studentStatusReport.read"><StudentStatusPage /></ProtectedRoute> },
      { path: "academics/students", element: <ProtectedRoute permission="students.manage"><StudentHubPage /></ProtectedRoute> },
      { path: "academics/students/directory", element: <ProtectedRoute permission="students.manage"><StudentDirectoryPage /></ProtectedRoute> },
      { path: "academics/students/new", element: <ProtectedRoute permission="students.manage"><StudentFormPage /></ProtectedRoute> },
      { path: "academics/students/:studentId/edit", element: <ProtectedRoute permission="students.manage"><StudentFormPage /></ProtectedRoute> },
      { path: "academics/students/:studentId", element: <ProtectedRoute permission="students.manage"><StudentViewPage /></ProtectedRoute> },
      { path: "academics/students/all", element: <ProtectedRoute permission="students.manage"><StudentWatchPage /></ProtectedRoute> },
      { path: "academics/students/sections", element: <ProtectedRoute permission="students.manage"><StudentSectionsPage /></ProtectedRoute> },
      { path: "academics/teaching-load", element: <ProtectedRoute permission="teachingLoad.manage"><TeacherListPage /></ProtectedRoute> },
      { path: "academics/classes", element: <ProtectedRoute permission="teachingLoad.manage"><ClassesPage /></ProtectedRoute> },
      { path: "academics/homeroom", element: <ProtectedRoute permission="teachingLoad.manage"><HomeroomPage /></ProtectedRoute> },
      { path: "academics/vocational", element: <ProtectedRoute permission="teachingLoad.manage"><TeacherTabPage /></ProtectedRoute> },
      { path: "academics/system-assignment", element: <ProtectedRoute permission="teachingLoad.manage"><SystemAssignmentPage /></ProtectedRoute> },
      { path: "academics/selected-roster", element: <ProtectedRoute permission="selectedRoster.read"><RosterPage /></ProtectedRoute> },
      { path: "academics/grade-correction", element: <ProtectedRoute permission="gradeCorrection.approve"><GradeUnlockPage /></ProtectedRoute> },
      { path: "academics/approvals", element: <ProtectedRoute permission="academicApprovals.manage"><ApprovalsPage /></ProtectedRoute> },
      { path: "academics/schedule", element: <ProtectedRoute permission="periodSchedule.manage"><ScheduleBoardPage /></ProtectedRoute> },
      { path: "academics/reports", element: <ProtectedRoute permission="academicReports.read"><ReportsPage /></ProtectedRoute> },
      { path: "system/academic-year", element: <ProtectedRoute permission="academicYear.manage"><AcademicYearPage /></ProtectedRoute> },
      { path: "system/backup", element: <ProtectedRoute permission="backup.create"><BackupPage /></ProtectedRoute> },
      { path: "system/restore", element: <ProtectedRoute permission="backup.restore"><BackupPage restore /></ProtectedRoute> },
      { path: "system/passwords", element: <ProtectedRoute permission="passwords.reset"><PasswordPage /></ProtectedRoute> },
      { path: "system/school-info", element: <ProtectedRoute permission="schoolInfo.manage"><SchoolInfoPage /></ProtectedRoute> },
      { path: "system/role-modules", element: <ProtectedRoute permission="roleModules.manage"><RoleModulesPage /></ProtectedRoute> },
      { path: "files", element: <ProtectedRoute permission="files.manage"><FilesPage /></ProtectedRoute> },
      { path: "profile", element: <ProfilePage /> },
      { path: "store/items", element: <ProtectedRoute permission="store.items"><ItemsPage /></ProtectedRoute> },
      { path: "store/model-19", element: <ProtectedRoute permission="store.receive"><Model19Page /></ProtectedRoute> },
      { path: "store/bin-card", element: <ProtectedRoute permission="store.binCard"><BinCardPage /></ProtectedRoute> },
      { path: "store/inflow", element: <ProtectedRoute permission="store.inflow"><InflowPage /></ProtectedRoute> },
      { path: "store/approvals", element: <ProtectedRoute permission="store.approvals"><StoreApprovalQueuePage /></ProtectedRoute> },
      { path: "store/issue", element: <ProtectedRoute permission="store.issue"><IssuePage /></ProtectedRoute> },
      { path: "store/register", element: <ProtectedRoute permission="store.items"><RegisterPage /></ProtectedRoute> },
      { path: "store/mehi-16", element: <ProtectedRoute permission="store.finance"><Mehi16Page /></ProtectedRoute> },
      { path: "store/ledger-cards", element: <ProtectedRoute permission="store.finance"><LedgerCardsPage /></ProtectedRoute> },
      { path: "store/budget", element: <ProtectedRoute permission="store.finance"><BudgetPage /></ProtectedRoute> },
      { path: "store/mehi-17", element: <ProtectedRoute permission="store.finance"><Mehi17LedgerPage /></ProtectedRoute> },
      { path: "store/mehi-17-setup", element: <ProtectedRoute permission="store.finance"><Mehi17SetupPage /></ProtectedRoute> },
      { path: "store/mehi-7", element: <ProtectedRoute permission="store.finance"><Mehi7Page /></ProtectedRoute> },
      { path: "finance/payments", element: <ProtectedRoute permission="finance.income"><IncomePage /></ProtectedRoute> },
      { path: "finance/income", element: <ProtectedRoute permission="finance.expense"><ExpensePage /></ProtectedRoute> },
      { path: "teacher/assigned-works", element: <ProtectedRoute permission="assignedWork.read"><AssignedWorksPage /></ProtectedRoute> },
      { path: "teacher/grades", element: <ProtectedRoute permission="grades.enter"><GradeEntryPage /></ProtectedRoute> },
      { path: "teacher/take-attendance", element: <ProtectedRoute permission="attendance.take"><TakeAttendancePage /></ProtectedRoute> },
      { path: "teacher/store-requests", element: <ProtectedRoute permission="storeRequests.create"><StoreRequestPage /></ProtectedRoute> },
      { path: "teacher/online-exams", element: <ProtectedRoute permission="onlineExams.manage"><OnlineExamsPage /></ProtectedRoute> },
      { path: "teacher/exam-results", element: <ProtectedRoute permission="examResults.manage"><ExamResultsPage /></ProtectedRoute> },
      { path: "teacher/best-teaching", element: <ProtectedRoute permission="bestTeaching.manage"><BestTeachingPage /></ProtectedRoute> },
      { path: "teacher/attendance", element: <ProtectedRoute permission="attendance.register"><AttendanceRegisterPage /></ProtectedRoute> },
      { path: "teacher/student-registration", element: <ProtectedRoute permission="studentRegistration.manage"><StudentRegistrationPage /></ProtectedRoute> },
      { path: "teacher/class-roster", element: <ProtectedRoute permission="classRoster.read"><ClassRosterPage /></ProtectedRoute> },
      { path: "teacher/report-cards", element: <ProtectedRoute permission="reportCards.generate"><ReportCardsPage /></ProtectedRoute> },
      { path: "teacher/simulations", element: <ProtectedRoute permission="simulations.create"><SimulationsPage /></ProtectedRoute> },
      { path: "teacher/student-reports", element: <ProtectedRoute permission="studentReports.read"><StudentReportsPage /></ProtectedRoute> },
      { path: "system/announcements", element: <ProtectedRoute permission="announcements.manage"><AnnouncementsPage /></ProtectedRoute> },
      { path: "system/staff-registration", element: <ProtectedRoute permission="staffRegistration.manage"><StaffRegistrationPage /></ProtectedRoute> },
      { path: "account/manage", element: <ProtectedRoute permission="accounts.manage"><StudentIdPage /></ProtectedRoute> },
      { path: "student/results", element: <ProtectedRoute permission="results.readOwn"><ResultsPage /></ProtectedRoute> },
      { path: "student/groups", element: <ProtectedRoute permission="groups.readOwn"><GroupsPage /></ProtectedRoute> },
      { path: "student/groups/:groupId", element: <ProtectedRoute permission="groups.readOwn"><GroupHubPage /></ProtectedRoute> },
      { path: "student/simulations", element: <ProtectedRoute permission="simulations.readOwn"><StudentSimulationsPage /></ProtectedRoute> },
      { path: "student/resources", element: <ProtectedRoute permission="resources.readOwn"><ResourcesPage /></ProtectedRoute> },
      { path: "student/exams", element: <ProtectedRoute permission="exams.readOwn"><ExamsPage /></ProtectedRoute> },
      { path: "student/quiz", element: <ProtectedRoute permission="quiz.readOwn"><QuizPage /></ProtectedRoute> },
      { path: "student/virtual-lab", element: <ProtectedRoute permission="simulations.readOwn"><VirtualLabPage /></ProtectedRoute> },
      ...placeholderRoutes,
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
