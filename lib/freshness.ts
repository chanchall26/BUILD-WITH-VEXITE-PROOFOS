/**
 * Proof freshness.
 *
 * A credential that never expires stops meaning anything. Evidence about how
 * someone handles AI tooling ages far faster than evidence that they write
 * clearly, so each capability decays on its own half-life rather than under one
 * blanket expiry date.
 *
 * Kept separate from lib/evidence.ts because the browser needs this maths and
 * that module reaches for node:crypto.
 */

import { HALF_LIFE_DAYS } from "./config";
import type { Dimension, PassportClaim } from "./domain";
import { daysBetween, nowMs, round } from "./utils";

export function freshnessFor(
  dimension: Dimension,
  verifiedAt: string,
  at: number = nowMs(),
): number {
  const age = daysBetween(verifiedAt, at);
  return round(Math.pow(2, -age / HALF_LIFE_DAYS[dimension]), 3);
}

/** When a claim has decayed enough to be worth re-earning. */
export function revalidateBy(dimension: Dimension, verifiedAt: string): string {
  const halfLife = HALF_LIFE_DAYS[dimension];
  const issued = Date.parse(verifiedAt) || nowMs();
  // 0.415 half-lives is roughly 75% freshness: still current, worth topping up.
  return new Date(issued + halfLife * 0.415 * 86_400_000).toISOString();
}

/**
 * The headline number, weighted by freshness. A passport whose evidence has
 * decayed should not read the same as one earned last week.
 */
export function liveTrustHealth(
  claims: PassportClaim[],
  at: number = nowMs(),
): number | null {
  const scored = claims.filter((c) => c.score !== null);
  if (!scored.length) return null;
  let weighted = 0;
  let mass = 0;
  for (const c of scored) {
    const f = freshnessFor(c.dimension, c.verifiedAt, at);
    weighted += (c.score as number) * f;
    mass += f;
  }
  return mass > 0 ? Math.round(weighted / mass) : null;
}

export function freshnessTone(f: number): "proof" | "signal" | "caution" | "alert" {
  if (f >= 0.85) return "proof";
  if (f >= 0.6) return "signal";
  if (f >= 0.4) return "caution";
  return "alert";
}
