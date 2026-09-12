/**
 * Deterministic observation detectors.
 *
 * These read a finished session and emit observations by string comparison and
 * arithmetic. No model is involved, so a candidate who disputes a finding gets
 * the same answer on recomputation, and a reviewer can check it by eye.
 *
 * The model-driven observer in lib/observer.ts adds what these cannot see. The
 * two sets are merged, and every observation carries which detector produced
 * it, so an employer can weight them differently if they want to.
 */

import type {
  Beat,
  ChallengeSpec,
  DefenceAnswer,
  Observation,
  ObservationKind,
  SessionTelemetry,
  Turn,
} from "./domain";
import { observe } from "./evidence";
import { normalise, verbatimOverlap } from "./utils";

// ---------------------------------------------------------------- phrasebook

/**
 * Phrase families, kept explicit rather than hidden in a model, because a
 * candidate is entitled to know what counted as pushing back.
 */
const PHRASES = {
  requestedEvidence: [
    "what evidence",
    "what's the evidence",
    "whats the evidence",
    "show me",
    "how do you know",
    "based on what",
    "where does that come from",
    "cite",
    "source",
    "prove",
    "which log",
    "what data",
    "can you check",
    "did you actually",
    "verify",
  ],
  challengedClaim: [
    "correlation",
    "doesn't follow",
    "does not follow",
    "doesnt follow",
    "unsupported",
    "that contradicts",
    "contradicts",
    "are you sure",
    "that's wrong",
    "thats wrong",
    "i don't think",
    "i dont think",
    "that assumes",
    "assumption",
    "no reason to think",
    "but the log",
    "but the data",
    "that's not what",
    "thats not what",
    "you said earlier",
    "why would",
  ],
  redirected: [
    "instead",
    "rather than",
    "let's start with",
    "lets start with",
    "different approach",
    "before we",
    "first check",
    "narrow it down",
    "isolate",
    "break it down",
    "step back",
  ],
  withheldTrust: [
    "i won't use",
    "i wont use",
    "not going to use",
    "can't act on",
    "cant act on",
    "not enough to act",
    "i'll verify",
    "ill verify",
    "need more before",
    "not confident enough",
    "i'd rather not",
    "id rather not",
    "hold off",
  ],
  explainedTradeoff: [
    "trade-off",
    "tradeoff",
    "the cost is",
    "downside",
    "we give up",
    "in exchange",
    "at the expense of",
    "the risk is",
    "worth it because",
  ],
} as const;

function matches(text: string, family: readonly string[]): string | null {
  const t = normalise(text);
  for (const phrase of family) if (t.includes(phrase)) return phrase;
  return null;
}

/** A sentence containing the phrase, so the observation quotes something real. */
function sentenceAround(text: string, phrase: string): string {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/);
  const hit = sentences.find((s) => normalise(s).includes(phrase));
  return (hit ?? text).trim().slice(0, 260);
}

// ---------------------------------------------------------------- counterpart

/**
 * What happened to each planted beat.
 *
 * A beat only counts if the counterpart actually played it. Beats the
 * candidate was never shown are excluded entirely, so nobody is marked down
 * for advice that never reached them.
 */
export function beatObservations(
  sessionId: string,
  spec: ChallengeSpec,
  turns: Turn[],
  work: string,
): Observation[] {
  const played = new Set<number>();
  const playedAt = new Map<number, number>();
  turns.forEach((turn, index) => {
    for (const beat of turn.beats ?? []) {
      played.add(beat);
      if (!playedAt.has(beat)) playedAt.set(beat, index);
    }
  });

  const normalisedWork = normalise(work);
  const out: Observation[] = [];

  for (const beat of spec.beats) {
    if (!played.has(beat.turn)) continue;
    const marker = normalise(beat.marker);
    const absorbed = marker.length > 0 && normalisedWork.includes(marker);

    if (absorbed) {
      out.push(
        observe({
          sessionId,
          kind: beat.behaviour === "scope_drift" ? "followed_scope_drift" : "propagated_defect",
          detail: `Carried the counterpart's ${describe(beat)} straight into the finished work.`,
          quote: beat.marker,
          source: "counterpart",
          detector: "deterministic",
          ref: `beat:${beat.turn}`,
        }),
      );
      continue;
    }

    // Not absorbed. That is only evidence of detection if they said something
    // about it; silently not using a suggestion proves nothing either way.
    const from = playedAt.get(beat.turn) ?? 0;
    const rebuttal = turns
      .slice(from + 1)
      .find((t) => t.role === "candidate" && matches(t.text, PHRASES.challengedClaim));

    if (rebuttal) {
      const phrase = matches(rebuttal.text, PHRASES.challengedClaim)!;
      out.push(
        observe({
          sessionId,
          kind: "detected_error",
          detail: `Pushed back on the counterpart's ${describe(beat)} and kept it out of the work.`,
          quote: sentenceAround(rebuttal.text, phrase),
          source: "counterpart",
          detector: "deterministic",
          ref: `beat:${beat.turn}`,
        }),
      );
    }
  }

  return out;
}

function describe(beat: Beat): string {
  switch (beat.behaviour) {
    case "assert_unsupported":
      return "unsupported conclusion";
    case "subtle_defect":
      return "planted defect";
    case "scope_drift":
      return "quiet change of scope";
    case "overconfidence":
      return "overconfident claim";
    case "partial_work":
      return "half-finished deliverable";
    case "conflicting_evidence":
      return "self-contradicting evidence";
    default:
      return "suggestion";
  }
}

/** What each candidate turn did, by phrase family. */
const DIALOGUE_CHECKS: {
  family: keyof typeof PHRASES;
  kind: ObservationKind;
  detail: string;
}[] = [
  {
    family: "requestedEvidence",
    kind: "requested_evidence",
    detail: "Asked the counterpart to show its evidence.",
  },
  {
    family: "challengedClaim",
    kind: "challenged_claim",
    detail: "Questioned a claim the counterpart had not supported.",
  },
  {
    family: "redirected",
    kind: "redirected_approach",
    detail: "Steered the counterpart onto a different approach.",
  },
  {
    family: "withheldTrust",
    kind: "withheld_trust",
    detail: "Declined to act on the counterpart's output.",
  },
  {
    family: "explainedTradeoff",
    kind: "explained_tradeoff",
    detail: "Named what the chosen approach costs.",
  },
];

/** Everything the candidate said to the counterpart, classified. */
export function dialogueObservations(sessionId: string, turns: Turn[]): Observation[] {
  const out: Observation[] = [];
  let counterpartHasSpoken = false;

  turns.forEach((turn, index) => {
    if (turn.role === "counterpart") {
      counterpartHasSpoken = true;
      return;
    }
    // Nothing said before the counterpart speaks can be a response to it.
    if (!counterpartHasSpoken) return;

    for (const check of DIALOGUE_CHECKS) {
      const phrase = matches(turn.text, PHRASES[check.family]);
      if (!phrase) continue;
      out.push(
        observe({
          sessionId,
          kind: check.kind,
          detail: check.detail,
          quote: sentenceAround(turn.text, phrase),
          source: "counterpart",
          detector: "deterministic",
          ref: `turn:${index}`,
        }),
      );
    }
  });

  return dedupe(out);
}

// ---------------------------------------------------------------- execution

export function requirementObservations(
  sessionId: string,
  spec: ChallengeSpec,
  work: string,
): Observation[] {
  const normalisedWork = normalise(work);
  const out: Observation[] = [];

  for (const req of spec.requirements) {
    if (!req.signal) continue; // left to the observer pass
    const met = normalisedWork.includes(normalise(req.signal));
    out.push(
      observe({
        sessionId,
        kind: met ? "met_requirement" : "missed_requirement",
        detail: met ? `Met: ${req.text}` : `Not present in the finished work: ${req.text}`,
        quote: req.signal,
        source: "artifact",
        detector: "deterministic",
        ref: `req:${req.id}`,
      }),
    );
  }

  return out;
}

// ---------------------------------------------------------------- authorship

/**
 * Authorship without biometrics.
 *
 * The question is not "is this the same face as last time". It is "did the
 * person speaking about this work make the decisions in it". Two signals
 * answer that: whether the work arrived from outside the session, and whether
 * the spoken defence names things that exist only in this particular
 * submission.
 */
export function authorshipObservations(
  sessionId: string,
  spec: ChallengeSpec,
  work: string,
  turns: Turn[],
  defence: DefenceAnswer[],
  telemetry: SessionTelemetry,
): Observation[] {
  const out: Observation[] = [];

  const counterpartText = turns
    .filter((t) => t.role === "counterpart")
    .map((t) => t.text)
    .join("\n\n");
  const fromCounterpart = verbatimOverlap(work, counterpartText);
  const totalChars = telemetry.pastedChars + telemetry.typedChars;
  const pasteRatio = totalChars > 0 ? telemetry.pastedChars / totalChars : 0;

  if (pasteRatio > 0.9 && fromCounterpart < 0.3 && work.trim().length > 400) {
    out.push(
      observe({
        sessionId,
        kind: "unexplained_artifact",
        detail: `${Math.round(pasteRatio * 100)}% of the work arrived as paste events, and it did not come from the counterpart.`,
        quote: work.trim().slice(0, 180),
        source: "artifact",
        detector: "deterministic",
        ref: "telemetry:paste",
      }),
    );
  }

  // Leaving the test is not cheating on its own. People get interrupted. It
  // becomes evidence only when it happens repeatedly AND a lot of the work
  // arrived by paste, because that pair is what "went and fetched an answer"
  // actually looks like.
  const away = telemetry.focusLosses ?? 0;
  const exits = telemetry.fullscreenExits ?? 0;
  if (away >= 3 && pasteRatio > 0.6) {
    out.push(
      observe({
        sessionId,
        kind: "left_the_test",
        detail: `Left the test ${away} times while ${Math.round(pasteRatio * 100)}% of the work arrived by paste.`,
        quote: `${away} switches away, ${exits} full-screen exits, ${Math.round((telemetry.secondsAway ?? 0))}s off-task`,
        source: "artifact",
        detector: "deterministic",
        ref: "telemetry:focus",
      }),
    );
  }

  const fingerprints = distinctiveTokens(work, spec);
  const spoken = normalise(defence.map((d) => d.transcript).join(" "));

  if (spoken.length > 60) {
    const named = fingerprints.filter((token) => spoken.includes(normalise(token)));
    if (named.length >= 2) {
      out.push(
        observe({
          sessionId,
          kind: "owned_decision",
          detail: `Spoke about ${named.length} choices that exist only in this submission: ${named.slice(0, 3).join(", ")}.`,
          quote: spoken.slice(0, 260),
          source: "defence",
          detector: "deterministic",
          ref: "defence:specificity",
        }),
      );
    } else if (fingerprints.length >= 3 && named.length === 0) {
      out.push(
        observe({
          sessionId,
          kind: "generic_defence",
          detail:
            "The spoken defence never named a single decision specific to this submission, though the work contains several.",
          quote: spoken.slice(0, 260),
          source: "defence",
          detector: "deterministic",
          ref: "defence:specificity",
        }),
      );
    }
  }

  return out;
}

/**
 * Identifiers, numbers and quoted strings that appear in the finished work but
 * not in the brief the candidate was handed. If they made a choice, these are
 * the traces of it.
 */
function distinctiveTokens(work: string, spec: ChallengeSpec): string[] {
  const briefText = normalise(
    [
      spec.situation,
      spec.deliverable,
      spec.workspaceSeed,
      ...spec.contextDocs.map((d) => d.body),
      ...spec.requirements.map((r) => r.text),
    ].join(" "),
  );

  const candidates = work.match(/[A-Za-z_][A-Za-z0-9_]{4,28}|\d+(?:\.\d+)?(?:ms|s|%|x)?/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of candidates) {
    const token = raw.trim();
    const key = normalise(token);
    if (key.length < 4 || seen.has(key)) continue;
    if (STOPWORDS.has(key)) continue;
    if (briefText.includes(key)) continue;
    seen.add(key);
    out.push(token);
    if (out.length >= 12) break;
  }
  return out;
}

const STOPWORDS = new Set([
  "const","await","async","function","return","import","export","from","this","that","with","which",
  "there","their","would","could","should","because","about","after","before","where","while","these",
  "those","other","every","first","using","value","result","error","string","number","object","array",
  "true","false","null","undefined","then","else","catch","throw","class","interface","type",
]);

// ---------------------------------------------------------------- assembly

function dedupe(observations: Observation[]): Observation[] {
  const seen = new Set<string>();
  return observations.filter((o) => {
    const key = `${o.kind}:${o.ref}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Everything the deterministic layer can see, in one call. */
export function deterministicObservations(input: {
  sessionId: string;
  spec: ChallengeSpec;
  work: string;
  turns: Turn[];
  defence: DefenceAnswer[];
  telemetry: SessionTelemetry;
}): Observation[] {
  const { sessionId, spec, work, turns, defence, telemetry } = input;
  return dedupe([
    ...beatObservations(sessionId, spec, turns, work),
    ...dialogueObservations(sessionId, turns),
    ...requirementObservations(sessionId, spec, work),
    ...authorshipObservations(sessionId, spec, work, turns, defence, telemetry),
  ]);
}

/** Integrity notes for the reviewer. Facts, not accusations. */
export function integrityFlags(
  spec: ChallengeSpec,
  work: string,
  turns: Turn[],
  telemetry: SessionTelemetry,
  observations: Observation[],
): string[] {
  const flags: string[] = [];

  const counterpartText = turns
    .filter((t) => t.role === "counterpart")
    .map((t) => t.text)
    .join("\n\n");
  const verbatim = verbatimOverlap(work, counterpartText);
  if (verbatim >= 0.85) {
    flags.push(`${Math.round(verbatim * 100)}% of the submitted work is word for word from the counterpart.`);
  }

  const playedBeats = new Set(turns.flatMap((t) => t.beats ?? []));
  const absorbed = observations.filter(
    (o) => o.kind === "propagated_defect" || o.kind === "followed_scope_drift",
  ).length;
  if (playedBeats.size >= 2 && absorbed === playedBeats.size) {
    flags.push(`Every one of the ${playedBeats.size} planted defects reached the finished work.`);
  }

  if (observations.some((o) => o.kind === "unexplained_artifact")) {
    flags.push("The work arrived by paste from outside the session.");
  }
  if (observations.some((o) => o.kind === "generic_defence")) {
    flags.push("The spoken defence did not reference any decision specific to this submission.");
  }
  if (observations.some((o) => o.kind === "trusted_dangerous")) {
    flags.push("Assigned actionable trust to an output flagged unsafe in the calibration set.");
  }

  const minutes = Math.max(0, telemetry.submittedAt - telemetry.startedAt) / 60000;
  if (minutes > 0 && minutes < spec.estimatedMinutes * 0.3) {
    flags.push(
      `Finished in ${minutes.toFixed(1)} minutes against a ${spec.estimatedMinutes}-minute task.`,
    );
  }

  // Stated as counts, for a human to weigh. Being interrupted is not cheating,
  // and the record should not pretend to know the difference.
  const away = telemetry.focusLosses ?? 0;
  const secondsAway = Math.round(telemetry.secondsAway ?? 0);
  if (away >= 3) {
    flags.push(
      `Switched away from the test ${away} times, ${secondsAway} seconds off-task in total.`,
    );
  }
  if ((telemetry.fullscreenExits ?? 0) >= 2) {
    flags.push(`Left full screen ${telemetry.fullscreenExits} times.`);
  }
  if ((telemetry.copyEvents ?? 0) >= 3) {
    flags.push(`Copied from the test ${telemetry.copyEvents} times.`);
  }

  return flags;
}
