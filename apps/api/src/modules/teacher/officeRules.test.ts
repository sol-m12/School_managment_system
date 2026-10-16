import { describe, expect, it } from "vitest";
import {
  coverBlocked,
  coveragePercent,
  evaluationTotal,
  pickQuestions,
  rangesOverlap,
  subjectInDepartment,
  swapBlocked,
  syncPlan,
  weekdayOf,
} from "./officeRules.js";

describe("teacher office rules", () => {
  it("maps a subject name to one department", () => {
    expect(subjectInDepartment("Mathematics", "Mathematics")).toBe(true);
    expect(subjectInDepartment("Social Science", "Natural Science")).toBe(false);
    expect(subjectInDepartment("Social Science", "Social Science")).toBe(true);
    expect(subjectInDepartment("ICT", "Vocational")).toBe(true);
    expect(subjectInDepartment("Seed Subject", "Mathematics")).toBe(false);
  });

  it("treats touching date ranges as overlap", () => {
    expect(rangesOverlap("2018-01-01", "2018-01-05", "2018-01-05", "2018-01-06")).toBe(true);
    expect(rangesOverlap("2018-01-01", "2018-01-05", "2018-01-06", "2018-01-08")).toBe(false);
  });

  it("blocks a swap that would double-book a teacher", () => {
    const left = { id: 1, day: "Friday", period: 1, teacherId: 10 };
    const right = { id: 2, day: "Friday", period: 2, teacherId: 20 };
    const others = [{ id: 3, day: "Friday", period: 2, teacherId: 10 }];
    expect(swapBlocked(left, right, others)).toBe(true);
    expect(swapBlocked(left, { id: 4, day: "Monday", period: 3, teacherId: 20 }, [])).toBe(false);
    expect(swapBlocked(left, left, [])).toBe(true);
  });

  it("allows a substitute only on the slot weekday when they are free", () => {
    const slot = { id: 1, day: "Monday", period: 1, teacherId: 10 };
    expect(coverBlocked(slot, 11, "2018-04-03", [], [])).toBe("WRONG_DAY");
    expect(weekdayOf("2018-04-02")).toBe("Monday");
    expect(coverBlocked(slot, 10, "2018-04-02", [], [])).toBe("SELF");
    expect(coverBlocked(slot, 11, "2018-04-02", [{ id: 8, day: "Monday", period: 1, teacherId: 11 }], [])).toBe("COVER_BUSY");
    expect(
      coverBlocked(slot, 11, "2018-04-02", [], [{ staffId: 11, date: "2018-04-02", day: "Monday", period: 1 }]),
    ).toBe("COVER_BUSY");
    expect(coverBlocked(slot, 11, "2018-04-02", [], [])).toBeNull();
  });

  it("fills a paper from questions that are not already on an open paper", () => {
    expect(pickQuestions([4, 1, 3, 2], new Set([2, 4]), 2)).toEqual([1, 3]);
    expect(pickQuestions([1, 2], new Set([1]), 2)).toBeNull();
    expect(pickQuestions([1], new Set(), 0)).toBeNull();
  });

  it("rounds coverage and refuses a score above its maximum", () => {
    expect(coveragePercent(0, 0)).toBe(0);
    expect(coveragePercent(3, 1)).toBe(33);
    expect(coveragePercent(2, 5)).toBe(100);
    expect(evaluationTotal({ planning: 20, delivery: 30, assessment: 25, punctuality: 15, care: 10 })).toEqual({
      total: 100,
      max: 100,
    });
    expect(evaluationTotal({ planning: 21, delivery: 0, assessment: 0, punctuality: 0, care: 0 })).toBeNull();
    expect(evaluationTotal({ planning: 10, delivery: 10 })).toBeNull();
  });

  it("keeps an approved attendance mark and replaces a pending one", () => {
    const plan = syncPlan(
      [
        { key: "1|2|2018-04-02", approval: "Approved" },
        { key: "3|2|2018-04-02", approval: "Pending" },
        { key: "4|2|2018-04-02", approval: "Rejected" },
      ],
      [
        { key: "1|2|2018-04-02", status: "A" },
        { key: "3|2|2018-04-02", status: "P" },
        { key: "4|2|2018-04-02", status: "T" },
        { key: "5|2|2018-04-02", status: "P" },
        { key: "5|2|2018-04-02", status: "A" },
      ],
    );
    expect(plan.conflicts.map((row) => row.key)).toEqual(["1|2|2018-04-02"]);
    expect(plan.apply).toEqual([
      { key: "3|2|2018-04-02", status: "P", exists: true },
      { key: "4|2|2018-04-02", status: "T", exists: true },
      { key: "5|2|2018-04-02", status: "A", exists: false },
    ]);
  });
});
