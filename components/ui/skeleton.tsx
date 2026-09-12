import { cn } from "@/lib/utils";

/** A shimmering placeholder. Says "coming", where a spinner says "wait". */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

/**
 * A loading state that names what is happening.
 *
 * "Loading…" tells somebody nothing. "Reading the job advert" tells them the
 * machine is doing the thing they asked for, which is the whole point of
 * showing progress at all.
 */
export function LoadingSteps({
  steps,
  active = 0,
  title,
}: {
  steps: string[];
  active?: number;
  title?: string;
}) {
  return (
    <div className="card p-8 text-center" role="status" aria-live="polite">
      {title && <p className="thinking text-[16px] font-medium">{title}</p>}
      <ul className="mx-auto mt-5 max-w-xs space-y-2.5 text-left">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2.5 text-[13px]">
            <span
              className={cn(
                "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                i < active
                  ? "bg-proof/15 text-proof"
                  : i === active
                    ? "bg-signal text-on-signal"
                    : "border border-edge text-dim",
              )}
            >
              {i < active ? "✓" : i + 1}
            </span>
            <span className={i <= active ? "text-bright" : "text-dim"}>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
