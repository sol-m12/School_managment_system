import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/auth/authContext";
import { api } from "@/lib/api";

export const STREAMS = ["Common", "Natural", "Social"] as const;
export type Stream = (typeof STREAMS)[number];

export type Subject = {
  id: number;
  subjectName: string;
  gradeLevel: number;
  stream: Stream;
  creditHours: number;
  isVocational: boolean;
  sortOrder: number | null;
};

export type SubjectInput = Omit<Subject, "id" | "sortOrder"> & { sortOrder: number };

export type SubjectPage = {
  rows: Subject[];
  total: number;
};

export const subjectKeys = {
  all: (tenantId: number) => ["subjects", tenantId] as const,
  detail: (tenantId: number, id: number) => [...subjectKeys.all(tenantId), "detail", id] as const,
};

async function fetchSubjects(): Promise<SubjectPage> {
  const { data } = await api.get<SubjectPage>("/subjects");
  return data;
}

export function useSubjects() {
  const { tenantId } = useSessionUser();
  return useQuery({
    queryKey: subjectKeys.all(tenantId),
    queryFn: fetchSubjects,
    placeholderData: keepPreviousData,
  });
}
