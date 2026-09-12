"use client";

import { useEffect, useState } from "react";
import { FIXTURE_PULSE } from "@/lib/fixtures";

interface Pulse {
  headline: string;
  stats: { value: string; label: string; sourceName: string }[];
  sources?: { title: string; url: string }[];
  source?: "gemini" | "fixture";
}

/**
 * The numbers behind this product move every quarter, so the page asks Gemini
 * to search for the current ones rather than shipping last year's. The verified
 * fallback renders first, so nothing pops in and nothing is ever blank.
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
    <div className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">Why this exists</span>
        {live && (
          <span className="chip border-data/30 text-data">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-data" />
            grounded via Google Search
          </span>
        )}
      </div>
      <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-bright">
        {pulse.headline}
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
        {pulse.stats.slice(0, 4).map((s) => (
          <div key={s.label}>
            <dt className="numeral text-2xl text-signal sm:text-[28px]">{s.value}</dt>
            <dd className="mt-1 text-[12.5px] leading-snug text-muted">{s.label}</dd>
            <dd className="mt-1 text-[11px] text-dim">{s.sourceName}</dd>
          </div>
        ))}
      </dl>
      {pulse.sources && pulse.sources.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-edge-soft pt-3 text-[11px] text-dim">
          {pulse.sources.slice(0, 4).map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-muted"
            >
              {s.title.slice(0, 46)}
            </a>
          ))}
        </p>
      )}
    </div>
  );
}
