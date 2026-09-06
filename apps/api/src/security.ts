import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt.toString("base64")}:${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltValue, digestValue] = encoded.split(":");
  if (algorithm !== "scrypt" || !saltValue || !digestValue) return false;
  const expected = Buffer.from(digestValue, "base64");
  const actual = await scrypt(password, Buffer.from(saltValue, "base64"), expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function encryptionKey(secret: string) { return createHash("sha256").update(secret).digest(); }
export function encryptJson(value: unknown, secret: string): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}
export function decryptJson<T>(payload: Uint8Array, secret: string): T {
  const bytes = Buffer.from(payload);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8")) as T;
}
