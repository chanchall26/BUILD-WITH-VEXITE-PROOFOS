"use client";

import { useEffect, useState } from "react";

type Choice = "system" | "light" | "dark";

/**
 * Light, dark, or whatever the device prefers.
 *
 * The choice is written to the root element and remembered. A tiny script in
 * the layout applies it before the first paint, so nobody sees a white flash
 * on the way to a dark page.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = (() => {
        try {
          return localStorage.getItem("proofos.theme") as Choice | null;
        } catch {
          return null;
        }
      })();
      if (cancelled) return;
      setChoice(saved === "light" || saved === "dark" ? saved : "system");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function apply(next: Choice) {
    setChoice(next);
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    try {
      if (next === "system") localStorage.removeItem("proofos.theme");
      else localStorage.setItem("proofos.theme", next);
    } catch {
      /* a blocked store just means the choice lasts for this visit */
    }
  }

  const next: Choice = choice === "system" ? "light" : choice === "light" ? "dark" : "system";
  const label =
    choice === "system" ? "Match my device" : choice === "light" ? "Light" : "Dark";

  return (
    <button
      type="button"
      onClick={() => apply(next)}
      aria-label={`Theme: ${label}. Click to switch.`}
      title={`Theme: ${label}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-muted transition-colors hover:border-signal-deep hover:text-signal"
    >
      {!ready ? (
        <span className="block h-3.5 w-3.5 rounded-full border border-current opacity-40" />
      ) : choice === "light" ? (
        <SunIcon />
      ) : choice === "dark" ? (
        <MoonIcon />
      ) : (
        <AutoIcon />
      )}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.8" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="1.6"
          x2="12"
          y2="4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="currentColor" />
    </svg>
  );
}
