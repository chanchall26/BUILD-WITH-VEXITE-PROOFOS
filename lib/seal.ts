/**
 * Sealed state.
 *
 * Some things have to travel with the candidate's browser and must not be
 * readable there. The calibration answer key is the clear case: the client
 * needs to hand it back when the answers are submitted, but a candidate who
 * can read it can score full marks by inspecting a network response.
 *
 * Sealing solves it without a database. The server encrypts the value with
 * AES-256-GCM under a key derived from PROOFOS_SECRET, hands over the
 * ciphertext, and unseals it on the way back. The client holds a value it
 * cannot read and cannot alter without the tag failing.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { secret } from "./config";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION = "s1";

function encryptionKey(): Buffer {
  // Domain-separated from the signing key, which is derived from the same
  // secret. Reusing one key for both would let a signature oracle bear on
  // encryption, and vice versa.
  return createHash("sha256").update(`proofos:seal:${secret()}`).digest();
}

export function seal(value: unknown): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), body.toString("base64url"), tag.toString("base64url")].join(
    ".",
  );
}

export function unseal<T>(sealed: string): T | null {
  try {
    const [version, iv, body, tag] = sealed.split(".");
    if (version !== VERSION || !iv || !body || !tag) return null;
    const decipher = createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(body, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plain) as T;
  } catch {
    // A wrong key, a truncated value or a tampered payload all land here.
    return null;
  }
}
