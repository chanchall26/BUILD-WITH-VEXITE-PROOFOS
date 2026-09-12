/**
 * The model half of evidence collection.
 *
 * The deterministic detectors catch what string comparison can settle. This
 * pass catches what only reading can: a candidate who reasoned their way to
 * the right answer without using any of the phrases in the phrasebook, a
 * requirement met in words nobody anticipated, a handover note that will not
 * survive contact with the next shift.
 *
 * It is deliberately constrained. It may only emit observation kinds that
 * genuinely require judgment, it must quote verbatim, and anything it returns
 * without a quote that actually appears in the session is discarded.
 */

import { EVAL_SEED, MODELS } from "./config";
import type { ChallengeSpec, DefenceAnswer, Observation, Turn } from "./domain";
import { observe } from "./evidence";
import { callGemini } from "./gemini";
import { OBSERVER_SYSTEM, observerPrompt } from "./prompts";
import { MODEL_OBSERVABLE, OBSERVER_SCHEMA } from "./schemas";
import { normalise } from "./utils";

type ModelObservable = (typeof MODEL_OBSERVABLE)[number];

interface RawObservation {
  kind: ModelObservable;
  detail: string;
  quote: string;
  source: Observation["source"];
  ref: string;
}

const ALLOWED = new Set<string>(MODEL_OBSERVABLE);

export async function modelObservations(input: {
  sessionId: string;
  spec: ChallengeSpec;
  work: string;
  turns: Turn[];
  defence: DefenceAnswer[];
}): Promise<{ observations: Observation[]; source: "gemini" | "fixture" }> {
  const transcript = input.turns
    .map((t, i) => `[${i}] ${t.role === "candidate" ? "Candidate" : "Counterpart"}: ${t.text}`)
    .join("\n\n");
  const defence = input.defence
    .map((d) => `Q: ${d.question}\nA: ${d.transcript}`)
    .join("\n\n");

  const result = await callGemini<{ observations: RawObservation[] }>({
    label: "extract evidence",
    capability: "Structured output + long-context reading",
    model: MODELS.architect,
    system: OBSERVER_SYSTEM,
    input: observerPrompt({ spec: input.spec, work: input.work, transcript, defence }),
    schema: OBSERVER_SCHEMA,
    thinking: "high",
    seed: EVAL_SEED,
    fixture: () => ({ observations: fixtureObservations(input) }),
  });

  // Everything the session actually contains, for checking quotes against.
  const haystack = normalise([input.work, transcript, defence].join("\n"));

  const observations = (result.data.observations ?? [])
    .filter((o) => ALLOWED.has(o.kind))
    .filter((o) => o.quote && o.quote.trim().length >= 8)
    // A quote that is not in the session did not happen. Drop it rather than
    // let a plausible-sounding invention become evidence.
    .filter((o) => haystack.includes(normalise(o.quote).slice(0, 60)))
    .slice(0, 18)
    .map((o) =>
      observe({
        sessionId: input.sessionId,
        kind: o.kind,
        detail: o.detail,
        quote: o.quote,
        source: o.source,
        detector: "model",
        ref: o.ref,
      }),
    )
    // Model-detected evidence counts, but a shade less than something settled
    // by string comparison, which cannot be talked into seeing things.
    .map((o) => ({ ...o, weight: Math.round(o.weight * 85) / 100 }));

  return { observations, source: result.source };
}

/**
 * What the fixture path returns.
 *
 * Rather than inventing findings, it reads the actual session and reports a
 * few things that are true of it, so demo mode produces a coherent record
 * instead of a canned one.
 */
function fixtureObservations(input: {
  spec: ChallengeSpec;
  work: string;
  turns: Turn[];
  defence: DefenceAnswer[];
}): RawObservation[] {
  const out: RawObservation[] = [];
  const work = input.work ?? "";
  const candidateTurns = input.turns.filter((t) => t.role === "candidate");

  const toolCalls = input.turns.flatMap((t) => t.toolCalls ?? []);
  if (toolCalls.length > 0) {
    const named = [...new Set(toolCalls.map((c) => c.name))];
    const mentioning = candidateTurns.find((t) =>
      named.some((n) => normalise(t.text).includes(normalise(n.replace(/_/g, " ")))),
    );
    if (mentioning) {
      out.push({
        kind: "requested_evidence",
        detail: "Asked the counterpart to go and look at a specific source rather than accept its summary.",
        quote: mentioning.text.slice(0, 200),
        source: "counterpart",
        ref: `turn:${input.turns.indexOf(mentioning)}`,
      });
    }
  }

  // Requirements without a deterministic signal are exactly what this pass is
  // for, so the fixture makes a defensible call on presence of the wording.
  for (const req of input.spec.requirements.filter((r) => !r.signal)) {
    const words = req.text
      .toLowerCase()
      .match(/[a-z]{5,}/g)
      ?.slice(0, 4) ?? [];
    const hit = words.filter((w) => normalise(work).includes(w)).length;
    if (words.length && hit >= Math.ceil(words.length / 2)) {
      out.push({
        kind: "met_requirement",
        detail: `Addressed: ${req.text}`,
        quote: work.slice(0, 180),
        source: "artifact",
        ref: `req:${req.id}`,
      });
    }
  }

  const spoken = input.defence.map((d) => d.transcript).join(" ");
  if (spoken.length > 120) {
    out.push({
      kind: "owned_decision",
      detail: "Talked through the reasoning behind their own choice rather than restating the task.",
      quote: spoken.slice(0, 220),
      source: "defence",
      ref: "defence:0",
    });
  }

  const longestAnswer = [...candidateTurns].sort((a, b) => b.text.length - a.text.length)[0];
  if (longestAnswer && longestAnswer.text.length > 140) {
    out.push({
      kind: "explained_tradeoff",
      detail: "Set out the reasoning behind the approach at length rather than issuing an instruction.",
      quote: longestAnswer.text.slice(0, 200),
      source: "counterpart",
      ref: `turn:${input.turns.indexOf(longestAnswer)}`,
    });
  }

  return out;
}
