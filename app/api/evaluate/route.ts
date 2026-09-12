/**
 * Turns a finished session into evidence, then into a signed passport.
 *
 * The order is the argument. Deterministic detectors run first and are never
 * overruled. A Gemini pass adds what only reading can see, and every one of
 * its observations is discarded unless the quote it supplies actually appears
 * in the session. Calibration is graded arithmetically against the sealed key.
 * Only then is a profile derived, and only then does a model write prose — from
 * numbers it did not produce.
 */

import { issuePassport } from "@/lib/credential";
import type { CalibrationKey, ChallengeSpec } from "@/lib/domain";
import { evaluateSession } from "@/lib/evaluate";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { zEvaluateRequest } from "@/lib/schemas";
import { unseal } from "@/lib/seal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`evaluate:${clientKey(req)}`, { capacity: 8, refillPerMinute: 6 });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zEvaluateRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Incomplete session.");
    const spec = parsed.data.challenge as ChallengeSpec;
    if (!spec?.beats || !spec?.requirements) return badRequest("Missing challenge.");

    // The answer key was sealed when the items were handed out. If it does not
    // unseal, the calibration section is dropped rather than guessed at.
    let calibrationKey: CalibrationKey[] | null = null;
    const calibration = parsed.data.calibration;
    if (calibration?.sealed) {
      calibrationKey = unseal<CalibrationKey[]>(calibration.sealed);
    }

    const { result, passport } = await evaluateSession({
      spec,
      holder: parsed.data.holder.trim() || "Anonymous",
      work: parsed.data.work,
      turns: parsed.data.turns,
      defence: parsed.data.defence,
      telemetry: parsed.data.telemetry,
      calibrationKey,
      calibrationAnswers: calibration?.answers ?? null,
    });

    const issued = await issuePassport(passport);

    return Response.json({
      result,
      passport,
      credential: {
        jwt: issued.jwt,
        sdJwt: issued.sdJwt,
        disclosureCount: issued.disclosures.length,
      },
      calibrationSealFailed: Boolean(calibration?.sealed) && calibrationKey === null,
    });
  });
}
