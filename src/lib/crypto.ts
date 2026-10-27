import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Derived from the auth secret, so there is one secret to manage. Rotating it makes saved keys unreadable.
function key(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("Missing env var BETTER_AUTH_SECRET. See .env.example.");
  return Buffer.from(hkdfSync("sha256", secret, "html-toolkit", "user-api-keys", 32));
}

/** AES-256-GCM; returns "iv.tag.ciphertext" in base64url. */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

export function decrypt(sealed: string): string {
  const [iv, tag, data] = sealed.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
