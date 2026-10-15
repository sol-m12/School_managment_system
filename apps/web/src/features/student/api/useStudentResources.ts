import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import type { ResourceList } from "./types";

export type ResourceFilters = { search: string; semester: string; year: string };

export const studentResourceKeys = {
  all: ["student", "resources"] as const,
  list: (tenantId: number, filters: ResourceFilters) => [...studentResourceKeys.all, tenantId, filters] as const,
};

export function useStudentResources(filters: ResourceFilters) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: studentResourceKeys.list(tenantId, filters),
    queryFn: async () =>
      (
        await api.get<ResourceList>("/student/resources", {
          params: {
            search: filters.search || undefined,
            semester: filters.semester || undefined,
            year: filters.year || undefined,
          },
        })
      ).data,
  });
}
