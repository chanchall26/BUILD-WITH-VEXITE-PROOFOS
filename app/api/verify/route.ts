/**
 * Verification.
 *
 * Signature check against the issuer's published Ed25519 key, disclosure
 * digests checked against what was signed, and a revocation lookup. No
 * account, no session, and no record kept of who checked what.
 */

import { verifyCredential } from "@/lib/credential";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { zVerifyRequest } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`verify:${clientKey(req)}`, { capacity: 60, refillPerMinute: 60 });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zVerifyRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Paste a credential to verify.");

    return Response.json(await verifyCredential(parsed.data.token));
  });
}
