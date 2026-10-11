import type { Role } from "./roles.js";

/**
 * Central permission map. Routes check permission keys, never role names.
 * Owner map and history: docs/roles-map.md (section 7).
 */
export const PERMISSIONS = [
  "subjects.read",
  "subjects.create",
  "subjects.update",
  "subjects.delete",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// TODO(end of Phase 1): remove "Admin". It is a TEMPORARY alias for the
// Principal so ported pages can be compared with the legacy system.
const ACADEMIC_SETUP: readonly Role[] = ["V_Principal", "Admin"];

// TODO(end of Phase 1): add "Principal" to subjects.read once the migration
// adds "Principal" to the users.role enum. It does not exist yet.
const GRANTS: Record<Permission, readonly Role[]> = {
  "subjects.read": ACADEMIC_SETUP,
  "subjects.create": ACADEMIC_SETUP,
  "subjects.update": ACADEMIC_SETUP,
  "subjects.delete": ACADEMIC_SETUP,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return GRANTS[permission].includes(role);
}

export function permissionsForRole(role: Role): Permission[] {
  return PERMISSIONS.filter((permission) => hasPermission(role, permission));
}
