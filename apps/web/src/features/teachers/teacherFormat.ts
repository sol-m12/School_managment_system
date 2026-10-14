import type { TeacherRow } from "./api/useTeachers";

const moneyFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Same as PHP number_format($value, 2). */
export function formatMoney(value: number): string {
  return moneyFormat.format(value);
}

/** Experience is stored as decimal(4,2), the legacy page prints it as is (for example 29.00). */
export function formatYears(value: number): string {
  return value.toFixed(2);
}

export function initialOf(name: string): string {
  const letter = name.trim().charAt(0);
  return letter ? letter.toUpperCase() : "";
}

export function fullName(row: Pick<TeacherRow, "firstName" | "lastName">): string {
  return `${row.firstName} ${row.lastName}`;
}
