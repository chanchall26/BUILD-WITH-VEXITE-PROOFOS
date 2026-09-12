"use client";

import { Camera, CameraOff, Check, Copy, Lock, RefreshCw, RotateCw, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/**
 * The popup that walks somebody through switching the camera on.
 *
 * Opens when they press "Turn on camera". First it points at the browser's
 * own permission prompt and asks for Allow, because that prompt is small,
 * appears in a corner, and vanishes if you click anywhere else. If the camera
 * still does not come on, it switches to the unblocking steps for the browser
 * they are actually using, with the settings address ready to copy.
 */

type Browser = "chrome" | "edge" | "firefox" | "safari" | "other";

function detectBrowser(): Browser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "edge";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

const BROWSER_LABEL: Record<Browser, string> = {
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  safari: "Safari",
  other: "your browser",
};

/** How to unblock a camera that was refused earlier, per browser. */
const UNBLOCK: Record<Browser, { steps: string[]; settingsUrl?: string }> = {
  chrome: {
    steps: [
      "Click the lock icon (or the camera icon with a red cross) on the left of the address bar.",
      "Find Camera and switch it to Allow.",
      "Reload the page, then press Turn on camera again.",
    ],
    settingsUrl: "chrome://settings/content/camera",
  },
  edge: {
    steps: [
      "Click the lock icon on the left of the address bar.",
      "Under Permissions for this site, set Camera to Allow.",
      "Reload the page, then press Turn on camera again.",
    ],
    settingsUrl: "edge://settings/content/camera",
  },
  firefox: {
    steps: [
      "Click the camera icon with a line through it on the left of the address bar.",
      "Next to Use the Camera, click the X to clear the block.",
      "Press Turn on camera again and choose Allow in the prompt.",
    ],
  },
  safari: {
    steps: [
      "In the menu bar open Safari, then Settings for This Website.",
      "Set Camera to Allow.",
      "Reload the page, then press Turn on camera again.",
    ],
  },
  other: {
    steps: [
      "Open the site settings from the icon on the left of the address bar.",
      "Set Camera to Allow.",
      "Reload the page, then press Turn on camera again.",
    ],
  },
};

/** A drawing of where the browser's own prompt appears. */
function PromptSketch({ browser }: { browser: Browser }) {
  const right = browser === "firefox" || browser === "safari";
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-deep" aria-hidden="true">
      <div className="flex items-center gap-2 border-b border-edge-soft bg-slab px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-alert/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-caution/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-proof/60" />
        <span className="ml-2 flex flex-1 items-center gap-1.5 rounded-md border border-edge bg-void px-2 py-1 text-[11px] text-dim">
          <Lock size={10} />
          <span className="truncate">proofos.app/challenge</span>
          <Camera size={11} className="ml-auto text-signal" />
        </span>
      </div>
      <div className={cn("px-3 pb-4 pt-3", right && "flex justify-end")}>
        <div className="w-[230px] rounded-lg border border-edge bg-slab p-3 shadow-[var(--shadow-pop)]">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold">
            <Camera size={12} className="text-signal" />
            proofos.app wants to
          </p>
          <p className="mt-1 text-[11px] text-muted">Use your camera</p>
          <div className="mt-2.5 flex gap-1.5">
            <span className="rounded-md border border-edge px-2 py-1 text-[10.5px] text-muted">
              Block
            </span>
            <span className="live-dot rounded-md bg-signal px-2.5 py-1 text-[10.5px] font-semibold text-on-signal ring-2 ring-signal/40">
              Allow
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const noSubscribe = () => () => {};

/** Whether a Permissions-Policy header forbids the camera for this page. */
function cameraForbiddenByPolicy(): boolean {
  try {
    const doc = document as Document & {
      permissionsPolicy?: { allowsFeature(f: string): boolean };
      featurePolicy?: { allowsFeature(f: string): boolean };
    };
    const policy = doc.permissionsPolicy ?? doc.featurePolicy;
    return policy ? !policy.allowsFeature("camera") : false;
  } catch {
    return false;
  }
}

export function CameraPermissionDialog({
  open,
  phase,
  error,
  onRetry,
  onClose,
}: {
  open: boolean;
  /** asking: the browser prompt should be up. blocked: it refused. */
  phase: "asking" | "blocked";
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  // Both live in the browser and never change while the page is open, so
  // they are read as external state with a server fallback.
  const browser = useSyncExternalStore(noSubscribe, detectBrowser, () => "other" as Browser);
  const policyBlocked = useSyncExternalStore(noSubscribe, cameraForbiddenByPolicy, () => false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const guide = UNBLOCK[browser];

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the address is on screen regardless */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-dialog-title"
    >
      <div className="panel-raised slide-up w-full max-w-lg p-6">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              phase === "asking" ? "bg-wash text-signal" : "bg-alert/10 text-alert",
            )}
          >
            {phase === "asking" ? <Camera size={20} /> : <CameraOff size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="camera-dialog-title" className="text-[18px] font-semibold tracking-[-0.02em]">
              {phase === "asking" ? "Allow the camera" : "The camera is blocked"}
            </h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
              {phase === "asking"
                ? `${BROWSER_LABEL[browser]} is asking whether this site may use your camera. Look for the prompt near the address bar and click Allow.`
                : (error ?? "The browser refused the camera without asking.")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-raise hover:text-bright"
          >
            <X size={16} />
          </button>
        </div>

        {phase === "asking" ? (
          <>
            <div className="mt-5">
              <PromptSketch browser={browser} />
            </div>
            <p className="mt-3 flex items-center gap-2 text-[12.5px] text-dim">
              <RefreshCw size={13} className="animate-spin text-signal" aria-hidden="true" />
              Waiting for you to choose Allow…
            </p>
          </>
        ) : policyBlocked ? (
          <div className="mt-5 rounded-xl border border-alert/40 bg-alert/5 p-4 text-[13px] leading-relaxed">
            <p className="font-semibold text-alert">This deployment forbids the camera.</p>
            <p className="mt-1 text-muted">
              The page is served with a <code className="font-mono">Permissions-Policy</code>{" "}
              header that switches the camera off for every visitor, so no browser can show a
              prompt. Nothing on your side will fix it: the site needs to be redeployed with{" "}
              <code className="font-mono">camera=(self)</code>.
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <p className="eyebrow">Unblock it in {BROWSER_LABEL[browser]}</p>
            <ol className="mt-3 space-y-2.5">
              {guide.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-[13.5px] leading-relaxed">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal text-[11.5px] font-semibold text-on-signal">
                    {i + 1}
                  </span>
                  <span className="text-muted">{step}</span>
                </li>
              ))}
            </ol>
            {guide.settingsUrl && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-edge-soft bg-deep px-3 py-2.5 text-[12.5px]">
                <span className="text-dim">Or paste this in a new tab:</span>
                <code className="font-mono text-[12px] text-data">{guide.settingsUrl}</code>
                <button
                  type="button"
                  onClick={() => void copy(guide.settingsUrl ?? "")}
                  className="btn btn-ghost btn-sm ml-auto"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {phase === "blocked" && (
            <>
              <button type="button" onClick={onRetry} className="btn btn-primary">
                <Camera size={15} aria-hidden="true" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn btn-outline"
              >
                <RotateCw size={15} aria-hidden="true" />
                Reload page
              </button>
            </>
          )}
          <button type="button" onClick={onClose} className="btn btn-ghost ml-auto">
            {phase === "asking" ? "Cancel" : "Close"}
          </button>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-dim">
          The camera is checked on your device only. No video is recorded, stored or sent.
        </p>
      </div>
    </div>
  );
}
