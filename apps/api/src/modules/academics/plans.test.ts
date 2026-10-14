import { describe, expect, it } from "vitest";
import { planAutoAssign } from "./assignPlan.js";
import { planEqual, planMerit, snakeIndex } from "./placementPlan.js";
import { buildPeriodClocks, heatBand, solveSchedule } from "./schedulePlan.js";

const seat = (id: number, section: string, capacity: number, current = 0) => ({
  id,
  gradeLevel: 9,
  stream: null,
  section,
  maxCapacity: capacity,
  currentCount: current,
});

describe("section placement", () => {
  it("fills the first section completely under merit", () => {
    const placed = planMerit(
      [seat(1, "A", 2), seat(2, "B", 2)],
      [
        { id: 1, fullName: "A", gender: "M", avgMark: 90, totalScore: 1 },
        { id: 2, fullName: "B", gender: "F", avgMark: 80, totalScore: 1 },
        { id: 3, fullName: "C", gender: "M", avgMark: 70, totalScore: 1 },
      ],
    );
    expect(placed.placed.map((item) => [item.studentId, item.sectionId])).toEqual([
      [1, 1],
      [2, 1],
      [3, 2],
    ]);
    expect(placed.left).toBe(0);
  });

  it("snakes males then females for equal placement", () => {
    expect([0, 1, 2, 3, 4, 5].map((index) => snakeIndex(index, 3))).toEqual([0, 1, 2, 2, 1, 0]);
    const placed = planEqual(
      [seat(1, "A", 2), seat(2, "B", 2), seat(3, "C", 2)],
      [1, 2, 3, 4, 5, 6].map((id) => ({
        id,
        fullName: String(id),
        gender: id <= 3 ? ("M" as const) : ("F" as const),
        avgMark: 100 - id,
        totalScore: 100 - id,
      })),
    );
    const sectionOf = (id: number) => placed.placed.find((item) => item.studentId === id)?.sectionId;
    expect(sectionOf(1)).toBe(1);
    expect(sectionOf(6)).toBe(1);
    expect(sectionOf(2)).toBe(2);
    expect(sectionOf(5)).toBe(2);
    expect(sectionOf(3)).toBe(3);
    expect(sectionOf(4)).toBe(3);
  });
});

describe("teacher assignment", () => {
  it("gives the base share to the more experienced teacher and the remainder to the least experienced", () => {
    const senior = { id: 1, experience: 10, load: 0 };
    const junior = { id: 2, experience: 1, load: 0 };
    const blocks = [
      { subjectId: 1, gradeLevel: 9, section: "A", creditHours: 4 },
      { subjectId: 1, gradeLevel: 9, section: "B", creditHours: 4 },
      { subjectId: 1, gradeLevel: 9, section: "C", creditHours: 4 },
    ];
    const placed = planAutoAssign([{ teachers: [senior, junior], blocks }]);
    expect(placed.filter((item) => item.staffId === 1)).toHaveLength(1);
    expect(placed.filter((item) => item.staffId === 2)).toHaveLength(2);
    expect(senior.load).toBe(4);
    expect(junior.load).toBe(8);
  });
});

describe("timetable", () => {
  it("inserts the break after the middle period", () => {
    const clocks = buildPeriodClocks(2, "08:00", 40);
    expect(clocks[0]).toEqual({ period: 1, start: "08:00:00", end: "08:40:00" });
    expect(clocks[1]?.start).toBe("08:55:00");
  });

  it("places two credits on different days", () => {
    const solved = solveSchedule(
      [
        {
          assignmentId: 1,
          classId: 1,
          subjectId: 1,
          staffId: 1,
          credits: 2,
          maxPerDay: 1,
          teacherName: "Abebe",
          classLabel: "9A",
        },
      ],
      2,
      2000,
    );
    expect(Array.isArray(solved)).toBe(true);
    if (!Array.isArray(solved)) return;
    expect(solved).toHaveLength(2);
    expect(new Set(solved.map((lesson) => lesson.day)).size).toBe(2);
  });

  it("colors a full day red and a light day green", () => {
    expect(heatBand([1, 1, 2, 0, 0])).toBe("green");
    expect(heatBand([4, 1, 0, 0, 0])).toBe("yellow");
    expect(heatBand([5, 0, 0, 0, 0])).toBe("red");
  });
});
