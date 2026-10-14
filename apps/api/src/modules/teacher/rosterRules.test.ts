import { describe, expect, it } from "vitest";
import { buildRosterRows, type GradeHit } from "./rosterRules.js";

const subjects = [{ id: 10, name: "Amharic" }];

function hit(studentId: number, semester: "1" | "2", score: number): [string, GradeHit] {
  return [`${studentId}:10:${semester}`, { score, recorded: true }];
}

describe("official roster rules", () => {
  it("ranks complete students and promotes or detains from the yearly average", () => {
    const grades = new Map<string, GradeHit>([
      hit(1, "1", 80),
      hit(1, "2", 60),
      hit(2, "1", 40),
      hit(2, "2", 40),
      hit(3, "1", 90),
    ]);
    const { students } = buildRosterRows(
      9,
      subjects,
      [
        { id: 1, fullName: "Abebe", gender: "M", age: 15, isTransfer: false, vocationalId: null },
        { id: 2, fullName: "Chaltu", gender: "F", age: 16, isTransfer: false, vocationalId: null },
        { id: 3, fullName: "Desta", gender: "M", age: null, isTransfer: false, vocationalId: null },
      ],
      grades,
      new Map(),
    );

    expect(students[0]).toMatchObject({
      remark: "Promoted",
      yearRemark: "Promoted",
      sem1: { total: "80", average: "80.0", rank: "2", marks: ["80.0"] },
      sem2: { total: "60", average: "60.0", rank: "1", marks: ["60.0"] },
      year: { total: "70", average: "70.0", rank: "1", marks: ["70.0"] },
    });
    expect(students[1]).toMatchObject({
      remark: "Detained",
      sem1: { rank: "3" },
      year: { rank: "2", average: "40.0" },
    });
    expect(students[2]).toMatchObject({
      sex: "M",
      age: "-",
      remark: "Pending",
      yearRemark: "Incomplete",
      sem1: { total: "90", rank: "1", incomplete: false },
      sem2: { total: "", marks: ["-"], incomplete: false },
      year: { total: "", marks: [""] },
    });
  });

  it("marks a missing subject with ! once any mark in that semester exists", () => {
    const grades = new Map<string, GradeHit>([["4:11:1", { score: 70, recorded: true }]]);
    const { students } = buildRosterRows(
      9,
      [
        { id: 10, name: "Amharic" },
        { id: 11, name: "English" },
      ],
      [{ id: 4, fullName: "Elias", gender: "M", age: 15, isTransfer: false, vocationalId: null }],
      grades,
      new Map(),
    );
    expect(students[0]?.sem1.marks).toEqual(["!", "70.0"]);
    expect(students[0]?.sem1.incomplete).toBe(true);
    expect(students[0]?.sem1.total).toBe("");
  });

  it("hides a transfer student's first-semester rank and still shows the total", () => {
    const grades = new Map<string, GradeHit>([hit(5, "1", 99), hit(5, "2", 99), hit(6, "1", 50), hit(6, "2", 50)]);
    const { students } = buildRosterRows(
      9,
      subjects,
      [
        { id: 5, fullName: "Transfer", gender: "F", age: 17, isTransfer: true, vocationalId: null },
        { id: 6, fullName: "Regular", gender: "M", age: 15, isTransfer: false, vocationalId: null },
      ],
      grades,
      new Map(),
    );
    expect(students[0]).toMatchObject({
      transfer: true,
      remark: "Promoted",
      sem1: { total: "99", rank: "" },
      sem2: { rank: "1" },
      year: { rank: "1" },
    });
    expect(students[1]?.year.rank).toBe("2");
  });

  it("detains a student with four failed subjects even when the average is high", () => {
    const gradeSubjects = [1, 2, 3, 4, 5].map((id) => ({ id, name: `S${id}` }));
    const grades = new Map<string, GradeHit>();
    for (const subject of gradeSubjects) {
      const score = subject.id === 5 ? 100 : 40;
      grades.set(`7:${subject.id}:1`, { score, recorded: true });
      grades.set(`7:${subject.id}:2`, { score, recorded: true });
    }
    const { showVocational, students } = buildRosterRows(
      10,
      gradeSubjects,
      [{ id: 7, fullName: "Fail", gender: "M", age: 16, isTransfer: false, vocationalId: null }],
      grades,
      new Map(),
    );
    expect(showVocational).toBe(false);
    expect(students[0]?.yearRemark).toBe("Detained");
  });
});
