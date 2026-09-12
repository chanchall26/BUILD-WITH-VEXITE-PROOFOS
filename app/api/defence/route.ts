/**
 * The spoken defence.
 *
 * Gemini reads what the candidate actually built and writes two questions only
 * its author can answer well. This replaces webcam proctoring and face
 * matching: you cannot outsource understanding of your own decisions, live, in
 * forty-five seconds, and no biometric data is collected to find that out.
 *
 * Gemini capabilities: structured output, long-context artifact reading,
 * text-to-speech.
 */

import { MODELS } from "@/lib/config";
import type { ChallengeSpec } from "@/lib/domain";
import { callGemini, speak } from "@/lib/gemini";
import { QUESTIONS_SYSTEM, questionsPrompt } from "@/lib/prompts";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { QUESTIONS_SCHEMA, zDefenceRequest } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

interface Questions {
  questions: { question: string; probes: string; weakAnswerLooksLike: string }[];
}

const FIXTURE_QUESTIONS: Questions = {
  questions: [
    {
      question:
        "The counterpart told you the database was the bottleneck and the CPU graph agreed with it. Walk me through why you did or did not accept that, and what would have changed your mind.",
      probes: "reasoning",
      weakAnswerLooksLike:
        "Repeats that the database was busy without separating the cause from the consequence.",
    },
    {
      question:
        "Whatever you decided to ship, tell me what you gave up by shipping it, and what you would put on a dashboard so nobody has to work this out again at three in the morning.",
      probes: "communication",
      weakAnswerLooksLike:
        "Describes the change but names no cost and no detection.",
    },
  ],
};

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`defence:${clientKey(req)}`, { capacity: 10, refillPerMinute: 8 });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zDefenceRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Malformed defence request.");
    const spec = parsed.data.challenge as ChallengeSpec;
    if (!spec?.defenceSeeds) return badRequest("Missing challenge.");

    const result = await callGemini<Questions>({
      label: "write defence questions",
      capability: "Structured output + artifact reading",
      model: MODELS.workhorse,
      system: QUESTIONS_SYSTEM,
      input: questionsPrompt(spec, parsed.data.work),
      schema: QUESTIONS_SCHEMA,
      thinking: "medium",
      fixture: () => FIXTURE_QUESTIONS,
    });

    // Hearing the question asked is a different experience from reading it.
    // Silence is an acceptable fallback, so a text-to-speech failure never
    // blocks anyone from finishing.
    const audio = await speak(result.data.questions[0]?.question ?? "");

    return Response.json({
      questions: result.data.questions,
      audio,
      source: result.source,
      model: result.model,
    });
  });
}
