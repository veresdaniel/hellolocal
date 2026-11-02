import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/** Prefix for AES-256-GCM payloads stored in AppSetting (at-rest encryption). */
export const SECRET_BOX_PREFIX = "enc:v1:";

function keyMaterial(): Buffer {
  const secret =
    process.env.APP_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "dev-insecure-secret-box-key");
  if (!secret) {
    throw new Error("APP_SECRET or JWT_SECRET is required to encrypt secrets at rest");
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypt a secret for AppSetting storage. Empty input stays empty. Idempotent for already-boxed values. */
export function encryptSecret(plaintext: string): string {
  const value = plaintext ?? "";
  if (!value) return "";
  if (value.startsWith(SECRET_BOX_PREFIX)) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return SECRET_BOX_PREFIX + Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

/** Decrypt a boxed secret; plain legacy values pass through unchanged. */
export function decryptSecret(stored: string): string {
  const value = stored ?? "";
  if (!value) return "";
  if (!value.startsWith(SECRET_BOX_PREFIX)) return value;

  const raw = Buffer.from(value.slice(SECRET_BOX_PREFIX.length), "base64url");
  if (raw.length < 28) {
    throw new Error("Invalid encrypted secret payload");
  }
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(SECRET_BOX_PREFIX));
}
