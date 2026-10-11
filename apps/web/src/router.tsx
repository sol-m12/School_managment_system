import { Navigate, createBrowserRouter, type RouteObject } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { SubjectDetailPage } from "@/features/subjects/SubjectDetailPage";
import { SubjectEditPage } from "@/features/subjects/SubjectEditPage";
import { SubjectsPage } from "@/features/subjects/SubjectsPage";
import { MENU_ITEMS, type NavItemKey } from "@/navigation/menu";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { PublicPlaceholderPage } from "@/pages/PublicPlaceholderPage";

/** Menu items with real pages; every other item still shows the placeholder. */
const BUILT_ITEMS: readonly NavItemKey[] = ["dashboard", "subjects"];

const placeholderRoutes: RouteObject[] = MENU_ITEMS.filter((item) => !BUILT_ITEMS.includes(item.key)).map((item) => ({
  path: item.path.slice(1),
  element:
    item.roles === "all" ? (
      <PlaceholderPage titleKey={item.key} />
    ) : (
      <ProtectedRoute roles={item.roles}>
        <PlaceholderPage titleKey={item.key} />
      </ProtectedRoute>
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
  { path: "/home", element: <PublicPlaceholderPage title="homePage" /> },
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
      ...placeholderRoutes,
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
