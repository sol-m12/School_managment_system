import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "../../db/index.js";
import {
  binCardLedger,
  grades,
  items,
  lbBadges,
  lbIntake,
  lbLiteracy,
  lbPatronLog,
  lbReminders,
  lbReservations,
  lbResources,
  libraryAttendance,
  libraryBooks,
  libraryBorrowing,
  principalTransfers,
  staff,
  students,
  subjects,
  tcBookRecommendations,
  users,
} from "../../db/schema/index.js";
import { ER_DUP_ENTRY, mysqlErrno } from "../../lib/mysqlError.js";
import { scoped, withTenant } from "../../lib/tenant.js";
import { libraryPoints } from "../student/deskRules.js";
import {
  LOAN_DAYS,
  addDays,
  checkoutBlock,
  clearanceBlock,
  copiesFree,
  entryBlock,
  intakeBlock,
  patronCode,
  ranksFor,
  readPatronCode,
  reminderKind,
  reserveBlock,
  suggestBooks,
  type SuggestReason,
} from "./libraryRules.js";
import type { BookInput, CheckoutInput, IntakeInput, LiteracyInput, PatronInput, ResourceInput, ScanInput } from "./library.schema.js";

export type LibraryErrorCode =
  | "NOT_FOUND"
  | "NOT_READY"
  | "NONE_LEFT"
  | "ALREADY_OUT"
  | "OVERDUE"
  | "COPIES_FREE"
  | "ALREADY_RESERVED"
  | "NOT_INSIDE"
  | "ALREADY_INSIDE"
  | "ALREADY_FILED"
  | "ALREADY_REPORTED"
  | "BOOKS_OUT"
  | "DUPLICATE_CODE"
  | "INSUFFICIENT_STOCK";

export class LibraryError extends Error {
  constructor(readonly code: LibraryErrorCode) {
    super(code);
    this.name = "LibraryError";
  }
}

function schoolDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function insertId(result: unknown): number {
  if (!Array.isArray(result)) return 0;
  const header = result[0] as { insertId?: number } | undefined;
  return Number(header?.insertId ?? 0);
}

function num(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function money(value: number): string {
  return value.toFixed(2);
}

function likeTerm(value: string): string {
  return `%${value.replace(/[\\%_]/g, "")}%`;
}

type Person = { id: number; name: string; username: string; role: string; studentId: number | null; code: string };

async function people(tenantId: number): Promise<Person[]> {
  const accounts = await db
    .select({ id: users.userId, username: users.username, role: users.role })
    .from(users)
    .where(scoped(users, tenantId))
    .orderBy(asc(users.username));
  const learners = await db
    .select({ userId: students.userId, studentId: students.studentId, name: students.fullName })
    .from(students)
    .where(scoped(students, tenantId));
  const workers = await db
    .select({ userId: staff.userId, first: staff.firstName, last: staff.lastName })
    .from(staff)
    .where(scoped(staff, tenantId));
  const byUser = new Map<number, { name: string; studentId: number | null }>();
  for (const row of learners) {
    if (row.userId != null) byUser.set(row.userId, { name: row.name, studentId: row.studentId });
  }
  for (const row of workers) {
    if (row.userId != null && !byUser.has(row.userId)) {
      byUser.set(row.userId, { name: `${row.first} ${row.last}`.trim(), studentId: null });
    }
  }
  return accounts.map((row) => {
    const known = byUser.get(row.id);
    return {
      id: row.id,
      name: known?.name || row.username,
      username: row.username,
      role: row.role,
      studentId: known?.studentId ?? null,
      code: known?.studentId != null ? patronCode(tenantId, known.studentId) : row.username,
    };
  });
}

async function borrowedMap(tenantId: number): Promise<Map<number, number>> {
  const rows = await db
    .select({ bookId: libraryBorrowing.bookId, total: sql<number>`count(*)` })
    .from(libraryBorrowing)
    .where(scoped(libraryBorrowing, tenantId, eq(libraryBorrowing.status, "Borrowed")))
    .groupBy(libraryBorrowing.bookId);
  const map = new Map<number, number>();
  for (const row of rows) if (row.bookId != null) map.set(row.bookId, num(row.total));
  return map;
}

async function bookOf(tenantId: number, bookId: number) {
  const [row] = await db
    .select({
      id: libraryBooks.bookId,
      title: libraryBooks.bookName,
      author: libraryBooks.author,
      accession: libraryBooks.accessionNumber,
      quantity: libraryBooks.quantity,
      gradeLevel: libraryBooks.gradeLevel,
      subjectId: libraryBooks.subjectId,
    })
    .from(libraryBooks)
    .where(scoped(libraryBooks, tenantId, eq(libraryBooks.bookId, bookId)))
    .limit(1);
  if (!row) throw new LibraryError("NOT_FOUND");
  return row;
}

async function openLoansFor(tenantId: number, userId: number) {
  return db
    .select({
      id: libraryBorrowing.borrowId,
      bookId: libraryBorrowing.bookId,
      due: libraryBorrowing.returnDate,
    })
    .from(libraryBorrowing)
    .where(scoped(libraryBorrowing, tenantId, and(eq(libraryBorrowing.userId, userId), eq(libraryBorrowing.status, "Borrowed"))));
}

async function lend(tenantId: number, librarianId: number, bookId: number, userId: number) {
  const today = schoolDate();
  const book = await bookOf(tenantId, bookId);
  const [person] = await db
    .select({ id: users.userId })
    .from(users)
    .where(scoped(users, tenantId, eq(users.userId, userId)))
    .limit(1);
  if (!person) throw new LibraryError("NOT_FOUND");
  const loans = await openLoansFor(tenantId, userId);
  const free = copiesFree(book.quantity ?? 0, (await borrowedMap(tenantId)).get(book.id) ?? 0);
  const block = checkoutBlock(
    free,
    loans.some((row) => row.bookId === book.id),
    loans.some((row) => row.due != null && row.due < today),
  );
  if (block) throw new LibraryError(block);
  const id = insertId(
    await db.insert(libraryBorrowing).values(
      withTenant(
        {
          bookId: book.id,
          userId,
          borrowDate: today,
          returnDate: addDays(today, LOAN_DAYS),
          status: "Borrowed" as const,
          receiverStaffId: librarianId,
        },
        tenantId,
      ),
    ),
  );
  return { id, dueOn: addDays(today, LOAN_DAYS) };
}

export async function desk(tenantId: number) {
  const today = schoolDate();
  const [bookRows, loanRows, reservations, reminders] = await Promise.all([
    db.select({ id: libraryBooks.bookId }).from(libraryBooks).where(scoped(libraryBooks, tenantId)),
    db
      .select({ due: libraryBorrowing.returnDate })
      .from(libraryBorrowing)
      .where(scoped(libraryBorrowing, tenantId, eq(libraryBorrowing.status, "Borrowed"))),
    db
      .select({ id: lbReservations.reservationId })
      .from(lbReservations)
      .where(scoped(lbReservations, tenantId, inArray(lbReservations.status, ["Open", "Ready"]))),
    db
      .select({ id: lbReminders.reminderId })
      .from(lbReminders)
      .where(scoped(lbReminders, tenantId, eq(lbReminders.seen, 0))),
  ]);
  return {
    books: bookRows.length,
    borrowed: loanRows.length,
    overdue: loanRows.filter((row) => row.due != null && row.due < today).length,
    reservations: reservations.length,
    reminders: reminders.length,
  };
}

export async function catalog(tenantId: number, q: string) {
  const term = likeTerm(q);
  const text = q
    ? or(like(libraryBooks.bookName, term), like(libraryBooks.author, term), like(libraryBooks.accessionNumber, term))
    : undefined;
  const [rows, subjectRows, borrowed] = await Promise.all([
    db
      .select({
        id: libraryBooks.bookId,
        title: libraryBooks.bookName,
        author: libraryBooks.author,
        year: libraryBooks.publishedYear,
        pages: libraryBooks.pageCount,
        accession: libraryBooks.accessionNumber,
        gradeLevel: libraryBooks.gradeLevel,
        subjectId: libraryBooks.subjectId,
        quantity: libraryBooks.quantity,
        remarks: libraryBooks.remarks,
      })
      .from(libraryBooks)
      .where(scoped(libraryBooks, tenantId, text))
      .orderBy(asc(libraryBooks.bookName))
      .limit(200),
    db
      .select({ id: subjects.subjectId, name: subjects.subjectName, gradeLevel: subjects.gradeLevel })
      .from(subjects)
      .where(scoped(subjects, tenantId))
      .orderBy(asc(subjects.subjectName)),
    borrowedMap(tenantId),
  ]);
  return {
    subjects: subjectRows,
    rows: rows.map((row) => ({
      ...row,
      author: row.author ?? "",
      year: row.year ?? "",
      remarks: row.remarks ?? "",
      quantity: row.quantity ?? 0,
      free: copiesFree(row.quantity ?? 0, borrowed.get(row.id) ?? 0),
    })),
  };
}

export async function addBook(tenantId: number, input: BookInput) {
  if (input.subjectId) {
    const [subject] = await db
      .select({ id: subjects.subjectId })
      .from(subjects)
      .where(scoped(subjects, tenantId, eq(subjects.subjectId, input.subjectId)))
      .limit(1);
    if (!subject) throw new LibraryError("NOT_FOUND");
  }
  try {
    const id = insertId(
      await db.insert(libraryBooks).values(
        withTenant(
          {
            bookName: input.bookName,
            author: input.author,
            publishedYear: input.publishedYear,
            pageCount: input.pageCount,
            accessionNumber: input.accessionNumber,
            gradeLevel: input.gradeLevel,
            subjectId: input.subjectId,
            quantity: input.quantity,
            entryDate: schoolDate(),
            remarks: input.remarks,
          },
          tenantId,
        ),
      ),
    );
    const qrSvg = await QRCode.toString(input.accessionNumber, { type: "svg", margin: 1, width: 160 });
    return { id, accession: input.accessionNumber, qrSvg };
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new LibraryError("DUPLICATE_CODE");
    throw error;
  }
}

export async function circulation(tenantId: number) {
  const today = schoolDate();
  const [loans, patrons, books, borrowed] = await Promise.all([
    db
      .select({
        id: libraryBorrowing.borrowId,
        bookId: libraryBorrowing.bookId,
        userId: libraryBorrowing.userId,
        title: libraryBooks.bookName,
        accession: libraryBooks.accessionNumber,
        borrowDate: libraryBorrowing.borrowDate,
        dueOn: libraryBorrowing.returnDate,
        status: libraryBorrowing.status,
      })
      .from(libraryBorrowing)
      .leftJoin(libraryBooks, and(eq(libraryBooks.bookId, libraryBorrowing.bookId), eq(libraryBooks.tenantId, tenantId)))
      .where(scoped(libraryBorrowing, tenantId))
      .orderBy(desc(libraryBorrowing.borrowId))
      .limit(200),
    people(tenantId),
    db
      .select({ id: libraryBooks.bookId, title: libraryBooks.bookName, accession: libraryBooks.accessionNumber, quantity: libraryBooks.quantity })
      .from(libraryBooks)
      .where(scoped(libraryBooks, tenantId))
      .orderBy(asc(libraryBooks.bookName)),
    borrowedMap(tenantId),
  ]);
  const names = new Map(patrons.map((row) => [row.id, row.name]));
  return {
    patrons,
    books: books.map((row) => ({
      id: row.id,
      title: row.title,
      accession: row.accession ?? "",
      free: copiesFree(row.quantity ?? 0, borrowed.get(row.id) ?? 0),
    })),
    rows: loans.map((row) => ({
      id: row.id,
      title: row.title ?? "",
      accession: row.accession ?? "",
      patron: row.userId != null ? (names.get(row.userId) ?? "") : "",
      borrowDate: row.borrowDate,
      dueOn: row.dueOn,
      status: row.status ?? "Borrowed",
      overdue: (row.status ?? "Borrowed") === "Borrowed" && row.dueOn != null && row.dueOn < today,
    })),
  };
}

export async function checkout(tenantId: number, librarianId: number, input: CheckoutInput) {
  return lend(tenantId, librarianId, input.bookId, input.userId);
}

export async function returnLoan(tenantId: number, borrowId: number) {
  const [row] = await db
    .select({ id: libraryBorrowing.borrowId, status: libraryBorrowing.status })
    .from(libraryBorrowing)
    .where(scoped(libraryBorrowing, tenantId, eq(libraryBorrowing.borrowId, borrowId)))
    .limit(1);
  if (!row || row.status !== "Borrowed") throw new LibraryError("NOT_READY");
  await db
    .update(libraryBorrowing)
    .set({ status: "Returned" })
    .where(scoped(libraryBorrowing, tenantId, eq(libraryBorrowing.borrowId, borrowId)));
  return { id: borrowId };
}

export async function intakeBoard(tenantId: number) {
  const [stock, rows] = await Promise.all([
    db
      .select({ id: items.itemId, code: items.itemCode, name: items.itemName, stock: items.currentStock })
      .from(items)
      .where(scoped(items, tenantId))
      .orderBy(asc(items.itemName)),
    db
      .select({
        id: lbIntake.intakeId,
        code: items.itemCode,
        name: items.itemName,
        copies: lbIntake.copies,
        createdAt: lbIntake.createdAt,
      })
      .from(lbIntake)
      .innerJoin(items, and(eq(items.itemId, lbIntake.itemId), eq(items.tenantId, tenantId)))
      .where(scoped(lbIntake, tenantId))
      .orderBy(desc(lbIntake.intakeId))
      .limit(100),
  ]);
  return {
    items: stock.map((row) => ({ id: row.id, code: row.code, name: row.name, stock: num(row.stock) })),
    rows,
  };
}

export async function takeIn(tenantId: number, userId: number, input: IntakeInput) {
  const [item] = await db
    .select({ id: items.itemId, code: items.itemCode, name: items.itemName, stock: items.currentStock })
    .from(items)
    .where(scoped(items, tenantId, eq(items.itemId, input.itemId)))
    .limit(1);
  if (!item) throw new LibraryError("NOT_FOUND");
  const stock = num(item.stock);
  const block = intakeBlock(stock, input.copies);
  if (block) throw new LibraryError(block);
  const today = schoolDate();
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: libraryBooks.bookId, quantity: libraryBooks.quantity })
      .from(libraryBooks)
      .where(scoped(libraryBooks, tenantId, eq(libraryBooks.accessionNumber, item.code)))
      .limit(1);
    const bookId = existing
      ? existing.id
      : insertId(
          await tx.insert(libraryBooks).values(
            withTenant(
              {
                bookName: item.name,
                author: "",
                accessionNumber: item.code,
                quantity: input.copies,
                entryDate: today,
                remarks: "",
              },
              tenantId,
            ),
          ),
        );
    if (existing) {
      await tx
        .update(libraryBooks)
        .set({ quantity: (existing.quantity ?? 0) + input.copies })
        .where(scoped(libraryBooks, tenantId, eq(libraryBooks.bookId, existing.id)));
    }
    await tx.insert(lbIntake).values(
      withTenant({ itemId: item.id, bookId, copies: input.copies, recordedBy: userId }, tenantId),
    );
    const balance = stock - input.copies;
    await tx.insert(binCardLedger).values(
      withTenant(
        {
          itemId: item.id,
          transactionDate: today,
          referenceDocument: "LIBRARY",
          receivedQty: "0.00",
          issuedQty: money(input.copies),
          balanceQty: money(balance),
          remark: "Library intake",
        },
        tenantId,
      ),
    );
    await tx
      .update(items)
      .set({ currentStock: money(balance) })
      .where(scoped(items, tenantId, eq(items.itemId, item.id)));
  });
  return { ok: true };
}

async function syncReminders(tenantId: number) {
  const today = schoolDate();
  const loans = await db
    .select({ id: libraryBorrowing.borrowId, userId: libraryBorrowing.userId, due: libraryBorrowing.returnDate })
    .from(libraryBorrowing)
    .where(scoped(libraryBorrowing, tenantId, eq(libraryBorrowing.status, "Borrowed")));
  const existing = await db
    .select({ borrowId: lbReminders.borrowId })
    .from(lbReminders)
    .where(scoped(lbReminders, tenantId));
  const seen = new Set(existing.map((row) => row.borrowId));
  for (const loan of loans) {
    const kind = reminderKind(loan.due, today);
    if (!kind || loan.userId == null || loan.due == null || seen.has(loan.id)) continue;
    try {
      await db.insert(lbReminders).values(
        withTenant({ borrowId: loan.id, userId: loan.userId, kind, dueOn: loan.due, seen: 0 }, tenantId),
      );
    } catch (error) {
      if (mysqlErrno(error) !== ER_DUP_ENTRY) throw error;
    }
  }
}

export async function reminders(tenantId: number) {
  await syncReminders(tenantId);
  const rows = await db
    .select({
      id: lbReminders.reminderId,
      kind: lbReminders.kind,
      dueOn: lbReminders.dueOn,
      title: libraryBooks.bookName,
      userId: lbReminders.userId,
    })
    .from(lbReminders)
    .innerJoin(libraryBorrowing, and(eq(libraryBorrowing.borrowId, lbReminders.borrowId), eq(libraryBorrowing.tenantId, tenantId)))
    .leftJoin(libraryBooks, and(eq(libraryBooks.bookId, libraryBorrowing.bookId), eq(libraryBooks.tenantId, tenantId)))
    .where(scoped(lbReminders, tenantId, eq(lbReminders.seen, 0)))
    .orderBy(asc(lbReminders.dueOn));
  const names = new Map((await people(tenantId)).map((row) => [row.id, row.name]));
  return {
    rows: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      dueOn: row.dueOn,
      title: row.title ?? "",
      patron: names.get(row.userId) ?? "",
    })),
  };
}

export async function seeReminder(tenantId: number, id: number) {
  const [row] = await db
    .select({ id: lbReminders.reminderId })
    .from(lbReminders)
    .where(scoped(lbReminders, tenantId, eq(lbReminders.reminderId, id)))
    .limit(1);
  if (!row) throw new LibraryError("NOT_FOUND");
  await db.update(lbReminders).set({ seen: 1 }).where(scoped(lbReminders, tenantId, eq(lbReminders.reminderId, id)));
  return { id };
}

export async function patrons(tenantId: number) {
  const [directory, logs] = await Promise.all([
    people(tenantId),
    db
      .select({
        id: lbPatronLog.logId,
        userId: lbPatronLog.userId,
        action: lbPatronLog.action,
        bookTitle: lbPatronLog.bookTitle,
        loggedOn: lbPatronLog.loggedOn,
      })
      .from(lbPatronLog)
      .where(scoped(lbPatronLog, tenantId))
      .orderBy(desc(lbPatronLog.logId))
      .limit(200),
  ]);
  const names = new Map(directory.map((row) => [row.id, row.name]));
  return {
    patrons: directory,
    rows: logs.map((row) => ({
      id: row.id,
      patron: names.get(row.userId) ?? "",
      action: row.action,
      bookTitle: row.bookTitle,
      loggedOn: row.loggedOn,
    })),
  };
}

export async function logPatron(tenantId: number, input: PatronInput) {
  const directory = await people(tenantId);
  const person = directory.find((row) => row.id === input.userId);
  if (!person) throw new LibraryError("NOT_FOUND");
  const [last] = await db
    .select({ action: lbPatronLog.action })
    .from(lbPatronLog)
    .where(scoped(lbPatronLog, tenantId, eq(lbPatronLog.userId, person.id)))
    .orderBy(desc(lbPatronLog.logId))
    .limit(1);
  const block = entryBlock(last?.action ?? null, input.action);
  if (block) throw new LibraryError(block);
  const today = schoolDate();
  if (input.action === "In" && person.studentId != null) {
    await db.insert(libraryAttendance).values(
      withTenant(
        { studentId: person.studentId, date: today, shift: "Regular" as const, bookTitle: input.bookTitle },
        tenantId,
      ),
    );
  }
  const id = insertId(
    await db.insert(lbPatronLog).values(
      withTenant(
        {
          userId: person.id,
          studentId: person.studentId,
          action: input.action,
          bookTitle: input.bookTitle,
          loggedOn: today,
        },
        tenantId,
      ),
    ),
  );
  return { id };
}

export async function resources(tenantId: number) {
  const [subjectRows, recommendations, rows] = await Promise.all([
    db
      .select({ id: subjects.subjectId, name: subjects.subjectName })
      .from(subjects)
      .where(scoped(subjects, tenantId))
      .orderBy(asc(subjects.subjectName)),
    db
      .select({
        id: tcBookRecommendations.recommendationId,
        title: tcBookRecommendations.title,
        reason: tcBookRecommendations.reason,
        subject: subjects.subjectName,
      })
      .from(tcBookRecommendations)
      .innerJoin(subjects, and(eq(subjects.subjectId, tcBookRecommendations.subjectId), eq(subjects.tenantId, tenantId)))
      .where(scoped(tcBookRecommendations, tenantId))
      .orderBy(desc(tcBookRecommendations.recommendationId)),
    db
      .select({
        id: lbResources.resourceId,
        title: lbResources.title,
        note: lbResources.note,
        subject: subjects.subjectName,
        recommendationId: lbResources.recommendationId,
      })
      .from(lbResources)
      .leftJoin(subjects, and(eq(subjects.subjectId, lbResources.subjectId), eq(subjects.tenantId, tenantId)))
      .where(scoped(lbResources, tenantId))
      .orderBy(asc(lbResources.title)),
  ]);
  const filed = new Set(rows.map((row) => row.recommendationId).filter((id): id is number => id != null));
  return {
    subjects: subjectRows,
    waiting: recommendations.filter((row) => !filed.has(row.id)),
    rows: rows.map((row) => ({ id: row.id, title: row.title, note: row.note, subject: row.subject ?? "" })),
  };
}

export async function addResource(tenantId: number, userId: number, input: ResourceInput) {
  let title = input.title;
  let note = input.note;
  let subjectId = input.subjectId;
  if (input.recommendationId) {
    const [row] = await db
      .select({
        title: tcBookRecommendations.title,
        reason: tcBookRecommendations.reason,
        subjectId: tcBookRecommendations.subjectId,
      })
      .from(tcBookRecommendations)
      .where(scoped(tcBookRecommendations, tenantId, eq(tcBookRecommendations.recommendationId, input.recommendationId)))
      .limit(1);
    if (!row) throw new LibraryError("NOT_FOUND");
    title = row.title;
    note = row.reason;
    subjectId = row.subjectId;
  }
  if (!title) throw new LibraryError("NOT_FOUND");
  if (subjectId) {
    const [subject] = await db
      .select({ id: subjects.subjectId })
      .from(subjects)
      .where(scoped(subjects, tenantId, eq(subjects.subjectId, subjectId)))
      .limit(1);
    if (!subject) throw new LibraryError("NOT_FOUND");
  }
  try {
    const id = insertId(
      await db.insert(lbResources).values(
        withTenant(
          { subjectId, title, note, recommendationId: input.recommendationId, recordedBy: userId },
          tenantId,
        ),
      ),
    );
    return { id };
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new LibraryError("ALREADY_FILED");
    throw error;
  }
}

export async function literacy(tenantId: number) {
  const [learnerRows, rows] = await Promise.all([
    db
      .select({
        id: students.studentId,
        name: students.fullName,
        gradeLevel: students.gradeLevel,
        section: students.section,
        year: students.academicYear,
      })
      .from(students)
      .where(scoped(students, tenantId))
      .orderBy(asc(students.fullName)),
    db
      .select({
        id: lbLiteracy.reportId,
        studentId: lbLiteracy.studentId,
        name: students.fullName,
        year: lbLiteracy.academicYear,
        visits: lbLiteracy.visits,
        returned: lbLiteracy.returnedCount,
        openLoans: lbLiteracy.openLoans,
        note: lbLiteracy.note,
      })
      .from(lbLiteracy)
      .innerJoin(students, and(eq(students.studentId, lbLiteracy.studentId), eq(students.tenantId, tenantId)))
      .where(scoped(lbLiteracy, tenantId))
      .orderBy(desc(lbLiteracy.reportId)),
  ]);
  return { students: learnerRows, rows };
}

export async function saveLiteracy(tenantId: number, userId: number, input: LiteracyInput) {
  const [student] = await db
    .select({ id: students.studentId, userId: students.userId, year: students.academicYear })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, input.studentId)))
    .limit(1);
  if (!student) throw new LibraryError("NOT_FOUND");
  const visits = await db
    .select({ id: libraryAttendance.attendanceId })
    .from(libraryAttendance)
    .where(scoped(libraryAttendance, tenantId, eq(libraryAttendance.studentId, student.id)));
  const loans = student.userId == null ? [] : await openLoansFor(tenantId, student.userId);
  const returned = student.userId == null
    ? []
    : await db
        .select({ id: libraryBorrowing.borrowId })
        .from(libraryBorrowing)
        .where(
          scoped(libraryBorrowing, tenantId, and(eq(libraryBorrowing.userId, student.userId), eq(libraryBorrowing.status, "Returned"))),
        );
  try {
    const id = insertId(
      await db.insert(lbLiteracy).values(
        withTenant(
          {
            studentId: student.id,
            academicYear: student.year,
            visits: visits.length,
            returnedCount: returned.length,
            openLoans: loans.length,
            note: input.note,
            recordedBy: userId,
          },
          tenantId,
        ),
      ),
    );
    return { id };
  } catch (error) {
    if (mysqlErrno(error) === ER_DUP_ENTRY) throw new LibraryError("ALREADY_REPORTED");
    throw error;
  }
}

export async function recommend(tenantId: number, studentId: number) {
  const [student] = await db
    .select({ id: students.studentId, name: students.fullName, gradeLevel: students.gradeLevel })
    .from(students)
    .where(scoped(students, tenantId, eq(students.studentId, studentId)))
    .limit(1);
  if (!student) throw new LibraryError("NOT_FOUND");
  const marks = await db
    .select({ subjectId: grades.subjectId, score: grades.score })
    .from(grades)
    .where(scoped(grades, tenantId, eq(grades.studentId, student.id)));
  const totals = new Map<number, { total: number; count: number }>();
  for (const mark of marks) {
    const current = totals.get(mark.subjectId) ?? { total: 0, count: 0 };
    current.total += num(mark.score);
    current.count += 1;
    totals.set(mark.subjectId, current);
  }
  const weak = [...totals.entries()].filter(([, row]) => row.count > 0 && row.total / row.count < 50).map(([id]) => id);
  const [bookRows, titleRows] = await Promise.all([
    db
      .select({
        id: libraryBooks.bookId,
        title: libraryBooks.bookName,
        subjectId: libraryBooks.subjectId,
        gradeLevel: libraryBooks.gradeLevel,
      })
      .from(libraryBooks)
      .where(scoped(libraryBooks, tenantId)),
    db
      .select({ title: tcBookRecommendations.title })
      .from(tcBookRecommendations)
      .where(scoped(tcBookRecommendations, tenantId)),
  ]);
  const picks = suggestBooks(bookRows, weak, student.gradeLevel, titleRows.map((row) => row.title));
  const byId = new Map(bookRows.map((row) => [row.id, row.title]));
  return {
    student: student.name,
    gradeLevel: student.gradeLevel,
    rows: picks.map((row) => ({ id: row.id, title: byId.get(row.id) ?? "", reason: row.reason as SuggestReason })),
  };
}

async function qr(code: string): Promise<string> {
  return QRCode.toString(code, { type: "svg", margin: 1, width: 180 });
}

export async function lookup(tenantId: number, code: string) {
  const parsed = readPatronCode(code);
  if (parsed) {
    if (parsed.tenantId !== tenantId) throw new LibraryError("NOT_FOUND");
    const [student] = await db
      .select({ id: students.studentId, userId: students.userId, name: students.fullName })
      .from(students)
      .where(scoped(students, tenantId, eq(students.studentId, parsed.studentId)))
      .limit(1);
    if (!student?.userId) throw new LibraryError("NOT_FOUND");
    return { kind: "patron" as const, id: student.userId, name: student.name, code: patronCode(tenantId, student.id), qrSvg: await qr(patronCode(tenantId, student.id)) };
  }
  const [book] = await db
    .select({ id: libraryBooks.bookId, title: libraryBooks.bookName, accession: libraryBooks.accessionNumber, quantity: libraryBooks.quantity })
    .from(libraryBooks)
    .where(scoped(libraryBooks, tenantId, eq(libraryBooks.accessionNumber, code.trim())))
    .limit(1);
  if (book?.accession) {
    const free = copiesFree(book.quantity ?? 0, (await borrowedMap(tenantId)).get(book.id) ?? 0);
    return { kind: "book" as const, id: book.id, title: book.title, code: book.accession, free, qrSvg: await qr(book.accession) };
  }
  const [account] = await db
    .select({ id: users.userId, username: users.username })
    .from(users)
    .where(scoped(users, tenantId, eq(users.username, code.trim())))
    .limit(1);
  if (!account) throw new LibraryError("NOT_FOUND");
  const person = (await people(tenantId)).find((row) => row.id === account.id);
  return { kind: "patron" as const, id: account.id, name: person?.name ?? account.username, code: account.username, qrSvg: await qr(account.username) };
}

export async function scanCheckout(tenantId: number, librarianId: number, input: ScanInput) {
  const book = await lookup(tenantId, input.bookCode);
  const patron = await lookup(tenantId, input.patronCode);
  if (book.kind !== "book" || patron.kind !== "patron") throw new LibraryError("NOT_FOUND");
  return lend(tenantId, librarianId, book.id, patron.id);
}

export async function reservations(tenantId: number) {
  const rows = await db
    .select({
      id: lbReservations.reservationId,
      bookId: lbReservations.bookId,
      userId: lbReservations.userId,
      title: libraryBooks.bookName,
      status: lbReservations.status,
      createdAt: lbReservations.createdAt,
    })
    .from(lbReservations)
    .innerJoin(libraryBooks, and(eq(libraryBooks.bookId, lbReservations.bookId), eq(libraryBooks.tenantId, tenantId)))
    .where(scoped(lbReservations, tenantId))
    .orderBy(desc(lbReservations.reservationId))
    .limit(200);
  const names = new Map((await people(tenantId)).map((row) => [row.id, row.name]));
  return {
    rows: rows.map((row) => ({
      id: row.id,
      title: row.title,
      patron: names.get(row.userId) ?? "",
      status: row.status,
      createdAt: row.createdAt,
    })),
  };
}

async function reservationOf(tenantId: number, id: number) {
  const [row] = await db
    .select({ id: lbReservations.reservationId, bookId: lbReservations.bookId, userId: lbReservations.userId, status: lbReservations.status })
    .from(lbReservations)
    .where(scoped(lbReservations, tenantId, eq(lbReservations.reservationId, id)))
    .limit(1);
  if (!row) throw new LibraryError("NOT_FOUND");
  return row;
}

export async function markReady(tenantId: number, id: number) {
  const row = await reservationOf(tenantId, id);
  if (row.status !== "Open") throw new LibraryError("NOT_READY");
  await db.update(lbReservations).set({ status: "Ready" }).where(scoped(lbReservations, tenantId, eq(lbReservations.reservationId, id)));
  return { id };
}

export async function collectReservation(tenantId: number, librarianId: number, id: number) {
  const row = await reservationOf(tenantId, id);
  if (row.status !== "Ready") throw new LibraryError("NOT_READY");
  const loan = await lend(tenantId, librarianId, row.bookId, row.userId);
  await db
    .update(lbReservations)
    .set({ status: "Collected" })
    .where(scoped(lbReservations, tenantId, eq(lbReservations.reservationId, id)));
  return loan;
}

export async function cancelReservation(tenantId: number, id: number) {
  const row = await reservationOf(tenantId, id);
  if (row.status !== "Open" && row.status !== "Ready") throw new LibraryError("NOT_READY");
  await db
    .update(lbReservations)
    .set({ status: "Cancelled" })
    .where(scoped(lbReservations, tenantId, eq(lbReservations.reservationId, id)));
  return { id };
}

export async function competition(tenantId: number) {
  const today = schoolDate();
  const learners = await db
    .select({ studentId: students.studentId, userId: students.userId, name: students.fullName, gradeLevel: students.gradeLevel })
    .from(students)
    .where(scoped(students, tenantId));
  const visits = await db
    .select({ studentId: libraryAttendance.studentId, total: sql<number>`count(*)` })
    .from(libraryAttendance)
    .where(scoped(libraryAttendance, tenantId))
    .groupBy(libraryAttendance.studentId);
  const loans = await db
    .select({ userId: libraryBorrowing.userId, status: libraryBorrowing.status, due: libraryBorrowing.returnDate })
    .from(libraryBorrowing)
    .where(scoped(libraryBorrowing, tenantId));
  const visitMap = new Map<number, number>();
  for (const row of visits) if (row.studentId != null) visitMap.set(row.studentId, num(row.total));
  const rows = [];
  for (const learner of learners) {
    if (learner.userId == null) continue;
    const mine = loans.filter((row) => row.userId === learner.userId);
    const returned = mine.filter((row) => row.status === "Returned").length;
    const late = mine.filter((row) => row.status === "Borrowed" && row.due != null && row.due < today).length;
    const points = libraryPoints(visitMap.get(learner.studentId) ?? 0, returned, late);
    const earned = ranksFor(points);
    for (const rank of earned) {
      try {
        await db.insert(lbBadges).values(withTenant({ userId: learner.userId, rank, points }, tenantId));
      } catch (error) {
        if (mysqlErrno(error) !== ER_DUP_ENTRY) throw error;
      }
    }
    rows.push({ id: learner.studentId, name: learner.name, gradeLevel: learner.gradeLevel, points, ranks: earned });
  }
  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  return { rows };
}

export async function clearance(tenantId: number) {
  const rows = await db
    .select({
      id: principalTransfers.transferId,
      name: students.fullName,
      userId: students.userId,
      libraryClear: principalTransfers.libraryClear,
      status: principalTransfers.status,
    })
    .from(principalTransfers)
    .innerJoin(students, and(eq(students.studentId, principalTransfers.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(principalTransfers, tenantId, inArray(principalTransfers.status, ["Open", "Cleared"])))
    .orderBy(desc(principalTransfers.transferId));
  const result = [];
  for (const row of rows) {
    const openLoans = row.userId == null ? 0 : (await openLoansFor(tenantId, row.userId)).length;
    result.push({
      id: row.id,
      name: row.name,
      openLoans,
      blocked: clearanceBlock(openLoans) != null,
      libraryClear: row.libraryClear === 1,
      status: row.status,
    });
  }
  return { rows: result };
}

export async function applyClearance(tenantId: number, id: number) {
  const [row] = await db
    .select({ id: principalTransfers.transferId, userId: students.userId, status: principalTransfers.status })
    .from(principalTransfers)
    .innerJoin(students, and(eq(students.studentId, principalTransfers.studentId), eq(students.tenantId, tenantId)))
    .where(scoped(principalTransfers, tenantId, eq(principalTransfers.transferId, id)))
    .limit(1);
  if (!row || row.status === "Issued") throw new LibraryError("NOT_FOUND");
  const openLoans = row.userId == null ? 0 : (await openLoansFor(tenantId, row.userId)).length;
  const block = clearanceBlock(openLoans);
  await db
    .update(principalTransfers)
    .set({ libraryClear: block ? 0 : 1 })
    .where(scoped(principalTransfers, tenantId, eq(principalTransfers.transferId, id)));
  if (block) throw new LibraryError(block);
  return { libraryClear: true };
}

export async function opac(tenantId: number, userId: number, q: string) {
  const board = await catalog(tenantId, q);
  const mine = await db
    .select({ bookId: lbReservations.bookId, status: lbReservations.status })
    .from(lbReservations)
    .where(scoped(lbReservations, tenantId, and(eq(lbReservations.userId, userId), inArray(lbReservations.status, ["Open", "Ready"]))));
  const held = new Set(mine.map((row) => row.bookId));
  const shelf = await db
    .select({ id: lbResources.resourceId, title: lbResources.title, note: lbResources.note, subject: subjects.subjectName })
    .from(lbResources)
    .leftJoin(subjects, and(eq(subjects.subjectId, lbResources.subjectId), eq(subjects.tenantId, tenantId)))
    .where(scoped(lbResources, tenantId))
    .orderBy(asc(lbResources.title));
  return {
    rows: board.rows.map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      accession: row.accession ?? "",
      gradeLevel: row.gradeLevel,
      free: row.free,
      reserved: held.has(row.id),
    })),
    reservations: mine.length,
    resources: shelf.map((row) => ({ id: row.id, title: row.title, note: row.note, subject: row.subject ?? "" })),
  };
}

export async function reserve(tenantId: number, userId: number, bookId: number) {
  const book = await bookOf(tenantId, bookId);
  const free = copiesFree(book.quantity ?? 0, (await borrowedMap(tenantId)).get(book.id) ?? 0);
  const [open] = await db
    .select({ id: lbReservations.reservationId })
    .from(lbReservations)
    .where(
      scoped(
        lbReservations,
        tenantId,
        and(eq(lbReservations.bookId, book.id), eq(lbReservations.userId, userId), inArray(lbReservations.status, ["Open", "Ready"])),
      ),
    )
    .limit(1);
  const block = reserveBlock(free, Boolean(open));
  if (block) throw new LibraryError(block);
  const id = insertId(
    await db.insert(lbReservations).values(withTenant({ bookId: book.id, userId, status: "Open" as const }, tenantId)),
  );
  return { id };
}
