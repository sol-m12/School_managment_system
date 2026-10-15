import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import type { StudentHome } from "./types";

export const studentHomeKeys = {
  all: ["student", "home"] as const,
  byTenant: (tenantId: number) => [...studentHomeKeys.all, tenantId] as const,
};

export function useStudentHome() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: studentHomeKeys.byTenant(tenantId),
    queryFn: async () => (await api.get<StudentHome>("/student/home")).data,
  });
}
