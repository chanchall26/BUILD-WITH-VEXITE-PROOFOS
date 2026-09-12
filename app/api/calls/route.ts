/** Recent Gemini calls, so the engine page shows real work rather than a diagram. */

import { isDemoMode } from "@/lib/config";
import { recentCalls, sidelinedModels } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    calls: recentCalls(),
    demoMode: isDemoMode(),
    // Models this key has been refused by, and how long until they are retried.
    sidelined: sidelinedModels(),
  });
}
