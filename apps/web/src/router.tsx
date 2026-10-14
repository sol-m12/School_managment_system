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
import { MENU_ITEMS, type NavItemKey } from "@/navigation/menu";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { HomePage } from "@/features/home/HomePage";
import { PublicPlaceholderPage } from "@/pages/PublicPlaceholderPage";

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
      { path: "finance/payments", element: <ProtectedRoute permission="finance.income"><IncomePage /></ProtectedRoute> },
      { path: "finance/income", element: <ProtectedRoute permission="finance.expense"><ExpensePage /></ProtectedRoute> },
      ...placeholderRoutes,
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
