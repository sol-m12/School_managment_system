// Mirror of apps/api/src/lib/roles.ts. Keep both lists in the same order.
export const ROLES = [
  "Teacher",
  "Admin",
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
