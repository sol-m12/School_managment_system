import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import type { GroupHub, StudentGroup } from "./types";

export const studentGroupKeys = {
  all: ["student", "groups"] as const,
  list: (tenantId: number) => [...studentGroupKeys.all, tenantId] as const,
  hub: (tenantId: number, groupId: number) => ["student", "group", tenantId, groupId] as const,
};

export function useStudentGroups() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: studentGroupKeys.list(tenantId),
    queryFn: async () => (await api.get<{ rows: StudentGroup[] }>("/student/groups")).data,
  });
}

export function useGroupHub(groupId: number) {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: studentGroupKeys.hub(tenantId, groupId),
    queryFn: async () => (await api.get<GroupHub>(`/student/groups/${groupId}`)).data,
    enabled: groupId > 0,
  });
}

export function useSendGroupMessage(groupId: number) {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => (await api.post<GroupHub>(`/student/groups/${groupId}/messages`, { text })).data,
    onSuccess: (data) => {
      client.setQueryData(studentGroupKeys.hub(tenantId, groupId), data);
    },
  });
}
