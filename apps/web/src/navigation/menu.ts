/**
 * TEMPORARY static sidebar menu (UNVERIFIED items and order).
 *
 * TODO: replace with GET /menu (modules + role_modules tables) — see
 * docs/backlog.md "Menu from database". Legacy builds the menu from those
 * tables in includes/header_sidebar.php; the live data is not available yet.
 */
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownCircle,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  ClipboardPen,
  FileBarChart,
  FileText,
  FlaskConical,
  FolderOpen,
  Gauge,
  Grid3x3,
  LayoutDashboard,
  Layers,
  ListChecks,
  ShoppingCart,
  UserCircle,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { can, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import type amNav from "@/locales/am/nav.json";

export type NavItemKey = keyof (typeof amNav)["items"];

export type MenuGroupKey = "main" | "academic" | "homeroom" | "administration" | "store" | "account";

export type MenuItem = {
  /** Locale key in the `nav` namespace, also used as React key. */
  key: NavItemKey;
  path: string;
  icon: LucideIcon;
  group: MenuGroupKey;
  /** Used only when `permission` is not set (items not ported yet). */
  roles: readonly Role[] | "all";
  /** Ported items are shown by permission key, not by role name. */
  permission?: Permission;
};

type MenuUser = { role: Role; permissions: readonly Permission[] };

export const MENU_GROUP_ORDER: readonly MenuGroupKey[] = [
  "main",
  "academic",
  "homeroom",
  "administration",
  "store",
  "account",
];

export const MENU_ITEMS: readonly MenuItem[] = [
  { key: "dashboard", path: "/dashboard", icon: LayoutDashboard, group: "main", roles: "all" },

  { key: "academicResults", path: "/student/results", icon: BookOpenCheck, group: "academic", roles: ["Student"] },
  { key: "semesterReportCard", path: "/student/report-card", icon: FileText, group: "academic", roles: ["Student"] },

  { key: "gradeEntry", path: "/teacher/grades", icon: ClipboardPen, group: "academic", roles: ["Teacher"] },
  { key: "schedule", path: "/teacher/schedule", icon: CalendarDays, group: "academic", roles: ["Teacher"] },
  { key: "fileManagement", path: "/teacher/files", icon: FolderOpen, group: "academic", roles: ["Teacher"] },
  { key: "simulations", path: "/teacher/simulations", icon: FlaskConical, group: "academic", roles: ["Teacher"] },
  { key: "storeRequest", path: "/teacher/store-requests", icon: ShoppingCart, group: "academic", roles: ["Teacher"] },

  { key: "roster", path: "/homeroom/roster", icon: ListChecks, group: "homeroom", roles: ["Teacher"] },
  { key: "reportCard", path: "/homeroom/report-cards", icon: FileText, group: "homeroom", roles: ["Teacher"] },
  { key: "classReport", path: "/homeroom/class-report", icon: FileBarChart, group: "homeroom", roles: ["Teacher"] },

  // TEMPORARY item (static menu). Owner: V_Principal. Access: subjects.read.
  {
    key: "subjects",
    path: "/academics/subjects",
    icon: Layers,
    group: "administration",
    roles: ["V_Principal", "Admin"],
    permission: "subjects.read",
  },
  { key: "teachingLoad", path: "/academics/teaching-load", icon: Users, group: "administration", roles: ["V_Principal", "Admin"] },
  { key: "sectionAssignment", path: "/academics/sections", icon: Grid3x3, group: "administration", roles: ["V_Principal", "Admin"] },
  { key: "admissions", path: "/academics/admissions", icon: UserPlus, group: "administration", roles: ["V_Principal", "Admin"] },
  { key: "autoSchedule", path: "/academics/schedule", icon: CalendarRange, group: "administration", roles: ["V_Principal", "Admin"] },
  { key: "workloadHeatmap", path: "/academics/workload", icon: Gauge, group: "administration", roles: ["V_Principal", "Admin"] },

  { key: "receiveItems", path: "/store/receive", icon: ArrowDownCircle, group: "store", roles: ["Store_Keeper", "Admin"] },
  { key: "binCard", path: "/store/bin-card", icon: ClipboardList, group: "store", roles: ["Store_Keeper", "Admin"] },

  { key: "accountSettings", path: "/account/manage", icon: UserCog, group: "account", roles: ["Technician", "Admin"] },
  { key: "profile", path: "/profile", icon: UserCircle, group: "account", roles: "all" },
];

export function canAccess(item: MenuItem, user: MenuUser): boolean {
  if (item.permission) return can(user.permissions, item.permission);
  return item.roles === "all" || item.roles.includes(user.role);
}

export type MenuGroup = { key: MenuGroupKey; items: MenuItem[] };

export function menuForUser(user: MenuUser): MenuGroup[] {
  return MENU_GROUP_ORDER.map((group) => ({
    key: group,
    items: MENU_ITEMS.filter((item) => item.group === group && canAccess(item, user)),
  })).filter((group) => group.items.length > 0);
}
