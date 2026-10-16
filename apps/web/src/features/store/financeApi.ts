import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import type { TFunction } from "i18next";
import { api } from "@/lib/api";
import { toErrorKey } from "@/lib/apiError";

export type CodeOption = { id: number; number: string; name: string };

export type LedgerCard = {
  id: number;
  fiscalYear: string;
  pageNo: string;
  accountCode: string;
  accountName: string;
  publicBodyName: string;
  programName: string;
  budgetTypeName: string;
  sourceName: string;
  initialBudget: number;
  totalExpenditure: number;
  currentBalance: number;
};

export type LedgerFilters = {
  search: string;
  fiscalYear: string;
  budgetTypeId: number;
  sourceCodeId: number;
  programId: number;
};

export type CodePair = { code: string; name: string };

export type Mehi16Card = {
  id: number;
  fiscalYear: string;
  pageNo: string;
  publicBody: CodePair;
  program: CodePair;
  subProgram: CodePair;
  subAgency: CodePair;
  project: CodePair;
  account: CodePair;
  budgetType: CodePair;
  source: CodePair;
};

export type Mehi16Line = {
  id: number;
  date: string;
  description: string;
  refNo: string;
  approved: number;
  addition: number;
  reduction: number;
  adjusted: number;
  committed: number;
  expenditure: number;
  balance: number;
};

export type BudgetLine = {
  accountCodeId: number;
  treasuryAmount: number;
  retainedAmount: number;
  assistanceAmount: number;
  loanAmount: number;
};

export type BudgetBody = {
  fiscalYear: string;
  letterRefNo: string;
  notificationDate: string;
  publicBodyCodeId: number;
  programCodeId: number;
  subProgramCodeId: number | null;
  projectCodeId: number | null;
  subAgencyCodeId: number | null;
  sourceCodeId: number | null;
  budgetTypeId: number | null;
  lines: BudgetLine[];
};

export type Mehi17Card = {
  id: number;
  fiscalYear: string;
  bankAccountNo: string;
  accountName: string;
  accountType: string;
  sourceCodeId: number;
  budgetTypeId: number;
  publicBodyName: string;
  programName: string;
  sourceCode: string;
  sourceName: string;
  accountCode: string;
  budgetTypeName: string;
  balance: number;
};

export type Mehi17Detail = {
  id: number;
  fiscalYear: string;
  bankAccountNo: string;
  accountName: string;
  accountType: string;
  publicBody: CodePair;
  subAgency: CodePair;
  program: CodePair;
  subProgram: CodePair;
  project: CodePair;
  source: CodePair;
  budgetTypeName: string;
  accountCode: string;
};

export type Mehi17Line = {
  id: number;
  registerMonth: string;
  registerDay: string;
  registerPage: string;
  registerItemNo: string;
  docDate: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type Mehi7Options = {
  page: "mehi7";
  fiscalYear: string;
  accounts: CodeOption[];
  budgetTypes: CodeOption[];
  sources: CodeOption[];
  cards: Mehi17Card[];
};

type BudgetLookups = {
  page: "budget";
  publicBodies: CodeOption[];
  programs: CodeOption[];
  subPrograms: CodeOption[];
  projects: CodeOption[];
  subAgencies: CodeOption[];
  sources: CodeOption[];
  budgetTypes: CodeOption[];
  accounts: CodeOption[];
};

type SetupLookups = {
  page: "setup";
  publicBodies: CodeOption[];
  subAgencies: CodeOption[];
  programs: CodeOption[];
  subPrograms: CodeOption[];
  projects: CodeOption[];
  sources: CodeOption[];
  budgetTypes: CodeOption[];
  accounts: CodeOption[];
};

type LedgerLookups = {
  page: "ledger";
  programs: CodeOption[];
  budgetTypes: CodeOption[];
  sources: CodeOption[];
  years: string[];
};

const moneyFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function birr(value: number): string {
  return moneyFormat.format(value);
}

export function birrOrBlank(value: number): string {
  return value > 0 ? birr(value) : "";
}

export function codeLabel(code: CodeOption): string {
  return `${code.number} - ${code.name}`;
}

export function schoolToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

export function financeErrorText(t: TFunction, error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { code?: string; balance?: number; requested?: number } | undefined;
    if (data?.code === "INSUFFICIENT_BUDGET" || data?.code === "INSUFFICIENT_CASH") {
      const key = data.code === "INSUFFICIENT_BUDGET" ? "store:insufficientBudget" : "store:insufficientCash";
      return t(key, { balance: birr(data.balance ?? 0), requested: birr(data.requested ?? 0) });
    }
  }
  return t(`errors:${toErrorKey(error)}`);
}

export function useFinanceLookups<T>(page: "budget" | "setup" | "ledger" | "mehi7") {
  return useQuery({
    queryKey: ["finance", "lookups", page],
    queryFn: async () => (await api.get<T>("/store/finance/lookups", { params: { page } })).data,
  });
}

export function useBudgetLookups() {
  return useFinanceLookups<BudgetLookups>("budget");
}

export function useSetupLookups() {
  return useFinanceLookups<SetupLookups>("setup");
}

export function useLedgerLookups() {
  return useFinanceLookups<LedgerLookups>("ledger");
}

export function useMehi7Options() {
  return useFinanceLookups<Mehi7Options>("mehi7");
}

export function useCreateFinanceCode(page: "budget" | "setup" | "ledger" | "mehi7") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { typeName: string; codeNumber: string; codeNameAm: string; codeNameEn: string; match: "like" | "exact" }) =>
      (await api.post<{ id: number; label: string; name: string }>("/store/finance/codes", body)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance", "lookups", page] });
    },
  });
}

export function useLedgerCards(filters: LedgerFilters) {
  return useQuery({
    queryKey: ["finance", "cards", filters],
    queryFn: async () =>
      (await api.get<{ cards: LedgerCard[]; totals: { cards: number; approved: number; expenditure: number; balance: number } }>(
        "/store/finance/cards",
        { params: filters },
      )).data,
  });
}

export function useDeleteLedgerCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await api.delete(`/store/finance/cards/${id}`)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance", "cards"] });
    },
  });
}

export function useMehi16Card(cardId: number | null) {
  return useQuery({
    queryKey: ["finance", "card", cardId ?? "latest"],
    queryFn: async () =>
      (await api.get<{ card: Mehi16Card; lines: Mehi16Line[] }>(cardId ? `/store/finance/cards/${cardId}` : "/store/finance/cards/latest")).data,
  });
}

export function useSaveBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BudgetBody) => (await api.post<{ notificationId: number; cardsOpened: number }>("/store/finance/budget", body)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}

export function useMehi17Board(selectedId: number | null) {
  return useQuery({
    queryKey: ["finance", "mehi17", selectedId ?? 0],
    queryFn: async () =>
      (await api.get<{ cards: Mehi17Card[]; card: Mehi17Detail | null; lines: Mehi17Line[] }>("/store/finance/mehi17", {
        params: selectedId ? { selectedId } : {},
      })).data,
  });
}

export function useOpenMehi17() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      fiscalYear: string;
      publicBodyCodeId: number;
      subAgencyCodeId: number | null;
      programCodeId: number;
      subProgramCodeId: number | null;
      projectCodeId: number | null;
      sourceCodeId: number;
      budgetTypeId: number;
      accountCodeId: number | null;
      accountName: string;
      bankAccountNo: string;
      openingBalance: number;
      description: string;
      registerMonth: string;
    }) => (await api.post<{ id: number }>("/store/finance/mehi17", body)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance", "mehi17"] });
    },
  });
}

export function useFindMehi17(filters: { fiscalYear: string; sourceCodeId: number; accountType: "" | "Bank" | "Cash" }, enabled: boolean) {
  return useQuery({
    queryKey: ["finance", "mehi17-find", filters],
    enabled,
    queryFn: async () =>
      (await api.get<{ found: boolean; card?: Mehi17Detail; lines?: Mehi17Line[] }>("/store/finance/mehi17/find", { params: filters })).data,
  });
}

export function useAccountHint() {
  return useMutation({
    mutationFn: async (accountId: number) =>
      (await api.get<{ cardId: number | null; budgetTypeId: number | null; sourceCodeId: number | null; currentBalance: number }>(
        "/store/finance/mehi7/hint",
        { params: { accountId } },
      )).data,
  });
}

export function useM16Balance() {
  return useMutation({
    mutationFn: async (query: { accountId: number; sourceId: number; budgetTypeId: number }) =>
      (await api.get<{ cardId: number; currentBalance: number }>("/store/finance/mehi7/balance", { params: query })).data,
  });
}

export function useSaveMehi7() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      serialNo: string;
      voucherDate: string;
      payeeName: string;
      modeOfPayment: "Check" | "Bank_Transfer" | "Cash";
      checkNo: string;
      purpose: string;
      publicBodyCodeId: number;
      programCodeId: number;
      lines: Array<{
        entryType: "debit" | "credit";
        accountCodeId: number | null;
        budgetCategoryId: number | null;
        budgetSourceId: number | null;
        m17CardId: number | null;
        debitAmount: number;
        creditAmount: number;
      }>;
    }) => (await api.post("/store/finance/mehi7", body)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
    },
  });
}
