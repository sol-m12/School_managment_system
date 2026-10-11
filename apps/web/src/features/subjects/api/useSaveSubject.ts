import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import { subjectKeys, type Subject, type SubjectInput } from "./useSubjects";

async function saveSubject(id: number | null, input: SubjectInput): Promise<Subject> {
  const { data } =
    id === null
      ? await api.post<{ subject: Subject }>("/subjects", input)
      : await api.put<{ subject: Subject }>(`/subjects/${id}`, input);
  return data.subject;
}

/** Creates when `id` is null, otherwise updates that subject. */
export function useSaveSubject(id: number | null) {
  const { tenantId } = useSessionUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubjectInput) => saveSubject(id, input),
    onSuccess: (subject) => {
      queryClient.setQueryData(subjectKeys.detail(tenantId, subject.id), subject);
      return queryClient.invalidateQueries({ queryKey: subjectKeys.all(tenantId) });
    },
  });
}
