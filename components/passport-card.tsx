"use client";

import { BadgeCheck, ShieldCheck } from "lucide-react";
import { DIMENSION_LABEL, type Passport } from "@/lib/domain";
import { freshnessFor, freshnessTone, liveTrustHealth } from "@/lib/freshness";
import { CountUp } from "@/components/ui/count-up";
import { SkillIcon } from "@/components/visuals/skill-meta";
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function PassportCard({
  passport,
  at,
  compact = false,
  className,
}: {
  passport: Passport;
  /** Fixed timestamp, so a prerendered card cannot drift from the client. */
  at: number;
  compact?: boolean;
  className?: string;
}) {
  const health = liveTrustHealth(passport.claims, at);
  const claims = compact ? passport.claims.slice(0, 4) : passport.claims;
  const proven = passport.claims.filter((c) => c.score !== null).length;

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

      {/* Identity ------------------------------------------------------- */}
      <div className="flex items-center gap-3.5 p-5 pb-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[15px] font-bold text-on-signal"
          style={{
            background: "linear-gradient(135deg, var(--color-signal), var(--color-violet))",
          }}
          aria-hidden="true"
        >
          {initials(passport.holder)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[16.5px] font-semibold tracking-[-0.02em]">
            {passport.holder}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
            <BadgeCheck size={13} className="text-proof" aria-hidden="true" />
            Verified · {passport.observationCount} pieces of proof
          </p>
        </div>

        <div className="text-right">
          <CountUp
            value={health}
            className="numeral block text-[34px] font-semibold leading-none"
          />
          <span className="mt-0.5 block text-[9.5px] font-medium uppercase tracking-[0.12em] text-dim">
            trust score
          </span>
        </div>
      </div>

      {/* Skills --------------------------------------------------------- */}
      <ul className="space-y-2.5 px-5 pb-4">
        {claims.map((c) => {
          const fresh = freshnessFor(c.dimension, c.verifiedAt, at);
          const unproven = c.score === null;
          return (
            <li key={c.dimension} className="flex items-center gap-2.5">
              <SkillIcon dimension={c.dimension} size={13} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "truncate text-[12.5px]",
                      unproven ? "text-dim" : "text-muted",
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
                  >
                    {c.score ?? "not shown yet"}
                  </span>
                </div>
                <div className={cn("meter mt-1 h-1", TONE_CLASS[freshnessTone(fresh)])}>
                  <span style={{ width: unproven ? "0%" : `${c.score}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Seal ----------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-edge-soft bg-deep px-5 py-3 text-[10.5px] text-dim">
        <span className="inline-flex items-center gap-1.5 font-medium text-proof">
          <ShieldCheck size={12} aria-hidden="true" />
          Signed
        </span>
        <span>{proven}/6 skills proven</span>
        <span className="hidden sm:inline">You choose what to share</span>
        <span className="ml-auto font-mono">{passport.id}</span>
      </div>
    </div>
  );
}
