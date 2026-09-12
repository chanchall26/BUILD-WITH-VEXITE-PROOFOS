/**
 * Revocation.
 *
 * Flips one bit in the status list. Anyone holding a copy of the credential
 * still has a valid signature — that is how signatures work — but a verifier
 * checking the list will see it withdrawn. This is what makes a portable
 * credential safe to issue: it can be taken back.
 *
 * In this deployment the list is held in memory, so it resets when the server
 * does. A production deployment persists it. That limitation is stated rather
 * than hidden, because a revocation list that quietly forgets is worse than
 * none at all.
 */

import { isRevoked, revoke, unrevoke } from "@/lib/credential";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`revoke:${clientKey(req)}`, { capacity: 20, refillPerMinute: 20 });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const body = (await req.json().catch(() => null)) as {
      statusIndex?: number;
      restore?: boolean;
    } | null;

    const index = Number(body?.statusIndex);
    if (!Number.isInteger(index) || index < 0) return badRequest("Send a status index.");

    if (body?.restore) unrevoke(index);
    else revoke(index);

    return Response.json({ statusIndex: index, revoked: isRevoked(index) });
  });
}
