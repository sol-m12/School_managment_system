import { describe, expect, it } from "vitest";
import { blankSection, cleanName, parseFormText, parseReady, readStudentCode, renewBlock, studentCode } from "./secretaryRules.js";

describe("secretaryRules", () => {
  it("cleans names and blank sections", () => {
    expect(cleanName("  አበበ   ተስፋየ  ")).toBe("አበበ ተስፋየ");
    expect(blankSection("  ")).toBeNull();
    expect(blankSection("A")).toBe("A");
  });

  it("reads student codes", () => {
    expect(studentCode(1, 42)).toBe("KEYT-1-42");
    expect(readStudentCode("KEYT-1-42")).toEqual({ tenantId: 1, studentId: 42 });
    expect(readStudentCode("42")).toEqual({ tenantId: 0, studentId: 42 });
    expect(readStudentCode("bad")).toBeNull();
  });

  it("blocks same or earlier renewal years", () => {
    expect(renewBlock("2017", "2017")).toBe("SAME_YEAR");
    expect(renewBlock("2017", "2016")).toBe("YEAR_BACK");
    expect(renewBlock("2017", "2018")).toBeNull();
  });

  it("parses labeled form text without a model", () => {
    const form = parseFormText(`Full Name: Abebe Tesfaye
Gender: M
Age: 15
Grade: 9
Registration Type: አዲስ
Kebele: 05`);
    expect(form.fullName).toBe("Abebe Tesfaye");
    expect(form.gender).toBe("M");
    expect(form.age).toBe(15);
    expect(form.gradeLevel).toBe(9);
    expect(form.registrationType).toBe("አዲስ");
    expect(form.kebele).toBe("05");
    expect(parseReady(form)).toBe(true);
  });
});
