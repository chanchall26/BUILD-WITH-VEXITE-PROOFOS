/**
 * One place for model choices, tunable constants and runtime mode.
 *
 * PROOFOS is Gemini-native. Every model named here is a Gemini model, picked
 * per job rather than defaulting one model to everything.
 */

export const APP = {
  name: "PROOFOS",
  full: "Proof Operating System",
  tagline: "Proof of what you can actually do",
  pitch:
    "Anyone can write a perfect CV now. PROOFOS gives people a short, real task and an AI teammate that is sometimes wrong, then shows an employer exactly what happened.",
} as const;

/**
 * Free-tier keys have no quota for the pro tier at all. Rather than pay a
 * refused round trip on every cold start, a deployment can point the architect
 * tier at the workhorse model and lose a little rubric quality for a lot of
 * latency. See .env.example.
 */
export const MODELS = {
  /** Deep reasoning: challenge design, evidence extraction, evaluation. */
  architect: process.env.GEMINI_ARCHITECT_MODEL || "gemini-3.1-pro-preview",
  /** Workhorse: the AI counterpart, role analysis, drafting. */
  workhorse: process.env.GEMINI_WORKHORSE_MODEL || "gemini-3.8-flash",
  /** Cheap and fast: classification and short rewrites. */
  swift: "gemini-3.5-flash-lite",
  /** Speech to text for the spoken defence. */
  transcribe: "gemini-3.5-transcribe",
  /** The counterpart's voice. */
  speech: "gemini-3.1-flash-tts-preview",
  /** Real-time voice session with the counterpart. */
  live: "gemini-3.1-flash-live-preview",
  /** Vectors for evidence retrieval and capability matching. */
  embedding: "gemini-embedding-2",
} as const;

export const EMBED_DIM = 768;

/** Fixed seed: the same session must evaluate the same way twice. */
export const EVAL_SEED = 20260912;

/**
 * Every configured API key, in order.
 *
 * Free-tier keys are rate limited per key, not per project, so a demo that
 * needs more than a couple of calls a minute can spread the load across
 * several. `GEMINI_API_KEYS` takes a comma-separated list; `GEMINI_API_KEY`
 * stays supported for the single-key case.
 */
export function apiKeys(): string[] {
  const raw = [
    process.env.GEMINI_API_KEYS,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ]
    .filter(Boolean)
    .join(",");

  return [
    ...new Set(
      raw
        .split(/[,\s]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 10),
    ),
  ];
}

export function apiKey(): string | undefined {
  return apiKeys()[0];
}

/**
 * With no API key the whole product runs from deterministic fixtures, clearly
 * labelled everywhere it surfaces. That is what makes a deployed demo safe to
 * hand to a stranger on an unknown network.
 */
export function isDemoMode(): boolean {
  return apiKeys().length === 0;
}

export function secret(): string {
  return (
    process.env.PROOFOS_SECRET ||
    "proofos-development-secret-not-for-production-000000000000000000"
  );
}

export function origin(): string {
  return (
    process.env.PROOFOS_ORIGIN ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  );
}

/** did:web maps an identifier onto a host. See docs/CREDENTIALS.md. */
export function issuerDid(): string {
  const host = origin().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return process.env.PROOFOS_ISSUER || `did:web:${encodeURIComponent(host)}`;
}

/**
 * Evidence decays because the ground moves. A judgment about AI tooling ages
 * far faster than a judgment about writing clearly, so each capability carries
 * its own half-life rather than one blanket expiry.
 */
export const HALF_LIFE_DAYS = {
  authorship: 90,
  ai_judgment: 120,
  verification: 180,
  execution: 270,
  reasoning: 365,
  communication: 540,
} as const;

export const SCORING = {
  /** Evidence below this count leaves a capability unproven rather than scored. */
  minObservations: 2,
  /** How quickly accumulated evidence earns confidence in the score. */
  confidenceRate: 2.2,
  /** Trust levels a perfectly calibrated person would give each truth label. */
  idealTrust: { correct: 90, partial: 55, wrong: 10, dangerous: 0 },
  /** Trusting something dangerous is not a small error. */
  dangerousMissPenalty: 1.6,
  /** A passport below this on AI judgment is flagged for human review. */
  reviewThreshold: 55,
} as const;
