import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

const key = (tenantId: number, name: string, extra = "") =>
  ["forum", tenantId, name, extra] as const;

export function useForumQuestions(moderate = false) {
  const { tenantId } = useSessionUser();
  const path = moderate ? "/forum/moderate/questions" : "/forum/questions";
  return useQuery({
    queryKey: key(tenantId, moderate ? "mod-list" : "list"),
    queryFn: async () =>
      (await api.get<{ rows: Array<{ id: number; title: string; points: number; studentName: string }> }>(path))
        .data,
  });
}

export function useForumQuestion(id: number, moderate = false) {
  const { tenantId } = useSessionUser();
  const path = moderate ? `/forum/moderate/questions/${id}` : `/forum/questions/${id}`;
  return useQuery({
    queryKey: key(tenantId, moderate ? "mod-q" : "q", String(id)),
    enabled: id > 0,
    queryFn: async () =>
      (
        await api.get<{
          id: number;
          title: string;
          body: string;
          answers: Array<{
            id: number;
            body: string;
            points: number;
            isEndorsed: boolean;
            studentName: string;
          }>;
        }>(path)
      ).data,
  });
}

export function usePostQuestion() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { title: string; body: string }) =>
      (await api.post("/forum/questions", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["forum", tenantId] });
    },
  });
}

export function usePostAnswer() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { questionId: number; body: string }) =>
      (await api.post(`/forum/questions/${input.questionId}/answers`, { body: input.body })).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["forum", tenantId] });
    },
  });
}

export function useUpvoteAnswer() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (answerId: number) =>
      (await api.post(`/forum/answers/${answerId}/upvote`)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["forum", tenantId] });
    },
  });
}

export function useEndorseAnswer() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (answerId: number) =>
      (await api.post(`/forum/moderate/answers/${answerId}/endorse`)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["forum", tenantId] });
    },
  });
}

export function useDeleteForumContent() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: "question" | "answer"; id: number }) =>
      (
        await api.delete(
          input.kind === "question"
            ? `/forum/moderate/questions/${input.id}`
            : `/forum/moderate/answers/${input.id}`,
        )
      ).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["forum", tenantId] });
    },
  });
}

export function useProfanityWords() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: key(tenantId, "words"),
    queryFn: async () =>
      (await api.get<{ rows: Array<{ id: number; word: string }> }>("/forum/filter/words")).data,
  });
}

export function useAddProfanityWord() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (word: string) => (await api.post("/forum/filter/words", { word })).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "words") });
    },
  });
}

export function useRemoveProfanityWord() {
  const { tenantId } = useSessionUser();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/forum/filter/words/${id}`)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key(tenantId, "words") });
    },
  });
}
