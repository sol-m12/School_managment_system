import { describe, expect, it } from "vitest";
import {
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
} from "./libraryRules.js";

describe("library rules", () => {
  it("keeps a loan for 14 days and counts free copies", () => {
    expect(addDays("2018-01-10", 14)).toBe("2018-01-24");
    expect(copiesFree(3, 2)).toBe(1);
    expect(copiesFree(1, 4)).toBe(0);
  });

  it("refuses a loan when the shelf is empty, the book is already out, or another book is overdue", () => {
    expect(checkoutBlock(0, false, false)).toBe("NONE_LEFT");
    expect(checkoutBlock(1, true, false)).toBe("ALREADY_OUT");
    expect(checkoutBlock(1, false, true)).toBe("OVERDUE");
    expect(checkoutBlock(1, false, false)).toBeNull();
  });

  it("reserves only when every copy is out", () => {
    expect(reserveBlock(1, false)).toBe("COPIES_FREE");
    expect(reserveBlock(0, true)).toBe("ALREADY_RESERVED");
    expect(reserveBlock(0, false)).toBeNull();
  });

  it("writes a reminder on the due day and after it", () => {
    expect(reminderKind("2018-02-01", "2018-01-31")).toBeNull();
    expect(reminderKind("2018-02-01", "2018-02-01")).toBe("due");
    expect(reminderKind("2018-02-01", "2018-02-02")).toBe("overdue");
  });

  it("blocks clearance, intake, and the door", () => {
    expect(clearanceBlock(1)).toBe("BOOKS_OUT");
    expect(clearanceBlock(0)).toBeNull();
    expect(intakeBlock(2, 3)).toBe("INSUFFICIENT_STOCK");
    expect(intakeBlock(2, 2)).toBeNull();
    expect(entryBlock(null, "Out")).toBe("NOT_INSIDE");
    expect(entryBlock("In", "In")).toBe("ALREADY_INSIDE");
    expect(entryBlock("In", "Out")).toBeNull();
  });

  it("reads the student card and awards the same ranks the student desk uses", () => {
    expect(patronCode(1, 12)).toBe("KEYT-1-12");
    expect(readPatronCode("KEYT-1-12")).toEqual({ tenantId: 1, studentId: 12 });
    expect(readPatronCode("student")).toBeNull();
    expect(ranksFor(19)).toEqual([]);
    expect(ranksFor(20)).toEqual(["member"]);
    expect(ranksFor(50)).toEqual(["member", "scholar"]);
  });

  it("suggests a teacher title first, then a weak subject, then the grade", () => {
    const books = [
      { id: 1, title: "Algebra", subjectId: 4, gradeLevel: 9 },
      { id: 2, title: "Poems", subjectId: 8, gradeLevel: 9 },
      { id: 3, title: "Maps", subjectId: 3, gradeLevel: 10 },
    ];
    expect(suggestBooks(books, [4], 9, ["Poems"])).toEqual([
      { id: 2, reason: "teacher" },
      { id: 1, reason: "weak" },
    ]);
  });
});
