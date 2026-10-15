import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import type { StudentResults } from "./types";

export const studentResultsKeys = {
  all: ["student", "results"] as const,
  byTenant: (tenantId: number) => [...studentResultsKeys.all, tenantId] as const,
};

export function useStudentResults() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: studentResultsKeys.byTenant(tenantId),
    queryFn: async () => (await api.get<StudentResults>("/student/results")).data,
  });
}
