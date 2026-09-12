"use client";

import { Bot, ShieldOff, UserX, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { FIXTURE_PULSE } from "@/lib/fixtures";

interface Pulse {
  headline: string;
  stats: { value: string; label: string; sourceName: string }[];
  sources?: { title: string; url: string }[];
  source?: "gemini" | "fixture";
}

/** One icon and colour per statistic, so the row reads as four distinct facts. */
const LOOKS = [
  { icon: UserX, colour: "var(--color-skill-authorship)" },
  { icon: ShieldOff, colour: "var(--color-skill-communication)" },
  { icon: Bot, colour: "var(--color-skill-ai)" },
  { icon: Scale, colour: "var(--color-skill-verification)" },
];

/**
 * The numbers behind this product move every quarter, so the page looks them up
 * rather than shipping last year's. The verified fallback renders first, so
 * nothing pops in and nothing is ever blank.
 */
export function MarketPulse() {
  const [pulse, setPulse] = useState<Pulse>(FIXTURE_PULSE);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/pulse");
        if (!res.ok) return;
        const data = (await res.json()) as Pulse;
        if (cancelled || !data?.stats?.length) return;
        setPulse(data);
        setLive(data.source === "gemini");
      } catch {
        /* the fallback is already on screen */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="title">Hiring signals are breaking</h2>
        {live && (
          <span className="badge badge-data">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-data" />
            looked up just now
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pulse.stats.slice(0, 4).map((s, i) => {
          const look = LOOKS[i] ?? LOOKS[0];
          const Icon = look.icon;
          return (
            <Card key={s.label} hover className={`rise rise-${i + 1} p-5`}>
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: `color-mix(in srgb, ${look.colour} 13%, transparent)`,
                  color: look.colour,
                }}
                aria-hidden="true"
              >
                <Icon size={18} />
              </span>
              <p
                className="numeral mt-3.5 text-[30px] font-bold leading-none"
                style={{ color: look.colour }}
              >
                {s.value}
              </p>
              <p className="mt-2 text-[13px] leading-snug text-muted">{s.label}</p>
              <p className="mt-2.5 border-t border-edge-soft pt-2.5 text-[11px] text-dim">
                {s.sourceName}
              </p>
            </Card>
          );
        })}
      </div>

      {pulse.sources && pulse.sources.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-dim">
          <span>Sources:</span>
          {pulse.sources.slice(0, 4).map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-signal"
            >
              {s.title.slice(0, 42)}
            </a>
          ))}
        </p>
      )}
    </div>
  );
}
