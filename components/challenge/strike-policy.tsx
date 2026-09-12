"use client";

/**
 * The strike rule: two warnings, then the test ends itself and is scored on
 * whatever was done. It sits on top of the camera guard and the focus guard,
 * which only count; this file decides when a count becomes a warning.
 *
 * A warning needs a *sustained* problem. A glance at the keyboard is not a
 * strike. Looking away for five seconds, leaving the tab, leaving full
 * screen, a second person in view, or the camera going dark all are.
 */

import { AlertTriangle, Camera, Eye, Maximize2, Users, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CameraStatus } from "./camera-guard";
import type { FocusCounts } from "./focus-mode";

export type StrikeReason =
  | "tab"
  | "fullscreen"
  | "no-face"
  | "many-faces"
  | "looking-away"
  | "blank"
  | "camera-off";

export interface Strike {
  /** 1-based. Warnings are 1..MAX_WARNINGS; MAX_WARNINGS + 1 ends the test. */
  n: number;
  reason: StrikeReason;
  at: number;
}

export const MAX_WARNINGS = 2;

/** Camera states that count, and how long each has to persist before it does. */
const CAMERA_HOLD_MS: Partial<Record<CameraStatus, { reason: StrikeReason; ms: number }>> = {
  "no-face": { reason: "no-face", ms: 4000 },
  "many-faces": { reason: "many-faces", ms: 2500 },
  "looking-away": { reason: "looking-away", ms: 5000 },
  blank: { reason: "blank", ms: 3000 },
  off: { reason: "camera-off", ms: 6000 },
};

/** If the problem simply continues, strike again after this long. */
const REPEAT_MS = 12_000;

/** The same reason cannot strike twice inside this window. */
const COOLDOWN_MS = 4000;

export const STRIKE_COPY: Record<
  StrikeReason,
  { title: string; body: string; icon: typeof Eye }
> = {
  tab: {
    title: "You left the test tab",
    body: "Stay on this tab until you finish. Switching tabs or windows counts as a warning.",
    icon: Maximize2,
  },
  fullscreen: {
    title: "You left full screen",
    body: "The test runs in full screen. Press continue to go back into it.",
    icon: Maximize2,
  },
  "no-face": {
    title: "We can't see you",
    body: "Sit where the camera can see your face for the whole test.",
    icon: Camera,
  },
  "many-faces": {
    title: "Someone else is in view",
    body: "Only you can be in front of the camera while you take the test.",
    icon: Users,
  },
  "looking-away": {
    title: "Your eyes were off the screen",
    body: "Keep your eyes on the screen. Looking away for a long time counts as a warning.",
    icon: Eye,
  },
  blank: {
    title: "The camera went dark",
    body: "Something is covering the camera, or the light is too low. Fix it to carry on.",
    icon: Video,
  },
  "camera-off": {
    title: "The camera switched off",
    body: "The camera has to stay on for the whole test. Turn it back on to carry on.",
    icon: Video,
  },
};

interface Options {
  /** Only strike while the timed part of the test is running. */
  active: boolean;
  cameraStatus: CameraStatus;
  focus: FocusCounts;
  /** Called once, on the strike after the last warning. */
  onEnd: (last: Strike) => void;
}

export function useStrikePolicy({ active, cameraStatus, focus, onEnd }: Options) {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [current, setCurrent] = useState<Strike | null>(null);
  const [ended, setEnded] = useState(false);

  const count = useRef(0);
  const endedRef = useRef(false);
  const lastByReason = useRef<Partial<Record<StrikeReason, number>>>({});
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const strike = useCallback((reason: StrikeReason) => {
    if (endedRef.current) return;
    const now = Date.now();
    const last = lastByReason.current[reason] ?? 0;
    if (now - last < COOLDOWN_MS) return;
    lastByReason.current[reason] = now;

    count.current += 1;
    const s: Strike = { n: count.current, reason, at: now };
    setStrikes((prev) => [...prev, s]);

    if (s.n > MAX_WARNINGS) {
      endedRef.current = true;
      setEnded(true);
      setCurrent(null);
      onEndRef.current(s);
    } else {
      setCurrent(s);
    }
  }, []);

  // Focus: a tab switch or a full-screen exit is a strike the moment it happens.
  const prevFocus = useRef<FocusCounts>(focus);
  useEffect(() => {
    const prev = prevFocus.current;
    prevFocus.current = focus;
    if (!active) return;
    if (focus.focusLosses > prev.focusLosses) strike("tab");
    else if (focus.fullscreenExits > prev.fullscreenExits) strike("fullscreen");
  }, [active, focus, strike]);

  // Camera: a state has to persist before it counts, then repeats if it stays.
  useEffect(() => {
    if (!active) return;
    const rule = CAMERA_HOLD_MS[cameraStatus];
    if (!rule) return;
    let timer = window.setTimeout(function fire() {
      strike(rule.reason);
      timer = window.setTimeout(fire, REPEAT_MS);
    }, rule.ms);
    return () => window.clearTimeout(timer);
  }, [active, cameraStatus, strike]);

  const dismiss = useCallback(() => setCurrent(null), []);

  return { strikes, current, ended, dismiss, warningsLeft: Math.max(0, MAX_WARNINGS - count.current) };
}

// ------------------------------------------------------------------ UI

export function StrikeModal({
  strike,
  onContinue,
}: {
  strike: Strike | null;
  /** Dismisses the warning; the page also re-enters full screen here. */
  onContinue: () => void;
}) {
  if (!strike) return null;
  const copy = STRIKE_COPY[strike.reason];
  const Icon = copy.icon;
  const final = strike.n === MAX_WARNINGS;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="strike-title"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-void/80 p-5 backdrop-blur-sm"
    >
      <div className="pop-in w-full max-w-md rounded-3xl border border-alert/40 bg-slab p-7 shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-3">
          <span
            className={
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl " +
              (final ? "bg-alert/15 text-alert" : "bg-caution/15 text-caution")
            }
          >
            {final ? <AlertTriangle size={22} aria-hidden="true" /> : <Icon size={22} aria-hidden="true" />}
          </span>
          <div>
            <p className={"eyebrow " + (final ? "text-alert" : "text-caution")}>
              {final ? "Final warning" : `Warning ${strike.n} of ${MAX_WARNINGS}`}
            </p>
            <h2 id="strike-title" className="mt-0.5 text-[18px] font-semibold leading-tight text-bright">
              {copy.title}
            </h2>
          </div>
        </div>

        <p className="mt-4 text-[14.5px] leading-relaxed text-muted">{copy.body}</p>

        <p
          className={
            "mt-4 rounded-xl border px-3.5 py-3 text-[13.5px] leading-relaxed " +
            (final
              ? "border-alert/40 bg-alert/5 text-alert"
              : "border-caution/40 bg-caution/5 text-bright")
          }
        >
          {final
            ? "One more and the test ends on its own. You'll be scored on what you've done so far."
            : `You have ${MAX_WARNINGS - strike.n} warning left. After that the test ends and is scored as it stands.`}
        </p>

        <Button size="lg" full className="mt-5" onClick={onContinue}>
          I understand, continue
        </Button>
      </div>
    </div>
  );
}

/** Small strike counter for the assessment bar. */
export function StrikePill({ used }: { used: number }) {
  if (used === 0) return null;
  const final = used >= MAX_WARNINGS;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold " +
        (final
          ? "border-alert/40 bg-alert/10 text-alert"
          : "border-caution/40 bg-caution/10 text-caution")
      }
      title="Two warnings, then the test ends itself."
    >
      <AlertTriangle size={12} aria-hidden="true" />
      {used}/{MAX_WARNINGS} warnings
    </span>
  );
}
