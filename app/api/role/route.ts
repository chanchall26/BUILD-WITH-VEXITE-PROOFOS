/**
 * Reads a job posting and says which verifiable capabilities the role depends
 * on, and how heavily. Accepts pasted text, a PDF, or a photograph of a
 * whiteboard, because that is the state hiring managers actually have their
 * requirements in.
 *
 * Gemini capabilities: multimodal document and image understanding, structured
 * output constrained to the six capabilities, optional Search grounding.
 */

import { MODELS } from "@/lib/config";
import type { RoleSpec } from "@/lib/domain";
import { FIXTURE_ROLE, FIXTURE_ROLE_INPUT } from "@/lib/fixtures";
import { callGemini, type InputPart } from "@/lib/gemini";
import { ROLE_SYSTEM, rolePrompt } from "@/lib/prompts";
import { badRequest, clientKey, guard, rateLimit, tooMany } from "@/lib/ratelimit";
import { ROLE_SCHEMA, zRoleRequest } from "@/lib/schemas";
import { shortId } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function GET() {
  return Response.json({ role: FIXTURE_ROLE, samplePosting: FIXTURE_ROLE_INPUT });
}

export async function POST(req: Request) {
  return guard(async () => {
    const limit = rateLimit(`role:${clientKey(req)}`, { capacity: 8, refillPerMinute: 6 });
    if (!limit.ok) return tooMany(limit.retryAfter);

    const parsed = zRoleRequest.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return badRequest("Send a posting or a file.");
    const { text, file, calibrate } = parsed.data;
    if (!text?.trim() && !file) return badRequest("Send a posting or a file.");

    const input: InputPart[] = [
      { type: "text", text: rolePrompt(text?.trim() ?? "", calibrate) },
    ];
    if (file) {
      input.push(
        file.mimeType.startsWith("image/")
          ? { type: "image", data: file.data, mime_type: file.mimeType }
          : { type: "document", data: file.data, mime_type: file.mimeType },
      );
    }

    const result = await callGemini<Omit<RoleSpec, "id" | "createdAt" | "source">>({
      label: file ? "read posting (multimodal)" : "read posting",
      capability: calibrate
        ? "Multimodal + structured output + Search grounding"
        : "Multimodal + structured output",
      model: MODELS.architect,
      system: ROLE_SYSTEM,
      input,
      schema: ROLE_SCHEMA,
      thinking: "high",
      search: calibrate,
      fixture: () => ({
        title: FIXTURE_ROLE.title,
        seniority: FIXTURE_ROLE.seniority,
        summary: FIXTURE_ROLE.summary,
        requirements: FIXTURE_ROLE.requirements,
      }),
    });

    const role: RoleSpec = {
      ...result.data,
      id: shortId("role"),
      createdAt: new Date().toISOString(),
      source: result.source,
    };

    return Response.json({ role, sources: result.sources, model: result.model, ms: result.ms });
  });
}
