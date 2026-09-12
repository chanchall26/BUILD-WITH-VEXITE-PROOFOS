/**
 * The issuer's did:web document.
 *
 * A did:web identifier maps onto a host, and this is the document that host
 * must publish. Fetch it once and every PROOFOS credential can be verified
 * offline afterwards, with no account and no call back to us.
 */

import { didDocument } from "@/lib/credential";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(await didDocument(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/did+json",
    },
  });
}
