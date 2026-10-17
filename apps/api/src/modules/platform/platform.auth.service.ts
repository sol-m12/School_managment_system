import { eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { platformUsers } from "../../db/schema/index.js";
import {
  createPlatformAccessToken,
  createPlatformRefreshToken,
  verifyPlatformRefreshToken,
} from "../../lib/jwt.js";
import {
  dummyPasswordCompare,
  verifyPassword,
} from "../../lib/password.js";

export class PlatformAuthError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "PlatformAuthError";
  }
}

export type PlatformUserView = {
  id: number;
  username: string;
  displayName: string;
};

export type PlatformLoginResult = {
  accessToken: string;
  refreshToken: string;
  user: PlatformUserView;
};

async function rejectCredentials(): Promise<never> {
  await dummyPasswordCompare("invalid");
  throw new PlatformAuthError("AUTH_INVALID_CREDENTIALS");
}

function addisStamp(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Africa/Addis_Ababa",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export async function platformLoginWithPassword(input: {
  username: string;
  password: string;
}): Promise<PlatformLoginResult> {
  const [user] = await db
    .select({
      id: platformUsers.id,
      username: platformUsers.username,
      passwordHash: platformUsers.passwordHash,
      displayName: platformUsers.displayName,
      tokenVersion: platformUsers.tokenVersion,
      isActive: platformUsers.isActive,
    })
    .from(platformUsers)
    .where(eq(platformUsers.username, input.username))
    .limit(1);

  if (!user) {
    return rejectCredentials();
  }

  if (user.isActive !== 1) {
    throw new PlatformAuthError("AUTH_INACTIVE");
  }

  const verified = await verifyPassword(input.password, user.passwordHash);
  if (!verified.ok) {
    throw new PlatformAuthError("AUTH_INVALID_CREDENTIALS");
  }

  await db
    .update(platformUsers)
    .set({
      lastSeen: addisStamp(),
      ...(verified.rehash ? { passwordHash: verified.rehash } : {}),
    })
    .where(eq(platformUsers.id, user.id));

  return {
    accessToken: createPlatformAccessToken({ userId: user.id }),
    refreshToken: createPlatformRefreshToken({
      userId: user.id,
      tokenVersion: user.tokenVersion,
    }),
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    },
  };
}

export async function platformRefreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string }> {
  let payload;
  try {
    payload = verifyPlatformRefreshToken(refreshToken);
  } catch {
    throw new PlatformAuthError("AUTH_UNAUTHORIZED");
  }

  const [user] = await db
    .select({
      id: platformUsers.id,
      tokenVersion: platformUsers.tokenVersion,
      isActive: platformUsers.isActive,
    })
    .from(platformUsers)
    .where(eq(platformUsers.id, payload.userId))
    .limit(1);

  if (!user || user.isActive !== 1 || user.tokenVersion !== payload.tokenVersion) {
    throw new PlatformAuthError("AUTH_UNAUTHORIZED");
  }

  return {
    accessToken: createPlatformAccessToken({ userId: user.id }),
  };
}

export async function platformLogout(userId: number): Promise<void> {
  await db
    .update(platformUsers)
    .set({ tokenVersion: sql`${platformUsers.tokenVersion} + 1` })
    .where(eq(platformUsers.id, userId));
}

export async function platformGetMe(userId: number): Promise<PlatformUserView> {
  const [row] = await db
    .select({
      id: platformUsers.id,
      username: platformUsers.username,
      displayName: platformUsers.displayName,
      isActive: platformUsers.isActive,
    })
    .from(platformUsers)
    .where(eq(platformUsers.id, userId))
    .limit(1);

  if (!row || row.isActive !== 1) {
    throw new PlatformAuthError("AUTH_UNAUTHORIZED");
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
  };
}
