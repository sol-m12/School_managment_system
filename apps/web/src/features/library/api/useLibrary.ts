import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const root = ["library"] as const;

function useBoard<T>(name: string, path: string, enabled = true) {
  return useQuery({
    queryKey: [...root, name],
    queryFn: async () => (await api.get<T>(path)).data,
    enabled,
  });
}

function useSend<T>(mutationFn: (body: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: root });
    },
  });
}

export type Desk = { books: number; borrowed: number; overdue: number; reservations: number; reminders: number };

export type SubjectOption = { id: number; name: string; gradeLevel?: number };

export type CatalogRow = {
  id: number;
  title: string;
  author: string;
  year: string;
  pages: number | null;
  accession: string | null;
  gradeLevel: number | null;
  subjectId: number | null;
  quantity: number;
  remarks: string;
  free: number;
};

export type PersonOption = { id: number; name: string; username: string; role: string; studentId: number | null; code: string };

export type LoanRow = {
  id: number;
  title: string;
  accession: string;
  patron: string;
  borrowDate: string | null;
  dueOn: string | null;
  status: "Borrowed" | "Returned";
  overdue: boolean;
};

export type LookupHit =
  | { kind: "book"; id: number; title: string; code: string; free: number; qrSvg: string }
  | { kind: "patron"; id: number; name: string; code: string; qrSvg: string };

export const useLibraryDesk = () => useBoard<Desk>("desk", "/library/desk");

export function useCatalog(q: string) {
  return useQuery({
    queryKey: [...root, "catalog", q],
    queryFn: async () => (await api.get<{ subjects: SubjectOption[]; rows: CatalogRow[] }>("/library/catalog", { params: { q } })).data,
  });
}

export const useCirculation = () =>
  useBoard<{ patrons: PersonOption[]; books: { id: number; title: string; accession: string; free: number }[]; rows: LoanRow[] }>(
    "circulation",
    "/library/circulation",
  );

export const useIntake = () =>
  useBoard<{ items: { id: number; code: string; name: string; stock: number }[]; rows: { id: number; code: string; name: string; copies: number; createdAt: string }[] }>(
    "intake",
    "/library/intake",
  );

export const useReminders = () =>
  useBoard<{ rows: { id: number; kind: "due" | "overdue"; dueOn: string; title: string; patron: string }[] }>("reminders", "/library/reminders");

export const usePatrons = () =>
  useBoard<{ patrons: PersonOption[]; rows: { id: number; patron: string; action: "In" | "Out"; bookTitle: string; loggedOn: string }[] }>(
    "patrons",
    "/library/patrons",
  );

export const useResources = () =>
  useBoard<{
    subjects: { id: number; name: string }[];
    waiting: { id: number; title: string; reason: string; subject: string }[];
    rows: { id: number; title: string; note: string; subject: string }[];
  }>("resources", "/library/resources");

export const useLiteracy = () =>
  useBoard<{
    students: { id: number; name: string; gradeLevel: number; section: string | null; year: string }[];
    rows: { id: number; studentId: number; name: string; year: string; visits: number; returned: number; openLoans: number; note: string }[];
  }>("literacy", "/library/literacy");

export function useRecommend(studentId: number) {
  return useQuery({
    queryKey: [...root, "recommend", studentId],
    queryFn: async () =>
      (await api.get<{ student: string; gradeLevel: number; rows: { id: number; title: string; reason: "teacher" | "weak" | "grade" }[] }>("/library/recommend", { params: { studentId } })).data,
    enabled: studentId > 0,
  });
}

export const useReservations = () =>
  useBoard<{ rows: { id: number; title: string; patron: string; status: "Open" | "Ready" | "Collected" | "Cancelled"; createdAt: string }[] }>(
    "reservations",
    "/library/reservations",
  );

export const useCompetition = () =>
  useBoard<{ rows: { id: number; name: string; gradeLevel: number; points: number; ranks: ("member" | "scholar")[] }[] }>("competition", "/library/competition");

export const useClearance = () =>
  useBoard<{ rows: { id: number; name: string; openLoans: number; blocked: boolean; libraryClear: boolean; status: string }[] }>("clearance", "/library/clearance");

export function useOpac(q: string) {
  return useQuery({
    queryKey: [...root, "opac", q],
    queryFn: async () =>
      (
        await api.get<{
          rows: { id: number; title: string; author: string; accession: string; gradeLevel: number | null; free: number; reserved: boolean }[];
          reservations: number;
          resources: { id: number; title: string; note: string; subject: string }[];
        }>("/library/opac", { params: { q } })
      ).data,
  });
}

export function useAddBook() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      bookName: string;
      author: string;
      publishedYear: string;
      pageCount: number | null;
      accessionNumber: string;
      gradeLevel: number | null;
      subjectId: number | null;
      quantity: number;
      remarks: string;
    }) => (await api.post<{ id: number; accession: string; qrSvg: string }>("/library/catalog", body)).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: root });
    },
  });
}

export const useCheckout = () => useSend((body: { bookId: number; userId: number }) => api.post("/library/circulation", body));
export const useReturnLoan = () => useSend((id: number) => api.post(`/library/circulation/${id}/return`));
export const useTakeIn = () => useSend((body: { itemId: number; copies: number }) => api.post("/library/intake", body));
export const useSeeReminder = () => useSend((id: number) => api.post(`/library/reminders/${id}/seen`));
export const useLogPatron = () => useSend((body: { userId: number; action: "In" | "Out"; bookTitle: string }) => api.post("/library/patrons", body));
export const useAddResource = () =>
  useSend((body: { title: string; subjectId: number | null; note: string; recommendationId: number | null }) => api.post("/library/resources", body));
export const useSaveLiteracy = () => useSend((body: { studentId: number; note: string }) => api.post("/library/literacy", body));
export const useScanCheckout = () => useSend((body: { bookCode: string; patronCode: string }) => api.post("/library/checkout", body));
export const useReadyReservation = () => useSend((id: number) => api.post(`/library/reservations/${id}/ready`));
export const useCollectReservation = () => useSend((id: number) => api.post(`/library/reservations/${id}/collect`));
export const useCancelReservation = () => useSend((id: number) => api.post(`/library/reservations/${id}/cancel`));
export const useApplyClearance = () => useSend((id: number) => api.post(`/library/clearance/${id}`));
export const useReserveBook = () => useSend((bookId: number) => api.post("/library/opac", { bookId }));

export function useLookup() {
  return useMutation({
    mutationFn: async (code: string) => (await api.get<LookupHit>("/library/lookup", { params: { code } })).data,
  });
}
