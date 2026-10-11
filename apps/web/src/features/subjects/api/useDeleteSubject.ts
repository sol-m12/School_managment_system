import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import { subjectKeys } from "./useSubjects";

async function deleteSubject(id: number): Promise<void> {
  await api.delete(`/subjects/${id}`);
}

export function useDeleteSubject() {
  const { tenantId } = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSubject,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: subjectKeys.detail(tenantId, id) });
      return queryClient.invalidateQueries({ queryKey: subjectKeys.all(tenantId) });
    },
  });
}
