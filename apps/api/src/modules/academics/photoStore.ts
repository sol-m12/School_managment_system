import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 5 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(readonly code: "PHOTO_TYPE" | "PHOTO_SIZE" | "NOT_FOUND") {
    super(code);
  }
}

type Kind = { ext: "jpg" | "png" | "gif" | "webp"; mime: string };

function kindOf(bytes: Buffer): Kind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: "png", mime: "image/png" };
  }
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF89a") return { ext: "gif", mime: "image/gif" };
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF87a") return { ext: "gif", mime: "image/gif" };
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export function photoDir(): string {
  return path.resolve(process.cwd(), "uploads", "profiles");
}

export async function savePhoto(bytes: Buffer): Promise<string> {
  if (bytes.length > MAX_BYTES) throw new PhotoError("PHOTO_SIZE");
  const kind = kindOf(bytes);
  if (!kind) throw new PhotoError("PHOTO_TYPE");
  const name = `${randomBytes(16).toString("hex")}.${kind.ext}`;
  const dir = photoDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return name;
}

export async function removePhoto(fileName: string | null | undefined): Promise<void> {
  if (!fileName || fileName === "default_profile.png") return;
  const base = path.basename(fileName);
  if (base !== fileName) return;
  await unlink(path.join(photoDir(), base)).catch(() => undefined);
}

export async function readPhoto(fileName: string): Promise<{ bytes: Buffer; mime: string }> {
  const base = path.basename(fileName);
  if (!base || base !== fileName || base === "default_profile.png") throw new PhotoError("NOT_FOUND");
  const bytes = await readFile(path.join(photoDir(), base)).catch(() => null);
  if (!bytes) throw new PhotoError("NOT_FOUND");
  const kind = kindOf(bytes);
  if (!kind) throw new PhotoError("NOT_FOUND");
  return { bytes, mime: kind.mime };
}
