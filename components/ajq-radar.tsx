import { AJQ_FACETS, FACET_LABEL, type FacetScore } from "@/lib/domain";

/**
 * The six facets of AI judgment, as a hexagon.
 *
 * A radar is the right shape here because the interesting candidates are the
 * lopsided ones. Somebody who detects errors brilliantly and never verifies
 * anything is a specific, recognisable risk, and a single number hides them
 * completely. An unproven facet is drawn pulled to the centre and labelled,
 * rather than plotted at zero as though it had been measured and failed.
 */

const SIZE = 260;
const CX = SIZE / 2;
const CY = SIZE / 2 + 4;
const R = 82;

function point(index: number, radius: number) {
  // Start at twelve o'clock and go clockwise.
  const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
  return {
    x: CX + Math.cos(angle) * radius,
    y: CY + Math.sin(angle) * radius,
  };
}

function polygon(radius: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const p = point(i, radius);
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
}

export function AjqRadar({
  facets,
  label = true,
}: {
  facets: FacetScore[];
  label?: boolean;
}) {
  const byFacet = new Map(facets.map((f) => [f.facet, f]));
  const ordered = AJQ_FACETS.map((facet) => byFacet.get(facet));

  const shape = ordered
    .map((f, i) => {
      // Unproven sits just off the centre: visibly not a zero, visibly not a score.
      const radius = f?.score == null ? R * 0.08 : (f.score / 100) * R;
      const p = point(i, radius);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

  const proven = ordered.filter((f) => f?.score != null).length;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[280px]"
        role="img"
        aria-label={`AI judgment across six facets. ${ordered
          .map((f, i) => `${FACET_LABEL[AJQ_FACETS[i]]} ${f?.score ?? "unproven"}`)
          .join(", ")}.`}
      >
        <defs>
          <linearGradient id="ajq-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7189ff" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#a07cff" stopOpacity="0.14" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((step) => (
          <polygon
            key={step}
            points={polygon(R * step)}
            fill="none"
            stroke="#1e2540"
            strokeWidth={step === 1 ? 1.2 : 0.8}
          />
        ))}

        {AJQ_FACETS.map((_, i) => {
          const p = point(i, R);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="#1e2540"
              strokeWidth="0.8"
            />
          );
        })}

        <polygon
          points={shape}
          fill="url(#ajq-fill)"
          stroke="#7189ff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {ordered.map((f, i) => {
          const radius = f?.score == null ? R * 0.08 : (f.score / 100) * R;
          const p = point(i, radius);
          const unproven = f?.score == null;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={unproven ? 2.6 : 3.4}
              fill={unproven ? "#5b6480" : "#a07cff"}
              stroke="#06080f"
              strokeWidth="1.4"
            />
          );
        })}

        {label &&
          AJQ_FACETS.map((facet, i) => {
            const p = point(i, R + 22);
            const score = ordered[i]?.score;
            return (
              <g key={facet}>
                <text
                  x={p.x}
                  y={p.y - 1}
                  fill="#8e98b2"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {FACET_LABEL[facet]}
                </text>
                <text
                  x={p.x}
                  y={p.y + 10}
                  fill={score == null ? "#5b6480" : "#7189ff"}
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {score ?? "—"}
                </text>
              </g>
            );
          })}
      </svg>

      {label && (
        <figcaption className="mt-1 text-center text-[11.5px] text-dim">
          {proven === 6
            ? "All six facets evidenced."
            : `${proven} of 6 facets evidenced. The rest read unproven, not zero.`}
        </figcaption>
      )}
    </figure>
  );
}
