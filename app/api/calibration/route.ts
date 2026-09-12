/**
 * Trust calibration.
 *
 * Ten AI outputs. The candidate says what each one is and how far they would
 * act on it. What is measured is not whether they can spot a wrong answer but
 * whether their confidence tracks reality — the person who is consistently
 * sure about the wrong things is the risk, and a plain right/wrong score would
 * miss them entirely.
 *
 * The answer key never reaches the browser. It is sealed with AES-256-GCM
 * under the server secret, handed to the client as an opaque blob, and posted
 * back with the answers. That keeps the whole flow stateless without letting a
 * candidate read the answers out of a network response.
 *
 * Gemini capability: structured output with a constrained truth distribution.
 */

import { MODELS } from "@/lib/config";
import { DOMAIN_LABEL, type CalibrationItem, type CalibrationKey } from "@/lib/domain";
import { FIXTURE_CALIBRATION } from "@/lib/fixtures";
import { callGemini } from "@/lib/gemini";
import { CALIBRATION_SYSTEM, calibrationPrompt } from "@/lib/prompts";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { CALIBRATION_SCHEMA, zCalibrationRequest } from "@/lib/schemas";
import { seal } from "@/lib/seal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`calibration:${clientKey(req)}`, {
      capacity: 8,
      refillPerMinute: 6,
    });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zCalibrationRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Pick a domain for the calibration set.");
    const { domain, situation } = parsed.data;

    const result = await callGemini<{ items: CalibrationKey[] }>({
      label: "write calibration set",
      capability: "Structured output with a constrained distribution",
      model: MODELS.architect,
      system: CALIBRATION_SYSTEM,
      input: calibrationPrompt(DOMAIN_LABEL[domain], situation ?? ""),
      schema: CALIBRATION_SCHEMA,
      thinking: "high",
      fixture: () => ({ items: FIXTURE_CALIBRATION }),
    });

    const key = (result.data.items ?? []).slice(0, 10).map((item, i) => ({
      ...item,
      id: item.id || `cal${i + 1}`,
    }));

    if (key.length < 4) {
      return Response.json({ error: "Could not build a calibration set." }, { status: 502 });
    }

    // Everything except the answers.
    const items: CalibrationItem[] = key.map((k) => ({
      id: k.id,
      context: k.context,
      claim: k.claim,
      statedConfidence: k.statedConfidence,
    }));

    return Response.json({
      items,
      sealed: seal(key),
      source: result.source,
      model: result.model,
    });
  });
}
