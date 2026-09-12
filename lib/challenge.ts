/**
 * Turning a model's challenge design into something safe to run.
 *
 * A generated challenge is not trusted as-is. Markers that already appear in
 * the workspace seed could never be attributed, requirement signals that leak
 * into the brief would be met by copying, and a tool whose result will not
 * parse would break the counterpart mid-session. All of that is repaired or
 * dropped here, before a candidate ever sees it.
 */

import type {
  Beat,
  ChallengeSpec,
  ContextDoc,
  Domain,
  Requirement,
  SimTool,
} from "./domain";
import { normalise, shortId } from "./utils";

/** The raw shape Gemini returns, before repair. */
export interface RawChallenge {
  title: string;
  roleContext: string;
  situation: string;
  deliverable: string;
  workspaceSeed: string;
  requirements: { id: string; text: string; signal: string }[];
  contextDocs: ContextDoc[];
  tools: {
    name: string;
    description: string;
    argument: string;
    argumentDescription: string;
    resultJson: string;
  }[];
  counterpartPersona: string;
  beats: {
    turn: number;
    behaviour: Beat["behaviour"];
    facet: Beat["facet"];
    instruction: string;
    marker: string;
    groundTruth: string;
  }[];
  defenceSeeds: string[];
  transparencyNotice: string;
  estimatedMinutes: number;
}

export function normaliseChallenge(
  raw: RawChallenge,
  domain: Domain,
  source: "gemini" | "fixture",
  grounding?: { title: string; url: string }[],
): ChallengeSpec {
  const seed = raw.workspaceSeed ?? "";
  const briefText = normalise(
    [
      raw.situation,
      raw.deliverable,
      seed,
      ...(raw.contextDocs ?? []).map((d) => d.body),
    ].join(" "),
  );

  // A marker already present in the material the candidate is handed can never
  // be attributed to the counterpart, so the beat is dropped rather than
  // silently mis-scoring someone.
  const beats: Beat[] = (raw.beats ?? [])
    .filter((b) => b.marker && b.marker.length <= 48)
    .filter((b) => !briefText.includes(normalise(b.marker)))
    .map((b, i) => ({ ...b, turn: b.turn > 0 ? b.turn : i + 1 }))
    .sort((a, b) => a.turn - b.turn);

  // The same logic for requirement signals: a signal already in the brief would
  // be satisfied by copying the brief.
  const requirements: Requirement[] = (raw.requirements ?? []).map((r, i) => {
    const usable =
      r.signal && r.signal.length <= 48 && !briefText.includes(normalise(r.signal));
    return {
      id: r.id || `r${i + 1}`,
      text: r.text,
      signal: usable ? r.signal : undefined,
    };
  });

  const tools: SimTool[] = (raw.tools ?? []).map((t) => ({
    name: sanitiseToolName(t.name),
    description: t.description,
    parameters: {
      type: "object",
      properties: {
        [t.argument || "query"]: {
          type: "string",
          description: t.argumentDescription || "What to look up.",
        },
      },
      required: [t.argument || "query"],
    },
    result: parseResult(t.resultJson),
  }));

  return {
    id: shortId("ch"),
    domain,
    title: raw.title,
    roleContext: raw.roleContext,
    situation: raw.situation,
    deliverable: raw.deliverable,
    workspaceSeed: seed,
    requirements,
    contextDocs: raw.contextDocs ?? [],
    tools,
    counterpartPersona: raw.counterpartPersona,
    beats,
    defenceSeeds: raw.defenceSeeds ?? [],
    transparencyNotice: raw.transparencyNotice,
    estimatedMinutes: raw.estimatedMinutes || 12,
    createdAt: new Date().toISOString(),
    grounding,
    source,
  };
}

/** Gemini function names must match ^[a-zA-Z_][a-zA-Z0-9_]*$ */
function sanitiseToolName(name: string): string {
  const cleaned = (name || "lookup").replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 48);
  return /^[a-zA-Z_]/.test(cleaned) ? cleaned : `t_${cleaned}`;
}

/** Tool results arrive as a JSON string. A tool that will not parse is useless. */
function parseResult(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return { note: json?.slice(0, 800) ?? "No data returned." };
  }
}

/**
 * Which beat the counterpart should play next.
 *
 * Beats run in order, one per reply, and each is played once. A candidate who
 * only sends two messages sees two beats, and the ones they never saw are
 * excluded from scoring rather than counted against them.
 */
export function nextBeat(spec: ChallengeSpec, alreadyPlayed: Set<number>): Beat | null {
  return spec.beats.find((b) => !alreadyPlayed.has(b.turn)) ?? null;
}

export function playedBeats(turns: { beats?: number[] }[]): Set<number> {
  const played = new Set<number>();
  for (const t of turns) for (const b of t.beats ?? []) played.add(b);
  return played;
}
