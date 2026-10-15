import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type SimRow = {
  id: number;
  subjectName: string;
  title: string;
  createdAt: string | null;
  externalUrl: string | null;
  hasFile: boolean;
};

export type StudentHome = {
  fullName: string;
  gradeLevel: number;
  section: string;
  greeting: "morning" | "afternoon" | "evening";
  today: string;
  simulationCount: number;
  simulations: SimRow[];
};

export type AssessmentItem = { label: string; score: number; maxScore: number };
export type SubjectBlock = { subject: string; earned: number; maxScore: number; items: AssessmentItem[] };

export type StudentResults = {
  fullName: string;
  gradeLevel: number;
  section: string;
  academicYear: string;
  semester: "1" | "2";
  rosterReady: boolean;
  completedCount: number;
  expectedCount: number;
  semesterAverage: number | null;
  semesterRank: number | null;
  hideSemesterRank: boolean;
  yearlyAverage: number | null;
  yearlyRank: number | null;
  chart: { subject: string; total: number }[];
  draft: SubjectBlock[];
  locked: SubjectBlock[];
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
    percent: number;
    history: { date: string; status: "P" | "A" | "T"; subjectName: string | null }[];
  };
};

export type StudentGroup = { id: number; groupName: string; subjectName: string; isLeader: boolean };

export type GroupHub = {
  id: number;
  groupName: string;
  subjectName: string;
  isLeader: boolean;
  members: { id: number; fullName: string; isLeader: boolean }[];
  tasks: { id: number; title: string; maxScore: number; deadline: string | null; hasFile: boolean }[];
  scores: { id: number; title: string; points: number; feedback: string | null }[];
  messages: { id: number; text: string; sentAt: string | null; sender: string }[];
};

export type ResourceRow = {
  id: number;
  title: string;
  fileType: string;
  semester: string | null;
  academicYear: string | null;
  sharedAt: string | null;
  teacherName: string;
  subjectName: string | null;
  content: string | null;
  hasFile: boolean;
};

export type ResourceList = {
  gradeLevel: number;
  section: string;
  stream: string;
  rows: ResourceRow[];
};

export type QuizView =
  | { inGroup: false }
  | { inGroup: true; groupName: string; exams: { examId: number; startTime: string | null }[] };

const homeKey = ["student", "home"] as const;
const resultsKey = ["student", "results"] as const;
const groupsKey = ["student", "groups"] as const;

export function useStudentHome() {
  return useQuery({
    queryKey: homeKey,
    queryFn: async () => (await api.get<StudentHome>("/student/home")).data,
  });
}

export function useStudentResults() {
  return useQuery({
    queryKey: resultsKey,
    queryFn: async () => (await api.get<StudentResults>("/student/results")).data,
  });
}

export function useStudentGroups() {
  return useQuery({
    queryKey: groupsKey,
    queryFn: async () => (await api.get<{ rows: StudentGroup[] }>("/student/groups")).data,
  });
}

export function useGroupHub(groupId: number) {
  return useQuery({
    queryKey: ["student", "group", groupId],
    queryFn: async () => (await api.get<GroupHub>(`/student/groups/${groupId}`)).data,
    enabled: groupId > 0,
  });
}

export function useSendGroupMessage(groupId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => (await api.post<GroupHub>(`/student/groups/${groupId}/messages`, { text })).data,
    onSuccess: (data) => {
      client.setQueryData(["student", "group", groupId], data);
    },
  });
}

export function useStudentSims() {
  return useQuery({
    queryKey: ["student", "sims"],
    queryFn: async () =>
      (await api.get<{ gradeLevel: number; section: string; rows: SimRow[] }>("/student/simulations")).data,
  });
}

export function useStudentResources(filters: { search: string; semester: string; year: string }) {
  return useQuery({
    queryKey: ["student", "resources", filters],
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

export function useStudentQuiz() {
  return useQuery({
    queryKey: ["student", "quiz"],
    queryFn: async () => (await api.get<QuizView>("/student/quiz")).data,
  });
}

export function shortDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function points(value: number, digits = 2): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export async function openStudentFile(path: string): Promise<void> {
  const response = await api.get<Blob>(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
