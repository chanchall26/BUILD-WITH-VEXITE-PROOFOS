"use client";

import { ArrowRight, Check, Eye, EyeOff, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The whole product, in one interaction.
 *
 * A paragraph explaining "the AI read the wrong chart" is forgettable. Seeing
 * the AI's confident claim next to the charts it never opened, and then opening
 * them yourself, is not. This is the section people remember.
 *
 * Each piece of evidence is drawn, not described: the one chart the AI opened
 * genuinely looks alarming on its own. The two it skipped are what explain it.
 */

/* ── Data ────────────────────────────────────────────────────────────── */

const CPU_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const CPU = [40, 41, 42, 58, 74, 80, 82];
const CHANGE_DAY = 3; // Tuesday

const PAGES = [
  { name: "Search", ms: 2140, broken: true },
  { name: "Orders", ms: 190, broken: false },
  { name: "Checkout", ms: 210, broken: false },
  { name: "Account", ms: 175, broken: false },
];

const QUERIES_AFTER = 51;

/* ── Mini charts ─────────────────────────────────────────────────────── */

/** Database CPU across the week. One series, so no legend; Tuesday is marked. */
function CpuSparkline({ alarmed }: { alarmed: boolean }) {
  const W = 520;
  const H = 96;
  const padX = 16;
  const padTop = 14;
  const padBottom = 18;
  const min = 30;
  const max = 90;
  const x = (i: number) => padX + (i * (W - padX * 2)) / (CPU.length - 1);
  const y = (v: number) => padTop + ((max - v) / (max - min)) * (H - padTop - padBottom);
  const line = CPU.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const area = `${line} L ${x(CPU.length - 1)} ${H - padBottom} L ${x(0)} ${H - padBottom} Z`;
  const colour = alarmed ? "var(--color-alert)" : "var(--color-data)";
  const last = CPU.length - 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-2.5 h-auto w-full"
      role="img"
      aria-label={`Database CPU by day: ${CPU.map((v, i) => `${CPU_DAYS[i]} ${v}%`).join(", ")}`}
    >
      {/* Recessive baseline and the one guide that matters (the 50% line) */}
      <line x1={padX} x2={W - padX} y1={H - padBottom} y2={H - padBottom} stroke="var(--color-edge)" strokeWidth="1" />
      <line x1={padX} x2={W - padX} y1={y(50)} y2={y(50)} stroke="var(--color-edge-soft)" strokeWidth="1" strokeDasharray="2 3" />

      {/* Change marker */}
      <line x1={x(CHANGE_DAY)} x2={x(CHANGE_DAY)} y1={padTop - 4} y2={H - padBottom} stroke="var(--color-dim)" strokeWidth="1" strokeDasharray="2 2" />

      <path d={area} fill={colour} opacity="0.1" />
      <path d={line} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* First and last points, direct-labelled. Markers keep a surface ring. */}
      <circle cx={x(0)} cy={y(CPU[0])} r="4" fill={colour} stroke="var(--color-slab)" strokeWidth="2" />
      <circle cx={x(last)} cy={y(CPU[last])} r="4.5" fill={colour} stroke="var(--color-slab)" strokeWidth="2" />
      <text x={x(0)} y={y(CPU[0]) - 8} textAnchor="middle" className="fill-[var(--color-muted)]" fontSize="10" fontWeight="600">
        {CPU[0]}%
      </text>
      <text x={x(last) - 2} y={y(CPU[last]) - 8} textAnchor="end" className="fill-[var(--color-bright)]" fontSize="10.5" fontWeight="700">
        {CPU[last]}%
      </text>

      {/* Day labels: first, the change, last. Enough to read; not one on every point. */}
      {[0, CHANGE_DAY, last].map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 5}
          textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
          className={i === CHANGE_DAY ? "fill-[var(--color-bright)]" : "fill-[var(--color-dim)]"}
          fontSize="9.5"
          fontWeight={i === CHANGE_DAY ? 600 : 500}
        >
          {i === CHANGE_DAY ? "Tue · change shipped" : CPU_DAYS[i]}
        </text>
      ))}
    </svg>
  );
}

/** Response time by page. One measure across four names; the one outlier is flagged. */
function PageBars({ revealed }: { revealed: boolean }) {
  const maxMs = 2400;
  return (
    <div className="mt-2.5 space-y-1.5" role="img" aria-label={`Response time by page: ${PAGES.map((p) => `${p.name} ${p.ms}ms`).join(", ")}`}>
      {PAGES.map((p) => {
        const flagged = revealed && p.broken;
        const colour = flagged ? "var(--color-alert)" : "var(--color-data)";
        return (
          <div key={p.name} className="grid grid-cols-[58px_1fr_54px] items-center gap-2 text-[11px]">
            <span className={cn("truncate", flagged ? "font-semibold text-bright" : "text-muted")}>{p.name}</span>
            <div className="h-2 overflow-hidden rounded-[4px] bg-edge-soft">
              <div
                className="h-full rounded-r-[4px] transition-[width] duration-700 ease-[var(--ease-out)]"
                style={{ width: `${(p.ms / maxMs) * 100}%`, background: colour }}
              />
            </div>
            <span className={cn("numeral text-right", flagged ? "font-bold text-bright" : "text-muted")}>
              {p.ms.toLocaleString()} ms
            </span>
          </div>
        );
      })}
      {revealed && (
        <p className="pop-in flex items-center gap-1.5 pt-1 text-[11px] font-medium text-alert">
          <TriangleAlert size={12} aria-hidden="true" />
          Search is 11× slower. The other three didn&apos;t move.
        </p>
      )}
    </div>
  );
}

/** One page load, before and after Tuesday: a single trip vs fifty-one. */
function QueryFanout({ revealed }: { revealed: boolean }) {
  const cols = 17;
  const r = 2.6;
  const gap = 8.4;
  const W = cols * gap;
  const rows = Math.ceil(QUERIES_AFTER / cols);
  const H = rows * gap;
  return (
    <div className="mt-2.5 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-[11px]" role="img" aria-label="One page load made 1 database query before Tuesday and 51 after">
      <span className="text-muted">Before</span>
      <svg viewBox={`0 0 ${W} ${gap}`} className="h-[9px]" style={{ width: W }} aria-hidden="true">
        <circle cx={gap / 2} cy={gap / 2} r={r} fill="var(--color-data)" />
      </svg>
      <span className="text-muted">After</span>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[27px]" style={{ width: W }} aria-hidden="true">
        {Array.from({ length: QUERIES_AFTER }, (_, i) => (
          <circle
            key={i}
            cx={(i % cols) * gap + gap / 2}
            cy={Math.floor(i / cols) * gap + gap / 2}
            r={r}
            fill={i === 0 ? "var(--color-data)" : revealed ? "var(--color-alert)" : "var(--color-dim)"}
            opacity={i === 0 || revealed ? 1 : 0.6}
          />
        ))}
      </svg>
      <span className="col-span-2 pt-0.5 text-[11px] text-muted">
        <span className="numeral font-semibold text-bright">1 → {QUERIES_AFTER}</span> database trips per search,
        one for each result on the page.
      </span>
    </div>
  );
}

/* ── Cause chain ─────────────────────────────────────────────────────── */

function Chain({
  steps,
  tone,
  label,
}: {
  steps: string[];
  tone: "alert" | "proof";
  label: string;
}) {
  const colour = tone === "alert" ? "var(--color-alert)" : "var(--color-proof)";
  return (
    <div>
      <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em]" style={{ color: colour }}>
        {label}
      </p>
      <ol className="flex flex-wrap items-center gap-y-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center">
            <span
              className="rounded-lg border px-2.5 py-1.5 text-[12px] font-medium leading-tight text-bright"
              style={{
                borderColor: `color-mix(in srgb, ${colour} 40%, transparent)`,
                background: `color-mix(in srgb, ${colour} 8%, transparent)`,
              }}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <ArrowRight size={13} className="mx-1 shrink-0" style={{ color: colour }} aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ── Evidence ────────────────────────────────────────────────────────── */

const EVIDENCE = [
  {
    id: "db",
    title: "Database load",
    opened: true,
    detail: "Busy, yes. But almost every request touches the database, so this rises whenever anything gets busier. It is a symptom, not a cause.",
  },
  {
    id: "pages",
    title: "Speed by page",
    opened: false,
    detail: "Orders, checkout and account are completely normal. Only one page changed. A bigger database would not fix that.",
  },
  {
    id: "deploy",
    title: "Tuesday's code change",
    opened: false,
    detail: "Someone added a lookup inside a loop. One search page shows 50 results, so it now makes 51 database trips instead of 1.",
  },
];

export function AiMistakeDemo() {
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      {/* The AI's claim ------------------------------------------------- */}
      <div className="card overflow-hidden self-start">
        <div className="flex items-center gap-2.5 border-b border-edge-soft bg-deep px-4 py-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-on-signal"
            style={{ background: "linear-gradient(135deg,var(--color-signal),var(--color-violet))" }}
            aria-hidden="true"
          >
            <Sparkles size={14} />
          </span>
          <span className="text-[13px] font-semibold">Your AI teammate</span>
          <span className={cn("badge ml-auto text-[10.5px]", revealed && "badge-alert")}>
            opened 1 of 3
          </span>
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

        {/* How it got there, and how it actually happened */}
        <div className="space-y-4 border-t border-edge-soft px-5 py-4">
          <Chain
            label="Its reasoning"
            tone="alert"
            steps={["Database CPU ↑", "95% of slow requests touch it", "Make it bigger"]}
          />
          {revealed && (
            <div className="pop-in">
              <Chain
                label="What actually happened"
                tone="proof"
                steps={["Tuesday's change", "51 queries per search", "Search 11× slower", "Database CPU ↑"]}
              />
            </div>
          )}
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
        <p className="mb-2.5 flex items-center justify-between text-[12.5px] font-medium text-muted">
          <span>Evidence available to it</span>
          <span className="text-[11px] text-dim">click a card to read it</span>
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
                        ? "border-proof/45 bg-slab"
                        : "border-dashed border-edge bg-deep",
                    !hidden && "cursor-pointer hover:border-signal",
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
                    <span className={cn("text-[13.5px] font-medium", hidden && "text-dim")}>{e.title}</span>
                    <span
                      className={cn(
                        "badge ml-auto text-[10px]",
                        e.opened ? "" : revealed ? "badge-proof" : "",
                      )}
                    >
                      {e.opened ? "it opened this" : revealed ? "it skipped this" : "not opened"}
                    </span>
                  </div>

                  {hidden ? (
                    <div className="mt-3 h-[52px] rounded-lg bg-[repeating-linear-gradient(135deg,var(--color-edge-soft)_0_6px,transparent_6px_14px)] opacity-70" aria-hidden="true" />
                  ) : e.id === "db" ? (
                    <CpuSparkline alarmed={!revealed} />
                  ) : e.id === "pages" ? (
                    <PageBars revealed={revealed} />
                  ) : (
                    <QueryFanout revealed={revealed} />
                  )}

                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <p className="mt-3 border-t border-edge-soft pt-3 text-[12.5px] leading-relaxed text-muted">
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
