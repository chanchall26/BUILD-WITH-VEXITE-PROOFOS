/**
 * The evaluation pipeline, end to end.
 *
 * Four things happen here, in this order, and the order matters:
 *   1. Deterministic detectors read the session. No model involved.
 *   2. A Gemini pass extracts what only reading can see, quoting verbatim.
 *   3. Calibration answers are graded arithmetically against the sealed key.
 *   4. All the observations are pooled, and the profile is derived from them.
 *
 * A model writes the narrative afterwards, from the observations and the
 * already-computed scores. It never touches a number.
 */

import { EVAL_SEED, MODELS, SCORING } from "./config";
import { deterministicObservations, integrityFlags } from "./detect";
import {
  DIMENSION_LABEL,
  type CalibrationAnswer,
  type CalibrationKey,
  type CalibrationResult,
  type ChallengeSpec,
  type DefenceAnswer,
  type Observation,
  type Passport,
  type ProofProfile,
  type SessionResult,
  type SessionTelemetry,
  type Turn,
} from "./domain";
import {
  buildClaims,
  calibrationObservations,
  deriveProfile,
  evidenceRoot,
  scoreCalibration,
} from "./evidence";
import { callGemini } from "./gemini";
import { modelObservations } from "./observer";
import { NARRATIVE_SYSTEM, narrativePrompt } from "./prompts";
import { NARRATIVE_SCHEMA } from "./schemas";
import { issuerDid } from "./config";
import { shortId } from "./utils";

export interface EvaluateInput {
  spec: ChallengeSpec;
  holder: string;
  work: string;
  turns: Turn[];
  defence: DefenceAnswer[];
  telemetry: SessionTelemetry;
  calibrationKey: CalibrationKey[] | null;
  calibrationAnswers: CalibrationAnswer[] | null;
}

interface Narrative {
  narrative: string;
  strengths: string[];
  gaps: string[];
  coaching: { title: string; action: string; why: string }[];
}

export interface EvaluateOutput {
  result: SessionResult;
  passport: Passport;
}

export async function evaluateSession(input: EvaluateInput): Promise<EvaluateOutput> {
  const sessionId = shortId("se");

  // 1 — deterministic
  const deterministic = deterministicObservations({
    sessionId,
    spec: input.spec,
    work: input.work,
    turns: input.turns,
    defence: input.defence,
    telemetry: input.telemetry,
  });

  // 2 — model, in parallel with nothing else because it needs the full session
  const { observations: fromModel, source: modelSource } = await modelObservations({
    sessionId,
    spec: input.spec,
    work: input.work,
    turns: input.turns,
    defence: input.defence,
  });

  // 3 — calibration
  let calibration: CalibrationResult | null = null;
  let calibrationObs: Observation[] = [];
  if (input.calibrationKey && input.calibrationAnswers?.length) {
    calibration = scoreCalibration(input.calibrationKey, input.calibrationAnswers);
    calibrationObs = calibrationObservations(sessionId, calibration);
  }

  // 4 — pool and derive
  const observations = dedupe([...deterministic, ...fromModel, ...calibrationObs]);
  const profile = deriveProfile(observations);
  const flags = integrityFlags(
    input.spec,
    input.work,
    input.turns,
    input.telemetry,
    observations,
  );
  if (profile.ajq.score !== null && profile.ajq.score < SCORING.reviewThreshold) {
    flags.push(
      `AI judgment scored ${profile.ajq.score} against a review threshold of ${SCORING.reviewThreshold}.`,
    );
  }

  const narrative = await writeNarrative(input.spec, profile, observations, flags);

  const completedAt = new Date().toISOString();
  const result: SessionResult = {
    sessionId,
    challengeId: input.spec.id,
    domain: input.spec.domain,
    candidate: input.holder,
    observations,
    profile,
    calibration,
    narrative: narrative.data.narrative,
    strengths: narrative.data.strengths,
    gaps: narrative.data.gaps,
    coaching: narrative.data.coaching,
    flags,
    completedAt,
    source: modelSource === "gemini" && narrative.source === "gemini" ? "gemini" : "fixture",
  };

  const passport: Passport = {
    v: 1,
    id: shortId("pp"),
    holder: input.holder,
    claims: buildClaims(profile, completedAt),
    ajq: profile.ajq,
    trustHealth: profile.trustHealth,
    observationCount: observations.length,
    sessions: [
      {
        id: sessionId,
        domain: input.spec.domain,
        challengeId: input.spec.id,
        completedAt,
      },
    ],
    evidenceRoot: evidenceRoot(observations),
    issuedAt: completedAt,
    issuer: issuerDid(),
    statusIndex: statusIndexFor(sessionId),
  };

  return { result, passport };
}

function dedupe(observations: Observation[]): Observation[] {
  const seen = new Set<string>();
  const out: Observation[] = [];
  for (const o of observations) {
    // Deterministic evidence wins a tie with model evidence about the same moment.
    const key = `${o.kind}:${o.ref ?? o.hash}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * Status list indices are assigned from the session id rather than a counter,
 * so a stateless deployment still issues distinct, stable indices and a
 * revocation recorded against one credential cannot silently hit another.
 */
function statusIndexFor(sessionId: string): number {
  let h = 2166136261;
  for (let i = 0; i < sessionId.length; i++) {
    h ^= sessionId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 16_384;
}

async function writeNarrative(
  spec: ChallengeSpec,
  profile: ProofProfile,
  observations: Observation[],
  flags: string[],
) {
  const scores = profile.dimensions
    .map(
      (d) =>
        `- ${DIMENSION_LABEL[d.dimension]}: ${d.score ?? "unproven"} (${d.evidence} observations, +${d.positive} / -${d.negative})`,
    )
    .join("\n");

  const evidence = observations
    .map(
      (o) =>
        `- [${o.polarity === 1 ? "+" : "-"}] ${o.kind} (${o.detector}, ${o.source}) — ${o.detail} :: "${o.quote.slice(0, 160)}"`,
    )
    .join("\n");

  return callGemini<Narrative>({
    label: "write evidence record",
    capability: "Structured output + grounded summarisation",
    model: MODELS.architect,
    system: NARRATIVE_SYSTEM,
    input: narrativePrompt({ spec, scores, observations: evidence, flags }),
    schema: NARRATIVE_SCHEMA,
    thinking: "high",
    seed: EVAL_SEED,
    fixture: () => fixtureNarrative(profile, observations, flags),
  });
}

/**
 * The fixture narrative is generated from the actual observations rather than
 * being a canned paragraph, so a demo-mode run still describes what happened
 * in that particular session.
 */
function fixtureNarrative(
  profile: ProofProfile,
  observations: Observation[],
  flags: string[],
): Narrative {
  const positives = observations.filter((o) => o.polarity === 1);
  const negatives = observations.filter((o) => o.polarity === -1);
  const strongest = [...profile.dimensions]
    .filter((d) => d.score !== null)
    .sort((a, b) => (b.score as number) - (a.score as number))[0];
  const weakest = [...profile.dimensions]
    .filter((d) => d.score !== null)
    .sort((a, b) => (a.score as number) - (b.score as number))[0];

  const ajq = profile.ajq.score;
  const headline =
    ajq === null
      ? "Not enough interaction with the counterpart to say anything about AI judgment."
      : ajq >= 70
        ? "Handled a confident, sometimes wrong counterpart without taking it at its word."
        : ajq >= 45
          ? "Caught some of what the counterpart got wrong and let the rest through."
          : "Accepted the counterpart's conclusions largely as given.";

  const narrative = [
    headline,
    strongest
      ? `Strongest evidence is in ${DIMENSION_LABEL[strongest.dimension].toLowerCase()} at ${strongest.score}, from ${strongest.evidence} observations.`
      : "",
    flags.length ? `Flagged for review: ${flags[0].toLowerCase()}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    narrative,
    strengths: positives.slice(0, 3).map((o) => o.detail),
    gaps: negatives.length
      ? negatives.slice(0, 3).map((o) => o.detail)
      : ["No negative evidence recorded, though the session was short enough that this proves little."],
    coaching: [
      {
        title: "Ask what would have to be true",
        action:
          "Before accepting any conclusion from an assistant, say out loud what evidence would have to exist for it to hold, then go and check whether it does.",
        why: weakest
          ? `Your thinnest evidence is in ${DIMENSION_LABEL[weakest.dimension].toLowerCase()}, and this is the habit that produces it.`
          : "It is the single habit that separates supervising a model from reading its output.",
      },
      {
        title: "Make the counterpart show its working",
        action:
          "When it hands you a number, ask which source it came from. It has tools; make it use them in front of you.",
        why: `You recorded ${observations.filter((o) => o.kind === "requested_evidence").length} evidence requests in this session.`,
      },
      {
        title: "Say what you gave up",
        action:
          "For every choice in the finished work, add one clause naming the alternative you rejected and why.",
        why: "It is the difference between work that reads as correct and work a reviewer can actually check.",
      },
    ],
  };
}
