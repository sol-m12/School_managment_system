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

export type ExamRow = {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  subjectName: string;
  vocational: boolean;
  taken: boolean;
};

export type ExamView =
  | { locked: true }
  | { locked: false; gradeLevel: number; section: string; stream: string; vocational: boolean; rows: ExamRow[] };

export type LabRow = { id: string; url: string };
