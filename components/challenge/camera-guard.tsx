"use client";

import { Camera, CameraOff, Eye, EyeOff, RefreshCw, Users, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker as FaceLandmarkerType } from "@mediapipe/tasks-vision";
import { cn } from "@/lib/utils";

/**
 * The camera check, done openly.
 *
 * The camera is on for the whole test and every frame is analysed on the
 * candidate's own machine. Nothing is uploaded, nothing is recorded, and the
 * candidate sees their own preview and every count the entire time.
 *
 * Three things are watched:
 *   1. Is the camera actually showing something? A covered lens, a switched-off
 *      camera, or a frame with no variation at all counts as "blank".
 *   2. Is one face in frame? None, or more than one, is noted.
 *   3. Where are the eyes? MediaPipe Face Landmarker runs locally and returns
 *      gaze blendshapes (eye look in/out/up/down) plus eyelid closure. Looking
 *      away from the screen for more than a moment is counted; a glance is not.
 *
 * Like focus mode, these are counts for a person to read, not verdicts. A
 * reviewer sees "looked away 4 times, 22 seconds" next to the work.
 */

export type CameraStatus =
  | "off" // never started, permission refused, or switched off mid-test
  | "starting"
  | "on" // live, but the face model has not loaded yet
  | "blank" // stream is live but the picture is black, covered or frozen
  | "no-face"
  | "many-faces"
  | "eyes-closed"
  | "looking-away"
  | "ok";

export interface CameraCounts {
  cameraDenied: boolean;
  cameraBlankSeconds: number;
  faceMissingSeconds: number;
  lookAwayEvents: number;
  lookAwaySeconds: number;
  multipleFaceEvents: number;
}

export const EMPTY_CAMERA_COUNTS: CameraCounts = {
  cameraDenied: false,
  cameraBlankSeconds: 0,
  faceMissingSeconds: 0,
  lookAwayEvents: 0,
  lookAwaySeconds: 0,
  multipleFaceEvents: 0,
};

export const CAMERA_STATUS_LABEL: Record<CameraStatus, string> = {
  off: "Camera off",
  starting: "Starting camera…",
  on: "Camera on",
  blank: "Camera blank or covered",
  "no-face": "No face in view",
  "many-faces": "More than one person",
  "eyes-closed": "Eyes closed",
  "looking-away": "Looking away",
  ok: "Eyes on screen",
};

/** How long a state must persist before it changes the status or counts. */
const HOLD_MS = {
  blank: 800,
  noFace: 1200,
  lookAway: 1500,
  eyesClosed: 1800,
  manyFaces: 600,
} as const;
type HoldKey = keyof typeof HOLD_MS;

/** The blank check samples a tiny frame this often; landmarks run per frame. */
const SAMPLE_MS = 500;
/** Counts are pushed to React this often, not on every animation frame. */
const FLUSH_MS = 500;

/** Below this luminance spread the frame is treated as covered or switched off. */
const BLANK_SPREAD = 6;
/** A gaze blendshape this strong means the eyes are clearly off the screen. */
const GAZE_AWAY = 0.55;
const BLINK = 0.6;
/** Nose position across the face; 0.5 is dead centre. */
const HEAD_TURN = 0.22;

interface Frame {
  blank: boolean;
  /** null when the face model is not available. */
  faces: number | null;
  eyesClosed: boolean;
  gazeAway: boolean;
}

export function useCameraGuard(recording: boolean) {
  const [status, setStatus] = useState<CameraStatus>("off");
  const [counts, setCounts] = useState<CameraCounts>(EMPTY_CAMERA_COUNTS);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarkerType | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const countsRef = useRef<CameraCounts>({ ...EMPTY_CAMERA_COUNTS });
  // The analysis loop reads this without restarting when the stage changes.
  const recordingRef = useRef(recording);
  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  // Attach the same stream to whichever preview is currently on screen. The
  // preview element changes between stages, so this is a callback ref.
  const attach = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => {});
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("off");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      // The candidate can switch the camera off from the browser's own controls.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => setStatus("off"));
      countsRef.current.cameraDenied = false;
      setCounts({ ...countsRef.current });
      setStatus("on");
    } catch (e) {
      streamRef.current = null;
      countsRef.current.cameraDenied = true;
      setCounts({ ...countsRef.current });
      setStatus("off");
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was refused. Allow it in the address bar, then try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : "The camera could not be started. Close other apps using it and try again.",
      );
    }
  }, []);

  const on = status !== "off" && status !== "starting";

  // Load the landmark model once the camera is first switched on, so it is
  // ready by the time the test starts. If it fails (offline, old browser) the
  // blank and off checks still run, and the status says "Camera on" rather
  // than claiming to see eyes it cannot.
  useEffect(() => {
    if (!on || landmarkerRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        const lm = await FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 2,
          outputFaceBlendshapes: true,
        });
        if (cancelled) {
          lm.close();
          return;
        }
        landmarkerRef.current = lm;
        setModelReady(true);
      } catch {
        if (!cancelled) setModelReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [on]);

  // The analysis loop. Runs whenever the camera is on so the candidate can
  // see the status while they set up; only accrues to the record while the
  // test is actually running.
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let lastSample = 0;
    let lastFlush = 0;
    let lastTick = performance.now();
    let lastFrame: Frame = { blank: false, faces: null, eyesClosed: false, gazeAway: false };
    const since: Record<HoldKey, number | null> = {
      blank: null,
      noFace: null,
      lookAway: null,
      eyesClosed: null,
      manyFaces: null,
    };
    let held: CameraStatus = "on";
    let awayCounted = false;
    let manyCounted = false;

    const canvas = (canvasRef.current ??= document.createElement("canvas"));
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const readBlank = (video: HTMLVideoElement) => {
      if (!ctx) return false;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let min = 255;
      let max = 0;
      for (let i = 0; i < data.length; i += 16) {
        const l = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        if (l < min) min = l;
        if (l > max) max = l;
      }
      return max - min < BLANK_SPREAD;
    };

    const readFace = (video: HTMLVideoElement, now: number): Omit<Frame, "blank"> | null => {
      const lm = landmarkerRef.current;
      if (!lm) return null;
      let result;
      try {
        result = lm.detectForVideo(video, now);
      } catch {
        return null;
      }
      const faces = result.faceLandmarks.length;
      if (faces !== 1) return { faces, eyesClosed: false, gazeAway: false };

      const shapes = new Map(
        (result.faceBlendshapes[0]?.categories ?? []).map((c) => [c.categoryName, c.score]),
      );
      const s = (k: string) => shapes.get(k) ?? 0;
      const eyesClosed = s("eyeBlinkLeft") > BLINK && s("eyeBlinkRight") > BLINK;

      // Both eyes moving the same way is a gaze shift; one eye alone is noise.
      const gaze = Math.max(
        Math.min(s("eyeLookOutLeft"), s("eyeLookInRight")),
        Math.min(s("eyeLookInLeft"), s("eyeLookOutRight")),
        Math.min(s("eyeLookUpLeft"), s("eyeLookUpRight")),
        Math.min(s("eyeLookDownLeft"), s("eyeLookDownRight")),
      );
      // Head turn: where the nose sits between the two cheek edges.
      const pts = result.faceLandmarks[0];
      const width = pts[454].x - pts[234].x;
      const noseRatio = width > 0 ? (pts[1].x - pts[234].x) / width : 0.5;
      const headTurned = Math.abs(noseRatio - 0.5) > HEAD_TURN;

      return { faces, eyesClosed, gazeAway: !eyesClosed && (gaze > GAZE_AWAY || headTurned) };
    };

    const hold = (key: HoldKey, active: boolean, now: number) => {
      if (!active) {
        since[key] = null;
        return false;
      }
      const startedAt = (since[key] ??= now);
      return now - startedAt >= HOLD_MS[key];
    };

    const flush = (now: number, force = false) => {
      if (!force && now - lastFlush < FLUSH_MS) return;
      lastFlush = now;
      setCounts({ ...countsRef.current });
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      const stream = streamRef.current;
      const now = performance.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      const c = countsRef.current;
      const rec = recordingRef.current;

      if (!stream?.active) {
        // Switched off from the browser, or unplugged. Off time is blank time.
        if (rec) c.cameraBlankSeconds += dt;
        if (held !== "off") {
          held = "off";
          setStatus("off");
          flush(now, true);
        }
        return;
      }
      // The preview element changes between stages and takes a frame or two
      // to start playing the same stream. That is not the camera going off.
      if (!video || video.readyState < 2) {
        if (video?.paused) void video.play().catch(() => {});
        return;
      }

      if (now - lastSample >= SAMPLE_MS) {
        lastSample = now;
        lastFrame = { ...lastFrame, blank: readBlank(video) };
      }
      const face = lastFrame.blank ? null : readFace(video, now);
      if (face) lastFrame = { ...lastFrame, ...face };

      const blank = hold("blank", lastFrame.blank, now);
      const noFace = !blank && hold("noFace", lastFrame.faces === 0, now);
      const manyFaces = !blank && hold("manyFaces", (lastFrame.faces ?? 0) > 1, now);
      const eyesClosed = !blank && hold("eyesClosed", lastFrame.eyesClosed, now);
      const lookAway = !blank && hold("lookAway", lastFrame.gazeAway, now);

      const next: CameraStatus = blank
        ? "blank"
        : manyFaces
          ? "many-faces"
          : noFace
            ? "no-face"
            : eyesClosed
              ? "eyes-closed"
              : lookAway
                ? "looking-away"
                : lastFrame.faces === null
                  ? "on"
                  : "ok";

      // Seconds accrue against the held state; events count once per stretch.
      const away = next === "looking-away" || next === "eyes-closed";
      if (rec) {
        if (next === "blank") c.cameraBlankSeconds += dt;
        if (next === "no-face") c.faceMissingSeconds += dt;
        if (away) c.lookAwaySeconds += dt;
        if (away && !awayCounted) c.lookAwayEvents += 1;
        if (next === "many-faces" && !manyCounted) c.multipleFaceEvents += 1;
      }
      awayCounted = away;
      manyCounted = next === "many-faces";

      if (next !== held) {
        held = next;
        setStatus(next);
        flush(now, true);
      } else {
        flush(now);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  // Release the camera and the model when the guard unmounts.
  useEffect(
    () => () => {
      stop();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    },
    [stop],
  );

  const rounded: CameraCounts = {
    ...counts,
    cameraBlankSeconds: Math.round(counts.cameraBlankSeconds),
    faceMissingSeconds: Math.round(counts.faceMissingSeconds),
    lookAwaySeconds: Math.round(counts.lookAwaySeconds),
  };

  return { status, on, counts: rounded, modelReady, error, start, stop, attach };
}

/* ══════════════════════════════════════════════════════════ UI */

const TONE: Record<CameraStatus, "proof" | "caution" | "alert" | "dim"> = {
  off: "alert",
  starting: "dim",
  on: "proof",
  blank: "alert",
  "no-face": "caution",
  "many-faces": "alert",
  "eyes-closed": "caution",
  "looking-away": "caution",
  ok: "proof",
};

function StatusIcon({ status }: { status: CameraStatus }) {
  const props = { size: 13, "aria-hidden": true as const };
  switch (status) {
    case "off":
      return <CameraOff {...props} />;
    case "blank":
      return <VideoOff {...props} />;
    case "many-faces":
      return <Users {...props} />;
    case "eyes-closed":
    case "looking-away":
    case "no-face":
      return <EyeOff {...props} />;
    case "ok":
      return <Eye {...props} />;
    default:
      return <Camera {...props} />;
  }
}

export function CameraStatusChip({
  status,
  className,
}: {
  status: CameraStatus;
  className?: string;
}) {
  const tone = TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium",
        tone === "proof" && "border-proof/40 bg-proof/10 text-proof",
        tone === "caution" && "border-caution/40 bg-caution/10 text-caution",
        tone === "alert" && "border-alert/40 bg-alert/10 text-alert",
        tone === "dim" && "border-edge text-dim",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <StatusIcon status={status} />
      {CAMERA_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The candidate's own preview. Mirrored, because that is how people expect to
 * see themselves, and always on screen while the camera is on.
 */
export function CameraPreview({
  attach,
  status,
  size = "md",
  className,
}: {
  attach: (el: HTMLVideoElement | null) => void;
  status: CameraStatus;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tone = TONE[status];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 bg-void",
        size === "sm" && "h-[96px] w-[128px]",
        size === "md" && "aspect-[4/3] w-full max-w-[320px]",
        size === "lg" && "aspect-[4/3] w-full max-w-[420px]",
        tone === "proof" && "border-proof",
        tone === "caution" && "border-caution",
        tone === "alert" && "border-alert",
        tone === "dim" && "border-edge",
        className,
      )}
    >
      <video
        ref={attach}
        muted
        playsInline
        autoPlay
        className="h-full w-full -scale-x-100 object-cover"
        aria-label="Your camera preview"
      />
      {(status === "off" || status === "starting") && (
        <div className="absolute inset-0 flex items-center justify-center text-dim">
          {status === "starting" ? (
            <RefreshCw
              size={size === "sm" ? 16 : 22}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <CameraOff size={size === "sm" ? 16 : 22} aria-hidden="true" />
          )}
        </div>
      )}
      <span
        className={cn(
          "absolute left-1.5 top-1.5 h-2 w-2 rounded-full",
          tone === "proof" && "live-dot bg-proof",
          tone === "caution" && "bg-caution",
          tone === "alert" && "bg-alert",
          tone === "dim" && "bg-dim",
        )}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * The floating self-view that stays in the corner through the test, with the
 * live status underneath it. Never larger than a thumbnail; the workspace is
 * what matters.
 */
export function CameraDock({
  attach,
  status,
  counts,
  modelReady,
}: {
  attach: (el: HTMLVideoElement | null) => void;
  status: CameraStatus;
  counts: CameraCounts;
  modelReady: boolean;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1.5">
      <CameraPreview attach={attach} status={status} size="sm" />
      <CameraStatusChip status={status} />
      {!modelReady && status !== "off" && (
        <span className="text-[10.5px] text-dim">face check loading…</span>
      )}
      {(counts.lookAwayEvents > 0 || counts.cameraBlankSeconds > 0) && (
        <span className="text-[10.5px] text-dim">
          away {counts.lookAwayEvents}× · {counts.lookAwaySeconds}s · blank{" "}
          {counts.cameraBlankSeconds}s
        </span>
      )}
    </div>
  );
}

/**
 * Shown over the test when the camera is off or the picture is blank. The
 * camera is part of the record, so the test waits until it is back. Nothing
 * is lost.
 */
export function CameraCurtain({
  status,
  error,
  onRetry,
}: {
  status: CameraStatus;
  error: string | null;
  onRetry: () => void;
}) {
  if (status !== "off" && status !== "blank") return null;
  const off = status === "off";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/92 backdrop-blur-sm"
      role="alertdialog"
      aria-live="assertive"
    >
      <div className="panel-raised mx-5 max-w-sm p-7 text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-alert/10 text-alert">
          {off ? <CameraOff size={20} /> : <VideoOff size={20} />}
        </span>
        <p className="mt-3 text-[18px] font-semibold">
          {off ? "Camera is off" : "Camera is blank"}
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          {off
            ? "The camera has to stay on during the test. Turn it back on to carry on from where you were."
            : "The picture is black or covered. Uncover the lens, or check the light, and the test carries on."}
        </p>
        {error && <p className="mt-2 text-[12.5px] text-alert">{error}</p>}
        <p className="mt-3 text-[12.5px] leading-relaxed text-dim">
          Nothing is lost. The time is counted and shown on your record.
        </p>
        {off && (
          <button type="button" onClick={onRetry} className="btn btn-primary mt-4">
            <Camera size={15} aria-hidden="true" />
            Turn camera on
          </button>
        )}
      </div>
    </div>
  );
}
