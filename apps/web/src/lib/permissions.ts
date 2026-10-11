// Mirror of the keys in apps/api/src/lib/permissions.ts. The API is the real guard;
// the web app only hides what the user cannot use.
export const PERMISSIONS = ["subjects.read", "subjects.create", "subjects.update", "subjects.delete"] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function can(permissions: readonly Permission[], permission: Permission): boolean {
  return permissions.includes(permission);
}
