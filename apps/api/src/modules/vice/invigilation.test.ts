import { describe, expect, it } from "vitest";
import { planInvigilation, type ExamSlot } from "./invigilation.js";

const morning: ExamSlot = { id: 1, date: "2018-02-10", start: "08:00:00", end: "10:00:00", needed: 2 };
const overlap: ExamSlot = { id: 2, date: "2018-02-10", start: "09:00:00", end: "11:00:00", needed: 1 };
const later: ExamSlot = { id: 3, date: "2018-02-10", start: "11:00:00", end: "13:00:00", needed: 1 };

describe("planInvigilation", () => {
  it("names the first person lead and spreads the rest", () => {
    const plan = planInvigilation([morning], [4, 2, 9], []);
    expect(plan.planned).toEqual([
      { sessionId: 1, staffId: 2, duty: "lead" },
      { sessionId: 1, staffId: 4, duty: "assistant" },
    ]);
    expect(plan.gaps).toEqual([]);
  });

  it("does not place one teacher on two overlapping sessions", () => {
    const plan = planInvigilation([morning, overlap], [7], []);
    expect(plan.planned).toEqual([{ sessionId: 1, staffId: 7, duty: "lead" }]);
    expect(plan.gaps).toEqual([
      { sessionId: 1, missing: 1 },
      { sessionId: 2, missing: 1 },
    ]);
  });

  it("uses a teacher again after the first session ends", () => {
    const plan = planInvigilation([morning, later], [7], []);
    expect(plan.planned.map((row) => row.sessionId)).toEqual([1, 3]);
    expect(plan.gaps).toEqual([{ sessionId: 1, missing: 1 }]);
  });

  it("keeps the subject teacher out while another teacher is free", () => {
    const plan = planInvigilation([morning], [2, 4], [], [{ sessionId: 1, staffId: 2 }]);
    expect(plan.planned[0]).toEqual({ sessionId: 1, staffId: 4, duty: "lead" });
    expect(plan.planned.map((row) => row.staffId)).toEqual([4, 2]);
    expect(plan.gaps).toEqual([]);
  });

  it("keeps seats that are already filled and balances the new load", () => {
    const plan = planInvigilation(
      [morning, later],
      [1, 2],
      [{ sessionId: 1, staffId: 1, duty: "lead" }],
    );
    expect(plan.planned).toEqual([
      { sessionId: 1, staffId: 2, duty: "assistant" },
      { sessionId: 3, staffId: 1, duty: "lead" },
    ]);
    expect(plan.gaps).toEqual([]);
  });
});
