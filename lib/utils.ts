import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function round(n: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function shortId(prefix = ""): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 12);
  return prefix ? `${prefix}_${body}` : body;
}

export function normalise(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Word shingles, used for verbatim-copy detection. */
function shingles(s: string, k = 5): Set<string> {
  const words = normalise(s).split(" ").filter(Boolean);
  const out = new Set<string>();
  if (words.length < k) {
    if (words.length) out.add(words.join(" "));
    return out;
  }
  for (let i = 0; i + k <= words.length; i++) out.add(words.slice(i, i + k).join(" "));
  return out;
}

/**
 * What fraction of the candidate's work is lifted word for word from what the
 * counterpart handed them. Pure string maths, so the finding is reproducible
 * and can be argued with rather than believed.
 */
export function verbatimOverlap(work: string, assistantText: string): number {
  const a = shingles(work);
  const b = shingles(assistantText);
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const s of a) if (b.has(s)) hits++;
  return hits / a.size;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function daysBetween(from: string | number, to: number = nowMs()): number {
  const start = typeof from === "string" ? Date.parse(from) : from;
  if (Number.isNaN(start)) return 0;
  return Math.max(0, (to - start) / 86_400_000);
}

/** Single clock, so tests can reason about time in one place. */
export function nowMs(): number {
  return Date.now();
}

export function isoIn(days: number, from: number = nowMs()): string {
  return new Date(from + days * 86_400_000).toISOString();
}

export function b64urlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const bin = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function pct(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n)}`;
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
