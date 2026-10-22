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
import {
  AlertsPage,
  DisposalPage,
  ForecastPage,
  InventorySearchPage,
  LoansPage,
  ProcurementPage as StoreProcurementPage,
  StoreReportPage,
} from "@/features/store/StoreOfficePages";
import { AssetsPage } from "@/features/store/AssetDesk";
import { StoreDeskPage } from "@/features/store/StoreDesk";
import { MENU_ITEMS, type NavItemKey } from "@/navigation/menu";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { HomePage } from "@/features/home/HomePage";
import { PlatformRoot } from "@/features/platform/PlatformRoot";
import { PlatformLoginPage } from "@/features/platform/PlatformLoginPage";
import { PlatformProtectedRoute } from "@/features/platform/PlatformProtectedRoute";
import { PlatformShell } from "@/features/platform/PlatformShell";
import { PlatformHomePage } from "@/features/platform/PlatformHomePage";
import { SchoolsPage } from "@/features/platform/SchoolsPage";
import { AddSchoolPage } from "@/features/platform/AddSchoolPage";
import {
  AccessLogPage,
  AlumniPage,
  ArchivesPage,
  CorrectionsPage,
  MinistryExportPage,
  RecordFilesPage,
  RecordImportPage,
  RecordInboxPage,
  RecordOverridesPage,
  RecordQueuePage,
  RecordsHomePage,
  StaffRecordsPage,
  TranscriptsPage,
  VerifyPage,
} from "@/features/records/RecordsPages";
import {
  CatalogPage,
  CheckoutPage,
  CirculationPage,
  ClearancePage,
  CompetitionPage,
  IntakePage,
  LibraryHomePage,
  LiteracyPage,
  PatronsPage,
  RecommendPage,
  RemindersPage,
  ReservationsPage,
  ResourcesPage as LibraryResourcesPage,
} from "@/features/library/LibraryPages";
import {
  BudgetsPage,
  OrderPrintPage,
  OrdersPage,
  ProcurementHomePage,
  RequisitionsPage,
  TenderMatrixPage,
  TendersPage,
  VendorsPage,
} from "@/features/procurement/ProcurementPages";
import { PublicTendersPage, VendorDeskPage, VendorLoginPage } from "@/features/procurement/VendorPortal";
import {
  ApprovalsPage as SecretaryApprovalsPage,
  AppointmentsPage,
  CleanupPage,
  DocumentsPage as SecretaryDocumentsPage,
  HelpdeskPage as SecretaryHelpdeskPage,
  IdCardsPage,
  NoticesPage,
  OcrPage,
  RegistrationPage as SecretaryRegistrationPage,
  RenewalPage,
  SecretaryHomePage,
} from "@/features/secretary/SecretaryPages";
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
import {
  AssignmentsPage,
  AttendanceStatusPage,
  DigitalIdPage,
  DisciplineStatusPage,
  DocumentRequestPage,
  HelpdeskPage as StudentHelpdeskPage,
  LibraryStatusPage,
  LibraryUsagePage,
  NotificationsPage,
  StudentTimetablePage,
  StudentVocationalPage,
  StudyPlannerPage,
} from "@/features/student/StudentDeskPages";
import { AnalyticsPage, AtRiskPage, BuilderPage, CorrelationPage, DemographicsPage, IncidentsPage, MoePage, TrainingPage, TransfersPage, WarningsPage } from "@/features/principal/InsightPages";
import { BulkPage, DocumentsPage as PrincipalDocumentsPage, ExecutivePage, HubPage, InboxPage, PremiumPage, StaffKpiPage, TrendsPage } from "@/features/principal/WorkPages";
import { BehaviorPage, InvigilationPage, VocationalPage } from "@/features/vice/VicePages";
import {
  IncidentsPage as TeacherIncidentsPage,
  LeavePage,
  LibraryPage,
  OfflineAttendancePage,
  ParticipationPage,
  QuestionBankPage,
  TimetablePage,
} from "@/features/teacher/SubjectOfficePages";
import {
  CoveragePage,
  CurriculumPage,
  EvaluationPage,
  GradeWorkflowPage,
  ProcurementPage,
  Student360Page,
} from "@/features/teacher/DutyOfficePages";
import { AnnouncementsPage } from "@/features/technician/AnnouncementsPage";
import { ClubsManagePage } from "@/features/clubs/ClubsManagePage";
import { ClubsStudentPage } from "@/features/clubs/ClubsStudentPage";
import { ClubsPatronPage } from "@/features/clubs/ClubsPatronPage";
import { ClubsOverseePage } from "@/features/clubs/ClubsOverseePage";
import { LostFoundBoardPage } from "@/features/lostfound/LostFoundBoardPage";
import { LostFoundModeratePage } from "@/features/lostfound/LostFoundModeratePage";
import { ForumStudentPage } from "@/features/forum/ForumStudentPage";
import { ForumModeratePage } from "@/features/forum/ForumModeratePage";
import { ForumFilterPage } from "@/features/forum/ForumFilterPage";
import { ScholarshipRecordsPage } from "@/features/scholarships/ScholarshipRecordsPage";
import { ScholarshipStudentPage } from "@/features/scholarships/ScholarshipStudentPage";
import { ScholarshipOpportunitiesPage } from "@/features/scholarships/ScholarshipOpportunitiesPage";
import { ScholarshipRecommendPage } from "@/features/scholarships/ScholarshipRecommendPage";
import { AuditPage, DutiesPage, HealthPage, IdentityPage, ImportPage, TicketsPage } from "@/features/operations/OperationsPages";
import { ParentsPage } from "@/features/operations/ParentsPage";
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
  "clubsManage",
  "studentClubs",
  "teacherClubs",
  "viceClubs",
  "studentLostFound",
  "teacherLostFound",
  "secretaryLostFound",
  "recordsLostFound",
  "studentForum",
  "teacherForum",
  "forumFilter",
  "studentScholarships",
  "recordsScholarships",
  "viceScholarships",
  "counselorScholarships",
  "teacherScholarships",
  "principalScholarships",
  "staffRegistration",
  "accountManagement",
  "parentAccounts",
  "onlineExam",
  "groupParticipation",
  "groupCompetition",
  "teacherFiles",
  "sentSimulation",
  "virtualLab",
  "myResults",
  "attendanceStatus",
  "disciplineStatus",
  "studentTimetable",
  "notificationCenter",
  "studentAssignments",
  "vocationalPlacement",
  "libraryStatus",
  "libraryUsage",
  "documentRequest",
  "studentHelpdesk",
  "techHelpdesk",
  "studyPlanner",
  "digitalId",
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
  "storeDesk",
  "procurementRouting",
  "inventorySearch",
  "reorderAlerts",
  "assetTags",
  "damageLog",
  "assetLoans",
  "stockForecast",
  "storeReports",
  "executiveOffice",
  "reportAnalysis",
  "communicationHub",
  "premiumOffice",
  "approvalInbox",
  "staffKpis",
  "documentSign",
  "bulkMessages",
  "academicCompare",
  "correlationInsights",
  "transferClearance",
  "atRiskStudents",
  "moeReports",
  "capacityBuilding",
  "reportBuilder",
  "earlyWarning",
  "incidentPortal",
  "yearAnalytics",
  "vocationalTraining",
  "behaviorOffice",
  "examInvigilation",
  "offlineAttendance",
  "globalTimetable",
  "incidentReports",
  "leaveRequest",
  "teacherLibrary",
  "questionBank",
  "participationTracker",
  "student360",
  "curriculumQuality",
  "gradeWorkflow",
  "procurementRequest",
  "syllabusCoverage",
  "teacherEvaluation",
  "libraryDesk",
  "libraryCatalog",
  "libraryCirculation",
  "libraryIntake",
  "libraryReminders",
  "libraryPatrons",
  "libraryResources",
  "libraryLiteracy",
  "libraryRecommend",
  "libraryCheckout",
  "libraryReservations",
  "libraryCompetition",
  "libraryClearance",
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
  { path: "/verify", element: <VerifyPage /> },
  { path: "/tenders", element: <PublicTendersPage /> },
  { path: "/vendor", element: <VendorLoginPage /> },
  { path: "/vendor/desk", element: <VendorDeskPage /> },
  { path: "/forgot-password", element: <PublicPlaceholderPage title="forgotPassword" /> },
  {
    path: "/platform",
    element: <PlatformRoot />,
    children: [
      { path: "login", element: <PlatformLoginPage /> },
      {
        element: (
          <PlatformProtectedRoute>
            <PlatformShell />
          </PlatformProtectedRoute>
        ),
        children: [
          { index: true, element: <PlatformHomePage /> },
          { path: "schools", element: <SchoolsPage /> },
          { path: "schools/new", element: <AddSchoolPage /> },
        ],
      },
    ],
  },
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
      { path: "system/identity", element: <ProtectedRoute permission="accounts.manage"><IdentityPage /></ProtectedRoute> },
      { path: "system/parents", element: <ProtectedRoute permission="parents.manage"><ParentsPage /></ProtectedRoute> },
      { path: "system/helpdesk", element: <ProtectedRoute permission="tickets.manage"><TicketsPage /></ProtectedRoute> },
      { path: "system/audit", element: <ProtectedRoute permission="audit.read"><AuditPage /></ProtectedRoute> },
      { path: "system/import", element: <ProtectedRoute permission="users.import"><ImportPage /></ProtectedRoute> },
      { path: "system/health", element: <ProtectedRoute permission="health.read"><HealthPage /></ProtectedRoute> },
      { path: "system/duties", element: <ProtectedRoute permission="duties.assign"><DutiesPage /></ProtectedRoute> },
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
      { path: "store/office", element: <ProtectedRoute permission="store.office"><StoreDeskPage /></ProtectedRoute> },
      { path: "store/procurement", element: <ProtectedRoute permission="store.office"><StoreProcurementPage /></ProtectedRoute> },
      { path: "store/search", element: <ProtectedRoute permission="store.office"><InventorySearchPage /></ProtectedRoute> },
      { path: "store/alerts", element: <ProtectedRoute permission="store.office"><AlertsPage /></ProtectedRoute> },
      { path: "store/assets", element: <ProtectedRoute permission="store.office"><AssetsPage /></ProtectedRoute> },
      { path: "store/disposal", element: <ProtectedRoute permission="store.office"><DisposalPage /></ProtectedRoute> },
      { path: "store/loans", element: <ProtectedRoute permission="store.office"><LoansPage /></ProtectedRoute> },
      { path: "store/forecast", element: <ProtectedRoute permission="store.office"><ForecastPage /></ProtectedRoute> },
      { path: "store/reports", element: <ProtectedRoute permission="store.office"><StoreReportPage /></ProtectedRoute> },
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
      { path: "teacher/offline-attendance", element: <ProtectedRoute permission="teacher.subject"><OfflineAttendancePage /></ProtectedRoute> },
      { path: "teacher/timetable", element: <ProtectedRoute permission="teacher.subject"><TimetablePage /></ProtectedRoute> },
      { path: "teacher/incidents", element: <ProtectedRoute permission="teacher.subject"><TeacherIncidentsPage /></ProtectedRoute> },
      { path: "teacher/leave", element: <ProtectedRoute permission="teacher.subject"><LeavePage /></ProtectedRoute> },
      { path: "teacher/clubs", element: <ProtectedRoute permission="clubs.patron"><ClubsPatronPage /></ProtectedRoute> },
      { path: "teacher/lost-found", element: <ProtectedRoute permission="lostfound.post"><LostFoundBoardPage /></ProtectedRoute> },
      { path: "teacher/forum", element: <ProtectedRoute permission="forum.moderate"><ForumModeratePage /></ProtectedRoute> },
      { path: "teacher/scholarships", element: <ProtectedRoute permission="scholarships.recommend"><ScholarshipRecommendPage /></ProtectedRoute> },
      { path: "teacher/library", element: <ProtectedRoute permission="teacher.subject"><LibraryPage /></ProtectedRoute> },
      { path: "teacher/question-bank", element: <ProtectedRoute permission="teacher.subject"><QuestionBankPage /></ProtectedRoute> },
      { path: "teacher/participation", element: <ProtectedRoute permission="teacher.subject"><ParticipationPage /></ProtectedRoute> },
      { path: "teacher/student-360", element: <ProtectedRoute permission="teacher.homeroom"><Student360Page /></ProtectedRoute> },
      { path: "teacher/curriculum", element: <ProtectedRoute permission="teacher.department"><CurriculumPage /></ProtectedRoute> },
      { path: "teacher/grade-workflow", element: <ProtectedRoute permission="teacher.department"><GradeWorkflowPage /></ProtectedRoute> },
      { path: "teacher/procurement", element: <ProtectedRoute permission="teacher.department"><ProcurementPage /></ProtectedRoute> },
      { path: "teacher/coverage", element: <ProtectedRoute permission="teacher.department"><CoveragePage /></ProtectedRoute> },
      { path: "teacher/evaluation", element: <ProtectedRoute permission="teacher.department"><EvaluationPage /></ProtectedRoute> },
      { path: "system/announcements", element: <ProtectedRoute permission="announcements.manage"><AnnouncementsPage /></ProtectedRoute> },
      { path: "system/clubs", element: <ProtectedRoute permission="clubs.manage"><ClubsManagePage /></ProtectedRoute> },
      { path: "system/forum-filter", element: <ProtectedRoute permission="forum.filter"><ForumFilterPage /></ProtectedRoute> },
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
      { path: "student/attendance", element: <ProtectedRoute permission="student.desk"><AttendanceStatusPage /></ProtectedRoute> },
      { path: "student/discipline", element: <ProtectedRoute permission="student.desk"><DisciplineStatusPage /></ProtectedRoute> },
      { path: "student/timetable", element: <ProtectedRoute permission="student.desk"><StudentTimetablePage /></ProtectedRoute> },
      { path: "student/notifications", element: <ProtectedRoute permission="student.desk"><NotificationsPage /></ProtectedRoute> },
      { path: "student/assignments", element: <ProtectedRoute permission="student.desk"><AssignmentsPage /></ProtectedRoute> },
      { path: "student/vocational", element: <ProtectedRoute permission="student.desk"><StudentVocationalPage /></ProtectedRoute> },
      { path: "student/library", element: <ProtectedRoute permission="student.desk"><LibraryStatusPage /></ProtectedRoute> },
      { path: "student/library-usage", element: <ProtectedRoute permission="student.desk"><LibraryUsagePage /></ProtectedRoute> },
      { path: "student/documents", element: <ProtectedRoute permission="student.desk"><DocumentRequestPage /></ProtectedRoute> },
      { path: "student/helpdesk", element: <ProtectedRoute permission="student.desk"><StudentHelpdeskPage /></ProtectedRoute> },
      { path: "student/planner", element: <ProtectedRoute permission="student.desk"><StudyPlannerPage /></ProtectedRoute> },
      { path: "student/id", element: <ProtectedRoute permission="student.desk"><DigitalIdPage /></ProtectedRoute> },
      { path: "student/clubs", element: <ProtectedRoute permission="clubs.student"><ClubsStudentPage /></ProtectedRoute> },
      { path: "student/lost-found", element: <ProtectedRoute permission="lostfound.post"><LostFoundBoardPage /></ProtectedRoute> },
      { path: "student/forum", element: <ProtectedRoute permission="forum.student"><ForumStudentPage /></ProtectedRoute> },
      { path: "student/scholarships", element: <ProtectedRoute permission="scholarships.student"><ScholarshipStudentPage /></ProtectedRoute> },
      { path: "principal/executive", element: <ProtectedRoute permission="principal.office"><ExecutivePage /></ProtectedRoute> },
      { path: "principal/trends", element: <ProtectedRoute permission="principal.office"><TrendsPage /></ProtectedRoute> },
      { path: "principal/communications", element: <ProtectedRoute permission="principal.office"><HubPage /></ProtectedRoute> },
      { path: "principal/premium", element: <ProtectedRoute permission="principal.office"><PremiumPage /></ProtectedRoute> },
      { path: "principal/inbox", element: <ProtectedRoute permission="principal.office"><InboxPage /></ProtectedRoute> },
      { path: "principal/staff", element: <ProtectedRoute permission="principal.office"><StaffKpiPage /></ProtectedRoute> },
      { path: "principal/documents", element: <ProtectedRoute permission="principal.office"><PrincipalDocumentsPage /></ProtectedRoute> },
      { path: "principal/messages", element: <ProtectedRoute permission="principal.office"><BulkPage /></ProtectedRoute> },
      { path: "principal/analytics", element: <ProtectedRoute permission="principal.office"><AnalyticsPage /></ProtectedRoute> },
      { path: "principal/correlation", element: <ProtectedRoute permission="principal.office"><CorrelationPage /></ProtectedRoute> },
      { path: "principal/transfers", element: <ProtectedRoute permission="principal.office"><TransfersPage /></ProtectedRoute> },
      { path: "principal/at-risk", element: <ProtectedRoute permission="principal.office"><AtRiskPage /></ProtectedRoute> },
      { path: "principal/moe", element: <ProtectedRoute permission="principal.office"><MoePage /></ProtectedRoute> },
      { path: "principal/training", element: <ProtectedRoute permission="principal.office"><TrainingPage /></ProtectedRoute> },
      { path: "principal/reports", element: <ProtectedRoute permission="principal.office"><BuilderPage /></ProtectedRoute> },
      { path: "principal/warnings", element: <ProtectedRoute permission="principal.office"><WarningsPage /></ProtectedRoute> },
      { path: "principal/incidents", element: <ProtectedRoute permission="principal.office"><IncidentsPage /></ProtectedRoute> },
      { path: "principal/demographics", element: <ProtectedRoute permission="principal.office"><DemographicsPage /></ProtectedRoute> },
      { path: "principal/record-overrides", element: <ProtectedRoute permission="records.override"><RecordOverridesPage /></ProtectedRoute> },
      { path: "principal/scholarships", element: <ProtectedRoute permission="scholarships.recommend"><ScholarshipRecommendPage /></ProtectedRoute> },
      { path: "records", element: <ProtectedRoute permission="records.office"><RecordsHomePage /></ProtectedRoute> },
      { path: "records/inbox", element: <ProtectedRoute permission="records.office"><RecordInboxPage /></ProtectedRoute> },
      { path: "records/queue", element: <ProtectedRoute permission="records.office"><RecordQueuePage /></ProtectedRoute> },
      { path: "records/transcripts", element: <ProtectedRoute permission="records.office"><TranscriptsPage /></ProtectedRoute> },
      { path: "records/archives", element: <ProtectedRoute permission="records.office"><ArchivesPage /></ProtectedRoute> },
      { path: "records/corrections", element: <ProtectedRoute permission="records.office"><CorrectionsPage /></ProtectedRoute> },
      { path: "records/import", element: <ProtectedRoute permission="records.office"><RecordImportPage /></ProtectedRoute> },
      { path: "records/staff", element: <ProtectedRoute permission="records.office"><StaffRecordsPage /></ProtectedRoute> },
      { path: "records/files", element: <ProtectedRoute permission="records.office"><RecordFilesPage /></ProtectedRoute> },
      { path: "records/alumni", element: <ProtectedRoute permission="records.office"><AlumniPage /></ProtectedRoute> },
      { path: "records/export", element: <ProtectedRoute permission="records.office"><MinistryExportPage /></ProtectedRoute> },
      { path: "records/access", element: <ProtectedRoute permission="records.office"><AccessLogPage /></ProtectedRoute> },
      { path: "records/lost-found", element: <ProtectedRoute permission="lostfound.moderate"><LostFoundModeratePage /></ProtectedRoute> },
      { path: "records/scholarships", element: <ProtectedRoute permission="scholarships.records"><ScholarshipRecordsPage /></ProtectedRoute> },
      { path: "library", element: <ProtectedRoute permission="library.office"><LibraryHomePage /></ProtectedRoute> },
      { path: "library/catalog", element: <ProtectedRoute permission="library.office"><CatalogPage /></ProtectedRoute> },
      { path: "library/circulation", element: <ProtectedRoute permission="library.office"><CirculationPage /></ProtectedRoute> },
      { path: "library/intake", element: <ProtectedRoute permission="library.office"><IntakePage /></ProtectedRoute> },
      { path: "library/reminders", element: <ProtectedRoute permission="library.office"><RemindersPage /></ProtectedRoute> },
      { path: "library/patrons", element: <ProtectedRoute permission="library.office"><PatronsPage /></ProtectedRoute> },
      { path: "library/resources", element: <ProtectedRoute permission="library.office"><LibraryResourcesPage /></ProtectedRoute> },
      { path: "library/literacy", element: <ProtectedRoute permission="library.office"><LiteracyPage /></ProtectedRoute> },
      { path: "library/recommend", element: <ProtectedRoute permission="library.office"><RecommendPage /></ProtectedRoute> },
      { path: "library/checkout", element: <ProtectedRoute permission="library.office"><CheckoutPage /></ProtectedRoute> },
      { path: "library/reservations", element: <ProtectedRoute permission="library.office"><ReservationsPage /></ProtectedRoute> },
      { path: "library/competition", element: <ProtectedRoute permission="library.office"><CompetitionPage /></ProtectedRoute> },
      { path: "library/clearance", element: <ProtectedRoute permission="library.office"><ClearancePage /></ProtectedRoute> },
      { path: "procurement", element: <ProtectedRoute permission="procurement.office"><ProcurementHomePage /></ProtectedRoute> },
      { path: "procurement/vendors", element: <ProtectedRoute permission="procurement.office"><VendorsPage /></ProtectedRoute> },
      { path: "procurement/requisitions", element: <ProtectedRoute permission="procurement.office"><RequisitionsPage /></ProtectedRoute> },
      { path: "procurement/budgets", element: <ProtectedRoute permission="procurement.office"><BudgetsPage /></ProtectedRoute> },
      { path: "procurement/orders", element: <ProtectedRoute permission="procurement.office"><OrdersPage /></ProtectedRoute> },
      { path: "procurement/orders/:id", element: <ProtectedRoute permission="procurement.office"><OrderPrintPage /></ProtectedRoute> },
      { path: "procurement/tenders", element: <ProtectedRoute permission="procurement.office"><TendersPage /></ProtectedRoute> },
      { path: "procurement/tenders/:id", element: <ProtectedRoute permission="procurement.office"><TenderMatrixPage /></ProtectedRoute> },
      { path: "secretary", element: <ProtectedRoute permission="secretary.office"><SecretaryHomePage /></ProtectedRoute> },
      { path: "secretary/registration", element: <ProtectedRoute permission="secretary.office"><SecretaryRegistrationPage /></ProtectedRoute> },
      { path: "secretary/cleanup", element: <ProtectedRoute permission="secretary.office"><CleanupPage /></ProtectedRoute> },
      { path: "secretary/renewal", element: <ProtectedRoute permission="secretary.office"><RenewalPage /></ProtectedRoute> },
      { path: "secretary/notices", element: <ProtectedRoute permission="secretary.office"><NoticesPage /></ProtectedRoute> },
      { path: "secretary/documents", element: <ProtectedRoute permission="secretary.office"><SecretaryDocumentsPage /></ProtectedRoute> },
      { path: "secretary/approvals", element: <ProtectedRoute permission="secretary.authorize"><SecretaryApprovalsPage /></ProtectedRoute> },
      { path: "secretary/appointments", element: <ProtectedRoute permission="secretary.office"><AppointmentsPage /></ProtectedRoute> },
      { path: "secretary/helpdesk", element: <ProtectedRoute permission="secretary.office"><SecretaryHelpdeskPage /></ProtectedRoute> },
      { path: "secretary/id-cards", element: <ProtectedRoute permission="secretary.office"><IdCardsPage /></ProtectedRoute> },
      { path: "secretary/ocr", element: <ProtectedRoute permission="secretary.office"><OcrPage /></ProtectedRoute> },
      { path: "secretary/lost-found", element: <ProtectedRoute permission="lostfound.moderate"><LostFoundModeratePage /></ProtectedRoute> },
      { path: "counselor/scholarships", element: <ProtectedRoute permission="scholarships.post"><ScholarshipOpportunitiesPage /></ProtectedRoute> },
      { path: "vice/vocational", element: <ProtectedRoute permission="vice.office"><VocationalPage /></ProtectedRoute> },
      { path: "vice/clubs", element: <ProtectedRoute permission="clubs.oversee"><ClubsOverseePage /></ProtectedRoute> },
      { path: "vice/scholarships", element: <ProtectedRoute permission="scholarships.post"><ScholarshipOpportunitiesPage /></ProtectedRoute> },
      { path: "vice/behavior", element: <ProtectedRoute permission="vice.office"><BehaviorPage /></ProtectedRoute> },
      { path: "vice/invigilation", element: <ProtectedRoute permission="vice.office"><InvigilationPage /></ProtectedRoute> },
      ...placeholderRoutes,
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
