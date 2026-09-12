/**
 * The mark: a seal built from a check inside a hexagon, the shape trust
 * infrastructure has used since wax. The gap in the ring is deliberate — a
 * proof that admits what it does not cover.
 */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M16 2.4 27.2 8.6v14.8L16 29.6 4.8 23.4V8.6z"
        fill="var(--color-raise)"
        stroke="url(#edge)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M10.6 16.4l3.7 3.8 7.3-8"
        stroke="url(#tick)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="edge" x1="4.8" y1="2.4" x2="27.2" y2="29.6">
          <stop stopColor="var(--color-signal-deep)" />
          <stop offset="1" stopColor="var(--color-violet)" />
        </linearGradient>
        <linearGradient id="tick" x1="10.6" y1="20.2" x2="21.6" y2="12.2">
          <stop stopColor="var(--color-signal)" />
          <stop offset="1" stopColor="var(--color-proof)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size} />
      <span className="text-[15px] font-semibold tracking-[0.01em] text-bright">
        PROOF<span className="text-signal">OS</span>
      </span>
    </span>
  );
}
