import { TRUTH_LABEL, type CalibrationResult } from "@/lib/domain";

/**
 * The calibration plot.
 *
 * Warranted trust along the bottom, stated trust up the side. A perfectly
 * calibrated person sits on the diagonal. Everything above it is over-trust,
 * everything below is under-trust, and the bottom-right corner — high stated
 * trust in something unsafe — is the quadrant that costs companies money.
 */

const SIZE = 300;
const PAD = 38;
const SPAN = SIZE - PAD * 2;

const COLOUR: Record<string, string> = {
  correct: "var(--color-proof)",
  partial: "var(--color-data)",
  wrong: "var(--color-caution)",
  dangerous: "var(--color-alert)",
};

export function CalibrationPlot({ result }: { result: CalibrationResult }) {
  const x = (v: number) => PAD + (v / 100) * SPAN;
  const y = (v: number) => PAD + (1 - v / 100) * SPAN;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[320px]"
        role="img"
        aria-label={`Calibration plot. ${result.answered} judgements, mean error ${result.calibrationError} points, bias ${result.bias > 0 ? "towards over-trust" : "towards under-trust"}.`}
      >
        <rect x={PAD} y={PAD} width={SPAN} height={SPAN} rx="8" fill="var(--color-deep)" stroke="var(--color-edge-soft)" />

        {/* The over-trust half, shaded because it is the expensive one. */}
        <path
          d={`M ${PAD} ${y(0)} L ${x(100)} ${y(100)} L ${x(100)} ${y(0)} Z`}
          fill="var(--color-alert)"
          opacity="0.04"
        />
        <path
          d={`M ${PAD} ${PAD} L ${x(100)} ${y(100)} L ${PAD} ${y(100)} Z`}
          fill="var(--color-signal)"
          opacity="0.05"
        />
        <line
          x1={PAD}
          y1={y(0)}
          x2={x(100)}
          y2={y(100)}
          stroke="var(--color-edge)"
          strokeDasharray="3 4"
        />

        <text x={x(100) - 6} y={y(4)} fill="var(--color-dim)" fontSize="9" textAnchor="end" fontFamily="monospace">
          OVER-TRUST
        </text>
        <text x={PAD + 6} y={PAD + 13} fill="var(--color-dim)" fontSize="9" fontFamily="monospace">
          UNDER-TRUST
        </text>

        {result.outcomes.map((o, i) => (
          <g key={o.id}>
            <line
              x1={x(o.idealTrust)}
              y1={y(o.idealTrust)}
              x2={x(o.idealTrust)}
              y2={y(o.trust)}
              stroke={COLOUR[o.truth]}
              strokeWidth="1"
              opacity="0.35"
            />
            <circle
              cx={x(o.idealTrust)}
              cy={y(o.trust)}
              r={o.truth === "dangerous" ? 6 : 4.5}
              fill={COLOUR[o.truth]}
              stroke="var(--color-void)"
              strokeWidth="1.5"
            >
              <title>
                {`${TRUTH_LABEL[o.truth]} — warranted ${o.idealTrust}, you said ${o.trust}`}
              </title>
            </circle>
            {o.truth === "dangerous" && o.trust > 30 && (
              <circle
                cx={x(o.idealTrust)}
                cy={y(o.trust)}
                r="10"
                fill="none"
                stroke="var(--color-alert)"
                strokeWidth="1"
                opacity="0.6"
              />
            )}
            <text
              x={x(o.idealTrust)}
              y={y(o.trust) - 10}
              fill="var(--color-dim)"
              fontSize="8"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {i + 1}
            </text>
          </g>
        ))}

        <text x={SIZE / 2} y={SIZE - 8} fill="var(--color-dim)" fontSize="9.5" textAnchor="middle">
          Warranted trust →
        </text>
        <text
          x={12}
          y={SIZE / 2}
          fill="var(--color-dim)"
          fontSize="9.5"
          textAnchor="middle"
          transform={`rotate(-90 12 ${SIZE / 2})`}
        >
          Your trust →
        </text>
      </svg>

      <figcaption className="mt-3 space-y-1 text-[12px] leading-relaxed text-dim">
        <p>
          Each point is one AI output. On the dashed line, your confidence matched what the
          output deserved.
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {(["correct", "partial", "wrong", "dangerous"] as const).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: COLOUR[t] }}
              />
              {TRUTH_LABEL[t]}
            </span>
          ))}
        </p>
      </figcaption>
    </figure>
  );
}
