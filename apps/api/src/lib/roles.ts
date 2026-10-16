// Same values and order as the users.role enum in the database.
export const ROLES = [
  "Teacher",
  "Technician",
  "Secretary",
  "Counselor",
  "Finance",
  "V_Principal",
  "Registrar",
  "Librarian",
  "Store_Keeper",
  "Student",
  "Principal",
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
