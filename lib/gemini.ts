/**
 * The single door to the Gemini API.
 *
 * Everything the product does with a model goes through here so that each call
 * is logged and visible on the /engine page, a missing key degrades to labelled
 * fixtures instead of an error page, and a model that is unavailable falls back
 * a tier rather than failing someone's session halfway through.
 */

import { GoogleGenAI } from "@google/genai";
import { EMBED_DIM, MODELS, apiKey, apiKeys, isDemoMode } from "./config";
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

// ---------------------------------------------------------------- key pool

/**
 * Gemini rate limits per key, not per project, so several free-tier keys give
 * a demo real headroom. Keys are held in a pool, rotated between calls so no
 * one key absorbs the whole load, and individually sidelined when refused.
 *
 * Two kinds of refusal, two cooldowns. A 429 clears in about a minute. A 403
 * or 404 means this key simply has no access to that model — a free-tier key
 * cannot reach the pro tier at all — and there is no point retrying it soon.
 * Anything else is treated as transient and sidelines nothing, so one network
 * blip never takes a working key out of rotation.
 *
 * The key itself is never logged. Only its position in the pool.
 */

const RATE_LIMIT_COOLDOWN_MS = 60_000;
/** A key that has spent its daily allowance is out for the rest of the hour. */
const DAILY_QUOTA_COOLDOWN_MS = 60 * 60_000;
const ENTITLEMENT_COOLDOWN_MS = 5 * 60_000;
/** Worst-case round trips before giving up and serving the fixture. */
const MAX_ATTEMPTS = 4;
/**
 * Keys tried per model tier before dropping a tier. Each tier has its own
 * quota, so when one model is busy on every key the fastest route to an
 * answer is a different model, not a third key on the same one.
 */
const KEYS_PER_TIER = 2;
/** One generation must finish inside this, or the next key gets its turn. */
const REQUEST_TIMEOUT_MS = 55_000;

/**
 * Per-request options for the Interactions client. Measured: a refused key
 * answers in under a second with this, and in eleven seconds without it.
 */
const ONE_SHOT = { maxRetries: 0, timeout: REQUEST_TIMEOUT_MS };

const clients = new Map<string, GoogleGenAI>();
const sidelined = new Map<string, number>();
let cursor = 0;

function clientFor(key: string): GoogleGenAI {
  let existing = clients.get(key);
  if (!existing) {
    // The SDK retries a 429 on its own with exponential backoff, which turned
    // one refused key into ten to twenty seconds of waiting before the pool
    // even heard about it. Rotation across keys is our job, so the SDK gets
    // one attempt and a hard deadline.
    existing = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: REQUEST_TIMEOUT_MS, retryOptions: { attempts: 1 } },
    });
    // The Interactions client has a second, separate retry loop that ignores
    // the options above. It is switched off per request; see ONE_SHOT.
    clients.set(key, existing);
  }
  return existing;
}

/** Kept for callers that only need a client and do their own error handling. */
export function client(): GoogleGenAI {
  const key = apiKey();
  if (!key) throw new Error("No Gemini API key is configured");
  return clientFor(key);
}

function cooldownFor(err: unknown): number | null {
  const message = err instanceof Error ? err.message : String(err);
  if (/\b(403|404)\b|permission|not found|unsupported|not available/i.test(message)) {
    return ENTITLEMENT_COOLDOWN_MS;
  }
  if (/\b429\b|quota|rate.?limit|resource.?exhausted/i.test(message)) {
    // Google says how long to wait; believe it, within reason. A per-day
    // limit is a different thing from a busy minute and is sidelined for far
    // longer, so the next visitor's request goes straight to a key that works.
    if (/per.?day|daily/i.test(message)) return DAILY_QUOTA_COOLDOWN_MS;
    const said = /retry.?(?:delay|in|after)\D{0,4}(\d+(?:\.\d+)?)\s*s/i.exec(message);
    if (said) {
      return Math.min(Math.max(Number(said[1]) * 1000, 5_000), DAILY_QUOTA_COOLDOWN_MS);
    }
    return RATE_LIMIT_COOLDOWN_MS;
  }
  return null;
}

function slot(index: number, model: string): string {
  return `${index}|${model}`;
}

function isSidelined(index: number, model: string): boolean {
  const until = sidelined.get(slot(index, model));
  if (until === undefined) return false;
  if (Date.now() >= until) {
    sidelined.delete(slot(index, model));
    return false;
  }
  return true;
}

export interface Attempt {
  key: string;
  /** 1-based, for logs and the engine page. */
  number: number;
}

/**
 * Which keys are worth trying for this model, best first.
 *
 * Sidelined keys are skipped. If every key is sidelined the full pool is
 * returned anyway, because a cooldown should never be the reason nothing is
 * attempted at all.
 */
function attemptsFor(model: string): Attempt[] {
  const all = apiKeys().map((key, i) => ({ key, number: i + 1, index: i }));
  if (all.length === 0) return [];
  const free = all.filter((a) => !isSidelined(a.index, model));
  const pool = free.length ? free : all;
  const start = cursor++ % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)].map(({ key, number }) => ({
    key,
    number,
  }));
}

function markRefused(attempt: Attempt, model: string, err: unknown): void {
  const cooldown = cooldownFor(err);
  if (cooldown === null) return;
  sidelined.set(slot(attempt.number - 1, model), Date.now() + cooldown);
}

/**
 * Runs something against the key pool, moving to the next key when one is
 * refused. Used by the paths that are not a plain structured call: streaming,
 * tool loops, embeddings and speech.
 */
async function withKeys<T>(
  model: string,
  run: (client: GoogleGenAI, attempt: Attempt) => Promise<T>,
): Promise<{ value: T; attempt: Attempt }> {
  const attempts = attemptsFor(model).slice(0, MAX_ATTEMPTS);
  if (attempts.length === 0) throw new Error("No Gemini API key is configured");

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      return { value: await run(clientFor(attempt.key), attempt), attempt };
    } catch (err) {
      lastError = err;
      markRefused(attempt, model, err);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Every configured key refused the request");
}

export interface PoolStatus {
  keys: number;
  sidelined: { key: number; model: string; retryInSeconds: number }[];
}

/** What the engine page shows. Positions only, never key material. */
export function keyPoolStatus(): PoolStatus {
  const now = Date.now();
  return {
    keys: apiKeys().length,
    sidelined: Array.from(sidelined, ([id, until]) => {
      const [index, model] = id.split("|");
      return {
        key: Number(index) + 1,
        model,
        retryInSeconds: Math.max(0, Math.round((until - now) / 1000)),
      };
    }).filter((s) => s.retryInSeconds > 0),
  };
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
  // Each model tier is tried across every key that is not currently sidelined
  // for it, then the next tier down. Bounded, so a fully rate-limited pool
  // reaches the fixture quickly instead of grinding through every combination.
  let lastError: unknown;
  let spent = 0;

  outer: for (const model of declared) {
    for (const attempt of attemptsFor(model).slice(0, KEYS_PER_TIER)) {
      if (spent >= MAX_ATTEMPTS) break outer;
      spent++;
      const t0 = Date.now();
      try {
        const interaction: any = await (clientFor(attempt.key).interactions as any).create(
          buildParams(o, model),
          ONE_SHOT,
        );
        const raw: string = interaction?.output_text ?? "";
        const data = (o.schema ? JSON.parse(stripFence(raw)) : raw) as T;
        const ms = Date.now() - t0;
        record({
          label: o.label,
          model,
          capability: o.capability,
          ms,
          ok: true,
          fixture: false,
          key: attempt.number,
        });
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
        markRefused(attempt, model, err);
        record({
          label: o.label,
          model,
          capability: o.capability,
          ms: Date.now() - t0,
          ok: false,
          fixture: false,
          key: attempt.number,
          note: err instanceof Error ? err.message.slice(0, 160) : "failed",
        });
      }
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
  // Opening the stream is where a refusal surfaces, so key rotation happens
  // here rather than mid-read.
  const { value: stream, attempt } = await withKeys<any>(opts.model, (c) =>
    (c.interactions as any).create(params, ONE_SHOT),
  );
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
          key: attempt.number,
        });
      } catch (err) {
        markRefused(attempt, opts.model, err);
        record({
          label: opts.label,
          model: opts.model,
          capability: "Streaming",
          ms: Date.now() - t0,
          ok: false,
          fixture: false,
          key: attempt.number,
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

  const t0 = Date.now();

  /**
   * One full tool loop against a single key. An interaction id belongs to the
   * key that created it, so a retry has to start the conversation over on the
   * new key rather than continue the old one.
   */
  const runLoop = async (c: GoogleGenAI) => {
    const made: ToolCall[] = [];
    let params: Record<string, any> = {
      model: opts.model,
      input: opts.input,
      system_instruction: opts.system,
      tools: declarations,
    };
    if (opts.thinking) params.generation_config = { thinking_level: opts.thinking };

    for (let round = 0; round < (opts.maxRounds ?? 3); round++) {
      const interaction: any = await (c.interactions as any).create(params, ONE_SHOT);
      const calls = (interaction?.steps ?? []).filter(
        (s: any) => s?.type === "function_call",
      );

      if (calls.length === 0) {
        return {
          text: interaction?.output_text ?? "",
          calls: made,
          interactionId: interaction?.id as string | undefined,
          note: made.length ? `resolved ${made.length} tool call(s)` : "no tools needed",
        };
      }

      const results = calls.map((call: any) => {
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
    // consult turn, which runs with a round limit of one.
    return {
      text: "",
      calls: made,
      interactionId: undefined,
      note: made.length
        ? `resolved ${made.length} tool call${made.length === 1 ? "" : "s"}`
        : "tool loop ended without a reply",
    };
  };

  try {
    const { value, attempt } = await withKeys(opts.model, runLoop);
    record({
      label: opts.label,
      model: opts.model,
      capability: "Function calling",
      ms: Date.now() - t0,
      ok: value.calls.length > 0 || value.text.length > 0,
      fixture: false,
      key: attempt.number,
      note: value.note,
    });
    return { text: value.text, calls: value.calls, interactionId: value.interactionId };
  } catch (err) {
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
    const { value: res, attempt } = await withKeys(MODELS.embedding, (c) =>
      c.models.embedContent({
        model: MODELS.embedding,
        contents: texts,
        config: { outputDimensionality: EMBED_DIM },
      }),
    );
    const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
    record({
      label: "embed evidence",
      model: MODELS.embedding,
      capability: "Embeddings",
      ms: Date.now() - t0,
      ok: true,
      fixture: false,
      key: attempt.number,
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
    const { value: interaction, attempt } = await withKeys<any>(MODELS.speech, (c) =>
      (c.interactions as any).create({
        model: MODELS.speech,
        input: text,
        response_modalities: ["audio"],
        generation_config: {
          speech_config: {
            voice_config: { prebuilt_voice_config: { voice_name: "Charon" } },
          },
        },
      }, ONE_SHOT),
    );
    record({
      key: attempt.number,
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
