/**
 * The PROOFOS domain model.
 *
 * One rule shapes all of it: **evidence is stored, scores are derived**. An
 * Observation is the atomic unit — a single thing a person did, quoted, tagged
 * and hashed. Every number anywhere in the product is a pure function of the
 * observations behind it, so any score can be reconstructed, audited, or
 * disputed line by line.
 */

// ---------------------------------------------------------------- domains

export const DOMAINS = [
  "software",
  "data",
  "product",
  "marketing",
  "finance",
  "support",
  "hr",
  "design",
  "research",
] as const;

export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABEL: Record<Domain, string> = {
  software: "Software engineering",
  data: "Data analysis",
  product: "Product management",
  marketing: "Marketing",
  finance: "Finance",
  support: "Customer support",
  hr: "People and hiring",
  design: "Design",
  research: "Research",
};

// ---------------------------------------------------------------- capabilities

/** The six capabilities a passport reports. */
export const DIMENSIONS = [
  "ai_judgment",
  "reasoning",
  "execution",
  "verification",
  "communication",
  "authorship",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABEL: Record<Dimension, string> = {
  ai_judgment: "AI Judgment",
  reasoning: "Critical Reasoning",
  execution: "Task Execution",
  verification: "Verification Discipline",
  communication: "Communication",
  authorship: "Authorship Continuity",
};

export const DIMENSION_BLURB: Record<Dimension, string> = {
  ai_judgment: "Supervising a capable, confident, sometimes wrong machine.",
  reasoning: "Separating what the evidence supports from what sounds right.",
  execution: "Getting the actual deliverable finished and correct.",
  verification: "Asking for the source before acting on the claim.",
  communication: "Making the decision legible to whoever reads it next.",
  authorship: "Evidence that the person scored is the person who did the work.",
};

/**
 * The six facets of AI Judgment. Prompting skill is not on this list on
 * purpose: the question is not how well you ask, it is how well you supervise.
 */
export const AJQ_FACETS = [
  "detect",
  "question",
  "verify",
  "direct",
  "correct",
  "decide",
] as const;

export type AjqFacet = (typeof AJQ_FACETS)[number];

export const FACET_LABEL: Record<AjqFacet, string> = {
  detect: "Detect",
  question: "Question",
  verify: "Verify",
  direct: "Direct",
  correct: "Correct",
  decide: "Decide",
};

export const FACET_QUESTION: Record<AjqFacet, string> = {
  detect: "Can you recognise that the AI is wrong?",
  question: "Can you challenge a claim the evidence does not support?",
  verify: "Can you insist on seeing the evidence?",
  direct: "Can you steer it towards the right approach?",
  correct: "Can you fix what it got wrong?",
  decide: "Can you tell when not to trust it at all?",
};

// ---------------------------------------------------------------- observations

export type ObservationKind =
  // AI judgment, positive
  | "detected_error"
  | "challenged_claim"
  | "requested_evidence"
  | "redirected_approach"
  | "corrected_output"
  | "withheld_trust"
  // AI judgment, negative
  | "accepted_unverified"
  | "propagated_defect"
  | "followed_scope_drift"
  // calibration
  | "calibrated_correctly"
  | "over_trusted"
  | "under_trusted"
  | "trusted_dangerous"
  // execution and communication
  | "met_requirement"
  | "missed_requirement"
  | "explained_tradeoff"
  | "unclear_handoff"
  // authorship
  | "owned_decision"
  | "generic_defence"
  | "unexplained_artifact"
  | "left_the_test";

export type ObservationSource = "counterpart" | "artifact" | "calibration" | "defence";
export type Detector = "deterministic" | "model";

/**
 * One thing that happened, with the words that prove it. Nothing in a passport
 * exists without at least one of these behind it.
 */
export interface Observation {
  id: string;
  sessionId: string;
  at: number;
  kind: ObservationKind;
  dimension: Dimension;
  facet?: AjqFacet;
  /** +1 counts for the capability, -1 counts against it. */
  polarity: 1 | -1;
  /** How much this single observation is worth, 0 to 1. */
  weight: number;
  /** One sentence: what the person did. */
  detail: string;
  /** Their words, verbatim. No quote, no observation. */
  quote: string;
  source: ObservationSource;
  detector: Detector;
  /** Where in the transcript this came from, for the drill-down. */
  ref?: string;
  /** SHA-256 over the evidence, so a passport claim can be tied to its source. */
  hash: string;
}

export const OBSERVATION_META: Record<
  ObservationKind,
  { label: string; dimension: Dimension; facet?: AjqFacet; polarity: 1 | -1; weight: number }
> = {
  detected_error: { label: "Detected an error", dimension: "ai_judgment", facet: "detect", polarity: 1, weight: 1 },
  challenged_claim: { label: "Challenged an unsupported claim", dimension: "ai_judgment", facet: "question", polarity: 1, weight: 0.9 },
  requested_evidence: { label: "Asked for the evidence", dimension: "verification", facet: "verify", polarity: 1, weight: 0.85 },
  redirected_approach: { label: "Redirected the approach", dimension: "ai_judgment", facet: "direct", polarity: 1, weight: 0.8 },
  corrected_output: { label: "Corrected the output", dimension: "ai_judgment", facet: "correct", polarity: 1, weight: 1 },
  withheld_trust: { label: "Declined to act on it", dimension: "ai_judgment", facet: "decide", polarity: 1, weight: 0.95 },

  accepted_unverified: { label: "Acted on an unverified claim", dimension: "verification", facet: "verify", polarity: -1, weight: 0.8 },
  propagated_defect: { label: "Carried a defect into the work", dimension: "ai_judgment", facet: "detect", polarity: -1, weight: 1 },
  followed_scope_drift: { label: "Followed the AI off the brief", dimension: "reasoning", facet: "direct", polarity: -1, weight: 0.7 },

  calibrated_correctly: { label: "Trust level matched reality", dimension: "ai_judgment", facet: "decide", polarity: 1, weight: 0.6 },
  over_trusted: { label: "Trusted more than the evidence justified", dimension: "ai_judgment", facet: "decide", polarity: -1, weight: 0.6 },
  under_trusted: { label: "Distrusted sound work", dimension: "ai_judgment", facet: "decide", polarity: -1, weight: 0.35 },
  trusted_dangerous: { label: "Trusted a dangerous output", dimension: "ai_judgment", facet: "decide", polarity: -1, weight: 1 },

  met_requirement: { label: "Met a stated requirement", dimension: "execution", polarity: 1, weight: 0.8 },
  missed_requirement: { label: "Missed a stated requirement", dimension: "execution", polarity: -1, weight: 0.8 },
  explained_tradeoff: { label: "Explained the trade-off", dimension: "communication", polarity: 1, weight: 0.8 },
  unclear_handoff: { label: "Left the reader guessing", dimension: "communication", polarity: -1, weight: 0.6 },

  owned_decision: { label: "Spoke to their own decision", dimension: "authorship", polarity: 1, weight: 1 },
  generic_defence: { label: "Defence would fit any submission", dimension: "authorship", polarity: -1, weight: 0.9 },
  unexplained_artifact: { label: "Work arrived from outside the session", dimension: "authorship", polarity: -1, weight: 1 },
  left_the_test: { label: "Left the test repeatedly while working", dimension: "authorship", polarity: -1, weight: 0.5 },
};

// ---------------------------------------------------------------- challenge

export type Behaviour =
  | "assert_unsupported"
  | "subtle_defect"
  | "scope_drift"
  | "overconfidence"
  | "partial_work"
  | "conflicting_evidence"
  | "push_back"
  | "ask_clarify";

export const BEHAVIOUR_LABEL: Record<Behaviour, string> = {
  assert_unsupported: "States a conclusion the data does not support",
  subtle_defect: "Correct-looking work with a planted flaw",
  scope_drift: "Quietly changes the requirement",
  overconfidence: "High stated confidence on a weak basis",
  partial_work: "Hands back half a deliverable as if finished",
  conflicting_evidence: "Supplies data that contradicts its own claim",
  push_back: "Argues against the candidate",
  ask_clarify: "Asks a question the candidate must answer",
};

/** A scripted move the counterpart makes on a given turn. */
export interface Beat {
  turn: number;
  behaviour: Behaviour;
  facet: AjqFacet;
  /** What the counterpart should do, in the second person, for its instruction. */
  instruction: string;
  /** A short literal that appears in the work if the candidate absorbed it. */
  marker: string;
  /** What is actually true, used when grading and when explaining afterwards. */
  groundTruth: string;
}

/** A tool the counterpart can call. Results are fixtures, so runs are repeatable. */
export interface SimTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Returned verbatim whatever the arguments. Deterministic on purpose. */
  result: unknown;
}

export interface ContextDoc {
  label: string;
  kind: "message" | "log" | "table" | "doc" | "snippet";
  body: string;
}

export interface Requirement {
  id: string;
  text: string;
  /**
   * A short literal whose presence in the finished work settles whether this
   * requirement was met, without asking a model. Optional: some requirements
   * genuinely need judgment, and those are left to the observer pass.
   */
  signal?: string;
}

export interface ChallengeSpec {
  id: string;
  domain: Domain;
  title: string;
  roleContext: string;
  situation: string;
  deliverable: string;
  workspaceSeed: string;
  requirements: Requirement[];
  contextDocs: ContextDoc[];
  tools: SimTool[];
  counterpartPersona: string;
  beats: Beat[];
  defenceSeeds: string[];
  transparencyNotice: string;
  estimatedMinutes: number;
  createdAt: string;
  grounding?: { title: string; url: string }[];
  source: "gemini" | "fixture";
}

// ---------------------------------------------------------------- transcript

export interface Turn {
  role: "candidate" | "counterpart";
  text: string;
  at: number;
  /** Beat turns the counterpart executed in this reply. */
  beats?: number[];
  /** Simulated tools the counterpart called before answering. */
  toolCalls?: { name: string; args: Record<string, unknown> }[];
}

export interface SessionTelemetry {
  startedAt: number;
  submittedAt: number;
  pasteEvents: number;
  pastedChars: number;
  typedChars: number;
  revisions: number;
  /**
   * Test-integrity counts. Every one of these is shown to the candidate live,
   * while it is being counted. Monitoring somebody without telling them is how
   * assessment loses people's trust, and none of these need a camera.
   */
  focusLosses?: number;
  fullscreenExits?: number;
  copyEvents?: number;
  secondsAway?: number;
}

// ---------------------------------------------------------------- calibration

export type TruthLabel = "correct" | "partial" | "wrong" | "dangerous";

export const TRUTH_LABEL: Record<TruthLabel, string> = {
  correct: "Correct",
  partial: "Partly right",
  wrong: "Wrong",
  dangerous: "Unsafe to act on",
};

/** What the candidate sees. The truth field never leaves the server. */
export interface CalibrationItem {
  id: string;
  context: string;
  claim: string;
  statedConfidence: number;
}

export interface CalibrationKey extends CalibrationItem {
  truth: TruthLabel;
  why: string;
}

export interface CalibrationAnswer {
  id: string;
  label: TruthLabel;
  /** How much the candidate would act on it, 0 to 100. */
  trust: number;
}

export interface CalibrationOutcome {
  id: string;
  claim: string;
  truth: TruthLabel;
  chosen: TruthLabel;
  labelCorrect: boolean;
  trust: number;
  idealTrust: number;
  error: number;
  why: string;
}

export interface CalibrationResult {
  answered: number;
  accuracy: number;
  /** Mean absolute distance between stated trust and warranted trust. */
  calibrationError: number;
  /** Positive means systematic over-trust, negative means under-trust. */
  bias: number;
  dangerousMisses: number;
  score: number;
  outcomes: CalibrationOutcome[];
}

// ---------------------------------------------------------------- defence

export interface DefenceAnswer {
  question: string;
  transcript: string;
  durationMs: number;
  typed: boolean;
}

// ---------------------------------------------------------------- results

export interface FacetScore {
  facet: AjqFacet;
  score: number | null;
  positive: number;
  negative: number;
  evidence: number;
}

export interface DimensionScore {
  dimension: Dimension;
  /** Null means unproven. No evidence, no number. */
  score: number | null;
  confidence: number;
  positive: number;
  negative: number;
  evidence: number;
}

export interface ProofProfile {
  dimensions: DimensionScore[];
  ajq: { score: number | null; facets: FacetScore[] };
  trustHealth: number | null;
  observationCount: number;
  provenCount: number;
}

export interface SessionResult {
  sessionId: string;
  challengeId: string;
  domain: Domain;
  candidate: string;
  observations: Observation[];
  profile: ProofProfile;
  calibration: CalibrationResult | null;
  narrative: string;
  strengths: string[];
  gaps: string[];
  coaching: { title: string; action: string; why: string }[];
  flags: string[];
  completedAt: string;
  source: "gemini" | "fixture";
}

// ---------------------------------------------------------------- passport

export interface PassportClaim {
  dimension: Dimension;
  score: number | null;
  evidence: number;
  /** 0 to 1, decayed by the capability's own half-life. */
  freshness: number;
  verifiedAt: string;
  revalidateBy: string;
}

export interface Passport {
  v: 1;
  id: string;
  holder: string;
  claims: PassportClaim[];
  ajq: { score: number | null; facets: FacetScore[] };
  trustHealth: number | null;
  observationCount: number;
  sessions: { id: string; domain: Domain; challengeId: string; completedAt: string }[];
  /** Digest of the full observation set, so evidence can be bound to the claim. */
  evidenceRoot: string;
  issuedAt: string;
  issuer: string;
  statusIndex: number;
}

// ---------------------------------------------------------------- roles

export interface RoleRequirement {
  dimension: Dimension;
  label: string;
  weight: number;
  why: string;
}

export interface RoleSpec {
  id: string;
  title: string;
  seniority: string;
  summary: string;
  requirements: RoleRequirement[];
  createdAt: string;
  source: "gemini" | "fixture";
}

export interface CoverageRow {
  dimension: Dimension;
  label: string;
  required: number;
  held: number | null;
  freshness: number;
  covered: boolean;
  note: string;
}

export interface RoleMatch {
  roleId: string;
  passportId: string;
  holder: string;
  coverage: number;
  rows: CoverageRow[];
  gaps: Dimension[];
}

// ---------------------------------------------------------------- telemetry

export interface GeminiCall {
  id: string;
  at: number;
  label: string;
  model: string;
  capability: string;
  ms: number;
  ok: boolean;
  fixture: boolean;
  /** Which key in the pool served it, 1-based. Never the key itself. */
  key?: number;
  note?: string;
}
