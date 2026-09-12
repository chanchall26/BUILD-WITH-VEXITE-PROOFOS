/**
 * Designs a work simulation for a chosen domain.
 *
 * Gemini capabilities: structured output against a schema, medium thinking level,
 * optional Google Search grounding to calibrate against what the role actually
 * involves in 2026 rather than what a posting claims.
 */

import { MODELS } from "@/lib/config";
import { normaliseChallenge, type RawChallenge } from "@/lib/challenge";
import { DOMAIN_LABEL } from "@/lib/domain";
import { FIXTURE_CHALLENGE, FIXTURE_ROLE_INPUT } from "@/lib/fixtures";
import { callGemini } from "@/lib/gemini";
import { CHALLENGE_SYSTEM, challengePrompt } from "@/lib/prompts";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { CHALLENGE_SCHEMA, zChallengeRequest } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** The seeded challenge, for the demo path and as a shape reference. */
export async function GET() {
  return Response.json({
    challenge: FIXTURE_CHALLENGE,
    sampleRoleInput: FIXTURE_ROLE_INPUT,
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`challenge:${clientKey(req)}`, {
      capacity: 6,
      refillPerMinute: 5,
    });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zChallengeRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Pick a domain to design for.");
    const { domain, roleContext, calibrate } = parsed.data;

    const result = await callGemini<RawChallenge>({
      label: calibrate ? "design simulation (search-calibrated)" : "design simulation",
      capability: calibrate
        ? "Structured output + Google Search grounding"
        : "Structured output + medium thinking",
      model: MODELS.architect,
      system: CHALLENGE_SYSTEM,
      input: challengePrompt(domain, DOMAIN_LABEL[domain], roleContext ?? "", calibrate),
      schema: CHALLENGE_SCHEMA,
      // Medium, not high. The design is long-form JSON and a candidate is
      // sitting on a spinner while it is written; high thinking roughly
      // doubled the wait without changing the simulations it produced.
      thinking: "medium",
      search: calibrate,
      fixture: () => fixtureRaw(),
    });

    const challenge = normaliseChallenge(
      result.data,
      domain,
      result.source,
      result.sources,
    );

    // A challenge whose defects were all stripped as unusable cannot measure
    // anything, so say so rather than running a hollow session.
    if (challenge.beats.length === 0) {
      return Response.json(
        { error: "The generated simulation had no usable defects. Try again." },
        { status: 502 },
      );
    }

    return Response.json({ challenge, model: result.model, ms: result.ms });
  });
}

/** The fixture, expressed in the raw shape so it takes the same code path. */
function fixtureRaw(): RawChallenge {
  const f = FIXTURE_CHALLENGE;
  return {
    title: f.title,
    roleContext: f.roleContext,
    situation: f.situation,
    deliverable: f.deliverable,
    workspaceSeed: f.workspaceSeed,
    requirements: f.requirements.map((r) => ({
      id: r.id,
      text: r.text,
      signal: r.signal ?? "",
    })),
    contextDocs: f.contextDocs,
    tools: f.tools.map((t) => ({
      name: t.name,
      description: t.description,
      argument: Object.keys(
        (t.parameters as { properties?: Record<string, unknown> }).properties ?? {
          window: {},
        },
      )[0],
      argumentDescription: "Time window or identifier.",
      resultJson: JSON.stringify(t.result),
    })),
    counterpartPersona: f.counterpartPersona,
    beats: f.beats,
    defenceSeeds: f.defenceSeeds,
    transparencyNotice: f.transparencyNotice,
    estimatedMinutes: f.estimatedMinutes,
  };
}
