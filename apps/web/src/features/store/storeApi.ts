import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type StockStatus = "critical" | "low" | "adequate";

export type StoreCategory = {
  id: number;
  code: string;
  name: string;
  description: string;
};

export type StoreItem = {
  id: number;
  code: string;
  name: string;
  modelNo: string;
  categoryId: number | null;
  categoryName: string;
  unitOfMeasure: string;
  reorderLevel: number;
  maxLevel: number;
  unitCost: number;
  currentStock: number;
  totalValue: number;
  storeNo: string;
  shelfNo: string;
  specification: string;
  itemType: string;
  isPerishable: boolean;
  expiryDate: string | null;
  status: StockStatus;
};

export type ItemStats = {
  totalSkus: number;
  adequate: number;
  low: number;
  critical: number;
  totalValue: number;
};

export type ItemBody = {
  itemName: string;
  categoryId: number;
  itemCode: string;
  modelNo: string;
  unitOfMeasure: string;
  unitCost: number;
  reorderLevel: number;
  storeNo: string;
  shelfNo: string;
  isPerishable: boolean;
  expiryDate: string | null;
  specification: string;
  itemType: "fixed_asset" | "consumable";
};

const itemsKey = ["store", "items"] as const;

export function useStoreItems() {
  return useQuery({
    queryKey: itemsKey,
    queryFn: async () => (await api.get<{ rows: StoreItem[]; stats: ItemStats }>("/store/items")).data,
  });
}

export function useStoreCategories() {
  return useQuery({
    queryKey: ["store", "categories"],
    queryFn: async () => (await api.get<{ rows: StoreCategory[] }>("/store/categories")).data.rows,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { categoryCode: string; categoryName: string; description: string }) =>
      (await api.post("/store/categories", body)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["store", "categories"] });
    },
  });
}

export function useNextItemCode() {
  return useMutation({
    mutationFn: async (input: { categoryId: number; style: "str" | "category" }) =>
      (await api.get<{ itemCode: string }>("/store/items/next-code", { params: input })).data.itemCode,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ItemBody) => (await api.post("/store/items", body)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsKey });
    },
  });
}

export type GrnBoard = {
  nextGrnNumber: string;
  dateReceived: string;
  items: { id: number; code: string; name: string; categoryName: string; storeNo: string; shelfNo: string }[];
  suppliers: { id: number; name: string }[];
  records: {
    id: number;
    grnNumber: string;
    dateReceived: string;
    itemCode: string;
    itemName: string;
    quantityReceived: number;
    unitPrice: number;
    totalPrice: number;
  }[];
};

export function useGrnBoard() {
  return useQuery({
    queryKey: ["store", "grn"],
    queryFn: async () => (await api.get<GrnBoard>("/store/grn")).data,
  });
}

export function useReceiveGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      grnNumber: string;
      dateReceived: string;
      department: string;
      supplierId: number | null;
      itemId: number;
      quantityReceived: number;
      unitPrice: number;
    }) => (await api.post("/store/grn", body)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["store"] });
    },
  });
}

export type BinCardView = {
  items: { id: number; code: string; name: string; unitOfMeasure: string }[];
  selected: {
    name: string;
    code: string;
    currentStock: number;
    unitOfMeasure: string;
    storeNo: string;
    shelfNo: string;
  } | null;
  totalIn: number;
  totalOut: number;
  rows: {
    id: number;
    transactionDate: string;
    referenceDocument: string;
    receivedQty: number;
    issuedQty: number;
    balanceQty: number;
    remark: string;
    itemCode: string;
    itemName: string;
    unitOfMeasure: string;
    categoryName: string;
  }[];
};

export function useBinCard(query: { itemId: number; fromDate: string; toDate: string; trxType: "" | "IN" | "OUT" }) {
  return useQuery({
    queryKey: ["store", "bin-card", query],
    queryFn: async () => (await api.get<BinCardView>("/store/bin-card", { params: query })).data,
  });
}

export function useRecordInflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      itemId: number;
      inflowType: "DONATION" | "TRANSFER" | "LOAN_RETURN" | "FOUND_SURPLUS";
      sourceEntity: string;
      quantity: number;
      unitEstimatedCost: number;
      referenceDocNo: string;
      remarks: string;
    }) => (await api.post<{ newStockBalance: number }>("/store/inflow", body)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["store"] });
    },
  });
}

export type ApprovalRow = {
  id: number;
  refCode: string;
  requesterName: string;
  department: string;
  itemName: string;
  itemCode: string;
  quantityRequested: number;
  currentStock: number;
  createdAt: string;
  purpose: string;
};

export function useApprovals() {
  return useQuery({
    queryKey: ["store", "approvals"],
    queryFn: async () => (await api.get<{ rows: ApprovalRow[] }>("/store/approvals")).data.rows,
  });
}

export function useApprovalAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: number; action: "forward" | "reject" }) =>
      (await api.post(`/store/approvals/${input.id}`, { action: input.action })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["store", "approvals"] });
    },
  });
}

export type IssueBoard = {
  pending: {
    id: number;
    refCode: string;
    requesterName: string;
    department: string;
    itemId: number;
    itemName: string;
    itemCode: string;
    unitOfMeasure: string;
    quantityRequested: number;
    binBalance: number;
    enough: boolean;
    approverName: string;
  }[];
  history: {
    id: number;
    voucherNo: string;
    quantityIssued: number;
    issueDate: string;
    itemName: string;
    itemCode: string;
    unitOfMeasure: string;
    unitCost: number;
    totalCost: number;
    refCode: string;
    department: string;
    requesterName: string;
  }[];
};

export function useIssues() {
  return useQuery({
    queryKey: ["store", "issues"],
    queryFn: async () => (await api.get<IssueBoard>("/store/issues")).data,
  });
}

export function useIssueItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { requisitionId: number; voucherNo: string }) => (await api.post("/store/issues", body)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["store"] });
    },
  });
}

export const etb = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
