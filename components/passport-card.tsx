"use client";

import { BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import { DIMENSION_LABEL, type Passport } from "@/lib/domain";
import { freshnessFor, freshnessTone, liveTrustHealth } from "@/lib/freshness";
import { CountUp } from "@/components/ui/count-up";
import { SKILL_META, SkillIcon } from "@/components/visuals/skill-meta";
import { cn } from "@/lib/utils";

/**
 * The Proof Passport, rendered as the object it is meant to feel like.
 *
 * This exists because "evidence-backed portable credential" stays an
 * abstraction until somebody sees one. It carries the whole argument at a
 * glance: a headline score that lands rather than appears, six skills with the
 * evidence count that earned each, freshness, and a signed seal.
 */

const TONE_CLASS: Record<string, string> = {
  proof: "is-proof",
  signal: "",
  caution: "is-caution",
  alert: "is-alert",
};

const RING_SIZE = 72;
const RING_STROKE = 5;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** The headline number, drawn inside a gradient ring that fills to the score. */
function ScoreRing({ value, id }: { value: number | null; id: string }) {
  const offset = RING_C * (1 - Math.max(0, Math.min(100, value ?? 0)) / 100);
  return (
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-signal)" />
            <stop offset="100%" stopColor="var(--color-violet)" />
          </linearGradient>
        </defs>
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke="var(--color-edge-soft)"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1100ms var(--ease-out)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp
          value={value}
          className="numeral block text-[22px] font-semibold leading-none"
        />
        <span className="mt-0.5 block text-[8px] font-medium uppercase tracking-[0.14em] text-dim">
          trust
        </span>
      </div>
    </div>
  );
}

export function PassportCard({
  passport,
  at,
  compact = false,
  showcase = false,
  className,
}: {
  passport: Passport;
  /** Fixed timestamp, so a prerendered card cannot drift from the client. */
  at: number;
  compact?: boolean;
  /**
   * Marketing use: hide who this belongs to and present it as "your passport".
   * The scores are still real fixture data, the person is not the point.
   */
  showcase?: boolean;
  className?: string;
}) {
  const health = liveTrustHealth(passport.claims, at);
  const claims = compact ? passport.claims.slice(0, 4) : passport.claims;
  const proven = passport.claims.filter((c) => c.score !== null).length;
  const ringId = `ring-${passport.id}`;

  return (
    <div
      className={cn(
        "card-raised relative overflow-hidden",
        "bg-gradient-to-b from-[color-mix(in_srgb,var(--color-wash)_55%,var(--color-slab))] to-slab",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-signal via-violet to-signal"
      />
      {/* A soft glow behind the score, so the top right feels lit. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--color-violet) 35%, transparent), transparent)",
        }}
      />

      {/* Identity ------------------------------------------------------- */}
      <div className="relative flex items-center gap-3.5 p-5 pb-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[15px] font-bold text-on-signal shadow-[0_6px_18px_color-mix(in_srgb,var(--color-signal)_35%,transparent)]"
          style={{
            background: "linear-gradient(135deg, var(--color-signal), var(--color-violet))",
          }}
          aria-hidden="true"
        >
          {showcase ? <ShieldCheck size={22} /> : initials(passport.holder)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] font-bold tracking-[-0.02em]">
            {showcase ? "Proof Passport" : passport.holder}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
            <BadgeCheck size={13} className="text-proof" aria-hidden="true" />
            Verified · {passport.observationCount} pieces of proof
          </p>
        </div>

        <ScoreRing value={health} id={ringId} />
      </div>

      {/* Skills --------------------------------------------------------- */}
      <ul className="relative space-y-2.5 px-5 pb-4">
        {claims.map((c) => {
          const fresh = freshnessFor(c.dimension, c.verifiedAt, at);
          const tone = freshnessTone(fresh);
          const unproven = c.score === null;
          const colour = SKILL_META[c.dimension].colour;
          return (
            <li key={c.dimension} className="flex items-center gap-2.5">
              <SkillIcon dimension={c.dimension} size={13} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "truncate text-[12.5px] font-medium",
                      unproven ? "text-dim" : "text-bright",
                    )}
                  >
                    {DIMENSION_LABEL[c.dimension]}
                  </span>
                  <span
                    className={cn(
                      "numeral ml-auto shrink-0",
                      unproven
                        ? "text-[9.5px] font-medium uppercase tracking-wider text-dim"
                        : "text-[12.5px] font-semibold",
                    )}
                    style={unproven ? undefined : { color: colour }}
                  >
                    {c.score ?? "not shown yet"}
                  </span>
                </div>
                <div className={cn("meter mt-1.5 h-1.5", TONE_CLASS[tone])}>
                  <span
                    style={{
                      width: unproven ? "0%" : `${c.score}%`,
                      // Fresh proof wears the skill's own colour; ageing proof
                      // keeps the freshness tone so the warning still reads.
                      ...(tone === "signal" && !unproven
                        ? {
                            background: `linear-gradient(90deg, color-mix(in srgb, ${colour} 70%, var(--color-slab)), ${colour})`,
                          }
                        : {}),
                    }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Seal ----------------------------------------------------------- */}
      <div className="relative flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-edge-soft bg-deep px-5 py-3 text-[10.5px] text-dim">
        <span className="inline-flex items-center gap-1.5 font-medium text-proof">
          <ShieldCheck size={12} aria-hidden="true" />
          Signed
        </span>
        <span
          className="rounded-full px-2 py-0.5 font-medium"
          style={{
            background: "color-mix(in srgb, var(--color-proof) 12%, transparent)",
            color: "var(--color-proof)",
          }}
        >
          {proven}/6 skills proven
        </span>
        <span className="hidden sm:inline">You choose what to share</span>
        {showcase ? (
          <span className="ml-auto inline-flex items-center gap-1 text-signal">
            <Sparkles size={11} aria-hidden="true" />
            Yours in 16 min
          </span>
        ) : (
          <span className="ml-auto font-mono">{passport.id}</span>
        )}
      </div>
    </div>
  );
}
