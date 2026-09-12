/**
 * The mark: a signed seal. A hexagon for a credential, a tick for verified,
 * and a gradient that ties the whole product to one identity.
 */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0 drop-shadow-[0_2px_6px_color-mix(in_srgb,var(--color-signal)_35%,transparent)]"
    >
      <path
        d="M16 2.2 27.4 8.5v15L16 29.8 4.6 23.5v-15z"
        fill="url(#mark-fill)"
        stroke="url(#mark-edge)"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M10.4 16.3 14.2 20.2 21.7 11.9"
        stroke="var(--color-on-signal)"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="mark-fill" x1="4.6" y1="2.2" x2="27.4" y2="29.8">
          <stop stopColor="var(--color-signal)" />
          <stop offset="1" stopColor="var(--color-violet)" />
        </linearGradient>
        <linearGradient id="mark-edge" x1="4.6" y1="2.2" x2="27.4" y2="29.8">
          <stop stopColor="var(--color-signal-deep)" />
          <stop offset="1" stopColor="var(--color-violet)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * The wordmark. PROOF in the text colour, OS in the brand gradient, set in the
 * display face with a little tracking so it reads as a name and not a word.
 */
export function Wordmark({ size = 26, tagline = false }: { size?: number; tagline?: boolean }) {
  const text = Math.round(size * 0.72);
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size} />
      <span className="flex flex-col">
        <span className="wordmark text-bright" style={{ fontSize: text }}>
          PROOF<span className="wordmark-accent">OS</span>
        </span>
        {tagline && (
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-dim">
            Proof of skill
          </span>
        )}
      </span>
    </span>
  );
}
