import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const root = ["store", "office"] as const;

function useOffice<T>(name: string, path: string, enabled = true) {
  return useQuery({
    queryKey: [...root, name],
    queryFn: async () => (await api.get<T>(path)).data,
    enabled,
  });
}

function useRefresh() {
  const client = useQueryClient();
  return async () => {
    await client.invalidateQueries({ queryKey: root });
    await client.invalidateQueries({ queryKey: ["store", "items"] });
  };
}

export type StockStatus = "critical" | "low" | "adequate";

export type ProcurementBoard = {
  low: { id: number; code: string; name: string; stock: number; reorder: number; suggested: number; routed: boolean }[];
  requests: { id: number; itemId: number; code: string; name: string; quantity: number; note: string; createdAt: string }[];
};

export type SearchBoard = {
  rows: { id: number; code: string; name: string; stock: number; reorder: number; status: StockStatus; storeNo: string; shelfNo: string; unit: string }[];
};

export type AlertBoard = {
  rows: { id: number; itemId: number; code: string; name: string; kind: "reorder" | "forecast"; stock: number; reorder: number; daysLeft: number | null }[];
};

export type AssetStatus = "InStore" | "OnLoan" | "Disposed";

export type AssetRow = {
  id: number;
  itemId: number;
  code: string;
  name: string;
  tag: string;
  serialNo: string;
  location: string;
  status: AssetStatus;
  qrSvg: string;
};

export type AssetHit = AssetRow & {
  loan: { id: number; borrowerName: string; purpose: string; dueOn: string; overdue: boolean } | null;
};

export type AssetBoard = {
  items: { id: number; code: string; name: string; stock: number; itemType: string }[];
  rows: AssetRow[];
};

export type DisposalBoard = {
  items: { id: number; code: string; name: string; stock: number }[];
  assets: { id: number; tag: string; itemId: number; name: string }[];
  rows: { id: number; code: string; name: string; tag: string; quantity: number; kind: "damage" | "disposal"; note: string; createdAt: string }[];
};

export type LoanBoard = {
  assets: { id: number; tag: string; name: string }[];
  rows: {
    id: number;
    assetId: number;
    tag: string;
    name: string;
    borrowerName: string;
    purpose: string;
    dueOn: string;
    returnedOn: string | null;
    status: "Out" | "Returned";
    overdue: boolean;
  }[];
};

export type ForecastBoard = {
  windowDays: number;
  horizon: number;
  rows: { id: number; code: string; name: string; stock: number; reorder: number; issued: number; daysLeft: number | null; alert: boolean }[];
};

export type StoreReport = {
  generatedOn: string;
  skus: number;
  adequate: number;
  low: number;
  critical: number;
  totalValue: number;
  routed: number;
  openLoans: number;
  overdueLoans: number;
  disposals: number;
  categories: { name: string; skus: number; value: number }[];
  audit: { id: number; actionType: string; description: string; timestamp: string }[];
};

export const useProcurement = () => useOffice<ProcurementBoard>("procurement", "/store/office/procurement");
export const useAlerts = () => useOffice<AlertBoard>("alerts", "/store/office/alerts");
export const useAssets = () => useOffice<AssetBoard>("assets", "/store/office/assets");
export const useDisposals = () => useOffice<DisposalBoard>("disposals", "/store/office/disposals");
export const useLoans = () => useOffice<LoanBoard>("loans", "/store/office/loans");
export const useForecast = () => useOffice<ForecastBoard>("forecast", "/store/office/forecast");
export const useStoreReport = () => useOffice<StoreReport>("reports", "/store/office/reports");

export function useInventorySearch(q: string) {
  return useQuery({
    queryKey: [...root, "search", q],
    queryFn: async () => (await api.get<SearchBoard>("/store/office/search", { params: { q } })).data,
    enabled: q.length > 0,
  });
}

export function useRoutePurchase() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (body: { itemId: number; quantity: number; note: string }) =>
      (await api.post("/store/office/procurement", body)).data,
    onSuccess: refresh,
  });
}

export function useSeeAlert() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: number) => (await api.post(`/store/office/alerts/${id}/seen`)).data,
    onSuccess: refresh,
  });
}

export function useRouteAlert() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: number) => (await api.post(`/store/office/alerts/${id}/route`)).data,
    onSuccess: refresh,
  });
}

export function useAssetLookup() {
  return useMutation({
    mutationFn: async (tag: string) => (await api.get<AssetHit>("/store/office/assets/lookup", { params: { tag } })).data,
  });
}

export function useRegisterAsset() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (body: { itemId: number; serialNo: string; location: string }) =>
      (await api.post("/store/office/assets", body)).data,
    onSuccess: refresh,
  });
}

export function useRecordDisposal() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (body: { itemId: number; assetId: number | null; quantity: number; kind: "damage" | "disposal"; note: string }) =>
      (await api.post("/store/office/disposals", body)).data,
    onSuccess: refresh,
  });
}

export function useLendAsset() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (body: { assetId: number; borrowerName: string; purpose: string; dueOn: string }) =>
      (await api.post("/store/office/loans", body)).data,
    onSuccess: refresh,
  });
}

export function useReturnAsset() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: number) => (await api.post(`/store/office/loans/${id}/return`)).data,
    onSuccess: refresh,
  });
}
