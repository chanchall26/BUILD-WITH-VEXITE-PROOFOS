import { cn } from "@/lib/utils";

/**
 * A score as a ring.
 *
 * Reads faster than a bar for a single headline figure, and leaves room in the
 * middle for the number itself. An unproven score draws no arc at all rather
 * than an empty one, because empty reads as zero and zero is a measurement.
 */
export function ProgressRing({
  value,
  size = 120,
  stroke = 9,
  colour = "var(--color-signal)",
  label,
  sublabel,
  className,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  colour?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = value === null ? 0 : (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-edge-soft)"
          strokeWidth={stroke}
        />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colour}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="numeral font-semibold leading-none"
          style={{ fontSize: size * 0.28 }}
        >
          {value ?? "—"}
        </span>
        {label && (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-dim">
            {label}
          </span>
        )}
        {sublabel && <span className="mt-0.5 text-[10px] text-dim">{sublabel}</span>}
      </div>
    </div>
  );
}

/** Segmented progress. Shows how many steps remain, not just a percentage. */
export function StepBar({
  total,
  done,
  className,
}: {
  total: number;
  done: number;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1.5", className)} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            i < done ? "bg-signal" : "bg-edge-soft",
          )}
        />
      ))}
    </div>
  );
}
