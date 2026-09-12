/** Recent Gemini calls, so the engine page shows real work rather than a diagram. */

import { isDemoMode } from "@/lib/config";
import { recentCalls } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ calls: recentCalls(), demoMode: isDemoMode() });
}
