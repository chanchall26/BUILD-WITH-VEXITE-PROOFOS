/** The issuer's public key, for verifiers that prefer JWKS to a DID document. */

import { publicJwk } from "@/lib/credential";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    { keys: [await publicJwk()] },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
