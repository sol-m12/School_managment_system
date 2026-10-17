import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/lib/api";

const root = ["procurement"] as const;
const vendorRoot = ["vendor-portal"] as const;

export const vendorApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim() || "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "vendorAccess";

export function vendorToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setVendorToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function useBoard<T>(name: string, path: string) {
  return useQuery({
    queryKey: [...root, name],
    queryFn: async () => (await api.get<T>(path)).data,
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

export type Desk = { vendors: number; checks: number; openOrders: number; openTenders: number; budgets: number };

export type VendorRow = {
  id: number;
  name: string;
  contact: string;
  phone: string;
  email: string;
  licenseNo: string;
  licenseExpires: string | null;
  status: "Active" | "Suspended";
  username: string;
  licenseCurrent: boolean;
};

export type BudgetRow = {
  id: number;
  fiscalYear: string;
  code: string;
  title: string;
  allocated: number;
  spent: number;
  remaining: number;
};

export type StoreRequest = {
  id: number;
  code: string;
  name: string;
  stock: number;
  reorder: number;
  quantity: number;
  note: string;
  checked: boolean;
  decision: "Approved" | "Refused" | null;
  ordered: boolean;
};

export type TeacherRequest = {
  id: number;
  department: string;
  name: string;
  quantity: number;
  purpose: string;
  stock: number;
  checked: boolean;
  decision: "Approved" | "Refused" | null;
  ordered: boolean;
};

export type OrderRow = {
  id: number;
  orderNo: string;
  vendor: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: "Issued" | "Partial" | "Delivered";
  received: number;
  sourceKind: string;
  createdAt: string;
};

export type OrderSheet = OrderRow & {
  licenseNo: string;
  budgetCode: string;
  fiscalYear: string;
  school: string;
};

export type TenderRow = {
  id: number;
  title: string;
  itemName: string;
  quantity: number;
  closesOn: string;
  status: "Open" | "Awarded" | "Closed";
  budgetId: number;
  budgetCode: string;
  open: boolean;
};

export type MatrixBid = {
  id: number;
  rank: number;
  vendorId: number;
  vendor: string;
  amount: number;
  note: string;
  licenseExpires: string | null;
  valid: boolean;
};

export type PublicTender = { id: number; title: string; itemName: string; quantity: number; closesOn: string };

export const useProcurementDesk = () => useBoard<Desk>("desk", "/procurement/desk");
export const useVendors = () => useBoard<{ rows: VendorRow[] }>("vendors", "/procurement/vendors");
export const useBudgets = () => useBoard<{ rows: BudgetRow[] }>("budgets", "/procurement/budgets");
export const useRequisitions = () =>
  useBoard<{ store: StoreRequest[]; teacher: TeacherRequest[] }>("requisitions", "/procurement/requisitions");
export const useOrders = () => useBoard<{ rows: OrderRow[] }>("orders", "/procurement/orders");
export const useTenders = () => useBoard<{ rows: TenderRow[] }>("tenders", "/procurement/tenders");

export function useOrder(id: number) {
  return useQuery({
    queryKey: [...root, "order", id],
    queryFn: async () => (await api.get<OrderSheet>(`/procurement/orders/${id}`)).data,
    enabled: id > 0,
  });
}

export function useMatrix(id: number) {
  return useQuery({
    queryKey: [...root, "matrix", id],
    queryFn: async () =>
      (
        await api.get<{
          tender: { id: number; title: string; itemName: string; quantity: number; closesOn: string; status: string };
          rows: MatrixBid[];
          winnerId: number | null;
          orderId: number | null;
        }>(`/procurement/tenders/${id}`)
      ).data,
    enabled: id > 0,
  });
}

export const useCreateVendor = () =>
  useSend<{ supplierName: string; contactName: string; phone: string; email: string; licenseNo: string; licenseExpires: string }>(
    async (body) => (await api.post<{ id: number; username: string; password: string }>("/procurement/vendors", body)).data,
  );

export const useVendorStatus = () =>
  useSend<{ id: number; status: "Active" | "Suspended" }>(
    async (body) => (await api.post(`/procurement/vendors/${body.id}/status`, { status: body.status })).data,
  );

export const useCreateBudget = () =>
  useSend<{ fiscalYear: string; code: string; title: string; allocated: number }>(
    async (body) => (await api.post("/procurement/budgets", body)).data,
  );

export const useCheckRequest = () =>
  useSend<{ sourceKind: "store" | "teacher"; sourceId: number }>(
    async (body) => (await api.post("/procurement/requisitions/check", body)).data,
  );

export const useDecide = () =>
  useSend<{
    sourceKind: "store" | "teacher";
    sourceId: number;
    budgetId: number | null;
    quantity: number;
    unitPrice: number;
    decision: "Approved" | "Refused";
    note: string;
  }>(async (body) => (await api.post("/procurement/approvals", body)).data);

export const useCreateOrder = () =>
  useSend<{ sourceKind: "store" | "teacher" | "tender"; sourceId: number; vendorId: number }>(
    async (body) => (await api.post("/procurement/orders", body)).data,
  );

export const useReceive = () =>
  useSend<{ id: number; quantity: number }>(async (body) => (await api.post(`/procurement/orders/${body.id}/receive`, { quantity: body.quantity })).data);

export const useCreateTender = () =>
  useSend<{ title: string; itemName: string; quantity: number; closesOn: string; budgetId: number }>(
    async (body) => (await api.post("/procurement/tenders", body)).data,
  );

export const useAward = () => useSend<number>(async (id) => (await api.post(`/procurement/tenders/${id}/award`)).data);

export function usePublicTenders(slug: string) {
  return useQuery({
    queryKey: [...vendorRoot, "board", slug],
    queryFn: async () => (await vendorApi.get<{ school: string; rows: PublicTender[] }>("/public/tenders", { params: { slug } })).data,
    enabled: slug.trim().length > 0,
  });
}

export function useVendorLogin() {
  return useMutation({
    mutationFn: async (body: { tenantSlug: string; username: string; password: string }) => {
      const { data } = await vendorApi.post<{ accessToken: string }>("/vendor/login", body);
      setVendorToken(data.accessToken);
      return data;
    },
  });
}

export type VendorDesk = {
  vendor: VendorRow;
  tenders: PublicTender[];
  bids: { id: number; tenderId: number; title: string; amount: number }[];
  awards: { id: number; letterNo: string; title: string; itemName: string; amount: number }[];
};

export function useVendorDesk() {
  const token = vendorToken();
  return useQuery({
    queryKey: [...vendorRoot, "desk"],
    queryFn: async () =>
      (await vendorApi.get<VendorDesk>("/vendor/desk", { headers: { Authorization: `Bearer ${token}` } })).data,
    enabled: Boolean(token),
  });
}

export function usePlaceBid() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { tenderId: number; amount: number; note: string }) => {
      const token = vendorToken();
      return (await vendorApi.post("/vendor/bids", body, { headers: { Authorization: `Bearer ${token}` } })).data;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: vendorRoot });
    },
  });
}
