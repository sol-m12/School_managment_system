import { alias, type AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  accountTypes,
  budgetNotificationItems,
  budgetNotifications,
  financeCodes,
  mehi161Cards,
  mehi161Transactions,
  mehi17Cards,
  mehi17Transactions,
  mehi7Items,
  mehi7Vouchers,
  systemSettings,
} from "../../db/schema/index.js";
import { scoped, withTenant } from "../../lib/tenant.js";

export type FinanceErrorCode =
  | "NO_CARD"
  | "CARD_NOT_FOUND"
  | "CARD_HAS_EXPENDITURE"
  | "ZERO_BUDGET"
  | "DUPLICATE_MEHI17"
  | "MISSING_LINE"
  | "MISSING_CODES"
  | "NO_M16_CARD"
  | "INSUFFICIENT_BUDGET"
  | "NO_M17_CARD"
  | "INSUFFICIENT_CASH";

export class FinanceError extends Error {
  constructor(
    readonly code: FinanceErrorCode,
    readonly details?: { balance: number; requested: number },
  ) {
    super(code);
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CodeOption = { id: number; number: string; name: string };

type NullableId = number | null;

const YEAR_KEY = "current_academic_year";
const ENGLISH_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Ledger lines stored on the card. These are the legacy record phrases. */
const LEDGER_LINE = {
  treasury: "የመደበኛ በጀት ፈቀዳ",
  retained: "የውስጥ ገቢ በጀት ፈቀዳ",
  assistance: "የእርዳታ በጀት ፈቀዳ",
  loan: "የብድር በጀት ፈቀዳ",
} as const;

function num(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function money(value: number): string {
  return value.toFixed(2);
}

function schoolDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function englishMonth(isoDate: string): string {
  const month = Number(isoDate.slice(5, 7));
  return ENGLISH_MONTHS[month - 1] ?? "January";
}

function sameOrNull(column: AnyMySqlColumn, value: NullableId): SQL {
  return value == null ? sql`${column} IS NULL` : eq(column, value);
}

type CodeAlias = { codeId: AnyMySqlColumn; tenantId: AnyMySqlColumn };

function codeJoin(column: AnyMySqlColumn, table: CodeAlias, tenantId: number): SQL {
  return sql`${column} = ${table.codeId} AND ${table.tenantId} = ${tenantId}`;
}

function isDuplicate(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { code?: unknown; errno?: unknown; cause?: unknown };
    if (record.code === "ER_DUP_ENTRY" || record.errno === 1062) return true;
    current = record.cause;
  }
  return false;
}

async function fiscalYearOf(tenantId: number): Promise<string> {
  const [row] = await db
    .select({ settingValue: systemSettings.settingValue })
    .from(systemSettings)
    .where(scoped(systemSettings, tenantId, eq(systemSettings.settingKey, YEAR_KEY)))
    .limit(1);
  const value = row?.settingValue?.trim();
  return value ? value : "2018";
}

async function codesWhere(tenantId: number, typeSql: SQL, activeOnly: boolean): Promise<CodeOption[]> {
  const rows = await db
    .select({
      id: financeCodes.codeId,
      number: financeCodes.codeNumber,
      nameAm: financeCodes.codeNameAm,
      nameEn: financeCodes.codeNameEn,
    })
    .from(financeCodes)
    .innerJoin(accountTypes, eq(financeCodes.typeId, accountTypes.typeId))
    .where(and(
      eq(financeCodes.tenantId, tenantId),
      typeSql,
      activeOnly ? eq(financeCodes.isActive, 1) : undefined,
    ))
    .orderBy(asc(financeCodes.codeNumber));
  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    name: displayCodeName(row.nameAm, row.nameEn, row.number),
  }));
}

function displayCodeName(nameAm: string | null | undefined, nameEn: string | null | undefined, fallback = ""): string {
  const am = nameAm?.trim() ?? "";
  if (am) return am;
  const en = nameEn?.trim() ?? "";
  if (en) return en;
  return fallback;
}

function likeType(fragment: string): SQL {
  return like(accountTypes.typeName, `%${fragment}%`);
}

function exactType(name: string): SQL {
  return eq(accountTypes.typeName, name);
}

function anyType(...fragments: string[]): SQL {
  const parts = fragments.map((fragment) => likeType(fragment));
  return or(...parts)!;
}

async function codesOnCards(
  tenantId: number,
  column: AnyMySqlColumn,
): Promise<CodeOption[]> {
  const rows = await db
    .selectDistinct({
      id: financeCodes.codeId,
      number: financeCodes.codeNumber,
      nameAm: financeCodes.codeNameAm,
      nameEn: financeCodes.codeNameEn,
    })
    .from(mehi161Cards)
    .innerJoin(financeCodes, and(
      eq(column, financeCodes.codeId),
      eq(financeCodes.tenantId, tenantId),
    ))
    .where(and(eq(mehi161Cards.tenantId, tenantId), sql`${column} IS NOT NULL`))
    .orderBy(asc(financeCodes.codeNumber));
  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    name: displayCodeName(row.nameAm, row.nameEn, row.number),
  }));
}

function mergeCodeOptions(...lists: CodeOption[][]): CodeOption[] {
  const byId = new Map<number, CodeOption>();
  for (const list of lists) {
    for (const code of list) byId.set(code.id, code);
  }
  return [...byId.values()].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}

export async function financeLookups(tenantId: number, page: "budget" | "setup" | "ledger" | "mehi7") {
  if (page === "budget") {
    return {
      page,
      publicBodies: await codesWhere(tenantId, anyType("Public Body", "Public_Body"), false),
      programs: await codesWhere(tenantId, anyType("Program", "ፕሮግራም"), false),
      subPrograms: await codesWhere(tenantId, anyType("Sub Program", "Sub_Program"), false),
      projects: await codesWhere(tenantId, anyType("Project"), false),
      subAgencies: await codesWhere(tenantId, anyType("Sub Agency", "Sub_Agency"), false),
      sources: await codesWhere(tenantId, anyType("Source", "Source_Of_Finance", "ምንጭ"), false),
      budgetTypes: await codesWhere(tenantId, anyType("Budget Type", "Budget_Type", "የበጀት ዓይነት"), false),
      accounts: await codesWhere(tenantId, anyType("Account", "Account_Code", "Expense"), false),
    };
  }
  if (page === "setup") {
    return {
      page,
      publicBodies: await codesWhere(tenantId, exactType("Public_Body"), true),
      subAgencies: await codesWhere(tenantId, exactType("Sub_Agency"), true),
      programs: await codesWhere(tenantId, exactType("Program"), true),
      subPrograms: await codesWhere(tenantId, exactType("Sub_Program"), true),
      projects: await codesWhere(tenantId, exactType("Project"), true),
      sources: await codesWhere(tenantId, exactType("Source_Of_Finance"), true),
      budgetTypes: await codesWhere(tenantId, exactType("Budget_Type"), true),
      accounts: await codesWhere(tenantId, exactType("Account_Code"), true),
    };
  }
  if (page === "ledger") {
    const years = await db
      .selectDistinct({ fiscalYear: mehi161Cards.fiscalYear })
      .from(mehi161Cards)
      .where(scoped(mehi161Cards, tenantId))
      .orderBy(desc(mehi161Cards.fiscalYear));
    return {
      page,
      programs: mergeCodeOptions(
        await codesWhere(tenantId, anyType("Program", "ፕሮግራም"), false),
        await codesOnCards(tenantId, mehi161Cards.programCodeId),
      ),
      budgetTypes: mergeCodeOptions(
        await codesWhere(tenantId, anyType("Budget Type", "Budget_Type", "የበጀት ዓይነት"), false),
        await codesOnCards(tenantId, mehi161Cards.budgetTypeId),
      ),
      sources: mergeCodeOptions(
        await codesWhere(tenantId, anyType("Source", "Source_Of_Finance", "ምንጭ"), false),
        await codesOnCards(tenantId, mehi161Cards.sourceCodeId),
      ),
      years: years.map((row) => row.fiscalYear),
    };
  }
  const fiscalYear = await fiscalYearOf(tenantId);
  return {
    page,
    fiscalYear,
    accounts: await codesWhere(tenantId, anyType("Account", "Account_Code", "Expense"), false),
    budgetTypes: await codesWhere(tenantId, anyType("Budget Type", "Budget_Type", "የበጀት ዓይነት"), false),
    sources: await codesWhere(tenantId, anyType("Source", "Source_Of_Finance", "ምንጭ"), false),
    cards: await listMehi17Cards(tenantId, fiscalYear),
  };
}

export async function addFinanceCode(
  tenantId: number,
  input: { typeName: string; codeNumber: string; codeNameAm: string; codeNameEn: string; match: "like" | "exact" },
) {
  return db.transaction(async (tx) => {
    const typeFilter = input.match === "exact"
      ? eq(accountTypes.typeName, input.typeName)
      : like(accountTypes.typeName, `%${input.typeName}%`);
    const [existing] = await tx
      .select({ id: accountTypes.typeId })
      .from(accountTypes)
      .where(scoped(accountTypes, tenantId, typeFilter))
      .limit(1);
    let typeId = existing?.id;
    if (!typeId) {
      const inserted = await tx.insert(accountTypes).values(withTenant({
        typeName: input.typeName,
        codePrefix: input.typeName.slice(0, 3).toUpperCase(),
      }, tenantId));
      typeId = Number(inserted[0].insertId);
    }
    const inserted = await tx.insert(financeCodes).values(withTenant({
      typeId,
      codeNumber: input.codeNumber,
      codeNameAm: input.codeNameAm,
      codeNameEn: input.codeNameEn || null,
      isActive: 1,
    }, tenantId));
    const id = Number(inserted[0].insertId);
    return { id, label: `${input.codeNumber} - ${input.codeNameAm}`, name: input.codeNameAm };
  });
}

async function codeIdByNumber(tx: Tx, tenantId: number, codeNumber: string): Promise<number | null> {
  const [row] = await tx
    .select({ id: financeCodes.codeId })
    .from(financeCodes)
    .where(scoped(financeCodes, tenantId, eq(financeCodes.codeNumber, codeNumber)))
    .limit(1);
  return row?.id ?? null;
}

async function latestM16Balance(tx: Tx | typeof db, tenantId: number, cardId: number): Promise<{ balance: number; adjusted: number } | null> {
  const [row] = await tx
    .select({
      balance: mehi161Transactions.balance,
      adjusted: mehi161Transactions.adjustedBudget,
    })
    .from(mehi161Transactions)
    .where(scoped(mehi161Transactions, tenantId, eq(mehi161Transactions.cardId, cardId)))
    .orderBy(desc(mehi161Transactions.transId))
    .limit(1);
  if (!row) return null;
  return { balance: num(row.balance), adjusted: num(row.adjusted) };
}

async function processLedgerCard(
  tx: Tx,
  tenantId: number,
  fiscalYear: string,
  publicBodyId: number,
  programId: number,
  subProgramId: NullableId,
  projectId: NullableId,
  subAgencyId: NullableId,
  accountId: number,
  sourceId: number,
  budgetTypeId: number,
  amount: number,
  refNo: string,
  notificationId: number,
  userId: number,
  lineText: string,
) {
  if (amount <= 0) return;
  const [existing] = await tx
    .select({ cardId: mehi161Cards.cardId })
    .from(mehi161Cards)
    .where(and(
      eq(mehi161Cards.tenantId, tenantId),
      eq(mehi161Cards.fiscalYear, fiscalYear),
      eq(mehi161Cards.accountCodeId, accountId),
      eq(mehi161Cards.sourceCodeId, sourceId),
      eq(mehi161Cards.budgetTypeId, budgetTypeId),
      eq(mehi161Cards.programCodeId, programId),
      sameOrNull(mehi161Cards.subProgramCodeId, subProgramId),
      sameOrNull(mehi161Cards.projectCodeId, projectId),
      sameOrNull(mehi161Cards.subAgencyCodeId, subAgencyId),
    ))
    .limit(1);
  let cardId = existing?.cardId;
  if (!cardId) {
    const inserted = await tx.insert(mehi161Cards).values(withTenant({
      fiscalYear,
      publicBodyCodeId: publicBodyId,
      programCodeId: programId,
      subProgramCodeId: subProgramId,
      projectCodeId: projectId,
      subAgencyCodeId: subAgencyId,
      sourceCodeId: sourceId,
      budgetTypeId,
      accountCodeId: accountId,
      createdBy: userId,
    }, tenantId));
    cardId = Number(inserted[0].insertId);
  }
  const text = `የ${fiscalYear} በጀት ዓመት ${lineText}`;
  await tx.insert(mehi161Transactions).values(withTenant({
    cardId,
    notificationId,
    transDate: schoolDate(),
    description: text,
    refNo,
    approvedBudget: money(amount),
    adjustedBudget: money(amount),
    balance: money(amount),
  }, tenantId));
}

export async function saveBudget(
  tenantId: number,
  userId: number,
  input: {
    fiscalYear: string;
    letterRefNo: string;
    notificationDate: string;
    publicBodyCodeId: number;
    programCodeId: number;
    subProgramCodeId: NullableId;
    projectCodeId: NullableId;
    subAgencyCodeId: NullableId;
    sourceCodeId: NullableId;
    budgetTypeId: NullableId;
    lines: Array<{
      accountCodeId: number;
      treasuryAmount: number;
      retainedAmount: number;
      assistanceAmount: number;
      loanAmount: number;
    }>;
  },
) {
  const hasAmount = input.lines.some((line) =>
    line.treasuryAmount + line.retainedAmount + line.assistanceAmount + line.loanAmount > 0);
  if (!hasAmount) throw new FinanceError("ZERO_BUDGET");

  return db.transaction(async (tx) => {
    const header = await tx.insert(budgetNotifications).values(withTenant({
      fiscalYear: input.fiscalYear,
      letterRefNo: input.letterRefNo,
      notificationDate: input.notificationDate,
      publicBodyCodeId: input.publicBodyCodeId,
      programCodeId: input.programCodeId,
      subProgramCodeId: input.subProgramCodeId,
      projectCodeId: input.projectCodeId,
      recordedBy: userId,
    }, tenantId));
    const notificationId = Number(header[0].insertId);
    const treasuryId = await codeIdByNumber(tx, tenantId, "101") ?? 1;
    const retainedId = await codeIdByNumber(tx, tenantId, "102") ?? 2;
    const assistanceId = await codeIdByNumber(tx, tenantId, "103") ?? 3;
    const loanId = await codeIdByNumber(tx, tenantId, "104") ?? 4;
    let cardsOpened = 0;
    const slots = [
      { amountOf: (line: (typeof input.lines)[number]) => line.treasuryAmount, fallback: treasuryId, text: LEDGER_LINE.treasury },
      { amountOf: (line: (typeof input.lines)[number]) => line.retainedAmount, fallback: retainedId, text: LEDGER_LINE.retained },
      { amountOf: (line: (typeof input.lines)[number]) => line.assistanceAmount, fallback: assistanceId, text: LEDGER_LINE.assistance },
      { amountOf: (line: (typeof input.lines)[number]) => line.loanAmount, fallback: loanId, text: LEDGER_LINE.loan },
    ];

    for (const line of input.lines) {
      await tx.insert(budgetNotificationItems).values(withTenant({
        notificationId,
        accountCodeId: line.accountCodeId,
        treasuryAmount: money(line.treasuryAmount),
        retainedRevenueAmount: money(line.retainedAmount),
        assistanceAmount: money(line.assistanceAmount),
        loanAmount: money(line.loanAmount),
      }, tenantId));
      for (const slot of slots) {
        const amount = slot.amountOf(line);
        if (amount <= 0) continue;
        await processLedgerCard(
          tx, tenantId, input.fiscalYear, input.publicBodyCodeId, input.programCodeId,
          input.subProgramCodeId, input.projectCodeId, input.subAgencyCodeId,
          line.accountCodeId, input.sourceCodeId ?? slot.fallback, input.budgetTypeId ?? slot.fallback,
          amount, input.letterRefNo, notificationId, userId, slot.text,
        );
        cardsOpened += 1;
      }
    }
    return { notificationId, cardsOpened };
  });
}

export async function listLedgerCards(
  tenantId: number,
  filters: { search: string; fiscalYear: string; budgetTypeId: number; sourceCodeId: number; programId: number },
) {
  const pb = alias(financeCodes, "pb");
  const program = alias(financeCodes, "program");
  const account = alias(financeCodes, "account");
  const budgetType = alias(financeCodes, "budget_type");
  const source = alias(financeCodes, "source");
  const initialBudget = sql<string>`COALESCE((SELECT t.approved_budget FROM mehi_16_1_transactions t WHERE t.card_id = ${mehi161Cards.cardId} AND t.tenant_id = ${tenantId} ORDER BY t.trans_id ASC LIMIT 1), 0)`;
  const totalExpenditure = sql<string>`COALESCE((SELECT SUM(t.expenditure) FROM mehi_16_1_transactions t WHERE t.card_id = ${mehi161Cards.cardId} AND t.tenant_id = ${tenantId}), 0)`;
  const currentBalance = sql<string>`COALESCE((SELECT t.balance FROM mehi_16_1_transactions t WHERE t.card_id = ${mehi161Cards.cardId} AND t.tenant_id = ${tenantId} ORDER BY t.trans_id DESC LIMIT 1), 0)`;
  const conditions: SQL[] = [eq(mehi161Cards.tenantId, tenantId)];
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    const search = or(
      like(account.codeNumber, pattern),
      like(account.codeNameAm, pattern),
      like(program.codeNameAm, pattern),
      like(pb.codeNameAm, pattern),
    );
    if (search) conditions.push(search);
  }
  if (filters.fiscalYear) conditions.push(eq(mehi161Cards.fiscalYear, filters.fiscalYear));
  if (filters.budgetTypeId) conditions.push(eq(mehi161Cards.budgetTypeId, filters.budgetTypeId));
  if (filters.sourceCodeId) conditions.push(eq(mehi161Cards.sourceCodeId, filters.sourceCodeId));
  if (filters.programId) conditions.push(eq(mehi161Cards.programCodeId, filters.programId));

  const rows = await db
    .select({
      id: mehi161Cards.cardId,
      fiscalYear: mehi161Cards.fiscalYear,
      pageNo: mehi161Cards.pageNo,
      accountCode: account.codeNumber,
      accountNameAm: account.codeNameAm,
      accountNameEn: account.codeNameEn,
      publicBodyNameAm: pb.codeNameAm,
      publicBodyNameEn: pb.codeNameEn,
      programNameAm: program.codeNameAm,
      programNameEn: program.codeNameEn,
      budgetTypeNameAm: budgetType.codeNameAm,
      budgetTypeNameEn: budgetType.codeNameEn,
      sourceNameAm: source.codeNameAm,
      sourceNameEn: source.codeNameEn,
      initialBudget,
      totalExpenditure,
      currentBalance,
    })
    .from(mehi161Cards)
    .leftJoin(pb, and(eq(mehi161Cards.publicBodyCodeId, pb.codeId), eq(pb.tenantId, tenantId)))
    .leftJoin(program, and(eq(mehi161Cards.programCodeId, program.codeId), eq(program.tenantId, tenantId)))
    .leftJoin(account, and(eq(mehi161Cards.accountCodeId, account.codeId), eq(account.tenantId, tenantId)))
    .leftJoin(budgetType, and(eq(mehi161Cards.budgetTypeId, budgetType.codeId), eq(budgetType.tenantId, tenantId)))
    .leftJoin(source, and(eq(mehi161Cards.sourceCodeId, source.codeId), eq(source.tenantId, tenantId)))
    .where(and(...conditions))
    .orderBy(desc(mehi161Cards.cardId));

  const cards = rows.map((row) => ({
    id: row.id,
    fiscalYear: row.fiscalYear,
    pageNo: row.pageNo,
    accountCode: row.accountCode ?? "",
    accountName: displayCodeName(row.accountNameAm, row.accountNameEn),
    publicBodyName: displayCodeName(row.publicBodyNameAm, row.publicBodyNameEn),
    programName: displayCodeName(row.programNameAm, row.programNameEn),
    budgetTypeName: displayCodeName(row.budgetTypeNameAm, row.budgetTypeNameEn),
    sourceName: displayCodeName(row.sourceNameAm, row.sourceNameEn),
    initialBudget: num(row.initialBudget),
    totalExpenditure: num(row.totalExpenditure),
    currentBalance: num(row.currentBalance),
  }));
  return {
    cards,
    totals: {
      cards: cards.length,
      approved: cards.reduce((sum, card) => sum + card.initialBudget, 0),
      expenditure: cards.reduce((sum, card) => sum + card.totalExpenditure, 0),
      balance: cards.reduce((sum, card) => sum + card.currentBalance, 0),
    },
  };
}

export async function deleteLedgerCard(tenantId: number, cardId: number) {
  const [card] = await db
    .select({ id: mehi161Cards.cardId })
    .from(mehi161Cards)
    .where(scoped(mehi161Cards, tenantId, eq(mehi161Cards.cardId, cardId)))
    .limit(1);
  if (!card) throw new FinanceError("CARD_NOT_FOUND");
  const [spent] = await db
    .select({ id: mehi161Transactions.transId })
    .from(mehi161Transactions)
    .where(and(
      eq(mehi161Transactions.tenantId, tenantId),
      eq(mehi161Transactions.cardId, cardId),
      sql`${mehi161Transactions.expenditure} > 0`,
    ))
    .limit(1);
  if (spent) throw new FinanceError("CARD_HAS_EXPENDITURE");
  await db.transaction(async (tx) => {
    await tx.delete(mehi161Transactions).where(scoped(mehi161Transactions, tenantId, eq(mehi161Transactions.cardId, cardId)));
    await tx.delete(mehi161Cards).where(scoped(mehi161Cards, tenantId, eq(mehi161Cards.cardId, cardId)));
  });
}

function codePair(
  code: string | null,
  nameAm: string | null,
  nameEn: string | null = null,
): { code: string; name: string } {
  return { code: code ?? "", name: displayCodeName(nameAm, nameEn) };
}

export async function ledgerCardDetail(tenantId: number, requestedId: number | null) {
  let cardId = requestedId ?? 0;
  if (cardId <= 0) {
    const [latest] = await db
      .select({ id: mehi161Cards.cardId })
      .from(mehi161Cards)
      .where(scoped(mehi161Cards, tenantId))
      .orderBy(desc(mehi161Cards.cardId))
      .limit(1);
    if (!latest) throw new FinanceError("NO_CARD");
    cardId = latest.id;
  }
  const pb = alias(financeCodes, "pb");
  const program = alias(financeCodes, "program");
  const subProgram = alias(financeCodes, "sub_program");
  const subAgency = alias(financeCodes, "sub_agency");
  const project = alias(financeCodes, "project");
  const account = alias(financeCodes, "account");
  const budgetType = alias(financeCodes, "budget_type");
  const source = alias(financeCodes, "source");
  const joinCode = (column: AnyMySqlColumn, table: CodeAlias) =>
    codeJoin(column, table, tenantId);
  const [card] = await db
    .select({
      id: mehi161Cards.cardId,
      fiscalYear: mehi161Cards.fiscalYear,
      pageNo: mehi161Cards.pageNo,
      publicBodyCode: pb.codeNumber,
      publicBodyNameAm: pb.codeNameAm,
      publicBodyNameEn: pb.codeNameEn,
      programCode: program.codeNumber,
      programNameAm: program.codeNameAm,
      programNameEn: program.codeNameEn,
      subProgramCode: subProgram.codeNumber,
      subProgramNameAm: subProgram.codeNameAm,
      subProgramNameEn: subProgram.codeNameEn,
      subAgencyCode: subAgency.codeNumber,
      subAgencyNameAm: subAgency.codeNameAm,
      subAgencyNameEn: subAgency.codeNameEn,
      projectCode: project.codeNumber,
      projectNameAm: project.codeNameAm,
      projectNameEn: project.codeNameEn,
      accountCode: account.codeNumber,
      accountNameAm: account.codeNameAm,
      accountNameEn: account.codeNameEn,
      budgetTypeCode: budgetType.codeNumber,
      budgetTypeNameAm: budgetType.codeNameAm,
      budgetTypeNameEn: budgetType.codeNameEn,
      sourceCode: source.codeNumber,
      sourceNameAm: source.codeNameAm,
      sourceNameEn: source.codeNameEn,
    })
    .from(mehi161Cards)
    .leftJoin(pb, joinCode(mehi161Cards.publicBodyCodeId, pb))
    .leftJoin(program, joinCode(mehi161Cards.programCodeId, program))
    .leftJoin(subProgram, joinCode(mehi161Cards.subProgramCodeId, subProgram))
    .leftJoin(subAgency, joinCode(mehi161Cards.subAgencyCodeId, subAgency))
    .leftJoin(project, joinCode(mehi161Cards.projectCodeId, project))
    .leftJoin(account, joinCode(mehi161Cards.accountCodeId, account))
    .leftJoin(budgetType, joinCode(mehi161Cards.budgetTypeId, budgetType))
    .leftJoin(source, joinCode(mehi161Cards.sourceCodeId, source))
    .where(scoped(mehi161Cards, tenantId, eq(mehi161Cards.cardId, cardId)))
    .limit(1);
  if (!card) throw new FinanceError("CARD_NOT_FOUND");
  const lines = await db
    .select()
    .from(mehi161Transactions)
    .where(scoped(mehi161Transactions, tenantId, eq(mehi161Transactions.cardId, cardId)))
    .orderBy(asc(mehi161Transactions.transId));
  return {
    card: {
      id: card.id,
      fiscalYear: card.fiscalYear,
      pageNo: card.pageNo,
      publicBody: codePair(card.publicBodyCode, card.publicBodyNameAm, card.publicBodyNameEn),
      program: codePair(card.programCode, card.programNameAm, card.programNameEn),
      subProgram: codePair(card.subProgramCode, card.subProgramNameAm, card.subProgramNameEn),
      subAgency: codePair(card.subAgencyCode, card.subAgencyNameAm, card.subAgencyNameEn),
      project: codePair(card.projectCode, card.projectNameAm, card.projectNameEn),
      account: codePair(card.accountCode, card.accountNameAm, card.accountNameEn),
      budgetType: codePair(card.budgetTypeCode, card.budgetTypeNameAm, card.budgetTypeNameEn),
      source: codePair(card.sourceCode, card.sourceNameAm, card.sourceNameEn),
    },
    lines: lines.map((line) => ({
      id: line.transId,
      date: line.transDate,
      description: line.description,
      refNo: line.refNo,
      approved: num(line.approvedBudget),
      addition: num(line.additionToBudget),
      reduction: num(line.reductionFromBudget),
      adjusted: num(line.adjustedBudget),
      committed: num(line.commitments),
      expenditure: num(line.expenditure),
      balance: num(line.balance),
    })),
  };
}

async function latestM17Balance(tx: Tx | typeof db, tenantId: number, cardId: number): Promise<number> {
  const [row] = await tx
    .select({ balance: mehi17Transactions.balance })
    .from(mehi17Transactions)
    .where(scoped(mehi17Transactions, tenantId, eq(mehi17Transactions.cardId, cardId)))
    .orderBy(desc(mehi17Transactions.transId))
    .limit(1);
  return num(row?.balance);
}

async function listMehi17Cards(tenantId: number, fiscalYear?: string) {
  const conditions: SQL[] = [eq(mehi17Cards.tenantId, tenantId)];
  if (fiscalYear) conditions.push(eq(mehi17Cards.fiscalYear, fiscalYear));
  const pb = alias(financeCodes, "m17_pb");
  const program = alias(financeCodes, "m17_program");
  const source = alias(financeCodes, "m17_source");
  const account = alias(financeCodes, "m17_account");
  const budgetType = alias(financeCodes, "m17_budget");
  const balance = sql<string>`COALESCE((SELECT t.balance FROM mehi_17_transactions t WHERE t.card_id = ${mehi17Cards.cardId} AND t.tenant_id = ${tenantId} ORDER BY t.trans_id DESC LIMIT 1), 0)`;
  const rows = await db
    .select({
      id: mehi17Cards.cardId,
      fiscalYear: mehi17Cards.fiscalYear,
      bankAccountNo: mehi17Cards.bankAccountNo,
      accountName: mehi17Cards.accountName,
      accountType: mehi17Cards.accountType,
      sourceCodeId: mehi17Cards.sourceCodeId,
      budgetTypeId: mehi17Cards.budgetTypeId,
      publicBodyName: pb.codeNameAm,
      programName: program.codeNameAm,
      sourceCode: source.codeNumber,
      sourceName: source.codeNameAm,
      accountCode: account.codeNumber,
      budgetTypeName: budgetType.codeNameAm,
      balance,
    })
    .from(mehi17Cards)
    .leftJoin(pb, and(eq(mehi17Cards.publicBodyCodeId, pb.codeId), eq(pb.tenantId, tenantId)))
    .leftJoin(program, and(eq(mehi17Cards.programCodeId, program.codeId), eq(program.tenantId, tenantId)))
    .leftJoin(source, and(eq(mehi17Cards.sourceCodeId, source.codeId), eq(source.tenantId, tenantId)))
    .leftJoin(account, and(eq(mehi17Cards.accountCodeId, account.codeId), eq(account.tenantId, tenantId)))
    .leftJoin(budgetType, and(eq(mehi17Cards.budgetTypeId, budgetType.codeId), eq(budgetType.tenantId, tenantId)))
    .where(and(...conditions))
    .orderBy(desc(mehi17Cards.cardId));
  return rows.map((row) => ({
    id: row.id,
    fiscalYear: row.fiscalYear,
    bankAccountNo: row.bankAccountNo,
    accountName: row.accountName ?? "",
    accountType: row.accountType ?? "",
    sourceCodeId: row.sourceCodeId,
    budgetTypeId: row.budgetTypeId,
    publicBodyName: row.publicBodyName ?? "",
    programName: row.programName ?? "",
    sourceCode: row.sourceCode ?? "",
    sourceName: row.sourceName ?? "",
    accountCode: row.accountCode ?? "",
    budgetTypeName: row.budgetTypeName ?? "",
    balance: num(row.balance),
  }));
}

export async function mehi17Board(tenantId: number, selectedId: number | null) {
  const cards = await listMehi17Cards(tenantId);
  const cardId = selectedId ?? cards[0]?.id ?? null;
  if (!cardId) return { cards, card: null, lines: [] };
  const detail = await mehi17Detail(tenantId, cardId);
  return { cards, ...detail };
}

export async function mehi17Detail(tenantId: number, cardId: number) {
  const pb = alias(financeCodes, "d_pb");
  const subAgency = alias(financeCodes, "d_sa");
  const program = alias(financeCodes, "d_pr");
  const subProgram = alias(financeCodes, "d_sp");
  const project = alias(financeCodes, "d_proj");
  const source = alias(financeCodes, "d_src");
  const budgetType = alias(financeCodes, "d_bt");
  const account = alias(financeCodes, "d_acc");
  const joinCode = (column: AnyMySqlColumn, table: CodeAlias) =>
    codeJoin(column, table, tenantId);
  const [card] = await db
    .select({
      id: mehi17Cards.cardId,
      fiscalYear: mehi17Cards.fiscalYear,
      bankAccountNo: mehi17Cards.bankAccountNo,
      accountName: mehi17Cards.accountName,
      accountType: mehi17Cards.accountType,
      publicBodyCode: pb.codeNumber,
      publicBodyName: pb.codeNameAm,
      subAgencyCode: subAgency.codeNumber,
      subAgencyName: subAgency.codeNameAm,
      programCode: program.codeNumber,
      programName: program.codeNameAm,
      subProgramCode: subProgram.codeNumber,
      subProgramName: subProgram.codeNameAm,
      projectCode: project.codeNumber,
      projectName: project.codeNameAm,
      sourceCode: source.codeNumber,
      sourceName: source.codeNameAm,
      budgetTypeName: budgetType.codeNameAm,
      accountCode: account.codeNumber,
    })
    .from(mehi17Cards)
    .leftJoin(pb, joinCode(mehi17Cards.publicBodyCodeId, pb))
    .leftJoin(subAgency, joinCode(mehi17Cards.subAgencyCodeId, subAgency))
    .leftJoin(program, joinCode(mehi17Cards.programCodeId, program))
    .leftJoin(subProgram, joinCode(mehi17Cards.subProgramCodeId, subProgram))
    .leftJoin(project, joinCode(mehi17Cards.projectCodeId, project))
    .leftJoin(source, joinCode(mehi17Cards.sourceCodeId, source))
    .leftJoin(budgetType, joinCode(mehi17Cards.budgetTypeId, budgetType))
    .leftJoin(account, joinCode(mehi17Cards.accountCodeId, account))
    .where(scoped(mehi17Cards, tenantId, eq(mehi17Cards.cardId, cardId)))
    .limit(1);
  if (!card) throw new FinanceError("CARD_NOT_FOUND");
  const lines = await db
    .select()
    .from(mehi17Transactions)
    .where(scoped(mehi17Transactions, tenantId, eq(mehi17Transactions.cardId, cardId)))
    .orderBy(asc(mehi17Transactions.transId));
  return {
    card: {
      id: card.id,
      fiscalYear: card.fiscalYear,
      bankAccountNo: card.bankAccountNo,
      accountName: card.accountName ?? "",
      accountType: card.accountType ?? "",
      publicBody: codePair(card.publicBodyCode, card.publicBodyName),
      subAgency: codePair(card.subAgencyCode, card.subAgencyName),
      program: codePair(card.programCode, card.programName),
      subProgram: codePair(card.subProgramCode, card.subProgramName),
      project: codePair(card.projectCode, card.projectName),
      source: codePair(card.sourceCode, card.sourceName),
      budgetTypeName: card.budgetTypeName ?? "",
      accountCode: card.accountCode ?? "",
    },
    lines: lines.map((line) => ({
      id: line.transId,
      registerMonth: line.registerMonth,
      registerDay: line.registerDate.slice(8, 10),
      registerPage: line.registerPage ?? "",
      registerItemNo: line.registerItemNo ?? "",
      docDate: line.docDate,
      description: line.description,
      debit: num(line.debitAmount),
      credit: num(line.creditAmount),
      balance: num(line.balance),
    })),
  };
}

export async function openMehi17(
  tenantId: number,
  userId: number,
  input: {
    fiscalYear: string;
    publicBodyCodeId: number;
    subAgencyCodeId: NullableId;
    programCodeId: number;
    subProgramCodeId: NullableId;
    projectCodeId: NullableId;
    sourceCodeId: number;
    budgetTypeId: number;
    accountCodeId: NullableId;
    accountName: string;
    bankAccountNo: string;
    openingBalance: number;
    description: string;
    registerMonth: string;
  },
) {
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: mehi17Cards.cardId })
        .from(mehi17Cards)
        .where(and(
          eq(mehi17Cards.tenantId, tenantId),
          eq(mehi17Cards.fiscalYear, input.fiscalYear),
          eq(mehi17Cards.bankAccountNo, input.bankAccountNo),
          eq(mehi17Cards.budgetTypeId, input.budgetTypeId),
        ))
        .limit(1);
      if (existing) throw new FinanceError("DUPLICATE_MEHI17");
      const accountType = input.bankAccountNo.trim().toUpperCase() === "CASH-BOX" ? "Cash" : "Bank";
      const inserted = await tx.insert(mehi17Cards).values(withTenant({
        fiscalYear: input.fiscalYear,
        publicBodyCodeId: input.publicBodyCodeId,
        subAgencyCodeId: input.subAgencyCodeId,
        programCodeId: input.programCodeId,
        subProgramCodeId: input.subProgramCodeId,
        projectCodeId: input.projectCodeId,
        sourceCodeId: input.sourceCodeId,
        bankAccountNo: input.bankAccountNo,
        budgetTypeId: input.budgetTypeId,
        accountCodeId: input.accountCodeId,
        accountName: input.accountName || null,
        accountType,
        createdBy: userId,
      }, tenantId));
      const cardId = Number(inserted[0].insertId);
      const today = schoolDate();
      await tx.insert(mehi17Transactions).values(withTenant({
        cardId,
        registerMonth: input.registerMonth,
        registerDate: today,
        docDate: today,
        description: input.description,
        refNo: "INIT-001",
        refType: "Transfer",
        debitAmount: money(input.openingBalance),
        creditAmount: money(0),
        balance: money(input.openingBalance),
        createdBy: userId,
      }, tenantId));
      return { id: cardId };
    });
  } catch (error) {
    if (error instanceof FinanceError) throw error;
    if (isDuplicate(error)) throw new FinanceError("DUPLICATE_MEHI17");
    throw error;
  }
}

export async function findMehi17(tenantId: number, fiscalYear: string, sourceCodeId: number, accountType: "Bank" | "Cash") {
  const [card] = await db
    .select({ id: mehi17Cards.cardId })
    .from(mehi17Cards)
    .where(and(
      eq(mehi17Cards.tenantId, tenantId),
      eq(mehi17Cards.fiscalYear, fiscalYear),
      eq(mehi17Cards.sourceCodeId, sourceCodeId),
      eq(mehi17Cards.accountType, accountType),
    ))
    .limit(1);
  if (!card) return { found: false as const };
  const detail = await mehi17Detail(tenantId, card.id);
  return { found: true as const, ...detail };
}

export async function accountBudgetHint(tenantId: number, accountId: number) {
  const fiscalYear = await fiscalYearOf(tenantId);
  const [card] = await db
    .select({
      cardId: mehi161Cards.cardId,
      budgetTypeId: mehi161Cards.budgetTypeId,
      sourceCodeId: mehi161Cards.sourceCodeId,
    })
    .from(mehi161Cards)
    .where(and(
      eq(mehi161Cards.tenantId, tenantId),
      eq(mehi161Cards.fiscalYear, fiscalYear),
      eq(mehi161Cards.accountCodeId, accountId),
    ))
    .orderBy(desc(mehi161Cards.cardId))
    .limit(1);
  if (!card) return { cardId: null, budgetTypeId: null, sourceCodeId: null, currentBalance: 0 };
  const latest = await latestM16Balance(db, tenantId, card.cardId);
  return {
    cardId: card.cardId,
    budgetTypeId: card.budgetTypeId,
    sourceCodeId: card.sourceCodeId,
    currentBalance: latest?.balance ?? 0,
  };
}

export async function m16Balance(tenantId: number, accountId: number, sourceId: number, budgetTypeId: number) {
  const fiscalYear = await fiscalYearOf(tenantId);
  const [card] = await db
    .select({ cardId: mehi161Cards.cardId })
    .from(mehi161Cards)
    .where(and(
      eq(mehi161Cards.tenantId, tenantId),
      eq(mehi161Cards.fiscalYear, fiscalYear),
      eq(mehi161Cards.accountCodeId, accountId),
      eq(mehi161Cards.sourceCodeId, sourceId),
      eq(mehi161Cards.budgetTypeId, budgetTypeId),
    ))
    .limit(1);
  if (!card) return { cardId: 0, currentBalance: 0 };
  const latest = await latestM16Balance(db, tenantId, card.cardId);
  return { cardId: card.cardId, currentBalance: latest?.balance ?? 0 };
}

export async function saveMehi7(
  tenantId: number,
  userId: number,
  input: {
    serialNo: string;
    voucherDate: string;
    payeeName: string;
    modeOfPayment: string;
    checkNo: string;
    purpose: string;
    publicBodyCodeId: number;
    programCodeId: number;
    lines: Array<{
      entryType: "debit" | "credit";
      accountCodeId: NullableId;
      budgetCategoryId: NullableId;
      budgetSourceId: NullableId;
      m17CardId: NullableId;
      debitAmount: number;
      creditAmount: number;
    }>;
  },
) {
  if (input.lines.length === 0) throw new FinanceError("MISSING_LINE");
  const fiscalYear = await fiscalYearOf(tenantId);
  return db.transaction(async (tx) => {
    const voucher = await tx.insert(mehi7Vouchers).values(withTenant({
      serialNo: input.serialNo,
      voucherDate: input.voucherDate,
      fiscalYear,
      publicBodyCodeId: input.publicBodyCodeId,
      programCodeId: input.programCodeId,
      payeeName: input.payeeName,
      modeOfPayment: input.modeOfPayment,
      checkNo: input.checkNo || null,
      purpose: input.purpose,
      totalAmount: money(input.lines.reduce((sum, line) => sum + line.debitAmount, 0)),
      createdBy: userId,
    }, tenantId));
    const voucherId = Number(voucher[0].insertId);

    for (const line of input.lines) {
      if (line.entryType === "debit" && line.debitAmount > 0) {
        if (!line.accountCodeId || !line.budgetSourceId || !line.budgetCategoryId) {
          throw new FinanceError("MISSING_CODES");
        }
        const [card] = await tx
          .select({ cardId: mehi161Cards.cardId })
          .from(mehi161Cards)
          .where(and(
            eq(mehi161Cards.tenantId, tenantId),
            eq(mehi161Cards.fiscalYear, fiscalYear),
            eq(mehi161Cards.accountCodeId, line.accountCodeId),
            eq(mehi161Cards.sourceCodeId, line.budgetSourceId),
            eq(mehi161Cards.budgetTypeId, line.budgetCategoryId),
          ))
          .limit(1);
        if (!card) throw new FinanceError("NO_M16_CARD");
        const latest = await latestM16Balance(tx, tenantId, card.cardId);
        const current = latest?.balance ?? 0;
        if (line.debitAmount > current) {
          throw new FinanceError("INSUFFICIENT_BUDGET", { balance: current, requested: line.debitAmount });
        }
        await tx.insert(mehi7Items).values(withTenant({
          voucherId,
          m16CardId: card.cardId,
          budgetCategoryId: line.budgetCategoryId,
          budgetSourceId: line.budgetSourceId,
          accountCodeId: line.accountCodeId,
          debitAmount: money(line.debitAmount),
          creditAmount: money(0),
        }, tenantId));
        const nextBalance = current - line.debitAmount;
        await tx.insert(mehi161Transactions).values(withTenant({
          cardId: card.cardId,
          notificationId: null,
          transDate: input.voucherDate,
          description: input.purpose,
          refNo: input.serialNo,
          approvedBudget: money(0),
          additionToBudget: money(0),
          reductionFromBudget: money(0),
          adjustedBudget: money(latest?.adjusted ?? 0),
          commitments: money(0),
          expenditure: money(line.debitAmount),
          balance: money(nextBalance),
        }, tenantId));
      }
      if (line.entryType === "credit" && line.creditAmount > 0) {
        if (!line.m17CardId) throw new FinanceError("NO_M17_CARD");
        const [owned] = await tx
          .select({ id: mehi17Cards.cardId })
          .from(mehi17Cards)
          .where(scoped(mehi17Cards, tenantId, eq(mehi17Cards.cardId, line.m17CardId)))
          .limit(1);
        if (!owned) throw new FinanceError("NO_M17_CARD");
        const current = await latestM17Balance(tx, tenantId, line.m17CardId);
        if (line.creditAmount > current) {
          throw new FinanceError("INSUFFICIENT_CASH", { balance: current, requested: line.creditAmount });
        }
        await tx.insert(mehi7Items).values(withTenant({
          voucherId,
          m17CardId: line.m17CardId,
          budgetCategoryId: line.budgetCategoryId,
          budgetSourceId: line.budgetSourceId,
          accountCodeId: null,
          debitAmount: money(0),
          creditAmount: money(line.creditAmount),
        }, tenantId));
        await tx.insert(mehi17Transactions).values(withTenant({
          cardId: line.m17CardId,
          registerMonth: englishMonth(input.voucherDate),
          registerDate: schoolDate(),
          docDate: input.voucherDate,
          description: input.purpose,
          refNo: input.serialNo,
          refType: "Mehi_7",
          debitAmount: money(0),
          creditAmount: money(line.creditAmount),
          balance: money(current - line.creditAmount),
          createdBy: userId,
        }, tenantId));
      }
    }
    return { id: voucherId };
  });
}
