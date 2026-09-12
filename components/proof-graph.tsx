"use client";

import { useMemo, useState } from "react";
import {
  DIMENSION_LABEL,
  FACET_LABEL,
  FACET_QUESTION,
  type DimensionScore,
  type FacetScore,
  type Observation,
} from "@/lib/domain";

/**
 * The proof graph.
 *
 * A passport is not a number, it is a tree: a headline that decomposes into
 * capabilities, one of which decomposes again into the six facets of AI
 * judgment, and every leaf resolves to the observations that produced it.
 * Clicking anything shows the evidence, which is the only reason the number is
 * allowed to exist.
 */

const W = 760;
const H = 452;
const NODE_W = 178;
const NODE_H = 44;

function tone(score: number | null): { fill: string; text: string } {
  if (score === null) return { fill: "#5b6480", text: "#5b6480" };
  if (score >= 70) return { fill: "#3ddc97", text: "#3ddc97" };
  if (score >= 45) return { fill: "#7189ff", text: "#7189ff" };
  return { fill: "#f2a93b", text: "#f2a93b" };
}

interface NodeProps {
  x: number;
  y: number;
  label: string;
  score: number | null;
  evidence: number;
  active: boolean;
  hint?: string;
  onSelect: () => void;
}

function Node({ x, y, label, score, evidence, active, hint, onSelect }: NodeProps) {
  const t = tone(score);
  const width = score === null ? 0 : (score / 100) * (NODE_W - 24);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${score === null ? "unproven" : score} from ${evidence} observations${hint ? `. ${hint}` : ""}`}
      aria-pressed={active}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="cursor-pointer outline-none"
    >
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx="9"
        fill={active ? "#131828" : "#0e121d"}
        stroke={active ? t.fill : "#1e2540"}
        strokeWidth={active ? 1.6 : 1}
      />
      <text x={x + 12} y={y + 18} fill="#e9edf7" fontSize="11.5" fontWeight="500">
        {label.length > 24 ? `${label.slice(0, 23)}…` : label}
      </text>
      <text
        x={x + NODE_W - 12}
        y={y + 18}
        fill={t.text}
        fontSize="12"
        fontFamily="monospace"
        textAnchor="end"
      >
        {score === null ? "—" : score}
      </text>
      <rect x={x + 12} y={y + 26} width={NODE_W - 24} height="3" rx="1.5" fill="#161b2c" />
      {score !== null && (
        <rect x={x + 12} y={y + 26} width={width} height="3" rx="1.5" fill={t.fill} />
      )}
      <text x={x + 12} y={y + 39} fill="#5b6480" fontSize="9" fontFamily="monospace">
        {evidence} obs
      </text>
    </g>
  );
}

function edge(x1: number, y1: number, x2: number, y2: number, active: boolean) {
  const mid = (x1 + x2) / 2;
  return (
    <path
      d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
      stroke={active ? "#4a5fd6" : "#1e2540"}
      strokeWidth={active ? 1.6 : 1}
      fill="none"
    />
  );
}

export function ProofGraph({
  trustHealth,
  dimensions,
  facets,
  observations = [],
  observationCount,
}: {
  trustHealth: number | null;
  dimensions: DimensionScore[];
  facets: FacetScore[];
  observations?: Observation[];
  observationCount: number;
}) {
  const [selected, setSelected] = useState<string>("ai_judgment");
  // A plain `selected === x` inside the `showFacets` branch gets narrowed away
  // by TypeScript's inferred predicates, so selection is compared through here.
  const isSelected = (id: string) => selected === id;

  const rows = dimensions.length || 1;
  const span = H - 40;
  const step = span / rows;
  const yFor = (i: number) => 20 + i * step + (step - NODE_H) / 2;

  const showFacets = selected === "ai_judgment";
  const facetY = (i: number) => 20 + i * (span / 6) + (span / 6 - NODE_H) / 2;

  const evidence = useMemo(() => {
    if (selected === "root") return observations;
    const facet = facets.find((f) => f.facet === selected);
    if (facet) return observations.filter((o) => o.facet === selected);
    return observations.filter((o) => o.dimension === selected);
  }, [observations, selected, facets]);

  const selectedLabel =
    selected === "root"
      ? "Everything"
      : (DIMENSION_LABEL[selected as keyof typeof DIMENSION_LABEL] ??
        FACET_LABEL[selected as keyof typeof FACET_LABEL] ??
        selected);

  const rootY = H / 2 - NODE_H / 2;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[720px]"
          role="group"
          aria-label="Proof graph. Select a capability to see the evidence behind it."
        >
          {dimensions.map((d, i) =>
            edge(20 + NODE_W, rootY + NODE_H / 2, 262, yFor(i) + NODE_H / 2, selected === d.dimension),
          )}
          {showFacets &&
            facets.map((f, i) =>
              edge(
                262 + NODE_W,
                yFor(dimensions.findIndex((d) => d.dimension === "ai_judgment")) + NODE_H / 2,
                504,
                facetY(i) + NODE_H / 2,
                true,
              ),
            )}

          <Node
            x={20}
            y={rootY}
            label="Trust health"
            score={trustHealth}
            evidence={observationCount}
            active={isSelected("root")}
            hint="Freshness-weighted mean of every proven capability"
            onSelect={() => setSelected("root")}
          />

          {dimensions.map((d, i) => (
            <Node
              key={d.dimension}
              x={262}
              y={yFor(i)}
              label={DIMENSION_LABEL[d.dimension]}
              score={d.score}
              evidence={d.evidence}
              active={isSelected(d.dimension)}
              onSelect={() => setSelected(d.dimension)}
            />
          ))}

          {showFacets &&
            facets.map((f, i) => (
              <Node
                key={f.facet}
                x={504}
                y={facetY(i)}
                label={FACET_LABEL[f.facet]}
                score={f.score}
                evidence={f.evidence}
                active={isSelected(f.facet)}
                hint={FACET_QUESTION[f.facet]}
                onSelect={() => setSelected(f.facet)}
              />
            ))}
        </svg>
      </div>

      {/* Evidence ------------------------------------------------------- */}
      <div className="mt-5 border-t border-edge-soft pt-5">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-[15px] font-medium">{selectedLabel}</h3>
          <span className="text-[12.5px] text-dim">
            {evidence.length} {evidence.length === 1 ? "observation" : "observations"}
          </span>
          {selected in FACET_QUESTION && (
            <span className="text-[12.5px] text-muted">
              {FACET_QUESTION[selected as keyof typeof FACET_QUESTION]}
            </span>
          )}
        </div>

        {evidence.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-dim">
            No evidence recorded here, so nothing is claimed. An unproven capability is
            reported as unproven rather than given a number that looks like a measurement.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {evidence.slice(0, 24).map((o) => (
              <li
                key={o.id}
                className={`rounded-lg border p-3 ${
                  o.polarity === 1
                    ? "border-proof/25 bg-proof/[0.035]"
                    : "border-caution/25 bg-caution/[0.035]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`numeral text-[11px] ${o.polarity === 1 ? "text-proof" : "text-caution"}`}
                  >
                    {o.polarity === 1 ? "+" : "−"}
                    {o.weight.toFixed(2)}
                  </span>
                  <span className="text-[12.5px] text-bright">{o.detail}</span>
                </div>
                <p className="mt-1.5 border-l-2 border-edge pl-2.5 text-[12.5px] italic leading-relaxed text-muted">
                  &ldquo;{o.quote}&rdquo;
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] text-dim">
                  <span>{o.detector}</span>
                  <span>{o.source}</span>
                  {o.ref && <span>{o.ref}</span>}
                  <span>sha256:{o.hash.slice(0, 12)}</span>
                  <span>{new Date(o.at).toISOString().slice(11, 19)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
