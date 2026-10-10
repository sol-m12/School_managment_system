import { createHash, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";

const BCRYPT_COST = 12;

/** Valid bcrypt hash used only to keep login timing similar when the user is missing. */
const DUMMY_BCRYPT_HASH = bcrypt.hashSync("timing-dummy", 10);

const BCRYPT_PREFIX = /^\$2[aby]\$/;

export type PasswordVerifyResult =
  | { ok: false }
  | { ok: true; rehash?: string };

function isBcryptHash(stored: string): boolean {
  return BCRYPT_PREFIX.test(stored);
}

/** Node bcrypt accepts $2a$/$2b$; PHP stores $2y$ — same algorithm, normalize for compare. */
function normalizeBcryptHash(stored: string): string {
  if (stored.startsWith("$2y$")) {
    return `$2b$${stored.slice(4)}`;
  }
  return stored;
}

function bcryptCost(stored: string): number | null {
  const match = stored.match(/^\$2[aby]\$(\d{2})\$/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function isMd5Hex(stored: string): boolean {
  return /^[a-f0-9]{32}$/i.test(stored);
}

function isSha1Hex(stored: string): boolean {
  return /^[a-f0-9]{40}$/i.test(stored);
}

function digestHex(algorithm: "md5" | "sha1", plain: string): string {
  return createHash(algorithm).update(plain, "utf8").digest("hex");
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function dummyPasswordCompare(plain: string): Promise<void> {
  try {
    await bcrypt.compare(plain, DUMMY_BCRYPT_HASH);
  } catch {
    // Ignore compare failures; this is only for timing.
  }
}

/**
 * Verifies a password against a stored value.
 * Supports bcrypt ($2a$/$2b$/$2y$), MD5 hex, SHA1 hex, and plain text.
 * On success with a non-bcrypt or under-cost hash, returns a new bcrypt hash to persist.
 */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<PasswordVerifyResult> {
  if (!stored) {
    return { ok: false };
  }

  if (isBcryptHash(stored)) {
    const ok = await bcrypt.compare(plain, normalizeBcryptHash(stored));
    if (!ok) {
      return { ok: false };
    }
    const cost = bcryptCost(stored);
    if (cost === null || cost < BCRYPT_COST || stored.startsWith("$2y$")) {
      return { ok: true, rehash: await hashPassword(plain) };
    }
    return { ok: true };
  }

  if (isMd5Hex(stored)) {
    const ok = safeEqualString(digestHex("md5", plain).toLowerCase(), stored.toLowerCase());
    if (!ok) {
      return { ok: false };
    }
    return { ok: true, rehash: await hashPassword(plain) };
  }

  if (isSha1Hex(stored)) {
    const ok = safeEqualString(digestHex("sha1", plain).toLowerCase(), stored.toLowerCase());
    if (!ok) {
      return { ok: false };
    }
    return { ok: true, rehash: await hashPassword(plain) };
  }

  // Plain-text legacy storage
  const ok = safeEqualString(plain, stored);
  if (!ok) {
    return { ok: false };
  }
  return { ok: true, rehash: await hashPassword(plain) };
}
