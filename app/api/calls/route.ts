/** Recent Gemini calls, so the engine page shows real work rather than a diagram. */

import { isDemoMode } from "@/lib/config";
import { keyPoolStatus, recentCalls } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const pool = keyPoolStatus();
  return Response.json({
    calls: recentCalls(),
    demoMode: isDemoMode(),
    // Positions in the key pool and their cooldowns. Never key material.
    pool,
  });
}
