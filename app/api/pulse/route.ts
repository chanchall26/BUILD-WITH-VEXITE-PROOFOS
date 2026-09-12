/**
 * Live market statistics for the landing page.
 *
 * The numbers that justify this product move every quarter, so rather than
 * baking last year's into the page we ask Gemini to search for the current ones
 * and cite who published them. Grounded, dated, and checkable by the reader.
 *
 * Gemini capability: Google Search grounding with source citations.
 */

import { MODELS } from "@/lib/config";
import { FIXTURE_PULSE } from "@/lib/fixtures";
import { callGemini } from "@/lib/gemini";
import { PULSE_PROMPT, PULSE_SYSTEM } from "@/lib/prompts";
import { guard } from "@/lib/ratelimit";
import { PULSE_SCHEMA } from "@/lib/schemas";

export const runtime = "nodejs";
export const revalidate = 3600;

interface Pulse {
  headline: string;
  stats: { value: string; label: string; sourceName: string }[];
}

export async function GET() {
  return guard(async () => {
    const result = await callGemini<Pulse>({
      label: "market pulse",
      capability: "Google Search grounding",
      model: MODELS.workhorse,
      system: PULSE_SYSTEM,
      input: PULSE_PROMPT,
      schema: PULSE_SCHEMA,
      search: true,
      thinking: "low",
      fixture: () => FIXTURE_PULSE,
    });

    return Response.json(
      { ...result.data, sources: result.sources, source: result.source },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  });
}
