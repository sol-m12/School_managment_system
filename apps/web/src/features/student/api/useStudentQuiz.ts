import { useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";
import type { QuizView } from "./types";

export const studentQuizKeys = {
  all: ["student", "quiz"] as const,
  byTenant: (tenantId: number) => [...studentQuizKeys.all, tenantId] as const,
};

export function useStudentQuiz() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: studentQuizKeys.byTenant(tenantId),
    queryFn: async () => (await api.get<QuizView>("/student/quiz")).data,
  });
}
