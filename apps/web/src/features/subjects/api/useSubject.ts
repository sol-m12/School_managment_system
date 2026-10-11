import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import { subjectKeys, type Subject } from "./useSubjects";

async function fetchSubject(id: number): Promise<Subject> {
  const { data } = await api.get<{ subject: Subject }>(`/subjects/${id}`);
  return data.subject;
}

export function useSubject(id: number) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: subjectKeys.detail(tenantId, id),
    queryFn: () => fetchSubject(id),
    enabled: Number.isInteger(id) && id > 0,
    retry: false,
  });
}
