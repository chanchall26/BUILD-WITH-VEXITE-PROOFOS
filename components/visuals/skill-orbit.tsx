"use client";

import { ArrowRight, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { AJQ_FACETS, FACET_LABEL, type AjqFacet } from "@/lib/domain";
import { FACET_META } from "./skill-meta";
import { cn } from "@/lib/utils";

/**
 * The six parts of AI judgment, drawn as the loop they actually form.
 *
 * A list of six bullet points is forgettable. Six nodes on a ring, joined by
 * arrows so you can see one leads to the next, where picking one shows a real
 * moment from the task, turns the same content into something explored. The
 * centre holds the idea the six add up to.
 */

const RADIUS = 38; // percentage of the container
const ARC_GAP = 0.22; // radians kept clear either side of a node

/** A moment from the task each facet shows up in, and what we write down. */
const FACET_STORY: Record<AjqFacet, { ai: string; you: string; record: string }> = {
  detect: {
    ai: "The database is the problem.",
    you: "Hang on. That rests on one number.",
    record: "Wrong claims you noticed before acting on them.",
  },
  question: {
    ai: "95% of slow requests touch the database.",
    you: "What share of all requests touch it?",
    record: "Push-backs on claims that sound certain but aren't.",
  },
  verify: {
    ai: "I've checked the dashboards.",
    you: "Which ones? Show me speed by page.",
    record: "Evidence you opened before you decided.",
  },
  direct: {
    ai: "Let's make the database bigger.",
    you: "Compare the four pages first.",
    record: "Instructions that changed what the AI did next.",
  },
  correct: {
    ai: "Search is slow because the database is busy.",
    you: "Search is slow because of a loop added on Tuesday.",
    record: "Fixes you made to what it produced.",
  },
  decide: {
    ai: "Shall I raise the ticket to upgrade the database?",
    you: "No. Fix the loop. Nothing else changed.",
    record: "Choices you made against its advice, and why.",
  },
};

function polar(i: number, r = RADIUS) {
  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
  return { x: 50 + Math.cos(angle) * r, y: 50 + Math.sin(angle) * r, angle };
}

/** Arc from node i to node i+1, stopping short of both so the arrow lands cleanly. */
function arcPath(i: number) {
  const a0 = (Math.PI * 2 * i) / 6 - Math.PI / 2 + ARC_GAP;
  const a1 = (Math.PI * 2 * (i + 1)) / 6 - Math.PI / 2 - ARC_GAP;
  const x0 = 50 + Math.cos(a0) * RADIUS;
  const y0 = 50 + Math.sin(a0) * RADIUS;
  const x1 = 50 + Math.cos(a1) * RADIUS;
  const y1 = 50 + Math.sin(a1) * RADIUS;
  return `M ${x0} ${y0} A ${RADIUS} ${RADIUS} 0 0 1 ${x1} ${y1}`;
}

export function SkillOrbit() {
  const [active, setActive] = useState<AjqFacet>("detect");
  const meta = FACET_META[active];
  const story = FACET_STORY[active];
  const index = AJQ_FACETS.indexOf(active);
  const Icon = meta.icon;

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
      {/* The loop ------------------------------------------------------- */}
      <div className="relative mx-auto aspect-square w-full max-w-[380px]">
        {/* A tinted halo in the active colour, so the ring feels lit from within. */}
        <div
          aria-hidden="true"
          className="absolute inset-[12%] rounded-full blur-2xl transition-colors duration-500"
          style={{ background: `color-mix(in srgb, ${meta.colour} 14%, transparent)` }}
        />

        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <marker
              id="orbit-arrow"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="4"
              markerHeight="4"
              orient="auto"
            >
              <path d="M0 0.6 L5.2 3 L0 5.4 Z" fill="var(--color-dim)" />
            </marker>
            <marker
              id="orbit-arrow-active"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="4"
              markerHeight="4"
              orient="auto"
            >
              <path d="M0 0.6 L5.2 3 L0 5.4 Z" fill={meta.colour} />
            </marker>
          </defs>

          {/* Faint guide ring and the arc arrows that make it a cycle */}
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--color-edge-soft)" strokeWidth="0.5" strokeDasharray="1 1.6" />
          {AJQ_FACETS.map((facet, i) => {
            const isActive = i === index;
            return (
              <path
                key={facet}
                d={arcPath(i)}
                fill="none"
                stroke={isActive ? meta.colour : "var(--color-edge)"}
                strokeWidth={isActive ? 1.1 : 0.7}
                strokeLinecap="round"
                markerEnd={isActive ? "url(#orbit-arrow-active)" : "url(#orbit-arrow)"}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Spoke from the centre to the chosen node */}
          {(() => {
            const p = polar(index, RADIUS - 12);
            const c = polar(index, 16);
            return (
              <line
                x1={c.x}
                y1={c.y}
                x2={p.x}
                y2={p.y}
                stroke={meta.colour}
                strokeWidth="0.8"
                strokeDasharray="1.4 1.4"
                className="transition-all duration-300"
              />
            );
          })()}
        </svg>

        {/* Centre */}
        <div className="absolute left-1/2 top-1/2 flex h-[32%] w-[32%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-edge bg-slab text-center shadow-[var(--shadow-card)]">
          <span className="numeral text-[22px] font-bold leading-none" style={{ color: meta.colour }}>
            6
          </span>
          <span className="mt-1 px-2 text-[8.5px] font-medium uppercase leading-tight tracking-wider text-dim">
            parts of
            <br />
            AI judgment
          </span>
        </div>

        {/* Nodes */}
        {AJQ_FACETS.map((facet, i) => {
          const { x, y } = polar(i);
          const FacetIcon = FACET_META[facet].icon;
          const colour = FACET_META[facet].colour;
          const isActive = facet === active;
          return (
            <button
              key={facet}
              type="button"
              onMouseEnter={() => setActive(facet)}
              onFocus={() => setActive(facet)}
              onClick={() => setActive(facet)}
              aria-pressed={isActive}
              aria-label={`${i + 1}. ${FACET_LABEL[facet]}: ${FACET_META[facet].question}`}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl px-1 py-1 transition-transform duration-300",
                isActive ? "scale-110" : "hover:scale-105",
              )}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300"
                style={{
                  background: isActive ? colour : "var(--color-slab)",
                  borderColor: isActive ? colour : "var(--color-edge)",
                  color: isActive ? "#fff" : colour,
                  boxShadow: isActive ? "var(--shadow-lift)" : "var(--shadow-sm)",
                }}
              >
                <FacetIcon size={18} />
                <span
                  className="numeral absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-slab px-1 text-[8.5px] font-bold"
                  style={{
                    background: isActive ? "var(--color-bright)" : "var(--color-raise)",
                    color: isActive ? "var(--color-void)" : "var(--color-muted)",
                  }}
                >
                  {i + 1}
                </span>
              </span>
              <span
                className={cn(
                  "text-[10.5px] font-semibold transition-colors",
                  isActive ? "text-bright" : "text-dim",
                )}
              >
                {FACET_LABEL[facet]}
              </span>
            </button>
          );
        })}
      </div>

      {/* The explanation ------------------------------------------------ */}
      <div>
        <div key={active} className="pop-in card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-edge-soft p-5 pb-4">
            <span
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: `color-mix(in srgb, ${meta.colour} 13%, transparent)`,
                color: meta.colour,
              }}
              aria-hidden="true"
            >
              <Icon size={20} />
            </span>
            <div className="min-w-0">
              <p className="eyebrow" style={{ color: meta.colour }}>
                {index + 1} of 6
              </p>
              <h3 className="title mt-0.5">{FACET_LABEL[active]}</h3>
            </div>
            <p className="ml-auto hidden max-w-[16rem] text-right text-[13px] leading-snug text-muted sm:block">
              {meta.question}
            </p>
          </div>

          {/* One exchange from the task, so the word has a face. */}
          <div className="space-y-2.5 p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-dim">
              What it looks like in the task
            </p>
            <div className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-on-signal"
                style={{ background: "linear-gradient(135deg,var(--color-signal),var(--color-violet))" }}
                aria-hidden="true"
              >
                <Sparkles size={12} />
              </span>
              <p className="rounded-xl rounded-tl-sm border border-edge-soft bg-deep px-3.5 py-2.5 text-[13.5px] leading-relaxed text-muted">
                {story.ai}
              </p>
            </div>
            <div className="flex items-start justify-end gap-2.5">
              <p
                className="rounded-xl rounded-tr-sm border px-3.5 py-2.5 text-[13.5px] font-medium leading-relaxed text-bright"
                style={{
                  borderColor: `color-mix(in srgb, ${meta.colour} 40%, transparent)`,
                  background: `color-mix(in srgb, ${meta.colour} 8%, transparent)`,
                }}
              >
                {story.you}
              </p>
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: `color-mix(in srgb, ${meta.colour} 14%, transparent)`,
                  color: meta.colour,
                }}
                aria-hidden="true"
              >
                <UserRound size={12} />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-edge-soft bg-deep px-5 py-3 text-[12.5px] text-muted">
            <ArrowRight size={13} className="shrink-0" style={{ color: meta.colour }} aria-hidden="true" />
            <span>
              <strong className="font-semibold text-bright">Goes on your record:</strong> {story.record}
            </span>
          </div>
        </div>

        <p className="mt-4 measure text-[13.5px] leading-relaxed text-dim">
          <strong className="font-semibold text-muted">Decide</strong> matters most and is
          hardest to fake, because it shows up in what somebody refuses to do.
        </p>
      </div>
    </div>
  );
}
