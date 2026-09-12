/**
 * Selective disclosure.
 *
 * A candidate applying for a role that cares about AI judgment and verification
 * should not have to hand over their communication score to prove it. The
 * credential commits to a salted digest of every claim, so building a
 * presentation is simply a matter of not sending the disclosures for the claims
 * being withheld. The signature is untouched and still verifies.
 *
 * The verifier can see that something was withheld, and how much. It cannot see
 * what.
 */

import { issuePassport, present } from "@/lib/credential";
import type { Passport } from "@/lib/domain";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { zPresentRequest } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`present:${clientKey(req)}`, { capacity: 20, refillPerMinute: 20 });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zPresentRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Choose at least one capability to disclose.");
    const passport = parsed.data.passport as Passport;
    if (!passport?.claims) return badRequest("Missing passport.");

    // Re-issued rather than stored, so the salts are fresh for this
    // presentation and two disclosures of the same claim to different
    // employers cannot be correlated by digest.
    const issued = await issuePassport(passport);
    const presentation = present(issued.sdJwt, {
      dimensions: parsed.data.disclose,
      ajq: parsed.data.disclose.includes("ai_judgment"),
      trustHealth: parsed.data.disclose.length === passport.claims.length,
      sessions: true,
    });

    return Response.json({
      presentation,
      disclosed: parsed.data.disclose,
      withheld: passport.claims
        .map((c) => c.dimension)
        .filter((d) => !parsed.data.disclose.includes(d)),
      audience: parsed.data.audience ?? null,
    });
  });
}
