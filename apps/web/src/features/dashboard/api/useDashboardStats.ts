import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";

export type DashboardStats = {
  itemTypes: number;
  lowStock: number;
  todayTransactions: number;
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: (tenantId: number) => [...dashboardKeys.all, "stats", tenantId] as const,
};

// Placeholder data. Replace the body with `api.get<DashboardStats>("/dashboard/stats")`
// once the endpoint exists; the hook signature and query key stay the same.
async function fetchDashboardStats(): Promise<DashboardStats> {
  return { itemTypes: 128, lowStock: 7, todayTransactions: 15 };
}

export function useDashboardStats() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: dashboardKeys.stats(tenantId),
    queryFn: fetchDashboardStats,
  });
}
