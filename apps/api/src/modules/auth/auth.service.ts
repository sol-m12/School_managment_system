import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { tenants, users } from "../../db/schema/index.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import {
  dummyPasswordCompare,
  verifyPassword,
} from "../../lib/password.js";
import { isRole } from "../../lib/roles.js";
import { scoped } from "../../lib/tenant.js";

export class AuthError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "AuthError";
  }
}

export type AuthUserView = {
  id: number;
  username: string;
  role: string;
  tenantId: number;
  tenantName: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserView;
};

async function rejectCredentials(): Promise<never> {
  await dummyPasswordCompare("invalid");
  throw new AuthError("AUTH_INVALID_CREDENTIALS");
}

export async function loginWithPassword(input: {
  tenantSlug: string;
  username: string;
  password: string;
}): Promise<LoginResult> {
  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      status: tenants.status,
    })
    .from(tenants)
    .where(
      and(eq(tenants.slug, input.tenantSlug), eq(tenants.status, "active")),
    )
    .limit(1);

  if (!tenant) {
    return rejectCredentials();
  }

  const [user] = await db
    .select({
      userId: users.userId,
      username: users.username,
      passwordHash: users.passwordHash,
      role: users.role,
      tokenVersion: users.tokenVersion,
      isActive: users.isActive,
      tenantId: users.tenantId,
    })
    .from(users)
    .where(scoped(users, tenant.id, eq(users.username, input.username)))
    .limit(1);

  if (!user || user.isActive !== 1) {
    return rejectCredentials();
  }

  if (!isRole(user.role)) {
    return rejectCredentials();
  }

  const verified = await verifyPassword(input.password, user.passwordHash);
  if (!verified.ok) {
    throw new AuthError("AUTH_INVALID_CREDENTIALS");
  }

  if (verified.rehash) {
    await db
      .update(users)
      .set({ passwordHash: verified.rehash })
      .where(scoped(users, user.tenantId, eq(users.userId, user.userId)));
  }

  const accessToken = createAccessToken({
    userId: user.userId,
    tenantId: user.tenantId,
    role: user.role,
  });
  const refreshToken = createRefreshToken({
    userId: user.userId,
    tenantId: user.tenantId,
    tokenVersion: user.tokenVersion,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.userId,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: tenant.name,
    },
  };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthError("AUTH_UNAUTHORIZED");
  }

  const [user] = await db
    .select({
      userId: users.userId,
      role: users.role,
      tenantId: users.tenantId,
      tokenVersion: users.tokenVersion,
      isActive: users.isActive,
    })
    .from(users)
    .where(scoped(users, payload.tenantId, eq(users.userId, payload.userId)))
    .limit(1);

  if (
    !user ||
    user.isActive !== 1 ||
    user.tokenVersion !== payload.tokenVersion ||
    !isRole(user.role)
  ) {
    throw new AuthError("AUTH_UNAUTHORIZED");
  }

  const accessToken = createAccessToken({
    userId: user.userId,
    tenantId: user.tenantId,
    role: user.role,
  });

  return { accessToken };
}

export async function logoutUser(userId: number, tenantId: number): Promise<void> {
  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(scoped(users, tenantId, eq(users.userId, userId)));
}

export async function getMe(
  userId: number,
  tenantId: number,
): Promise<AuthUserView> {
  const [row] = await db
    .select({
      userId: users.userId,
      username: users.username,
      role: users.role,
      tenantId: users.tenantId,
      tenantName: tenants.name,
    })
    .from(users)
    .innerJoin(tenants, eq(tenants.id, users.tenantId))
    .where(scoped(users, tenantId, eq(users.userId, userId)))
    .limit(1);

  if (!row || !isRole(row.role)) {
    throw new AuthError("AUTH_UNAUTHORIZED");
  }

  return {
    id: row.userId,
    username: row.username,
    role: row.role,
    tenantId: row.tenantId,
    tenantName: row.tenantName,
  };
}
