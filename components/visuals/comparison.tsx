import { Check, X } from "lucide-react";

/**
 * Traditional checks against proof-based ones.
 *
 * Replaces three paragraphs of argument with seven rows somebody can scan in
 * about ten seconds, which is roughly how long they will actually give it.
 */

const ROWS = [
  { label: "What it proves", old: "A real human was there", now: "What they can actually do" },
  { label: "AI supervision", old: null, now: "Measured across six parts" },
  { label: "Who owns it", old: "The company", now: "The candidate" },
  { label: "Reusable elsewhere", old: null, now: "At every company" },
  { label: "Expiry", old: "Never, or random", now: "Fades, skill by skill" },
  { label: "Evidence you can check", old: null, now: "Every score opens up" },
  { label: "Needs your camera", old: "Usually yes", now: "Never" },
];

export function Comparison() {
  return (
    <div className="overflow-hidden rounded-[--radius-panel] border border-edge">
      {/* Headings */}
      <div className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-edge bg-deep">
        <div className="px-4 py-3.5" />
        <div className="px-4 py-3.5 text-[12.5px] font-semibold text-muted">
          Tests today
        </div>
        <div className="bg-wash px-4 py-3.5 text-[12.5px] font-bold text-signal">PROOFOS</div>
      </div>

      <div className="divide-y divide-[--color-edge-soft]">
        {ROWS.map((r) => (
          <div key={r.label} className="grid grid-cols-[1.1fr_1fr_1fr] items-center">
            <div className="px-4 py-3.5 text-[13px] font-medium text-muted">{r.label}</div>

            <div className="flex items-center gap-2 px-4 py-3.5">
              {r.old ? (
                <span className="text-[13px] text-muted">{r.old}</span>
              ) : (
                <>
                  <X size={15} className="shrink-0 text-alert" aria-hidden="true" />
                  <span className="text-[13px] text-dim">No</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 bg-wash px-4 py-3.5">
              <Check size={15} className="shrink-0 text-proof" aria-hidden="true" />
              <span className="text-[13px] font-medium">{r.now}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
