import { describe, expect, it } from "vitest";
import {
  acceptAllowed,
  alumniAllowed,
  correctionAllowed,
  markSummary,
  nextQueue,
  parseImport,
  scoreAllowed,
  unlockAllowed,
} from "./recordsRules.js";

describe("record office rules", () => {
  it("accepts only a mark the department head has sent", () => {
    expect(acceptAllowed("Approved", "Sent")).toBe(true);
    expect(acceptAllowed("Approved", "Approved")).toBe(false);
    expect(acceptAllowed("Submitted", "Sent")).toBe(false);
    expect(acceptAllowed("Accepted", "Sent")).toBe(false);
  });

  it("walks the transcript queue one step at a time", () => {
    expect(nextQueue("Submitted")).toBe("Reviewing");
    expect(nextQueue("Reviewing")).toBe("Ready");
    expect(nextQueue("Ready")).toBe("Collected");
    expect(nextQueue("Collected")).toBeNull();
  });

  it("changes an accepted mark only with a principal grant", () => {
    expect(correctionAllowed({ gradeStatus: "Approved", override: "Granted" })).toBe("NOT_ACCEPTED");
    expect(correctionAllowed({ gradeStatus: "Accepted", override: "Pending" })).toBe("OVERRIDE_REQUIRED");
    expect(correctionAllowed({ gradeStatus: "Accepted", override: "Granted" })).toBeNull();
  });

  it("unlocks only a locked section that the principal has granted", () => {
    expect(unlockAllowed("none", "Granted")).toBe("NOT_FOUND");
    expect(unlockAllowed("Unlocked", "Granted")).toBe("NOT_FOUND");
    expect(unlockAllowed("Locked", "Pending")).toBe("OVERRIDE_REQUIRED");
    expect(unlockAllowed("Locked", "Granted")).toBeNull();
  });

  it("keeps alumni to grade 12 and reads csv, not excel or pdf", () => {
    expect(alumniAllowed(11, false)).toBe("NOT_GRADUATE");
    expect(alumniAllowed(12, true)).toBe("ALREADY_ALUMNI");
    expect(alumniAllowed(12, false)).toBeNull();
    expect(parseImport("excel", "a,b")).toBe("EXCEL_SAVE_AS_CSV");
    expect(parseImport("pdf", "%PDF")).toBe("PDF_FILE");
    expect(parseImport("csv", "fullName,gender\n")).toBe("IMPORT_EMPTY");
    const rows = parseImport("csv", "fullName,gender,age,gradeLevel,section,academicYear\nAbebe,M,18,12,A,2018");
    expect(rows).toEqual([
      { fullName: "Abebe", gender: "M", age: 18, gradeLevel: 12, section: "A", academicYear: "2018" },
    ]);
    expect(parseImport("structured", JSON.stringify(rows))).toEqual(rows);
    expect(scoreAllowed(101, 100)).toBe(false);
    expect(scoreAllowed(80, 100)).toBe(true);
    expect(markSummary([{ score: 50, maxScore: 100 }])).toBe("1 accepted, average 50");
  });
});
