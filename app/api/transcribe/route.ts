/**
 * Speech to text for the spoken defence.
 *
 * The recording is transcribed and then discarded. Only the words reach the
 * evidence pipeline. Nothing about the voice itself — accent, tone, fluency,
 * emotion — is measured, stored, or inferred. Emotion inference in a hiring
 * context is prohibited under Article 5 of the EU AI Act, and it is not a
 * signal worth having in any case.
 *
 * Gemini capability: native audio understanding.
 */

import { MODELS } from "@/lib/config";
import { callGemini } from "@/lib/gemini";
import { TRANSCRIBE_SYSTEM } from "@/lib/prompts";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { zTranscribeRequest } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FIXTURE_TRANSCRIPT =
  "So I didn't accept the database explanation, because the CPU being high is what you'd expect either way. Once I pulled the per-endpoint numbers only search had moved, everything else was flat within noise, and that told me it was one code path rather than the whole system. Then the deploy diff showed a loadTags call inside the results map, so fifty results meant fifty-one round trips, which is why query volume went up eleven times while every individual query stayed fast. I'd roll back that change rather than cache over it, because the cache would have hidden it and we'd have found it again next month.";

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`transcribe:${clientKey(req)}`, {
      capacity: 12,
      refillPerMinute: 10,
    });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zTranscribeRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Send audio to transcribe.");

    const result = await callGemini<string>({
      label: "transcribe spoken defence",
      capability: "Audio understanding",
      model: MODELS.transcribe,
      system: TRANSCRIBE_SYSTEM,
      input: [
        { type: "text", text: "Transcribe this answer." },
        { type: "audio", data: parsed.data.audio, mime_type: parsed.data.mimeType },
      ],
      fixture: () => FIXTURE_TRANSCRIPT,
    });

    const transcript = String(result.data ?? "").trim();
    return Response.json({
      transcript,
      empty: transcript === "[no speech detected]" || transcript.length < 12,
      source: result.source,
      model: result.model,
    });
  });
}
