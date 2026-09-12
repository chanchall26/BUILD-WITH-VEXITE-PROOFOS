/**
 * Two kinds of schema.
 *
 * The `*_SCHEMA` objects are plain JSON Schema handed to Gemini's structured
 * output, so a model returns data rather than prose we then regex. The `z*`
 * objects validate what arrives from a browser.
 */

import { z } from "zod";
import { AJQ_FACETS, DIMENSIONS, DOMAINS } from "./domain";

// ---------------------------------------------------------------- Gemini

export const CHALLENGE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    roleContext: { type: "string" },
    situation: { type: "string" },
    deliverable: { type: "string" },
    workspaceSeed: { type: "string" },
    requirements: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          signal: { type: "string" },
        },
        required: ["id", "text", "signal"],
      },
    },
    contextDocs: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          kind: { type: "string", enum: ["message", "log", "table", "doc", "snippet"] },
          body: { type: "string" },
        },
        required: ["label", "kind", "body"],
      },
    },
    tools: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          argument: { type: "string" },
          argumentDescription: { type: "string" },
          resultJson: { type: "string" },
        },
        required: ["name", "description", "argument", "argumentDescription", "resultJson"],
      },
    },
    counterpartPersona: { type: "string" },
    beats: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          turn: { type: "integer" },
          behaviour: {
            type: "string",
            enum: [
              "assert_unsupported",
              "subtle_defect",
              "scope_drift",
              "overconfidence",
              "partial_work",
              "conflicting_evidence",
            ],
          },
          facet: { type: "string", enum: [...AJQ_FACETS] },
          instruction: { type: "string" },
          marker: { type: "string" },
          groundTruth: { type: "string" },
        },
        required: ["turn", "behaviour", "facet", "instruction", "marker", "groundTruth"],
      },
    },
    defenceSeeds: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
    transparencyNotice: { type: "string" },
    estimatedMinutes: { type: "integer" },
  },
  required: [
    "title",
    "roleContext",
    "situation",
    "deliverable",
    "workspaceSeed",
    "requirements",
    "contextDocs",
    "tools",
    "counterpartPersona",
    "beats",
    "defenceSeeds",
    "transparencyNotice",
    "estimatedMinutes",
  ],
} as const satisfies Record<string, unknown>;

export const CALIBRATION_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      minItems: 10,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          context: { type: "string" },
          claim: { type: "string" },
          statedConfidence: { type: "integer" },
          truth: { type: "string", enum: ["correct", "partial", "wrong", "dangerous"] },
          why: { type: "string" },
        },
        required: ["id", "context", "claim", "statedConfidence", "truth", "why"],
      },
    },
  },
  required: ["items"],
} as const satisfies Record<string, unknown>;

/**
 * Kinds the observer model is permitted to emit.
 *
 * Anything settled by string comparison or arithmetic is deliberately absent:
 * whether a planted defect reached the finished work, whether the work was
 * pasted in from outside, and every calibration outcome are computed, not
 * judged. The model contributes what only reading can see.
 */
export const MODEL_OBSERVABLE = [
  "detected_error",
  "challenged_claim",
  "requested_evidence",
  "redirected_approach",
  "corrected_output",
  "withheld_trust",
  "accepted_unverified",
  "followed_scope_drift",
  "met_requirement",
  "missed_requirement",
  "explained_tradeoff",
  "unclear_handoff",
  "owned_decision",
  "generic_defence",
] as const;

export const OBSERVER_SCHEMA = {
  type: "object",
  properties: {
    observations: {
      type: "array",
      maxItems: 18,
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: [...MODEL_OBSERVABLE] },
          detail: { type: "string" },
          quote: { type: "string" },
          source: {
            type: "string",
            enum: ["counterpart", "artifact", "calibration", "defence"],
          },
          ref: { type: "string" },
        },
        required: ["kind", "detail", "quote", "source", "ref"],
      },
    },
  },
  required: ["observations"],
} as const satisfies Record<string, unknown>;

export const NARRATIVE_SCHEMA = {
  type: "object",
  properties: {
    narrative: { type: "string" },
    strengths: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
    gaps: { type: "array", minItems: 1, maxItems: 3, items: { type: "string" } },
    coaching: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          action: { type: "string" },
          why: { type: "string" },
        },
        required: ["title", "action", "why"],
      },
    },
  },
  required: ["narrative", "strengths", "gaps", "coaching"],
} as const satisfies Record<string, unknown>;

export const ROLE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    seniority: { type: "string" },
    summary: { type: "string" },
    requirements: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          dimension: { type: "string", enum: [...DIMENSIONS] },
          label: { type: "string" },
          weight: { type: "integer" },
          why: { type: "string" },
        },
        required: ["dimension", "label", "weight", "why"],
      },
    },
  },
  required: ["title", "seniority", "summary", "requirements"],
} as const satisfies Record<string, unknown>;

export const QUESTIONS_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          probes: { type: "string" },
          weakAnswerLooksLike: { type: "string" },
        },
        required: ["question", "probes", "weakAnswerLooksLike"],
      },
    },
  },
  required: ["questions"],
} as const satisfies Record<string, unknown>;

export const PULSE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    stats: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          value: { type: "string" },
          label: { type: "string" },
          sourceName: { type: "string" },
        },
        required: ["value", "label", "sourceName"],
      },
    },
  },
  required: ["headline", "stats"],
} as const satisfies Record<string, unknown>;

export const GAP_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    minutes: { type: "integer" },
    prompt: { type: "string" },
    whatItProves: { type: "string" },
    successLooksLike: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
  },
  required: ["title", "minutes", "prompt", "whatItProves", "successLooksLike"],
} as const satisfies Record<string, unknown>;

// ---------------------------------------------------------------- requests

const zDomain = z.enum(DOMAINS);

export const zChallengeRequest = z.object({
  domain: zDomain,
  roleContext: z.string().max(4000).optional(),
  calibrate: z.boolean().default(false),
});

export const zTurn = z.object({
  role: z.enum(["candidate", "counterpart"]),
  text: z.string().max(20000),
  at: z.number(),
  beats: z.array(z.number()).optional(),
  toolCalls: z
    .array(z.object({ name: z.string(), args: z.record(z.string(), z.unknown()) }))
    .optional(),
});

export const zTelemetry = z.object({
  startedAt: z.number(),
  submittedAt: z.number(),
  pasteEvents: z.number().min(0),
  pastedChars: z.number().min(0),
  typedChars: z.number().min(0),
  revisions: z.number().min(0),
  focusLosses: z.number().min(0).optional(),
  fullscreenExits: z.number().min(0).optional(),
  copyEvents: z.number().min(0).optional(),
  secondsAway: z.number().min(0).optional(),
  cameraDenied: z.boolean().optional(),
  cameraBlankSeconds: z.number().min(0).optional(),
  faceMissingSeconds: z.number().min(0).optional(),
  lookAwayEvents: z.number().min(0).optional(),
  lookAwaySeconds: z.number().min(0).optional(),
  multipleFaceEvents: z.number().min(0).optional(),
  warnings: z.number().min(0).max(10).optional(),
  autoEnded: z.boolean().optional(),
  endedBy: z.string().max(40).optional(),
});

export const zCounterpartRequest = z.object({
  challenge: z.unknown(),
  work: z.string().max(40000),
  history: z.array(zTurn).max(40),
  message: z.string().min(1).max(4000),
});

export const zCalibrationGrade = z.object({
  challengeId: z.string().max(120),
  answers: z
    .array(
      z.object({
        id: z.string().max(60),
        label: z.enum(["correct", "partial", "wrong", "dangerous"]),
        trust: z.number().min(0).max(100),
      }),
    )
    .max(20),
  items: z.array(z.unknown()).max(20).optional(),
});

export const zDefenceRequest = z.object({
  challenge: z.unknown(),
  work: z.string().max(40000),
});

export const zTranscribeRequest = z.object({
  audio: z.string().max(9_000_000),
  mimeType: z.string().max(120),
});

export const zEvaluateRequest = z.object({
  challenge: z.unknown(),
  holder: z.string().min(1).max(80),
  work: z.string().max(40000),
  turns: z.array(zTurn).max(60),
  defence: z
    .array(
      z.object({
        question: z.string().max(1000),
        transcript: z.string().max(8000),
        durationMs: z.number().min(0),
        typed: z.boolean(),
      }),
    )
    .max(4),
  calibration: z
    .object({
      /** The sealed answer key handed out with the items. Opaque to the client. */
      sealed: z.string().max(200_000),
      answers: z.array(
        z.object({
          id: z.string().max(60),
          label: z.enum(["correct", "partial", "wrong", "dangerous"]),
          trust: z.number().min(0).max(100),
        }),
      ),
    })
    .nullable()
    .optional(),
  telemetry: zTelemetry,
});

export const zCalibrationRequest = z.object({
  domain: zDomain,
  situation: z.string().max(4000).optional(),
});

export const zRoleRequest = z.object({
  text: z.string().max(12000).optional(),
  file: z
    .object({ data: z.string().max(8_000_000), mimeType: z.string().max(120) })
    .optional(),
  calibrate: z.boolean().default(false),
});

export const zPresentRequest = z.object({
  passport: z.unknown(),
  disclose: z.array(z.enum(DIMENSIONS)).min(1),
  audience: z.string().max(120).optional(),
});

export const zGapRequest = z.object({
  dimension: z.enum(DIMENSIONS),
  roleTitle: z.string().max(160),
  domain: zDomain.optional(),
});

export const zVerifyRequest = z.object({
  token: z.string().max(200_000),
});
