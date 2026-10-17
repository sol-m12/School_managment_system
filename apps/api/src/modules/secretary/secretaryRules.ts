/** Secretary desk rules. OCR reads labeled lines. It is not a trained model. */

export type ParsedForm = {
  fullName: string;
  gender: "M" | "F" | null;
  age: number | null;
  gradeLevel: number | null;
  registrationType: "አዲስ" | "ነባር" | "አቋራጭ" | "ደጋሚ" | "መልሶ ቅበላ" | null;
  previousSchool: string;
  kebele: string;
  gote: string;
  houseNumber: string;
};

export function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function blankSection(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function studentCode(tenantId: number, studentId: number): string {
  return `KEYT-${tenantId}-${studentId}`;
}

export function readStudentCode(code: string): { tenantId: number; studentId: number } | null {
  const match = /^KEYT-(\d+)-(\d+)$/.exec(code.trim());
  if (match) return { tenantId: Number(match[1]), studentId: Number(match[2]) };
  const plain = Number(code.trim());
  if (Number.isInteger(plain) && plain > 0 && String(plain) === code.trim()) {
    return { tenantId: 0, studentId: plain };
  }
  return null;
}

export function renewBlock(currentYear: string, targetYear: string): "SAME_YEAR" | "YEAR_BACK" | null {
  if (currentYear === targetYear) return "SAME_YEAR";
  if (Number(targetYear) < Number(currentYear)) return "YEAR_BACK";
  return null;
}

function labelValue(text: string, labels: readonly string[]): string {
  for (const label of labels) {
    const pattern = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:：-]\\s*(.+)`, "i");
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].trim().split(/\n/)[0]!.trim();
  }
  return "";
}

function genderOf(raw: string): "M" | "F" | null {
  const value = raw.trim().toLowerCase();
  if (value === "m" || value === "male" || value === "ወንድ") return "M";
  if (value === "f" || value === "female" || value === "ሴት") return "F";
  return null;
}

function registrationOf(raw: string): ParsedForm["registrationType"] {
  const value = raw.trim();
  if (value === "አዲስ" || value.toLowerCase() === "new") return "አዲስ";
  if (value === "ነባር" || value.toLowerCase() === "returning") return "ነባር";
  if (value === "አቋራጭ") return "አቋራጭ";
  if (value === "ደጋሚ") return "ደጋሚ";
  if (value === "መልሶ ቅበላ") return "መልሶ ቅበላ";
  return null;
}

/** Reads labeled form text. It is not a trained model. */
export function parseFormText(raw: string): ParsedForm {
  const text = raw.replace(/\r/g, "");
  const ageRaw = labelValue(text, ["Age", "እድሜ"]);
  const gradeRaw = labelValue(text, ["Grade", "Grade Level", "ክፍል"]);
  const age = Number(ageRaw);
  const gradeLevel = Number(gradeRaw);
  return {
    fullName: cleanName(labelValue(text, ["Full Name", "Name", "ሙሉ ስም", "ስም"])),
    gender: genderOf(labelValue(text, ["Gender", "Sex", "ጾታ"])),
    age: Number.isInteger(age) && age > 0 ? age : null,
    gradeLevel: Number.isInteger(gradeLevel) && gradeLevel >= 9 && gradeLevel <= 12 ? gradeLevel : null,
    registrationType: registrationOf(labelValue(text, ["Registration Type", "Type", "የምዝገባ አይነት"])),
    previousSchool: cleanName(labelValue(text, ["Previous School", "ያለፈ ትምህርት ቤት"])),
    kebele: cleanName(labelValue(text, ["Kebele", "ቀበሌ"])),
    gote: cleanName(labelValue(text, ["Gote", "ጎተ"])),
    houseNumber: cleanName(labelValue(text, ["House Number", "House", "የቤት ቁጥር"])),
  };
}

export function parseReady(form: ParsedForm): boolean {
  return Boolean(form.fullName && form.gender && form.age && form.gradeLevel && form.registrationType);
}
