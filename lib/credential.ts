/**
 * The credential layer.
 *
 * A PROOFOS passport is a W3C Verifiable Credential 2.0, secured as a JWT
 * under vc-jose-cose, and issued in a selectively disclosable form so a
 * candidate hands an employer exactly the claims that employer needs.
 *
 * Three standards decisions are worth stating, because each is easy to get
 * subtly wrong:
 *
 *   1. No `vc` claim wrapper. Under vc-jose-cose the credential's own
 *      properties ARE the JWT payload. The nested `vc` object is a VC 1.1
 *      convention that the 2.0 JWT profile explicitly moved away from.
 *   2. Selective disclosure follows SD-JWT (RFC 9901). The `_sd` array of
 *      salted digests sits inside `credentialSubject`, the object whose
 *      members are being hidden, and disclosures travel after the JWT
 *      separated by `~`. Media type `application/vc+sd-jwt`.
 *   3. Verification enforces the two checks people skip: a disclosure MUST be
 *      a three-element array, and a digest MUST NOT appear twice. Both are
 *      MUST-level in RFC 9901 §7.1 and both are silent forgery vectors when
 *      omitted.
 *
 * Revocation is a bitstring status list a verifier can poll.
 */

import { createHash, randomBytes, createPrivateKey, createPublicKey } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { SignJWT, jwtVerify, exportJWK, decodeProtectedHeader, type JWK } from "jose";
import { issuerDid, origin, secret } from "./config";
import { DIMENSIONS, type Dimension, type Passport } from "./domain";

const ALG = "EdDSA";
const SD_ALG = "sha-256";
/** application/vc+sd-jwt — one of the six media types registered by vc-jose-cose. */
const MEDIA_TYPE = "vc+sd-jwt";
const KID = "proofos-1";
const STATUS_LIST_BITS = 131_072; // the specification's minimum list length

/** DER prefix for a PKCS#8-wrapped Ed25519 private key. */
const PKCS8_ED25519 = Buffer.from("302e020100300506032b657004220420", "hex");

let keys: {
  priv: ReturnType<typeof createPrivateKey>;
  pub: ReturnType<typeof createPublicKey>;
} | null = null;

/**
 * The signing key is derived from PROOFOS_SECRET, so a deployment always
 * issues under one key and credentials keep verifying across restarts and
 * across serverless instances that never share memory.
 */
function keyPair() {
  if (keys) return keys;
  const seed = createHash("sha256").update(secret()).digest();
  const priv = createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519, seed]),
    format: "der",
    type: "pkcs8",
  });
  keys = { priv, pub: createPublicKey(priv) };
  return keys;
}

export async function publicJwk(): Promise<JWK> {
  const jwk = await exportJWK(keyPair().pub);
  return { ...jwk, alg: ALG, use: "sig", kid: KID };
}

/** The did:web document that lets anyone resolve and trust this issuer. */
export async function didDocument() {
  const did = issuerDid();
  const jwk = await publicJwk();
  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/jws-2020/v1",
    ],
    id: did,
    verificationMethod: [
      { id: `${did}#${KID}`, type: "JsonWebKey2020", controller: did, publicKeyJwk: jwk },
    ],
    assertionMethod: [`${did}#${KID}`],
    authentication: [`${did}#${KID}`],
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function evidenceDigest(value: unknown): string {
  return sha256(JSON.stringify(value)).slice(0, 32);
}

// ---------------------------------------------------------------- disclosure

/**
 * One selectively disclosable claim: a base64url JSON array of
 * [salt, claimName, claimValue]. The credential commits only to the SHA-256 of
 * that string, so the claim stays hidden until the holder chooses to hand over
 * the disclosure itself.
 */
export interface Disclosure {
  name: string;
  encoded: string;
  digest: string;
}

function makeDisclosure(name: string, value: unknown): Disclosure {
  const salt = randomBytes(16).toString("base64url");
  const encoded = Buffer.from(JSON.stringify([salt, name, value]), "utf8").toString("base64url");
  return { name, encoded, digest: sha256(encoded) };
}

type ReadResult =
  | { ok: true; name: string; value: unknown }
  | { ok: false; reason: string };

/**
 * Decodes one disclosure, enforcing RFC 9901 §7.1 step 3.c: an object-property
 * disclosure MUST be exactly three elements. A two-element array-element
 * disclosure replayed into an `_sd` slot would otherwise be read as
 * [name, value] = [value, undefined], quietly injecting a claim nobody signed.
 */
function readDisclosure(encoded: string): ReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "A disclosure is not valid base64url JSON." };
  }
  if (!Array.isArray(parsed) || parsed.length !== 3) {
    return {
      ok: false,
      reason: "A disclosure is not a three-element array, which the format requires.",
    };
  }
  if (typeof parsed[1] !== "string") {
    return { ok: false, reason: "A disclosure carries a non-string claim name." };
  }
  return { ok: true, name: parsed[1], value: parsed[2] };
}

export interface IssuedCredential {
  /** The credential on its own, with every claim hidden. */
  jwt: string;
  /** The full holder copy: credential plus every disclosure. */
  sdJwt: string;
  disclosures: Disclosure[];
  passportId: string;
}

/**
 * Issues the passport.
 *
 * Each capability claim, the AI-judgment breakdown, the headline number and
 * the session list are selectively disclosable. The holder's name, the
 * evidence digest and the observation count are always present, because a
 * credential that hides how much evidence stands behind it is worse than no
 * credential at all.
 */
export async function issuePassport(passport: Passport): Promise<IssuedCredential> {
  const { priv } = keyPair();

  const disclosures: Disclosure[] = [
    ...passport.claims.map((c) => makeDisclosure(`claim:${c.dimension}`, c)),
    makeDisclosure("ajq", passport.ajq),
    makeDisclosure("trustHealth", passport.trustHealth),
    makeDisclosure("sessions", passport.sessions),
  ];

  // vc-jose-cose: the credential's properties are the payload. No `vc` wrapper.
  const jwt = await new SignJWT({
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://proofos.dev/credentials/proof-passport/v1",
    ],
    id: `urn:proofos:${passport.id}`,
    type: ["VerifiableCredential", "ProofPassport"],
    issuer: passport.issuer,
    validFrom: passport.issuedAt,
    credentialStatus: {
      id: `${origin()}/api/status/1#${passport.statusIndex}`,
      type: "BitstringStatusListEntry",
      statusPurpose: "revocation",
      statusListIndex: String(passport.statusIndex),
      statusListCredential: `${origin()}/api/status/1`,
    },
    credentialSubject: {
      id: `urn:proofos:holder:${passport.id}`,
      holder: passport.holder,
      evidenceRoot: passport.evidenceRoot,
      observationCount: passport.observationCount,
      sessionCount: passport.sessions.length,
      statusIndex: passport.statusIndex,
      // SD-JWT: the digests live in the object whose members they hide.
      _sd: disclosures.map((d) => d.digest).sort(),
    },
    _sd_alg: SD_ALG,
  })
    .setProtectedHeader({ alg: ALG, typ: MEDIA_TYPE, kid: KID })
    .setIssuer(passport.issuer)
    .setSubject(passport.id)
    .setIssuedAt(Math.floor(Date.parse(passport.issuedAt) / 1000) || undefined)
    .setJti(passport.id)
    .sign(priv);

  return {
    jwt,
    sdJwt: [jwt, ...disclosures.map((d) => d.encoded)].join("~") + "~",
    disclosures,
    passportId: passport.id,
  };
}

/**
 * Builds a presentation carrying only the chosen capabilities.
 *
 * The signature is untouched. Hiding a claim means not sending its disclosure.
 * A verifier can see that claims were withheld, because the digest list is
 * longer than the disclosures presented, but cannot see what they were.
 */
export function present(
  sdJwt: string,
  disclose: {
    dimensions?: Dimension[];
    ajq?: boolean;
    trustHealth?: boolean;
    sessions?: boolean;
  },
): string {
  const [jwt, ...encoded] = sdJwt.split("~").filter(Boolean);
  const wanted = new Set<string>();
  for (const d of disclose.dimensions ?? []) wanted.add(`claim:${d}`);
  if (disclose.ajq) wanted.add("ajq");
  if (disclose.trustHealth) wanted.add("trustHealth");
  if (disclose.sessions) wanted.add("sessions");

  const kept = encoded.filter((e) => {
    const read = readDisclosure(e);
    return read.ok && wanted.has(read.name);
  });

  return [jwt, ...kept].join("~") + "~";
}

// ---------------------------------------------------------------- revocation

const REVOKED = new Set<number>();

export function revoke(index: number): void {
  if (Number.isInteger(index) && index >= 0 && index < STATUS_LIST_BITS) REVOKED.add(index);
}

export function unrevoke(index: number): void {
  REVOKED.delete(index);
}

export function isRevoked(index: number): boolean {
  return REVOKED.has(index);
}

/** Multibase base64url-no-pad of the gzipped bitstring, as the specification requires. */
export function encodedStatusList(): string {
  const bytes = new Uint8Array(STATUS_LIST_BITS / 8);
  for (const index of REVOKED) bytes[index >> 3] |= 0b1000_0000 >> (index & 7);
  return "u" + gzipSync(Buffer.from(bytes)).toString("base64url");
}

export function decodeStatusList(encoded: string): Uint8Array {
  const body = encoded.startsWith("u") ? encoded.slice(1) : encoded;
  return new Uint8Array(gunzipSync(Buffer.from(body, "base64url")));
}

/** Reads one bit out of a published list, the way an external verifier would. */
export function statusBitAt(encoded: string, index: number): boolean {
  const bytes = decodeStatusList(encoded);
  if (index < 0 || index >= bytes.length * 8) throw new Error("Status index out of range.");
  return (bytes[index >> 3] & (0b1000_0000 >> (index & 7))) !== 0;
}

export async function statusListCredential() {
  const { priv } = keyPair();
  const id = `${origin()}/api/status/1`;
  return new SignJWT({
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id,
    type: ["VerifiableCredential", "BitstringStatusListCredential"],
    issuer: issuerDid(),
    validFrom: new Date().toISOString(),
    credentialSubject: {
      id: `${id}#list`,
      type: "BitstringStatusList",
      statusPurpose: "revocation",
      encodedList: encodedStatusList(),
    },
  })
    .setProtectedHeader({ alg: ALG, typ: "vc+jwt", kid: KID })
    .setIssuer(issuerDid())
    .setIssuedAt()
    .sign(priv);
}

// ---------------------------------------------------------------- verify

export interface VerifiedClaim {
  name: string;
  value: unknown;
}

export type VerifyOutcome =
  | {
      valid: true;
      holder: string;
      passportId: string;
      issuer: string;
      issuedAt: string;
      evidenceRoot: string;
      observationCount: number;
      sessionCount: number;
      revoked: boolean;
      disclosed: VerifiedClaim[];
      withheld: number;
      ms: number;
    }
  | { valid: false; reason: string; ms: number };

/**
 * Verifies a credential or a presentation of one, offline, against the
 * issuer's public key. No account, no lookup, no call home. Revocation is the
 * only thing that consults live state, and it is reported rather than hidden.
 */
export async function verifyCredential(token: string): Promise<VerifyOutcome> {
  const started = performance.now();
  const ms = () => Math.round(performance.now() - started);
  const trimmed = token.trim().replace(/\s+/g, "");
  if (!trimmed) return { valid: false, reason: "Nothing to verify.", ms: ms() };

  const [jwt, ...encoded] = trimmed.split("~").filter(Boolean);

  try {
    const header = decodeProtectedHeader(jwt);
    if (header.alg !== ALG) {
      return {
        valid: false,
        reason: `Signed with ${header.alg ?? "an unknown algorithm"}, which this verifier does not accept.`,
        ms: ms(),
      };
    }

    const { payload } = await jwtVerify(jwt, keyPair().pub, { algorithms: [ALG] });
    const types = payload.type;
    const subject = payload.credentialSubject as Record<string, unknown> | undefined;

    if (!subject || !Array.isArray(types) || !types.includes("ProofPassport")) {
      return {
        valid: false,
        reason: "Signature is valid, but this is not a PROOFOS passport.",
        ms: ms(),
      };
    }

    const committed = new Set(Array.isArray(subject._sd) ? (subject._sd as string[]) : []);
    const seen = new Set<string>();
    const disclosed: VerifiedClaim[] = [];

    for (const e of encoded) {
      const digest = sha256(e);
      if (!committed.has(digest)) {
        return {
          valid: false,
          reason: "A disclosed claim does not match anything the issuer signed.",
          ms: ms(),
        };
      }
      // RFC 9901 §7.1 step 4: a digest encountered twice invalidates the whole thing.
      if (seen.has(digest)) {
        return {
          valid: false,
          reason: "The same claim was presented twice, which the format forbids.",
          ms: ms(),
        };
      }
      seen.add(digest);

      const read = readDisclosure(e);
      if (!read.ok) return { valid: false, reason: read.reason, ms: ms() };
      disclosed.push({ name: read.name, value: read.value });
    }

    const statusIndex = Number(subject.statusIndex ?? -1);

    return {
      valid: true,
      holder: String(subject.holder ?? "Unknown"),
      passportId: String(payload.jti ?? payload.sub ?? "unknown"),
      issuer: String(payload.issuer ?? payload.iss ?? "unknown"),
      issuedAt: String(
        payload.validFrom ?? new Date((payload.iat ?? 0) * 1000).toISOString(),
      ),
      evidenceRoot: String(subject.evidenceRoot ?? ""),
      observationCount: Number(subject.observationCount ?? 0),
      sessionCount: Number(subject.sessionCount ?? 0),
      revoked: statusIndex >= 0 && isRevoked(statusIndex),
      disclosed,
      withheld: Math.max(0, committed.size - disclosed.length),
      ms: ms(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    if (/signature/i.test(message)) {
      return {
        valid: false,
        reason: "Signature does not match. This credential was altered after it was issued.",
        ms: ms(),
      };
    }
    if (/expired/i.test(message)) {
      return { valid: false, reason: "This credential has expired.", ms: ms() };
    }
    return { valid: false, reason: `Not a readable credential (${message}).`, ms: ms() };
  }
}

/** Pulls the capability claims back out of a verified presentation. */
export function claimsFrom(disclosed: VerifiedClaim[]): Passport["claims"] {
  const out: Passport["claims"] = [];
  for (const d of disclosed) {
    if (!d.name.startsWith("claim:")) continue;
    const dimension = d.name.slice(6) as Dimension;
    if (!DIMENSIONS.includes(dimension)) continue;
    out.push(d.value as Passport["claims"][number]);
  }
  return out;
}
