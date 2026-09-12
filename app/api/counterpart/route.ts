/**
 * The AI counterpart.
 *
 * Not an assistant with a bug in it. A simulated colleague that consults real
 * tools, forms a view, and is wrong in the specific ways capable colleagues are
 * wrong: confident, well-argued, and looking at the wrong number.
 *
 * Each reply is two Gemini calls on purpose. The first is a function-calling
 * turn where the counterpart decides which tools to consult and the server
 * resolves them against the challenge's fixture world. The second streams the
 * reply, written from what it actually looked at. Splitting them is what lets
 * the interface show the candidate which data the counterpart chose to read —
 * and, more usefully, which it did not.
 *
 * Gemini capabilities: function calling, streaming, system instruction.
 */

import { MODELS, isDemoMode } from "@/lib/config";
import { nextBeat, playedBeats } from "@/lib/challenge";
import type { Beat, ChallengeSpec } from "@/lib/domain";
import { FIXTURE_COUNTERPART } from "@/lib/fixtures";
import { callWithTools, record, streamGemini, type ToolCall } from "@/lib/gemini";
import { counterpartSystem } from "@/lib/prompts";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { zCounterpartRequest } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const CONSULT_SYSTEM = `You are deciding what to look at before answering a colleague.

Call whichever tools would inform a reply to their message. Call more than one if more than one is relevant. Do not write a reply, do not summarise, do not explain yourself — the only thing you produce this turn is tool calls. If nothing needs looking up, produce nothing.`;

function streamText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = text.match(/[\s\S]{1,16}/g) ?? [text];
  let i = 0;
  return new ReadableStream({
    async pull(controller) {
      if (i >= chunks.length) return controller.close();
      controller.enqueue(encoder.encode(chunks[i++]));
      await new Promise((r) => setTimeout(r, 16));
    },
  });
}

/**
 * Which tools the counterpart consults in fixture mode.
 *
 * The choice is the point. On its opening claim it reads the database metrics,
 * which look alarming, and does not read the endpoint latency, which would
 * show that one route regressed and the rest are flat. A candidate who notices
 * the gap has done the thing being measured.
 */
function fixtureToolChoice(spec: ChallengeSpec, beat: Beat | null): ToolCall[] {
  const pick = (name: string, args: Record<string, unknown>): ToolCall[] => {
    const tool = spec.tools.find((t) => t.name === name);
    return tool ? [{ id: `call_${name}`, name, args }] : [];
  };
  if (!beat) return pick("query_endpoint_latency", { window: "24h" });
  if (beat.turn === 1) return pick("check_db_metrics", { window: "24h" });
  if (beat.turn === 2) return pick("check_db_metrics", { window: "1h" });
  if (beat.turn === 3) return pick("read_error_logs", { route: "/v2/search" });
  return [];
}

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`counterpart:${clientKey(req)}`, {
      capacity: 30,
      refillPerMinute: 24,
    });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zCounterpartRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Malformed counterpart request.");
    const { work, history, message } = parsed.data;
    const spec = parsed.data.challenge as ChallengeSpec;
    if (!spec?.beats || !spec?.tools) return badRequest("Missing challenge.");

    const beat = nextBeat(spec, playedBeats(history));
    const system = counterpartSystem(spec, beat);

    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Proofos-Source": isDemoMode() ? "fixture" : "gemini",
    };
    if (beat) headers["X-Proofos-Beat"] = String(beat.turn);

    // ---- fixture path -----------------------------------------------------
    if (isDemoMode()) {
      const calls = fixtureToolChoice(spec, beat);
      headers["X-Proofos-Tools"] = encodeURIComponent(
        JSON.stringify(calls.map((c) => ({ name: c.name, args: c.args }))),
      );
      record({
        label: beat ? `counterpart reply (beat ${beat.turn})` : "counterpart reply",
        model: "fixture",
        capability: "Function calling + streaming",
        ms: 0,
        ok: true,
        fixture: true,
        note: calls.length ? `consulted ${calls.map((c) => c.name).join(", ")}` : "no tools",
      });
      const body = FIXTURE_COUNTERPART[beat?.turn ?? 0] ?? FIXTURE_COUNTERPART[0];
      return new Response(streamText(body), { headers });
    }

    // ---- live path --------------------------------------------------------
    const transcript = history
      .slice(-10)
      .map((t) => `${t.role === "candidate" ? "Candidate" : "You"}: ${t.text}`)
      .join("\n\n");

    const situation = `The task:
${spec.deliverable}

Their work so far:
---
${work.slice(0, 6000)}
---
${transcript ? `\nConversation so far:\n${transcript}\n` : ""}
Candidate just said: ${message}`;

    // Step one: decide what to look at, and look at it.
    const consulted: { name: string; args: Record<string, unknown>; result: unknown }[] = [];
    try {
      await callWithTools({
        label: "counterpart consults tools",
        model: MODELS.workhorse,
        system: CONSULT_SYSTEM,
        input: situation,
        thinking: "low",
        maxRounds: 1,
        tools: spec.tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
        resolve: (call) => {
          const tool = spec.tools.find((t) => t.name === call.name);
          const result = tool ? tool.result : { error: `No such tool: ${call.name}` };
          consulted.push({ name: call.name, args: call.args, result });
          return result;
        },
      });
    } catch {
      // Consulting is a bonus, not a precondition. A failure here still leaves
      // a counterpart that can hold a conversation.
    }

    headers["X-Proofos-Tools"] = encodeURIComponent(
      JSON.stringify(consulted.map((c) => ({ name: c.name, args: c.args }))),
    );

    const looked = consulted.length
      ? `\n\nWhat you looked up just now:\n${consulted
          .map((c) => `${c.name}(${JSON.stringify(c.args)}) => ${JSON.stringify(c.result).slice(0, 2400)}`)
          .join("\n\n")}`
      : "";

    // Step two: write the reply, streamed.
    try {
      const stream = await streamGemini({
        label: beat ? `counterpart reply (beat ${beat.turn})` : "counterpart reply",
        model: MODELS.workhorse,
        system,
        input: situation + looked,
        thinking: "low",
      });
      return new Response(stream, { headers });
    } catch {
      headers["X-Proofos-Source"] = "fixture";
      const body = FIXTURE_COUNTERPART[beat?.turn ?? 0] ?? FIXTURE_COUNTERPART[0];
      return new Response(streamText(body), { headers });
    }
  });
}
