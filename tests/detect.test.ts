/**
 * The deterministic detectors, the sealed answer key, and the repair pass that
 * makes a generated challenge safe to run.
 *
 * These are the parts of PROOFOS that no model touches, which makes them the
 * parts a candidate is entitled to have checked.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { normaliseChallenge, nextBeat, playedBeats, type RawChallenge } from "../lib/challenge.ts";
import { deterministicObservations, integrityFlags } from "../lib/detect.ts";
import type { DefenceAnswer, SessionTelemetry, Turn } from "../lib/domain.ts";
import { FIXTURE_CALIBRATION, FIXTURE_CHALLENGE, FIXTURE_COUNTERPART } from "../lib/fixtures.ts";
import { seal, unseal } from "../lib/seal.ts";

const NOW = 1_770_000_000_000;
const SESSION = "se_detect";

const TELEMETRY: SessionTelemetry = {
  startedAt: NOW,
  submittedAt: NOW + 11 * 60_000,
  pasteEvents: 1,
  pastedChars: 100,
  typedChars: 1200,
  revisions: 60,
};

function played(beat: number, text: string): Turn[] {
  return [
    { role: "candidate", text: "what's going on?", at: NOW },
    { role: "counterpart", text, at: NOW + 1000, beats: [beat] },
  ];
}

function run(over: {
  work?: string;
  turns?: Turn[];
  defence?: DefenceAnswer[];
  telemetry?: Partial<SessionTelemetry>;
}) {
  return deterministicObservations({
    sessionId: SESSION,
    spec: FIXTURE_CHALLENGE,
    work: over.work ?? "",
    turns: over.turns ?? [],
    defence: over.defence ?? [],
    telemetry: { ...TELEMETRY, ...over.telemetry },
  });
}

// ---------------------------------------------------------------- beats

test("a planted defect that survives into the work is recorded against them", () => {
  const observations = run({
    turns: played(1, FIXTURE_COUNTERPART[1]),
    work: "The database is the bottleneck, so we scale the instance.",
  });
  const hit = observations.find((o) => o.kind === "propagated_defect");
  assert.ok(hit, "the marker survived and should be recorded");
  assert.equal(hit.polarity, -1);
  assert.equal(hit.detector, "deterministic");
  assert.equal(hit.ref, "beat:1");
});

test("keeping a defect out only counts when they said something about it", () => {
  const silent = run({
    turns: played(1, FIXTURE_COUNTERPART[1]),
    work: "Rolling back the deploy.",
  });
  assert.equal(
    silent.filter((o) => o.kind === "detected_error").length,
    0,
    "silently not using a suggestion proves nothing either way",
  );

  const vocal = run({
    turns: [
      ...played(1, FIXTURE_COUNTERPART[1]),
      {
        role: "candidate",
        text: "That's correlation, not causation — nearly every request touches the database.",
        at: NOW + 2000,
      },
    ],
    work: "Rolling back the deploy.",
  });
  assert.ok(vocal.some((o) => o.kind === "detected_error"));
});

test("a defect the counterpart never played is excluded entirely", () => {
  const observations = run({ turns: [], work: "anything at all" });
  assert.equal(observations.filter((o) => o.ref?.startsWith("beat:")).length, 0);
});

test("marker matching survives case and whitespace differences", () => {
  const observations = run({
    turns: played(2, FIXTURE_COUNTERPART[2]),
    work: "const   POOL_SIZE   =   200;".replace("POOL_SIZE", "pool_size"),
  });
  assert.ok(observations.some((o) => o.kind === "propagated_defect"));
});

test("scope drift is recorded as a reasoning failure, not a defect", () => {
  const observations = run({
    turns: played(4, FIXTURE_COUNTERPART[4]),
    work: "Also going to migrate to searchclient v3 while we're here.",
  });
  assert.ok(observations.some((o) => o.kind === "followed_scope_drift"));
});

// ---------------------------------------------------------------- dialogue

test("nothing said before the counterpart speaks counts as a response to it", () => {
  const observations = run({
    turns: [
      { role: "candidate", text: "why is this happening? what evidence do we have?", at: NOW },
    ],
  });
  assert.equal(observations.filter((o) => o.source === "counterpart").length, 0);
});

test("asking for evidence and pushing back are recorded separately", () => {
  const observations = run({
    turns: [
      { role: "counterpart", text: "it's the database", at: NOW },
      { role: "candidate", text: "What evidence supports that?", at: NOW + 1 },
      { role: "candidate", text: "That's correlation, not causation.", at: NOW + 2 },
      { role: "candidate", text: "Instead of scaling, let's look at one endpoint.", at: NOW + 3 },
      { role: "candidate", text: "I won't use that until we've checked.", at: NOW + 4 },
    ],
  });
  for (const kind of [
    "requested_evidence",
    "challenged_claim",
    "redirected_approach",
    "withheld_trust",
  ]) {
    assert.ok(
      observations.some((o) => o.kind === kind),
      `expected a ${kind} observation`,
    );
  }
});

test("every observation quotes something the candidate actually said", () => {
  const text = "What evidence supports that conclusion? I'd want the endpoint numbers.";
  const observations = run({
    turns: [
      { role: "counterpart", text: "it's the database", at: NOW },
      { role: "candidate", text, at: NOW + 1 },
    ],
  });
  const quoted = observations.find((o) => o.kind === "requested_evidence");
  assert.ok(quoted);
  assert.ok(text.includes(quoted.quote.slice(0, 30)));
});

// ---------------------------------------------------------------- requirements

test("requirements with a signal are settled by string comparison", () => {
  const met = run({ work: "The regressed route is /v2/search and the cause is an n+1." });
  assert.ok(met.some((o) => o.kind === "met_requirement" && o.ref === "req:r1"));
  assert.ok(met.some((o) => o.kind === "met_requirement" && o.ref === "req:r2"));

  const missed = run({ work: "Something is slow." });
  assert.ok(missed.some((o) => o.kind === "missed_requirement" && o.ref === "req:r1"));
});

// ---------------------------------------------------------------- authorship

test("work pasted from outside the session is flagged without accusing anyone", () => {
  const observations = run({
    work: "x".repeat(600),
    telemetry: { pastedChars: 600, typedChars: 10 },
  });
  const flag = observations.find((o) => o.kind === "unexplained_artifact");
  assert.ok(flag);
  assert.equal(flag.dimension, "authorship");
  assert.ok(!/cheat|dishonest|fraud/i.test(flag.detail));
});

test("a defence naming choices unique to the submission counts for authorship", () => {
  const observations = run({
    work: "Rolled back release 2026.09.08 because loadTags introduced an n+1 in formatResults.",
    defence: [
      {
        question: "why?",
        transcript:
          "I rolled back because loadTags was called inside the results map in formatResults, so fifty results meant fifty-one queries.",
        durationMs: 40_000,
        typed: false,
      },
    ],
  });
  assert.ok(observations.some((o) => o.kind === "owned_decision"));
});

test("a defence that would fit any submission counts against it", () => {
  const observations = run({
    work: "Rolled back release 2026.09.08 because loadTags introduced an n+1 in formatResults.",
    defence: [
      {
        question: "why?",
        transcript:
          "Well, you always want to understand the root cause before you ship a fix, and communication with the team matters a great deal in an incident.",
        durationMs: 40_000,
        typed: false,
      },
    ],
  });
  assert.ok(observations.some((o) => o.kind === "generic_defence"));
});

test("typing the defence instead of speaking it is treated identically", () => {
  const shared = {
    work: "Rolled back release 2026.09.08 because loadTags introduced an n+1 in formatResults.",
    transcript:
      "I rolled back because loadTags ran inside the results map in formatResults, so fifty results became fifty-one queries.",
  };
  const spoken = run({
    work: shared.work,
    defence: [{ question: "q", transcript: shared.transcript, durationMs: 41_000, typed: false }],
  });
  const written = run({
    work: shared.work,
    defence: [{ question: "q", transcript: shared.transcript, durationMs: 0, typed: true }],
  });
  assert.deepEqual(
    spoken.map((o) => o.kind).sort(),
    written.map((o) => o.kind).sort(),
  );
});

// ---------------------------------------------------------------- flags

test("integrity flags state facts rather than accusations", () => {
  const counterpartText = FIXTURE_COUNTERPART[1];
  const turns = played(1, counterpartText);
  const observations = run({ turns, work: counterpartText });
  const flags = integrityFlags(FIXTURE_CHALLENGE, counterpartText, turns, TELEMETRY, observations);
  assert.ok(flags.length > 0);
  for (const flag of flags) {
    assert.ok(!/cheat|liar|dishonest|fraud/i.test(flag), `flag reads as an accusation: ${flag}`);
  }
});

test("finishing implausibly fast is noted", () => {
  const flags = integrityFlags(
    FIXTURE_CHALLENGE,
    "done",
    [],
    { ...TELEMETRY, submittedAt: NOW + 90_000 },
    [],
  );
  assert.ok(flags.some((f) => /minutes/i.test(f)));
});

// ---------------------------------------------------------------- sealing

test("the sealed answer key round-trips and is opaque", () => {
  const sealed = seal(FIXTURE_CALIBRATION);
  assert.ok(!sealed.includes("dangerous"));
  assert.ok(!sealed.includes(FIXTURE_CALIBRATION[0].why.slice(0, 20)));
  const back = unseal<typeof FIXTURE_CALIBRATION>(sealed);
  assert.deepEqual(back, FIXTURE_CALIBRATION);
});

test("a tampered seal will not open", () => {
  const sealed = seal({ truth: "dangerous" });
  const parts = sealed.split(".");
  const body = parts[2];
  const flipped = body[0] === "A" ? "B" : "A";
  assert.equal(unseal(`${parts[0]}.${parts[1]}.${flipped}${body.slice(1)}.${parts[3]}`), null);
});

test("a malformed seal returns null rather than throwing", () => {
  for (const junk of ["", "nope", "s1.a.b", "s2.a.b.c"]) {
    assert.equal(unseal(junk), null);
  }
});

// ---------------------------------------------------------------- repair

const RAW: RawChallenge = {
  title: "T",
  roleContext: "R",
  situation: "The retry budget is exhausted and pool_size = 200 is already in the config.",
  deliverable: "Fix it",
  workspaceSeed: "// starter with cacheKey = userId already present",
  requirements: [
    { id: "r1", text: "leaks", signal: "retry budget" },
    { id: "r2", text: "usable", signal: "unique constraint" },
  ],
  contextDocs: [{ label: "l", kind: "log", body: "b" }],
  tools: [
    {
      name: "check metrics!",
      description: "d",
      argument: "window",
      argumentDescription: "w",
      resultJson: '{"cpu":82}',
    },
    {
      name: "broken",
      description: "d",
      argument: "q",
      argumentDescription: "w",
      resultJson: "not json at all",
    },
  ],
  counterpartPersona: "p",
  beats: [
    {
      turn: 1,
      behaviour: "assert_unsupported",
      facet: "detect",
      instruction: "i",
      marker: "pool_size = 200",
      groundTruth: "g",
    },
    {
      turn: 2,
      behaviour: "subtle_defect",
      facet: "correct",
      instruction: "i",
      marker: "cacheKey = userId",
      groundTruth: "g",
    },
    {
      turn: 3,
      behaviour: "overconfidence",
      facet: "verify",
      instruction: "i",
      marker: "shardCount = 16",
      groundTruth: "g",
    },
  ],
  defenceSeeds: ["s"],
  transparencyNotice: "n",
  estimatedMinutes: 12,
};

test("a beat whose marker is already in the brief is dropped, not mis-scored", () => {
  const spec = normaliseChallenge(RAW, "software", "gemini");
  const markers = spec.beats.map((b) => b.marker);
  assert.ok(!markers.includes("pool_size = 200"), "already in the situation text");
  assert.ok(!markers.includes("cacheKey = userId"), "already in the workspace seed");
  assert.deepEqual(markers, ["shardCount = 16"]);
});

test("a requirement signal already in the brief is demoted to a judgment call", () => {
  const spec = normaliseChallenge(RAW, "software", "gemini");
  assert.equal(spec.requirements.find((r) => r.id === "r1")?.signal, undefined);
  assert.equal(spec.requirements.find((r) => r.id === "r2")?.signal, "unique constraint");
});

test("tool names are made callable and unparseable results do not break the run", () => {
  const spec = normaliseChallenge(RAW, "software", "gemini");
  for (const tool of spec.tools) {
    assert.match(tool.name, /^[a-zA-Z_][a-zA-Z0-9_]*$/);
  }
  assert.deepEqual(spec.tools[0].result, { cpu: 82 });
  assert.ok(typeof spec.tools[1].result === "object" && spec.tools[1].result !== null);
});

test("beats are played in order, once each", () => {
  const spec = FIXTURE_CHALLENGE;
  const seen = new Set<number>();
  const order: number[] = [];
  for (let i = 0; i < spec.beats.length + 2; i++) {
    const beat = nextBeat(spec, seen);
    if (!beat) break;
    order.push(beat.turn);
    seen.add(beat.turn);
  }
  assert.deepEqual(order, [1, 2, 3, 4]);
  assert.equal(nextBeat(spec, seen), null, "no beat is played twice");
});

test("played beats are read back off the transcript", () => {
  assert.deepEqual([...playedBeats([{ beats: [1] }, {}, { beats: [3, 1] }])].sort(), [1, 3]);
});
