"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CameraCounts } from "@/components/challenge/camera-guard";

/**
 * Test integrity, done openly.
 *
 * The test runs full screen and counts four things: switching to another tab or
 * app, leaving full screen, copying out of the test, and how long you were
 * away. All of it is shown to you live, on screen, while it is being counted.
 *
 * The camera check lives next door in camera-guard.tsx and follows the same
 * rule: every count is on screen while it is being counted. Nothing is
 * recorded. You can leave at any time. The counts go on the record next to
 * your work, and a human reads them. Being interrupted is not cheating, and a
 * system that cannot tell the difference should not pretend to.
 */

export interface FocusCounts {
  focusLosses: number;
  fullscreenExits: number;
  copyEvents: number;
  secondsAway: number;
}

export const EMPTY_COUNTS: FocusCounts = {
  focusLosses: 0,
  fullscreenExits: 0,
  copyEvents: 0,
  secondsAway: 0,
};

/** Fullscreen lives in the browser, not in React, so it is read as external state. */
function subscribeToFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}
const readFullscreen = () => Boolean(document.fullscreenElement);
const readFullscreenOnServer = () => false;

export function useFocusGuard(active: boolean) {
  const [counts, setCounts] = useState<FocusCounts>(EMPTY_COUNTS);
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreen,
    readFullscreen,
    readFullscreenOnServer,
  );
  const [away, setAway] = useState(false);
  const leftAt = useRef<number | null>(null);
  const wasFullscreen = useRef(false);

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      // Some browsers and embedded frames refuse. The test still works; the
      // record simply notes that full screen was unavailable.
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* nothing to do */
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    const onVisibility = () => {
      if (document.hidden) {
        leftAt.current = Date.now();
        setAway(true);
      } else {
        const gone = leftAt.current ? (Date.now() - leftAt.current) / 1000 : 0;
        leftAt.current = null;
        setAway(false);
        setCounts((c) => ({
          ...c,
          focusLosses: c.focusLosses + 1,
          secondsAway: Math.round(c.secondsAway + gone),
        }));
      }
    };

    const onBlur = () => {
      if (document.hidden) return; // already counted by the visibility handler
      leftAt.current = leftAt.current ?? Date.now();
      setAway(true);
    };

    const onFocus = () => {
      if (leftAt.current === null) return;
      const gone = (Date.now() - leftAt.current) / 1000;
      leftAt.current = null;
      setAway(false);
      // A flick of the mouse outside the window is not leaving the test.
      if (gone < 1.5) return;
      setCounts((c) => ({
        ...c,
        focusLosses: c.focusLosses + 1,
        secondsAway: Math.round(c.secondsAway + gone),
      }));
    };

    // Counting the transition only. The current state is read separately.
    const onFullscreenChange = () => {
      const now = Boolean(document.fullscreenElement);
      if (wasFullscreen.current && !now) {
        setCounts((c) => ({ ...c, fullscreenExits: c.fullscreenExits + 1 }));
      }
      wasFullscreen.current = now;
    };

    const onCopy = () => setCounts((c) => ({ ...c, copyEvents: c.copyEvents + 1 }));

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("copy", onCopy);

    wasFullscreen.current = Boolean(document.fullscreenElement);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("copy", onCopy);
    };
  }, [active]);

  return { counts, isFullscreen, away, enterFullscreen, exitFullscreen };
}

/** The always-visible strip. What is counted, and what it is currently at. */
export function FocusBar({
  counts,
  camera,
  isFullscreen,
  onEnterFullscreen,
  onExitFullscreen,
}: {
  counts: FocusCounts;
  camera?: CameraCounts;
  isFullscreen: boolean;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
}) {
  const noted =
    counts.focusLosses +
      counts.fullscreenExits +
      counts.copyEvents +
      (camera
        ? camera.lookAwayEvents + camera.cameraBlankSeconds + camera.faceMissingSeconds
        : 0) >
    0;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-edge-soft bg-deep px-4 py-2.5">
      <span className="inline-flex items-center gap-2 text-[12.5px] font-medium">
        <span
          className={`h-2 w-2 rounded-full ${isFullscreen ? "bg-proof" : "bg-caution"}`}
          aria-hidden="true"
        />
        {isFullscreen ? "Focus mode on" : "Focus mode off"}
      </span>

      <span className="hidden text-[12px] text-dim sm:inline">
        We count these things, and you can see them the whole time.
      </span>

      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
        <Count label="Tab switches" value={counts.focusLosses} />
        <Count label="Left full screen" value={counts.fullscreenExits} />
        <Count label="Copied out" value={counts.copyEvents} />
        <Count label="Seconds away" value={counts.secondsAway} />
        {camera && (
          <>
            <Count label="Looked away" value={camera.lookAwayEvents} />
            <Count label="Eyes off screen (s)" value={camera.lookAwaySeconds} />
            <Count label="Camera blank (s)" value={camera.cameraBlankSeconds} />
            <Count label="No face (s)" value={camera.faceMissingSeconds} />
            {camera.multipleFaceEvents > 0 && (
              <Count label="Extra people" value={camera.multipleFaceEvents} />
            )}
          </>
        )}
      </dl>

      <button
        type="button"
        onClick={isFullscreen ? onExitFullscreen : onEnterFullscreen}
        className="btn btn-quiet ml-auto text-[12.5px]"
      >
        {isFullscreen ? "Exit full screen" : "Go full screen"}
      </button>

      {noted && (
        <p className="w-full text-[11.5px] leading-relaxed text-dim">
          Noted, not judged. These go on your record as numbers for a person to read.
          Being interrupted is normal and does not fail anything.
        </p>
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <dt className="text-dim">{label}</dt>
      <dd className={`numeral ${value > 0 ? "text-caution" : "text-muted"}`}>{value}</dd>
    </div>
  );
}

/** Shown over the test when the candidate has switched away. */
export function AwayCurtain({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/92 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="panel-raised mx-5 max-w-sm p-7 text-center">
        <p className="text-[18px] font-semibold">Test paused</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          You switched away. Come back to the tab and it carries on from where you were.
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-dim">
          Nothing is lost and nothing is failed. The time away is counted and shown on your
          record.
        </p>
      </div>
    </div>
  );
}
