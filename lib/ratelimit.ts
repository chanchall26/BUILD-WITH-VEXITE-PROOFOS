/**
 * A small in-process token bucket. Enough to stop a public demo link burning
 * someone's Gemini quota; not a substitute for a real edge limiter.
 */

type Bucket = { tokens: number; last: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  { capacity = 20, refillPerMinute = 20 } = {},
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: capacity, last: now };
  bucket.tokens = Math.min(
    capacity,
    bucket.tokens + ((now - bucket.last) / 60_000) * refillPerMinute,
  );
  bucket.last = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    return { ok: false, retryAfter: Math.ceil(((1 - bucket.tokens) / refillPerMinute) * 60) };
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  if (buckets.size > 5000) buckets.clear();
  return { ok: true, retryAfter: 0 };
}

export function clientKey(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
}

export function tooMany(retryAfter: number): Response {
  return Response.json(
    { error: "Too many requests. Give it a moment." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}

/** Wraps a handler so an unexpected throw becomes JSON, never an HTML error page. */
export async function guard(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected failure.";
    return Response.json({ error: message.slice(0, 300) }, { status: 500 });
  }
}
