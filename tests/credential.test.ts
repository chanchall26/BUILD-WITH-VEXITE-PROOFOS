/**
 * The credential is the trust boundary. If a passport can be edited after
 * issue, or a claim can be forged into a presentation, none of the rest
 * matters.
 *
 * The two SD-JWT checks people skip — disclosure arity and repeated digests —
 * are both tested here, because both are silent forgery vectors.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decodeStatusList,
  didDocument,
  encodedStatusList,
  isRevoked,
  issuePassport,
  present,
  publicJwk,
  revoke,
  statusBitAt,
  statusListCredential,
  unrevoke,
  verifyCredential,
} from "../lib/credential.ts";
import { FIXTURE_PASSPORTS } from "../lib/fixtures.ts";
import type { Passport } from "../lib/domain.ts";

const passport = FIXTURE_PASSPORTS[0];

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

// ---------------------------------------------------------------- issue

test("a full presentation verifies and carries every claim", async () => {
  const issued = await issuePassport(passport);
  const outcome = await verifyCredential(issued.sdJwt);
  assert.equal(outcome.valid, true);
  if (!outcome.valid) return;
  assert.equal(outcome.holder, passport.holder);
  assert.equal(outcome.disclosed.length, issued.disclosures.length);
  assert.equal(outcome.withheld, 0);
});

test("the bare credential verifies with nothing disclosed", async () => {
  const issued = await issuePassport(passport);
  const outcome = await verifyCredential(issued.jwt);
  assert.equal(outcome.valid, true);
  if (!outcome.valid) return;
  assert.equal(outcome.disclosed.length, 0);
  assert.equal(outcome.withheld, issued.disclosures.length);
});

test("the credential is not wrapped in a vc claim", async () => {
  const issued = await issuePassport(passport);
  const payload = JSON.parse(
    Buffer.from(issued.jwt.split(".")[1], "base64url").toString("utf8"),
  );
  // vc-jose-cose: the credential's properties ARE the payload.
  assert.equal(payload.vc, undefined);
  assert.ok(Array.isArray(payload.type) && payload.type.includes("VerifiableCredential"));
  assert.ok(payload["@context"][0].includes("credentials/v2"));
  assert.equal(payload.credentialStatus.type, "BitstringStatusListEntry");
});

test("the media type is one vc-jose-cose actually registers", async () => {
  const issued = await issuePassport(passport);
  const header = JSON.parse(
    Buffer.from(issued.jwt.split(".")[0], "base64url").toString("utf8"),
  );
  assert.equal(header.typ, "vc+sd-jwt");
  assert.equal(header.alg, "EdDSA");
});

test("the observation count cannot be hidden", async () => {
  const issued = await issuePassport(passport);
  const outcome = await verifyCredential(issued.jwt);
  assert.ok(outcome.valid);
  if (!outcome.valid) return;
  // A credential that hides how much evidence stands behind it is worse than none.
  assert.equal(outcome.observationCount, passport.observationCount);
  assert.equal(outcome.evidenceRoot, passport.evidenceRoot);
});

// ---------------------------------------------------------------- disclosure

test("a presentation discloses only what the holder chose", async () => {
  const issued = await issuePassport(passport);
  const partial = present(issued.sdJwt, { dimensions: ["ai_judgment", "verification"] });
  const outcome = await verifyCredential(partial);
  assert.equal(outcome.valid, true);
  if (!outcome.valid) return;

  const names = outcome.disclosed.map((d) => d.name);
  assert.deepEqual(names.sort(), ["claim:ai_judgment", "claim:verification"]);
  assert.ok(outcome.withheld > 0);
  assert.ok(!JSON.stringify(outcome.disclosed).includes("communication"));
});

test("two presentations of the same claim cannot be correlated by digest", async () => {
  const a = await issuePassport(passport);
  const b = await issuePassport(passport);
  const digestsA = a.disclosures.map((d) => d.digest);
  const digestsB = b.disclosures.map((d) => d.digest);
  // Fresh salts each issue, so the same claim hashes differently every time.
  assert.equal(digestsA.some((d) => digestsB.includes(d)), false);
});

test("a disclosure the issuer never signed is rejected", async () => {
  const issued = await issuePassport(passport);
  const forged = b64url(["saltsaltsaltsalt", "claim:ai_judgment", { score: 99 }]);
  const outcome = await verifyCredential(`${issued.jwt}~${forged}~`);
  assert.equal(outcome.valid, false);
});

test("the same disclosure presented twice is rejected", async () => {
  const issued = await issuePassport(passport);
  const one = issued.disclosures[0].encoded;
  const outcome = await verifyCredential(`${issued.jwt}~${one}~${one}~`);
  assert.equal(outcome.valid, false);
  assert.ok(outcome.valid === false && /twice/i.test(outcome.reason));
});

test("a two-element disclosure cannot smuggle a claim in", async () => {
  // Without the arity check, [salt, value] destructures to name = value and
  // value = undefined, quietly inserting a claim nobody signed.
  const issued = await issuePassport(passport);
  const original = issued.disclosures[0].encoded;
  const [salt] = JSON.parse(Buffer.from(original, "base64url").toString("utf8"));
  const short = b64url([salt, { score: 100 }]);
  const outcome = await verifyCredential(`${issued.jwt}~${short}~`);
  assert.equal(outcome.valid, false);
});

// ---------------------------------------------------------------- tampering

test("editing the signed payload breaks verification", async () => {
  const issued = await issuePassport(passport);
  const [header, body, signature] = issued.jwt.split(".");
  const at = Math.floor(body.length / 2);
  const flipped = body[at] === "A" ? "B" : "A";
  const outcome = await verifyCredential(
    `${header}.${body.slice(0, at)}${flipped}${body.slice(at + 1)}.${signature}`,
  );
  assert.equal(outcome.valid, false);
  assert.ok(outcome.valid === false && /altered/i.test(outcome.reason));
});

test("splicing an honest signature onto an inflated payload fails", async () => {
  const honest = await issuePassport(passport);
  const inflated: Passport = {
    ...passport,
    claims: passport.claims.map((c) => ({ ...c, score: 100 })),
    trustHealth: 100,
  };
  const forged = await issuePassport(inflated);
  const spliced = `${forged.jwt.split(".")[0]}.${forged.jwt.split(".")[1]}.${honest.jwt.split(".")[2]}`;
  assert.equal((await verifyCredential(spliced)).valid, false);
});

test("an alg-none token is refused before anything else happens", async () => {
  const header = b64url({ alg: "none", typ: "vc+sd-jwt" });
  const body = b64url({ type: ["VerifiableCredential", "ProofPassport"], credentialSubject: {} });
  const outcome = await verifyCredential(`${header}.${body}.`);
  assert.equal(outcome.valid, false);
  assert.ok(outcome.valid === false && /none/i.test(outcome.reason));
});

test("garbage is rejected without throwing", async () => {
  for (const junk of ["", "   ", "not-a-token", "a.b.c", "~~~", "x".repeat(500)]) {
    const outcome = await verifyCredential(junk);
    assert.equal(outcome.valid, false, `expected rejection for ${JSON.stringify(junk.slice(0, 20))}`);
    assert.ok(outcome.valid === false && outcome.reason.length > 0);
  }
});

// ---------------------------------------------------------------- revocation

test("revocation is reported without invalidating the signature", async () => {
  const index = 4242;
  unrevoke(index);
  const target: Passport = { ...passport, statusIndex: index };
  const issued = await issuePassport(target);

  const before = await verifyCredential(issued.sdJwt);
  assert.ok(before.valid && before.revoked === false);

  revoke(index);
  const after = await verifyCredential(issued.sdJwt);
  // The signature is still good — that is how signatures work. The status says no.
  assert.ok(after.valid && after.revoked === true);
  unrevoke(index);
});

test("the status list encodes exactly the revoked bits", () => {
  unrevoke(7);
  unrevoke(8);
  revoke(7);
  const encoded = encodedStatusList();
  assert.ok(encoded.startsWith("u"), "multibase base64url prefix");
  assert.equal(statusBitAt(encoded, 7), true);
  assert.equal(statusBitAt(encoded, 8), false);
  unrevoke(7);
});

test("the status list is the specification's minimum length", () => {
  const bytes = decodeStatusList(encodedStatusList());
  assert.equal(bytes.length * 8, 131_072);
});

test("the status list is itself a signed credential", async () => {
  const jwt = await statusListCredential();
  const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
  assert.ok(payload.type.includes("BitstringStatusListCredential"));
  assert.equal(payload.credentialSubject.statusPurpose, "revocation");
  assert.ok(payload.credentialSubject.encodedList.startsWith("u"));
});

test("an out-of-range status index is an error rather than a silent false", () => {
  assert.throws(() => statusBitAt(encodedStatusList(), 999_999));
});

// ---------------------------------------------------------------- keys

test("the published key is Ed25519 and carries no private material", async () => {
  const jwk = await publicJwk();
  assert.equal(jwk.kty, "OKP");
  assert.equal(jwk.crv, "Ed25519");
  assert.equal(jwk.alg, "EdDSA");
  assert.ok(jwk.x);
  assert.equal(jwk.d, undefined, "the private scalar must never be published");
});

test("the did document publishes a resolvable verification method", async () => {
  const doc = await didDocument();
  assert.ok(doc.id.startsWith("did:web:"));
  assert.equal(doc.verificationMethod[0].controller, doc.id);
  assert.ok(doc.assertionMethod[0].startsWith(doc.id));
  assert.equal(doc.verificationMethod[0].publicKeyJwk.d, undefined);
});

test("the same secret always issues under the same key", async () => {
  const a = await publicJwk();
  const b = await publicJwk();
  assert.equal(a.x, b.x);
});

test("revocation state is per-index and does not bleed", () => {
  revoke(100);
  assert.equal(isRevoked(100), true);
  assert.equal(isRevoked(101), false);
  unrevoke(100);
  assert.equal(isRevoked(100), false);
});
