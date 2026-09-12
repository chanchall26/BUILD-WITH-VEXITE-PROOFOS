/**
 * The single door to the Gemini API.
 *
 * Everything the product does with a model goes through here so that each call
 * is logged and visible on the /engine page, a missing key degrades to labelled
 * fixtures instead of an error page, and a model that is unavailable falls back
 * a tier rather than failing someone's session halfway through.
 */

import { GoogleGenAI } from "@google/genai";
import { EMBED_DIM, MODELS, apiKey, isDemoMode } from "./config";
import type { GeminiCall } from "./domain";
import { shortId } from "./utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------- call log

const LOG_LIMIT = 80;
const log: GeminiCall[] = [];

export function record(entry: Omit<GeminiCall, "id" | "at">): GeminiCall {
  const call: GeminiCall = { ...entry, id: shortId("call"), at: Date.now() };
  log.unshift(call);
  if (log.length > LOG_LIMIT) log.length = LOG_LIMIT;
  return call;
}

export function recentCalls(): GeminiCall[] {
  return [...log];
}

// ---------------------------------------------------------------- client

let cached: GoogleGenAI | null = null;

export function client(): GoogleGenAI {
  const key = apiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  if (!cached) cached = new GoogleGenAI({ apiKey: key });
  return cached;
}

// ------------------------------------------------------------ circuit breaker

/**
 * Not every key can reach every model. A free-tier key has no quota for the
 * pro tier at all, so without this the product spends ten seconds failing on
 * the same model before every single fallback, on every request.
 *
 * A model that answers 429 or 403 is skipped for a few minutes and the next
 * tier is used directly. Transient errors are not recorded, so a one-off
 * network blip does not sideline a model that works.
 */
/** A rate limit clears in about a minute; a missing entitlement does not. */
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const ENTITLEMENT_COOLDOWN_MS = 5 * 60_000;
const unavailable = new Map<string, number>();

function cooldownFor(err: unknown): number | null {
  const message = err instanceof Error ? err.message : String(err);
  if (/\b(403|404)\b|permission|not found|unsupported|not available/i.test(message)) {
    return ENTITLEMENT_COOLDOWN_MS;
  }
  if (/\b429\b|quota|rate.?limit|resource.?exhausted/i.test(message)) {
    return RATE_LIMIT_COOLDOWN_MS;
  }
  return null;
}

function isUnavailable(model: string): boolean {
  const until = unavailable.get(model);
  if (until === undefined) return false;
  if (Date.now() >= until) {
    unavailable.delete(model);
    return false;
  }
  return true;
}

function markUnavailable(model: string, err: unknown): void {
  const cooldown = cooldownFor(err);
  if (cooldown === null) return; // a transient blip must not sideline a working model
  unavailable.set(model, Date.now() + cooldown);
}

/** Which models this key has been refused by, for the engine page. */
export function sidelinedModels(): { model: string; retryInSeconds: number }[] {
  const now = Date.now();
  return Array.from(unavailable, ([model, until]) => ({
    model,
    retryInSeconds: Math.max(0, Math.round((until - now) / 1000)),
  })).filter((m) => m.retryInSeconds > 0);
}

// ---------------------------------------------------------------- shapes

/**
 * Deliberately excludes "minimal". Support varies by model — gemini-3.8-flash
 * rejects it — and the SDK's type ends in `(string & {})`, so a bad value
 * compiles and ships. Restricting the union here is the cheapest guard.
 */
export type Thinking = "low" | "medium" | "high";

export type InputPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mime_type: string }
  | { type: "document"; data: string; mime_type: string }
  | { type: "audio"; data: string; mime_type: string };

export interface Source {
  title: string;
  url: string;
}

export interface CallOpts<T> {
  label: string;
  /** Which Gemini capability this exercises, shown on the engine page. */
  capability: string;
  model: string;
  system?: string;
  input: string | InputPart[];
  /** JSON Schema the response must satisfy. */
  schema?: Record<string, unknown>;
  thinking?: Thinking;
  seed?: number;
  /** Ground the answer in Google Search and return citations. */
  search?: boolean;
  previous?: string;
  /** Used verbatim when no API key is configured, or on total failure. */
  fixture: () => T;
}

export interface CallResult<T> {
  data: T;
  source: "gemini" | "fixture";
  sources: Source[];
  interactionId?: string;
  model: string;
  ms: number;
}

function buildParams<T>(o: CallOpts<T>, model: string): Record<string, any> {
  const generation_config: Record<string, any> = {};
  if (o.thinking) generation_config.thinking_level = o.thinking;
  if (typeof o.seed === "number") generation_config.seed = o.seed;

  const params: Record<string, any> = { model, input: o.input };
  if (o.system) params.system_instruction = o.system;
  if (Object.keys(generation_config).length) params.generation_config = generation_config;
  if (o.schema) {
    params.response_format = {
      type: "text",
      mime_type: "application/json",
      schema: o.schema,
    };
  }
  if (o.search) params.tools = [{ type: "google_search" }];
  if (o.previous) params.previous_interaction_id = o.previous;
  return params;
}

/** Cited web sources, from grounding steps or inline text annotations. */
export function extractSources(interaction: any): Source[] {
  const out = new Map<string, string>();
  for (const step of interaction?.steps ?? []) {
    const results = step?.results ?? step?.result ?? [];
    for (const r of Array.isArray(results) ? results : []) {
      if (r?.url) out.set(r.url, r.title || r.url);
    }
    for (const block of step?.content ?? []) {
      for (const a of block?.annotations ?? []) {
        if (a?.url) out.set(a.url, a.title || a.url);
      }
    }
  }
  return Array.from(out, ([url, title]) => ({ url, title })).slice(0, 6);
}

function stripFence(s: string): string {
  const t = s.trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
}

/**
 * One Gemini call, with a one-tier model fallback and a fixture escape.
 * With `schema` set the result is parsed JSON; otherwise it is the text.
 */
export async function callGemini<T>(o: CallOpts<T>): Promise<CallResult<T>> {
  const started = Date.now();

  if (isDemoMode()) {
    const data = o.fixture();
    record({
      label: o.label,
      model: "fixture",
      capability: o.capability,
      ms: Date.now() - started,
      ok: true,
      fixture: true,
      note: "no API key — deterministic fixture",
    });
    return { data, source: "fixture", sources: [], model: "fixture", ms: 0 };
  }

  // Deduplicated, because a deployment can point the architect tier at the
  // workhorse model. Without this, the fallback would retry the same model
  // that just failed and pay a second round trip to learn nothing.
  const declared = [
    ...new Set(
      o.model === MODELS.architect
        ? [o.model, MODELS.workhorse, MODELS.swift]
        : [o.model, MODELS.swift],
    ),
  ];
  // Skip tiers this key has already been refused by, rather than paying the
  // round trip to be refused again. If every tier is sidelined, try them all
  // anyway: a cooldown should never be the reason nothing is attempted.
  const reachable = declared.filter((m) => !isUnavailable(m));
  const tiers = reachable.length ? reachable : declared;
  let lastError: unknown;

  for (const model of tiers) {
    const t0 = Date.now();
    try {
      const interaction: any = await (client().interactions as any).create(
        buildParams(o, model),
      );
      const raw: string = interaction?.output_text ?? "";
      const data = (o.schema ? JSON.parse(stripFence(raw)) : raw) as T;
      const ms = Date.now() - t0;
      record({ label: o.label, model, capability: o.capability, ms, ok: true, fixture: false });
      return {
        data,
        source: "gemini",
        sources: extractSources(interaction),
        interactionId: interaction?.id,
        model,
        ms,
      };
    } catch (err) {
      lastError = err;
      markUnavailable(model, err);
      record({
        label: o.label,
        model,
        capability: o.capability,
        ms: Date.now() - t0,
        ok: false,
        fixture: false,
        note: err instanceof Error ? err.message.slice(0, 160) : "failed",
      });
    }
  }

  // Nobody's assessment fails because of an upstream outage.
  const data = o.fixture();
  record({
    label: `${o.label} (recovered)`,
    model: "fixture",
    capability: o.capability,
    ms: Date.now() - started,
    ok: true,
    fixture: true,
    note: lastError instanceof Error ? lastError.message.slice(0, 160) : undefined,
  });
  return { data, source: "fixture", sources: [], model: "fixture", ms: 0 };
}

// ---------------------------------------------------------------- streaming

/** Streams text out of a model call, for the counterpart's replies. */
export async function streamGemini(opts: {
  label: string;
  model: string;
  system: string;
  input: string | InputPart[] | unknown[];
  thinking?: Thinking;
  tools?: Record<string, unknown>[];
}): Promise<ReadableStream<Uint8Array>> {
  const params: Record<string, any> = {
    model: opts.model,
    input: opts.input,
    system_instruction: opts.system,
    stream: true,
  };
  if (opts.thinking) params.generation_config = { thinking_level: opts.thinking };
  if (opts.tools?.length) params.tools = opts.tools;

  const t0 = Date.now();
  const stream: any = await (client().interactions as any).create(params);
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event?.event_type === "step.delta" && event?.delta?.type === "text") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        record({
          label: opts.label,
          model: opts.model,
          capability: "Streaming",
          ms: Date.now() - t0,
          ok: true,
          fixture: false,
        });
      } catch (err) {
        markUnavailable(opts.model, err);
        record({
          label: opts.label,
          model: opts.model,
          capability: "Streaming",
          ms: Date.now() - t0,
          ok: false,
          fixture: false,
          note: err instanceof Error ? err.message.slice(0, 160) : "stream failed",
        });
        controller.enqueue(
          encoder.encode("\n\n_(the counterpart lost its connection — ask again)_"),
        );
      }
      controller.close();
    },
  });
}

// ---------------------------------------------------------------- tool use

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * Runs a model turn that may call simulated tools, resolving every call
 * against a fixture world before letting the model answer.
 *
 * This is what makes the counterpart a colleague rather than a chatbot: it
 * goes and looks things up, and the candidate can see which numbers it chose
 * to look at and which it ignored.
 */
export async function callWithTools(opts: {
  label: string;
  model: string;
  system: string;
  input: string;
  tools: { name: string; description: string; parameters: Record<string, unknown> }[];
  /** Resolves a tool call against the fixture world. */
  resolve: (call: ToolCall) => unknown;
  thinking?: Thinking;
  maxRounds?: number;
}): Promise<{ text: string; calls: ToolCall[]; interactionId?: string }> {
  const declarations = opts.tools.map((t) => ({
    type: "function",
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  const made: ToolCall[] = [];
  const t0 = Date.now();

  let params: Record<string, any> = {
    model: opts.model,
    input: opts.input,
    system_instruction: opts.system,
    tools: declarations,
  };
  if (opts.thinking) params.generation_config = { thinking_level: opts.thinking };

  try {
    for (let round = 0; round < (opts.maxRounds ?? 3); round++) {
      const interaction: any = await (client().interactions as any).create(params);
      const steps: any[] = interaction?.steps ?? [];
      const calls = steps.filter((s) => s?.type === "function_call");

      if (calls.length === 0) {
        record({
          label: opts.label,
          model: opts.model,
          capability: "Function calling",
          ms: Date.now() - t0,
          ok: true,
          fixture: false,
          note: made.length ? `resolved ${made.length} tool call(s)` : "no tools needed",
        });
        return {
          text: interaction?.output_text ?? "",
          calls: made,
          interactionId: interaction?.id,
        };
      }

      const results = calls.map((call) => {
        const args =
          typeof call.arguments === "string"
            ? safeParse(call.arguments)
            : (call.arguments ?? {});
        const resolved: ToolCall = { id: call.id, name: call.name, args };
        made.push(resolved);
        return {
          type: "function_result",
          name: call.name,
          call_id: call.id,
          result: [{ type: "text", text: JSON.stringify(opts.resolve(resolved)) }],
        };
      });

      params = {
        model: opts.model,
        input: results,
        system_instruction: opts.system,
        tools: declarations,
        previous_interaction_id: interaction.id,
        ...(opts.thinking ? { generation_config: { thinking_level: opts.thinking } } : {}),
      };
    }

    // Running out of rounds having resolved tools is the normal outcome for a
    // consult turn, which is called with maxRounds of one. It is only a
    // failure when the loop ended with nothing to show for it.
    record({
      label: opts.label,
      model: opts.model,
      capability: "Function calling",
      ms: Date.now() - t0,
      ok: made.length > 0,
      fixture: false,
      note: made.length
        ? `resolved ${made.length} tool call${made.length === 1 ? "" : "s"}`
        : "tool loop ended without a reply",
    });
    return { text: "", calls: made };
  } catch (err) {
    markUnavailable(opts.model, err);
    record({
      label: opts.label,
      model: opts.model,
      capability: "Function calling",
      ms: Date.now() - t0,
      ok: false,
      fixture: false,
      note: err instanceof Error ? err.message.slice(0, 160) : "failed",
    });
    throw err;
  }
}

function safeParse(s: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(s);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------- embeddings

/**
 * Vectors for evidence retrieval and capability matching. Falls back to a
 * deterministic hashed bag of words so search still returns a sensible
 * ordering with no key configured.
 */
export async function embed(texts: string[]): Promise<{
  vectors: number[][];
  source: "gemini" | "fixture";
}> {
  if (isDemoMode() || texts.length === 0) {
    record({
      label: "embed evidence",
      model: "fixture",
      capability: "Embeddings",
      ms: 0,
      ok: true,
      fixture: true,
    });
    return { vectors: texts.map((t) => hashVector(t)), source: "fixture" };
  }

  const t0 = Date.now();
  try {
    const res = await client().models.embedContent({
      model: MODELS.embedding,
      contents: texts,
      config: { outputDimensionality: EMBED_DIM },
    });
    const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
    record({
      label: "embed evidence",
      model: MODELS.embedding,
      capability: "Embeddings",
      ms: Date.now() - t0,
      ok: true,
      fixture: false,
    });
    if (vectors.length === texts.length) return { vectors, source: "gemini" };
  } catch (err) {
    record({
      label: "embed evidence",
      model: MODELS.embedding,
      capability: "Embeddings",
      ms: Date.now() - t0,
      ok: false,
      fixture: false,
      note: err instanceof Error ? err.message.slice(0, 160) : "failed",
    });
  }
  return { vectors: texts.map((t) => hashVector(t)), source: "fixture" };
}

function hashVector(text: string, dim = 256): number[] {
  const v = new Array(dim).fill(0);
  for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let h = 2166136261;
    for (let i = 0; i < word.length; i++) {
      h ^= word.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    v[Math.abs(h) % dim] += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

// ---------------------------------------------------------------- speech

/** Speaks a line as the counterpart. Returns base64 audio, or null. */
export async function speak(text: string): Promise<string | null> {
  if (isDemoMode() || !text.trim()) return null;
  const t0 = Date.now();
  try {
    const interaction: any = await (client().interactions as any).create({
      model: MODELS.speech,
      input: text,
      response_modalities: ["audio"],
      generation_config: {
        speech_config: {
          voice_config: { prebuilt_voice_config: { voice_name: "Charon" } },
        },
      },
    });
    record({
      label: "speak as counterpart",
      model: MODELS.speech,
      capability: "Text-to-speech",
      ms: Date.now() - t0,
      ok: true,
      fixture: false,
    });
    return interaction?.output_audio?.data ?? null;
  } catch (err) {
    record({
      label: "speak as counterpart",
      model: MODELS.speech,
      capability: "Text-to-speech",
      ms: Date.now() - t0,
      ok: false,
      fixture: false,
      note: err instanceof Error ? err.message.slice(0, 160) : "failed",
    });
    return null;
  }
}
