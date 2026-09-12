"use client";

import { ChevronDown, Quote } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { SkillIcon, SKILL_META } from "@/components/visuals/skill-meta";
import { DIMENSION_LABEL, type Dimension, type DimensionScore, type Observation } from "@/lib/domain";
import { freshnessFor, freshnessTone } from "@/lib/freshness";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<string, string> = {
  proof: "is-proof",
  signal: "",
  caution: "is-caution",
  alert: "is-alert",
};

function verdict(score: number | null): { label: string; tone: string } {
  if (score === null) return { label: "Not shown yet", tone: "badge" };
  if (score >= 75) return { label: "Strong", tone: "badge badge-proof" };
  if (score >= 55) return { label: "Solid", tone: "badge badge-brand" };
  if (score >= 35) return { label: "Mixed", tone: "badge badge-caution" };
  return { label: "Weak here", tone: "badge badge-alert" };
}

/**
 * One skill, with its evidence folded away.
 *
 * Showing every piece of evidence at once buries the result. The score, a
 * one-line reading and the evidence count are enough to scan six of these;
 * anyone who wants the receipts opens the card.
 */
export function SkillCard({
  score,
  verifiedAt,
  observations,
  index = 0,
}: {
  score: DimensionScore;
  verifiedAt: string;
  observations: Observation[];
  index?: number;
}) {
  const [open, setOpen] = useState(false);
  const dimension = score.dimension as Dimension;
  const meta = SKILL_META[dimension];
  const mine = observations.filter((o) => o.dimension === dimension);
  const fresh = freshnessFor(dimension, verifiedAt);
  const v = verdict(score.score);

  return (
    <Card
      accent={meta.colour}
      hover={!open}
      className={cn("rise overflow-hidden", `rise-${(index % 6) + 1}`)}
    >
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <SkillIcon dimension={dimension} size={17} />

          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold tracking-[-0.015em]">
              {DIMENSION_LABEL[dimension]}
            </h3>
            <p className="mt-0.5 text-[12.5px] text-dim">{meta.plain}</p>
          </div>

          <div className="text-right">
            <CountUp
              value={score.score}
              className="numeral block text-[26px] font-bold leading-none"
            />
            <span className={cn("mt-1.5 inline-flex", v.tone)}>{v.label}</span>
          </div>
        </div>

        <div className={cn("meter mt-4", TONE_CLASS[freshnessTone(fresh)])}>
          <span style={{ width: score.score === null ? "0%" : `${score.score}%` }} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-dim">
          <span>
            {score.evidence} {score.evidence === 1 ? "moment" : "moments"} recorded
          </span>
          <span>{Math.round(fresh * 100)}% fresh</span>
          {mine.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="ml-auto inline-flex items-center gap-1 font-medium text-signal transition-colors hover:text-violet"
            >
              {open ? "Hide proof" : "See the proof"}
              <ChevronDown
                size={13}
                className={cn("transition-transform duration-200", open && "rotate-180")}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      </div>

      {/* Evidence, on request ------------------------------------------- */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <ul className="space-y-2.5 border-t border-edge-soft bg-deep p-5">
            {mine.slice(0, 8).map((o) => (
              <li
                key={o.id}
                className={cn(
                  "rounded-xl border p-3",
                  o.polarity === 1
                    ? "border-proof/25 bg-proof/[0.04]"
                    : "border-caution/25 bg-caution/[0.04]",
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "numeral mt-0.5 shrink-0 text-[11px] font-bold",
                      o.polarity === 1 ? "text-proof" : "text-caution",
                    )}
                  >
                    {o.polarity === 1 ? "+" : "−"}
                  </span>
                  <p className="text-[12.5px] font-medium leading-snug">{o.detail}</p>
                </div>
                <p className="mt-2 flex gap-1.5 text-[12px] italic leading-relaxed text-muted">
                  <Quote size={11} className="mt-1 shrink-0 opacity-60" aria-hidden="true" />
                  {o.quote}
                </p>
                <p className="mt-2 font-mono text-[10px] text-dim">
                  {o.detector === "deterministic" ? "measured" : "read from your work"} ·{" "}
                  {o.hash.slice(0, 10)}
                </p>
              </li>
            ))}
            {mine.length > 8 && (
              <li className="text-center text-[11.5px] text-dim">
                and {mine.length - 8} more
              </li>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
}
