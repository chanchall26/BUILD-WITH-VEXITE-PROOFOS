/**
 * The derivation engine.
 *
 * Every number PROOFOS shows is produced here from observations. These tests
 * cover the properties a candidate could reasonably dispute: that thin
 * evidence does not produce a confident number, that no evidence produces no
 * number at all, and that the same evidence always produces the same result.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { SCORING } from "../lib/config.ts";
import type { CalibrationAnswer, CalibrationKey, Observation } from "../lib/domain.ts";
import {
  calibrationObservations,
  deriveProfile,
  evidenceRoot,
  matchRole,
  observe,
  scoreCalibration,
  scoreDimension,
} from "../lib/evidence.ts";
import { freshnessFor, liveTrustHealth, revalidateBy } from "../lib/freshness.ts";
import { FIXTURE_PASSPORTS, FIXTURE_ROLE } from "../lib/fixtures.ts";

const SESSION = "se_test";

function obs(kind: Observation["kind"], quote: string, ref?: string): Observation {
  return observe({
    sessionId: SESSION,
    kind,
    detail: `test ${kind}`,
    quote,
    source: "counterpart",
    detector: "deterministic",
    ref,
    at: 1_770_000_000_000,
  });
}

// ---------------------------------------------------------------- no evidence

test("a capability with no evidence is unproven, not fifty", () => {
  const score = scoreDimension("communication", []);
  assert.equal(score.score, null);
  assert.equal(score.evidence, 0);
  assert.equal(score.confidence, 0);
});

test("a single observation is still below the evidence floor", () => {
  const score = scoreDimension("ai_judgment", [obs("detected_error", "one thing", "a")]);
  assert.equal(score.evidence, 1);
  assert.equal(score.score, null, `one observation should not produce ${score.score}`);
  assert.ok(SCORING.minObservations > 1);
});

test("the profile counts what is proven separately from what was observed", () => {
  const profile = deriveProfile([
    obs("detected_error", "caught it", "a"),
    obs("challenged_claim", "pushed back", "b"),
  ]);
  assert.equal(profile.observationCount, 2);
  assert.equal(profile.provenCount, 1, "only ai_judgment has evidence");
  assert.equal(profile.dimensions.find((d) => d.dimension === "execution")?.score, null);
});

// ---------------------------------------------------------------- confidence

test("thin evidence is pulled towards the midpoint, thick evidence is not", () => {
  const thin = scoreDimension("ai_judgment", [
    obs("detected_error", "a", "1"),
    obs("corrected_output", "b", "2"),
  ]);
  const thick = scoreDimension("ai_judgment", [
    obs("detected_error", "a", "1"),
    obs("corrected_output", "b", "2"),
    obs("challenged_claim", "c", "3"),
    obs("redirected_approach", "d", "4"),
    obs("withheld_trust", "e", "5"),
    obs("detected_error", "f", "6"),
  ]);
  assert.ok(thin.score !== null && thick.score !== null);
  assert.ok(
    (thick.score as number) > (thin.score as number),
    `more of the same evidence should read higher: ${thin.score} then ${thick.score}`,
  );
  assert.ok(thick.confidence > thin.confidence);
  assert.ok((thin.score as number) < 90, "two observations must not produce near-certainty");
});

test("negative evidence pulls a score down symmetrically", () => {
  const good = scoreDimension("ai_judgment", [
    obs("detected_error", "a", "1"),
    obs("corrected_output", "b", "2"),
    obs("challenged_claim", "c", "3"),
  ]);
  const bad = scoreDimension("ai_judgment", [
    obs("propagated_defect", "a", "1"),
    obs("propagated_defect", "b", "2"),
    obs("followed_scope_drift", "c", "3"),
  ]);
  assert.ok(good.score !== null && bad.score !== null);
  assert.ok((good.score as number) > 55);
  assert.ok((bad.score as number) < 45);
});

test("the same observations always derive the same profile", () => {
  const set = [
    obs("detected_error", "a", "1"),
    obs("requested_evidence", "b", "2"),
    obs("propagated_defect", "c", "3"),
  ];
  assert.deepEqual(deriveProfile(set), deriveProfile([...set].reverse()));
});

test("the evidence root is order-independent and change-sensitive", () => {
  const a = obs("detected_error", "a", "1");
  const b = obs("challenged_claim", "b", "2");
  assert.equal(evidenceRoot([a, b]), evidenceRoot([b, a]));
  assert.notEqual(evidenceRoot([a, b]), evidenceRoot([a]));
});

// ---------------------------------------------------------------- facets

test("AI judgment reports both a headline and its six facets", () => {
  const profile = deriveProfile([
    obs("detected_error", "a", "1"),
    obs("detected_error", "b", "2"),
    obs("withheld_trust", "c", "3"),
    obs("withheld_trust", "d", "4"),
  ]);
  assert.equal(profile.ajq.facets.length, 6);
  const detect = profile.ajq.facets.find((f) => f.facet === "detect");
  const question = profile.ajq.facets.find((f) => f.facet === "question");
  assert.ok(detect && detect.score !== null, "detect has evidence");
  assert.equal(question?.score, null, "question has none and says so");
});

// ---------------------------------------------------------------- calibration

const KEY: CalibrationKey[] = [
  { id: "c1", context: "", claim: "right and hedged", statedConfidence: 60, truth: "correct", why: "" },
  { id: "c2", context: "", claim: "wrong and certain", statedConfidence: 95, truth: "wrong", why: "" },
  { id: "c3", context: "", claim: "would delete production", statedConfidence: 55, truth: "dangerous", why: "" },
  { id: "c4", context: "", claim: "half right", statedConfidence: 70, truth: "partial", why: "" },
];

test("perfect calibration scores far above confident wrongness", () => {
  const calibrated: CalibrationAnswer[] = [
    { id: "c1", label: "correct", trust: 90 },
    { id: "c2", label: "wrong", trust: 10 },
    { id: "c3", label: "dangerous", trust: 0 },
    { id: "c4", label: "partial", trust: 55 },
  ];
  const credulous: CalibrationAnswer[] = [
    { id: "c1", label: "correct", trust: 95 },
    { id: "c2", label: "correct", trust: 95 },
    { id: "c3", label: "correct", trust: 95 },
    { id: "c4", label: "correct", trust: 95 },
  ];
  const good = scoreCalibration(KEY, calibrated);
  const bad = scoreCalibration(KEY, credulous);

  assert.equal(good.accuracy, 1);
  assert.equal(good.dangerousMisses, 0);
  assert.ok(good.score > 90, `well-calibrated should score high, got ${good.score}`);
  assert.equal(bad.dangerousMisses, 1);
  assert.ok(bad.score < 45, `credulous should score low, got ${bad.score}`);
});

test("bias is signed, so over-trust and under-trust are distinguishable", () => {
  const over = scoreCalibration(KEY, KEY.map((k) => ({ id: k.id, label: k.truth, trust: 100 })));
  const under = scoreCalibration(KEY, KEY.map((k) => ({ id: k.id, label: k.truth, trust: 0 })));
  assert.ok(over.bias > 0, `over-trust should be positive, got ${over.bias}`);
  assert.ok(under.bias < 0, `under-trust should be negative, got ${under.bias}`);
  assert.equal(over.accuracy, 1, "labels were right in both cases");
});

test("trusting an unsafe output is penalised harder than being merely wrong", () => {
  const wrongOnly = scoreCalibration(KEY, [
    { id: "c1", label: "wrong", trust: 90 },
    { id: "c2", label: "wrong", trust: 10 },
    { id: "c3", label: "dangerous", trust: 0 },
    { id: "c4", label: "partial", trust: 55 },
  ]);
  const unsafe = scoreCalibration(KEY, [
    { id: "c1", label: "correct", trust: 90 },
    { id: "c2", label: "wrong", trust: 10 },
    { id: "c3", label: "correct", trust: 90 },
    { id: "c4", label: "partial", trust: 55 },
  ]);
  assert.equal(wrongOnly.dangerousMisses, 0);
  assert.equal(unsafe.dangerousMisses, 1);
  assert.ok(unsafe.score < wrongOnly.score, `${unsafe.score} should be below ${wrongOnly.score}`);
});

test("unanswered items are excluded rather than counted as failures", () => {
  const partial = scoreCalibration(KEY, [{ id: "c1", label: "correct", trust: 90 }]);
  assert.equal(partial.answered, 1);
  assert.equal(partial.accuracy, 1);
});

test("calibration answers become observations like everything else", () => {
  const result = scoreCalibration(KEY, [
    { id: "c3", label: "correct", trust: 95 },
    { id: "c1", label: "correct", trust: 88 },
  ]);
  const observations = calibrationObservations(SESSION, result);
  assert.equal(observations.length, 2);
  assert.ok(observations.some((o) => o.kind === "trusted_dangerous"));
  assert.ok(observations.some((o) => o.kind === "calibrated_correctly"));
  assert.ok(observations.every((o) => o.detector === "deterministic"));
});

// ---------------------------------------------------------------- freshness

test("evidence decays to half its freshness after one half-life", () => {
  const issued = new Date("2026-01-01T00:00:00.000Z");
  const at = issued.getTime() + 120 * 86_400_000; // ai_judgment half-life
  assert.ok(Math.abs(freshnessFor("ai_judgment", issued.toISOString(), at) - 0.5) < 0.01);
});

test("capabilities decay at different rates", () => {
  const issued = "2026-01-01T00:00:00.000Z";
  const at = Date.parse(issued) + 180 * 86_400_000;
  const judgment = freshnessFor("ai_judgment", issued, at);
  const communication = freshnessFor("communication", issued, at);
  assert.ok(
    communication > judgment,
    "writing clearly ages more slowly than knowing today's tooling",
  );
});

test("the headline is weighted by freshness, so a stale passport reads lower", () => {
  const claims = FIXTURE_PASSPORTS[0].claims;
  const now = Date.parse("2026-09-12T00:00:00.000Z");
  const later = now + 400 * 86_400_000;
  const fresh = liveTrustHealth(claims, now);
  const stale = liveTrustHealth(claims, later);
  assert.ok(fresh !== null && stale !== null);
  assert.notEqual(fresh, stale);
});

test("revalidation is scheduled before a claim has half decayed", () => {
  const issued = "2026-01-01T00:00:00.000Z";
  const due = Date.parse(revalidateBy("ai_judgment", issued));
  const halfLife = Date.parse(issued) + 120 * 86_400_000;
  assert.ok(due > Date.parse(issued));
  assert.ok(due < halfLife, "prompt a top-up before the evidence is half gone");
});

// ---------------------------------------------------------------- role match

test("coverage rewards evidence that is both strong and fresh", () => {
  const strong = matchRole(FIXTURE_ROLE, FIXTURE_PASSPORTS[0]);
  const weak = matchRole(FIXTURE_ROLE, FIXTURE_PASSPORTS[1]);
  assert.ok(strong.coverage > weak.coverage, `${strong.coverage} vs ${weak.coverage}`);
  assert.ok(strong.coverage <= 100 && weak.coverage >= 0);
});

test("decayed evidence stops covering a requirement", () => {
  const now = Date.parse("2026-09-12T00:00:00.000Z");
  const soon = matchRole(FIXTURE_ROLE, FIXTURE_PASSPORTS[0], now);
  const muchLater = matchRole(FIXTURE_ROLE, FIXTURE_PASSPORTS[0], now + 800 * 86_400_000);
  assert.ok(muchLater.coverage < soon.coverage);
  assert.ok(muchLater.gaps.length > soon.gaps.length);
});

test("every uncovered requirement is named rather than silently averaged away", () => {
  const match = matchRole(FIXTURE_ROLE, FIXTURE_PASSPORTS[1]);
  for (const row of match.rows.filter((r) => !r.covered)) {
    assert.ok(match.gaps.includes(row.dimension));
    assert.ok(row.note.length > 10, "an uncovered requirement explains itself");
  }
});

test("matching produces coverage and never a recommendation", () => {
  const match = matchRole(FIXTURE_ROLE, FIXTURE_PASSPORTS[2]);
  const asJson = JSON.stringify(match).toLowerCase();
  for (const banned of ["hire", "reject", "recommend", "shortlist"]) {
    assert.ok(!asJson.includes(banned), `a match must not contain "${banned}"`);
  }
});
