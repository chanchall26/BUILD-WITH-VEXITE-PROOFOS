/**
 * The bitstring status list.
 *
 * One bit per issued credential, gzipped and base64url-encoded, served as a
 * signed credential of its own. A verifier fetches it once and checks the bit
 * at the index named in the credential, which means it learns whether that
 * credential was revoked without telling the issuer which credential it was
 * asking about.
 */

import { encodedStatusList, statusListCredential } from "@/lib/credential";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/status/[id]">) {
  const { id } = await ctx.params;
  if (id !== "1") {
    return Response.json({ error: "No such status list." }, { status: 404 });
  }

  const jwt = await statusListCredential();
  return Response.json(
    { jwt, encodedList: encodedStatusList(), statusPurpose: "revocation" },
    {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
