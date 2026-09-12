"use client";

import { Check, Eye, EyeOff, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The whole product, in one interaction.
 *
 * A paragraph explaining "the AI read the wrong chart" is forgettable. Seeing
 * the AI's confident claim next to the chart it never opened, and then opening
 * it yourself, is not. This is the section people remember.
 */

const EVIDENCE = [
  {
    id: "db",
    title: "Database load",
    opened: true,
    summary: "CPU 40% → 82%",
    detail: "Busy, yes. But almost every request touches the database, so this rises whenever anything gets busier.",
  },
  {
    id: "pages",
    title: "Speed by page",
    opened: false,
    summary: "1 of 4 pages broken",
    detail: "Search went 180ms → 2140ms. Orders, checkout and account are completely normal. Only one page changed.",
  },
  {
    id: "deploy",
    title: "Tuesday's code change",
    opened: false,
    summary: "A loop that asks 51 times",
    detail: "Someone added a lookup inside a loop. One search page shows 50 results, so it now makes 51 database trips instead of 1.",
  },
];

export function AiMistakeDemo() {
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* The AI's claim ------------------------------------------------- */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-edge-soft bg-deep px-4 py-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-on-signal"
            style={{ background: "linear-gradient(135deg,var(--color-signal),var(--color-violet))" }}
            aria-hidden="true"
          >
            <Sparkles size={14} />
          </span>
          <span className="text-[13px] font-semibold">Your AI teammate</span>
          <span className="badge ml-auto text-[10.5px]">opened 1 of 3</span>
        </div>

        <div className="space-y-3 p-5 text-[13.5px] leading-relaxed">
          <p className="text-muted">I&apos;ve checked the dashboards.</p>
          <p className="rounded-xl border border-signal/30 bg-wash px-3.5 py-3 font-medium text-signal">
            The database is the problem. Let&apos;s make it bigger.
          </p>
          <p className="text-muted">
            CPU has doubled since Tuesday, and 95% of the slow requests touch the database.
            That&apos;s about as clear as it gets.
          </p>
        </div>

        {revealed && (
          <div className="pop-in border-t border-edge-soft bg-alert/5 px-5 py-4">
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-alert">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-semibold">That number means nothing.</strong> Almost
                every request touches the database. It&apos;s like saying 95% of car crashes
                involve cars.
              </span>
            </p>
          </div>
        )}
      </div>

      {/* The evidence --------------------------------------------------- */}
      <div>
        <p className="mb-2.5 text-[12.5px] font-medium text-muted">
          Evidence available to it
        </p>
        <ul className="space-y-2.5">
          {EVIDENCE.map((e) => {
            const hidden = !e.opened && !revealed;
            const isOpen = open === e.id;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={hidden}
                  onClick={() => setOpen(isOpen ? null : e.id)}
                  aria-expanded={isOpen}
                  className={cn(
                    "w-full rounded-xl border px-4 py-3 text-left transition-all duration-300",
                    e.opened
                      ? "border-edge bg-slab"
                      : revealed
                        ? "border-proof/45 bg-proof/5"
                        : "border-dashed border-edge bg-deep opacity-55",
                    !hidden && "hover:border-signal cursor-pointer",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {e.opened ? (
                      <Eye size={15} className="shrink-0 text-muted" aria-hidden="true" />
                    ) : (
                      <EyeOff
                        size={15}
                        className={cn("shrink-0", revealed ? "text-proof" : "text-dim")}
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-[13.5px] font-medium">{e.title}</span>
                    <span
                      className={cn(
                        "badge ml-auto text-[10px]",
                        e.opened ? "" : revealed ? "badge-proof" : "",
                      )}
                    >
                      {e.opened ? "it opened this" : revealed ? "it skipped this" : "not opened"}
                    </span>
                  </div>

                  {!hidden && (
                    <p className="mt-1.5 pl-[25px] text-[12.5px] font-medium text-bright">
                      {e.summary}
                    </p>
                  )}

                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="mt-2 pl-[25px] text-[12.5px] leading-relaxed text-muted">
                        {e.detail}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {!revealed ? (
          <Button
            className="mt-4"
            full
            icon={<Eye size={16} />}
            onClick={() => setRevealed(true)}
          >
            Show what it missed
          </Button>
        ) : (
          <div className="pop-in mt-4 rounded-xl border border-proof/40 bg-proof/5 px-4 py-3.5">
            <p className="flex items-start gap-2 text-[13px] leading-relaxed">
              <Check size={15} className="mt-0.5 shrink-0 text-proof" aria-hidden="true" />
              <span className="text-muted">
                <strong className="font-semibold text-bright">
                  The database was the victim, not the cause.
                </strong>{" "}
                Copy the AI&apos;s fix and that goes on your record. Spot it, and that goes
                on your record too.
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
