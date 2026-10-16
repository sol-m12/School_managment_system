import { describe, expect, it } from "vitest";
import {
  chooseBlock,
  documentBlock,
  homeworkBlock,
  libraryPoints,
  libraryRank,
  placementBlock,
  programGradeBlock,
  studyPlan,
  vocationalBand,
} from "./deskRules.js";

describe("vocational curriculum bands", () => {
  it("follows the new curriculum by grade", () => {
    expect(vocationalBand(6)).toBe("none");
    expect(vocationalBand(8)).toBe("explore");
    expect(vocationalBand(10)).toBe("choose");
    expect(vocationalBand(12)).toBe("continue");
    expect(chooseBlock("explore", false, true)).toBe("EXPLORE_ONLY");
    expect(chooseBlock("choose", true, true)).toBe("ALREADY_CHOSEN");
    expect(chooseBlock("choose", false, true)).toBeNull();
  });

  it("places a grade 9 student only on that grade's curriculum trade", () => {
    expect(
      placementBlock({
        studentGrade: 9,
        programGrade: 10,
        trade: "Textile",
        curriculumNames: ["Textile"],
        currentSkill: null,
      }),
    ).toBe("WRONG_GRADE");
    expect(
      placementBlock({
        studentGrade: 12,
        programGrade: 12,
        trade: "Garment",
        curriculumNames: ["Garment", "ICT"],
        currentSkill: "ICT",
      }),
    ).toBe("CONTINUE_ONLY");
    expect(programGradeBlock(5)).toBe("GRADE_CLOSED");
    expect(programGradeBlock(9)).toBeNull();
  });
});

describe("student desk calculations", () => {
  it("scores library use and builds a study list from weak marks", () => {
    expect(libraryPoints(5, 4, 1)).toBe(45);
    expect(libraryRank(45)).toBe("member");
    expect(libraryRank(50)).toBe("scholar");
    expect(documentBlock(11, false)).toBe("GRADE_CLOSED");
    expect(documentBlock(12, true)).toBe("ALREADY_OPEN");
    expect(homeworkBlock("2018-04-01 08:00:00", "2018-04-02 09:00:00", false)).toBe("DEADLINE");
    expect(studyPlan([{ name: "Math", average: 40, absences: 0 }, { name: "English", average: 80, absences: 4 }])).toEqual([
      { subject: "Math", reason: "weak", minutes: 40 },
      { subject: "English", reason: "absent", minutes: 30 },
    ]);
  });
});
