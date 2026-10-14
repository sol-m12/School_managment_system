import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type RoleCount = { role: string; total: number };

export type DashboardView =
  | {
      kind: "control";
      academicYear: string;
      students: number;
      teachers: number;
      staff: number;
      otherStaff: number;
      roles: RoleCount[];
    }
  | {
      kind: "store";
      firstName: string;
      jobTitle: string;
      itemTypes: number;
      lowStock: number;
      todayTransactions: number;
    }
  | {
      kind: "academic";
      firstName: string;
      academicYear: string;
      weekday: string;
      students: number;
      classes: number;
      todayPeriods: {
        periodNumber: number;
        subjectName: string;
        gradeLevel: number;
        section: string;
        classId: number;
      }[];
    }
  | { kind: "empty" };

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: (tenantId: number, role: string) => [...dashboardKeys.all, "stats", tenantId, role] as const,
};

export function useDashboard() {
  const { tenantId, role } = useSessionUser();
  return useQuery({
    queryKey: dashboardKeys.stats(tenantId, role),
    queryFn: async () => {
      const { data } = await api.get<DashboardView>("/dashboard");
      return data;
    },
  });
}
