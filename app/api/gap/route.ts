/**
 * The skill-gap exercise.
 *
 * When a role asks for a capability someone has not evidenced, the useful
 * response is not a rejection. It is a twenty-minute exercise that would
 * produce the missing evidence, after which their record covers the role.
 * That is the difference between a filter and an operating system.
 *
 * Gemini capability: targeted generation from a named capability gap.
 */

import { MODELS } from "@/lib/config";
import { DIMENSION_LABEL, FACET_QUESTION, DIMENSION_BLURB } from "@/lib/domain";
import { callGemini } from "@/lib/gemini";
import { GAP_SYSTEM, gapPrompt } from "@/lib/prompts";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { GAP_SCHEMA, zGapRequest } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Gap {
  title: string;
  minutes: number;
  prompt: string;
  whatItProves: string;
  successLooksLike: string[];
}

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`gap:${clientKey(req)}`, { capacity: 10, refillPerMinute: 8 });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zGapRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Name the capability to build evidence for.");
    const { dimension, roleTitle } = parsed.data;

    const label = DIMENSION_LABEL[dimension];
    const question =
      dimension === "ai_judgment"
        ? Object.values(FACET_QUESTION).join(" ")
        : DIMENSION_BLURB[dimension];

    const result = await callGemini<Gap>({
      label: `design gap exercise (${dimension})`,
      capability: "Targeted generation + structured output",
      model: MODELS.workhorse,
      system: GAP_SYSTEM,
      input: gapPrompt(dimension, label, question, roleTitle),
      schema: GAP_SCHEMA,
      thinking: "medium",
      fixture: () => ({
        title: `Twenty minutes on ${label.toLowerCase()}`,
        minutes: 20,
        prompt: `Take a decision you made at work in the last month where an AI tool was involved. Write it up in four parts: what the tool told you, what you did to check it, what you would have missed if you had not checked, and what you would do differently now. Be specific enough that a stranger could tell whether you actually did the checking.`,
        whatItProves: `A worked example of ${label.toLowerCase()} on real work, which is the evidence ${roleTitle} is asking for and your record does not yet carry.`,
        successLooksLike: [
          "The check is described concretely enough to be repeated by someone else.",
          "You name something you would have got wrong, not only something you got right.",
          "The change you would make is a habit, not a resolution.",
        ],
      }),
    });

    return Response.json({ gap: result.data, dimension, source: result.source });
  });
}
