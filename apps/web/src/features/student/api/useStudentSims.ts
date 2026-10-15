import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import type { SimRow } from "./types";

export const studentSimKeys = {
  all: ["student", "sims"] as const,
  byTenant: (tenantId: number) => [...studentSimKeys.all, tenantId] as const,
};

export function useStudentSims() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: studentSimKeys.byTenant(tenantId),
    queryFn: async () =>
      (await api.get<{ gradeLevel: number; section: string; rows: SimRow[] }>("/student/simulations")).data,
  });
}
