/**
 * Role coverage.
 *
 * The output is "this person has verified, still-fresh evidence for N% of what
 * the role asks for", with the uncovered capabilities named. It is deliberately
 * not a hire signal: there is no threshold anywhere in this path that turns a
 * number into a recommendation, and the uncovered list is the useful half.
 */

import type { Passport, RoleSpec } from "@/lib/domain";
import { matchRole } from "@/lib/evidence";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`match:${clientKey(req)}`, { capacity: 40, refillPerMinute: 40 });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const body = (await req.json().catch(() => null)) as {
      role?: RoleSpec;
      passports?: Passport[];
    } | null;

    const role = body?.role;
    const passports = body?.passports ?? [];
    if (!role?.requirements?.length) return badRequest("Send a role with requirements.");
    if (passports.length > 60) return badRequest("Too many passports in one request.");

    const matches = passports
      .filter((p) => Array.isArray(p?.claims))
      .map((p) => matchRole(role, p))
      .sort((a, b) => b.coverage - a.coverage);

    return Response.json({ matches });
  });
}
