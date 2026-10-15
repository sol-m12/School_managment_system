import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export type CourseFileBoard = {
  classes: { value: string; label: string }[];
  rows: { id: number; title: string; category: string; classLabel: string; sharedAt: string }[];
};

export const courseFileKeys = {
  all: ["teacher", "course-files"] as const,
  board: (tenantId: number) => [...courseFileKeys.all, tenantId] as const,
};

export function useCourseFiles() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: courseFileKeys.board(tenantId),
    queryFn: async () => (await api.get<CourseFileBoard>("/teacher/course-files")).data,
  });
}

export function useAddCourseFile() {
  const client = useQueryClient();
  const { tenantId } = useSessionUser();
  return useMutation({
    mutationFn: async (body: { classSelect: string; category: string; title: string; content: string }) =>
      (await api.post<CourseFileBoard>("/teacher/course-files", body)).data,
    onSuccess: (data) => client.setQueryData(courseFileKeys.board(tenantId), data),
  });
}
