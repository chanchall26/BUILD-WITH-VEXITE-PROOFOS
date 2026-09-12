"use client";

import { useState } from "react";
import { AJQ_FACETS, FACET_LABEL, type AjqFacet } from "@/lib/domain";
import { FACET_META } from "./skill-meta";
import { cn } from "@/lib/utils";

/**
 * The six parts of AI judgment, as a ring you can poke.
 *
 * A list of six bullet points is forgettable. Six nodes around a centre, where
 * picking one explains it, turns the same content into something somebody
 * actually explores. The centre holds the idea the six add up to.
 */

const RADIUS = 38; // percentage of the container

export function SkillOrbit() {
  const [active, setActive] = useState<AjqFacet>("detect");
  const meta = FACET_META[active];
  const Icon = meta.icon;

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      {/* The ring ------------------------------------------------------- */}
      <div className="relative mx-auto aspect-square w-full max-w-[340px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="var(--color-edge-soft)"
            strokeWidth="0.6"
          />
          {AJQ_FACETS.map((facet, i) => {
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * RADIUS;
            const y = 50 + Math.sin(angle) * RADIUS;
            return (
              <line
                key={facet}
                x1="50"
                y1="50"
                x2={x}
                y2={y}
                stroke={facet === active ? FACET_META[facet].colour : "var(--color-edge-soft)"}
                strokeWidth={facet === active ? "0.8" : "0.4"}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {/* Centre */}
        <div className="absolute left-1/2 top-1/2 flex h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-edge bg-slab text-center shadow-[var(--shadow-card)]">
          <span className="numeral text-[19px] font-bold leading-none text-signal">6</span>
          <span className="mt-0.5 px-1 text-[8.5px] font-medium uppercase leading-tight tracking-wider text-dim">
            parts of AI judgment
          </span>
        </div>

        {/* Nodes */}
        {AJQ_FACETS.map((facet, i) => {
          const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
          const x = 50 + Math.cos(angle) * RADIUS;
          const y = 50 + Math.sin(angle) * RADIUS;
          const FacetIcon = FACET_META[facet].colour ? FACET_META[facet].icon : null;
          const isActive = facet === active;
          return (
            <button
              key={facet}
              type="button"
              onMouseEnter={() => setActive(facet)}
              onFocus={() => setActive(facet)}
              onClick={() => setActive(facet)}
              aria-pressed={isActive}
              aria-label={`${FACET_LABEL[facet]}: ${FACET_META[facet].question}`}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-xl px-1 py-1 transition-transform duration-300",
                isActive ? "scale-110" : "hover:scale-105",
              )}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300"
                style={{
                  background: isActive
                    ? FACET_META[facet].colour
                    : `color-mix(in srgb, ${FACET_META[facet].colour} 11%, transparent)`,
                  borderColor: isActive
                    ? FACET_META[facet].colour
                    : "color-mix(in srgb, var(--color-edge) 100%, transparent)",
                  color: isActive ? "#fff" : FACET_META[facet].colour,
                  boxShadow: isActive ? "var(--shadow-lift)" : "none",
                }}
              >
                {FacetIcon && <FacetIcon size={18} />}
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
        <div key={active} className="pop-in card p-6" style={{ borderColor: meta.colour }}>
          <span
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{
              background: `color-mix(in srgb, ${meta.colour} 13%, transparent)`,
              color: meta.colour,
            }}
            aria-hidden="true"
          >
            <Icon size={20} />
          </span>
          <h3 className="title mt-3">{FACET_LABEL[active]}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{meta.question}</p>
        </div>

        <p className="mt-4 measure text-[13.5px] leading-relaxed text-dim">
          <strong className="font-semibold text-muted">Decide</strong> matters most and is
          hardest to fake, because it shows up in what somebody refuses to do.
        </p>
      </div>
    </div>
  );
}
