"use client";

import {
  ArrowRight,
  Camera,
  ChevronDown,
  FileText,
  Play,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalibrationStep } from "@/components/challenge/calibration-step";
import {
  CameraCurtain,
  CameraDock,
  CameraPreview,
  CameraStatusChip,
  useCameraGuard,
  type CameraStatus,
} from "@/components/challenge/camera-guard";
import { CameraPermissionDialog } from "@/components/challenge/camera-permission";
import { CounterpartPanel } from "@/components/challenge/counterpart-panel";
import { DefenceStep } from "@/components/challenge/defence-step";
import { AwayCurtain, FocusBar, useFocusGuard } from "@/components/challenge/focus-mode";
import {
  MAX_WARNINGS,
  StrikeModal,
  StrikePill,
  useStrikePolicy,
  type Strike,
} from "@/components/challenge/strike-policy";
import { PageHeader } from "@/components/layout/page-header";
import { Mark } from "@/components/mark";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSteps } from "@/components/ui/skeleton";
import { StepBar } from "@/components/ui/progress-ring";
import { DOMAIN_META, FALLBACK_DOMAIN } from "@/components/visuals/skill-meta";
import {
  DOMAINS,
  DOMAIN_LABEL,
  type CalibrationAnswer,
  type ChallengeSpec,
  type DefenceAnswer,
  type Domain,
  type Turn,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

type Stage =
  | "pick"
  | "building"
  | "consent"
  | "brief"
  | "work"
  | "calibration"
  | "defence"
  | "scoring";

const STEPS: { stage: Stage; label: string; short: string }[] = [
  { stage: "brief", label: "Read the situation", short: "Read" },
  { stage: "work", label: "Do the work", short: "Work" },
  { stage: "calibration", label: "Judge 10 AI answers", short: "Quiz" },
  { stage: "defence", label: "Explain your choices", short: "Explain" },
  { stage: "scoring", label: "Get your results", short: "Results" },
];

const WE_RECORD = [
  "What you write, and everything you say to your AI teammate",
  "Your answers in the trust quiz",
  "The words from two short spoken answers. The recording is deleted straight after.",
  "Simple counts: pastes, edits, time, and times you left the test",
  "Camera counts: seconds the camera was blank, no face in view, or eyes off the screen. Checked on your device; you see it live.",
  "Warnings. You get two, for a problem that goes on: leaving the tab or full screen, no face in view, a second person, eyes off the screen for a while, or a dark camera. A third ends the test and scores what you have done.",
];

const WE_NEVER = [
  "No video is recorded, stored, or sent anywhere. Frames are checked on your device and thrown away.",
  "No face recognition. We never identify you or match you to anything.",
  "No screen recording. No kept audio. Nothing about how you sound or your accent.",
  "No automatic yes or no. A person decides.",
];

export default function ChallengePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("pick");
  const [domain, setDomain] = useState<Domain>("software");
  const [roleContext, setRoleContext] = useState("");
  const [useSearch, setUseSearch] = useState(false);
  const [challenge, setChallenge] = useState<ChallengeSpec | null>(null);
  const [holder, setHolder] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [work, setWork] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);
  const [calibration, setCalibration] = useState<{
    sealed: string;
    answers: CalibrationAnswer[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pasteCount, setPasteCount] = useState(0);
  const startedAt = useRef(0);
  const pastedChars = useRef(0);
  const typedChars = useRef(0);
  const revisions = useRef(0);

  const guarded = stage === "work" || stage === "calibration" || stage === "defence";
  const { counts, isFullscreen, away, enterFullscreen, exitFullscreen } =
    useFocusGuard(guarded);
  const camera = useCameraGuard(guarded);
  // The permission popup: points at the browser prompt while it is up, and
  // explains how to unblock the camera if the browser refused.
  const [cameraDialog, setCameraDialog] = useState<"closed" | "asking" | "blocked">("closed");
  async function openCamera() {
    setCameraDialog("asking");
    const ok = await camera.start();
    setCameraDialog(ok ? "closed" : "blocked");
  }
  const cameraPermission = (
    <CameraPermissionDialog
      open={cameraDialog !== "closed"}
      phase={cameraDialog === "blocked" ? "blocked" : "asking"}
      error={camera.error}
      onRetry={() => void openCamera()}
      onClose={() => setCameraDialog("closed")}
    />
  );
  // Two warnings, then the test ends itself and is scored as it stands.
  const strikePolicy = useStrikePolicy({
    active: guarded,
    cameraStatus: camera.status,
    focus: counts,
    onEnd: (last) => void submit([], last),
  });
  const strikeModal = guarded ? (
    <StrikeModal
      strike={strikePolicy.current}
      onContinue={() => {
        strikePolicy.dismiss();
        if (!isFullscreen) void enterFullscreen();
      }}
    />
  ) : null;
  // The camera stays on screen from the moment it is switched on until the
  // results arrive, and the test waits while it is off or blank.
  const inTest = stage === "brief" || guarded;
  const cameraDock = inTest ? (
    <CameraDock
      attach={camera.attach}
      status={camera.status}
      counts={camera.counts}
      modelReady={camera.modelReady}
    />
  ) : null;
  const cameraCurtain = guarded ? (
    <>
      <CameraCurtain status={camera.status} error={camera.error} onRetry={() => void openCamera()} />
      {cameraPermission}
    </>
  ) : null;

  useEffect(() => {
    if (window.location.hash !== "#seeded") return;
    let cancelled = false;
    void (async () => {
      setStage("building");
      try {
        const res = await fetch("/api/challenge");
        const data = await res.json();
        if (cancelled) return;
        if (!data?.challenge) throw new Error("no challenge");
        setChallenge(data.challenge);
        setWork(data.challenge.workspaceSeed ?? "");
        setStage("consent");
      } catch {
        if (cancelled) return;
        setError("We couldn't load the sample test. Please refresh.");
        setStage("pick");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function build(sample: boolean) {
    setStage("building");
    setError(null);
    try {
      const res = sample
        ? await fetch("/api/challenge")
        : await fetch("/api/challenge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain,
              roleContext: roleContext.trim() || undefined,
              calibrate: useSearch,
            }),
          });
      const data = await res.json();
      if (!res.ok || !data.challenge) throw new Error(data?.error ?? "We couldn't build it.");
      setChallenge(data.challenge);
      setWork(data.challenge.workspaceSeed ?? "");
      setStage("consent");
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} Nothing was lost — try again.`
          : "Something went wrong. Try again.",
      );
      setStage("pick");
    }
  }

  function onWorkChange(next: string) {
    const delta = next.length - work.length;
    if (delta > 0) typedChars.current += delta;
    revisions.current += 1;
    setWork(next);
  }

  async function submit(defence: DefenceAnswer[], endedBy?: Strike) {
    if (!challenge) return;
    // Snapshot the camera counts now; the camera itself is released when the
    // results page takes over.
    const cameraCounts = camera.counts;
    const warnings = Math.min(strikePolicy.strikes.length + (endedBy ? 1 : 0), MAX_WARNINGS);
    setStage("scoring");
    void exitFullscreen();
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge,
          holder: holder.trim() || "Anonymous",
          work,
          turns,
          defence,
          calibration,
          telemetry: {
            startedAt: startedAt.current || Date.now() - 60_000,
            submittedAt: Date.now(),
            pasteEvents: pasteCount,
            pastedChars: pastedChars.current,
            typedChars: typedChars.current,
            revisions: revisions.current,
            ...counts,
            ...cameraCounts,
            warnings,
            autoEnded: Boolean(endedBy),
            endedBy: endedBy?.reason,
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Scoring failed.");
      sessionStorage.setItem("proofos.result", await res.text());
      router.push("/passport");
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} Your work is safe — press submit again.`
          : "Scoring failed. Your work is safe.",
      );
      setStage("defence");
    }
  }

  // ══════════════════════════════════════════════════════ pick / building
  if (stage === "pick" || stage === "building") {
    if (stage === "building") {
      return (
        <Shell>
          <LoadingSteps
            title={useSearch ? "Looking up what this job really involves…" : "Building your test…"}
            active={1}
            steps={[
              "Reading what the job needs",
              "Writing a realistic situation",
              "Adding real data and tools",
              "Hiding four mistakes for your teammate",
            ]}
          />
        </Shell>
      );
    }

    return (
      <Shell>
        <PageHeader
          back={{ href: "/", label: "Back to home" }}
          crumbs={[{ label: "Home", href: "/" }, { label: "Take the test" }]}
          eyebrow="About 16 minutes"
          title="What kind of work do you do?"
          description="Pick one and we'll build a short, realistic task from that world. You'll work on it with an AI teammate that is confidently wrong four times."
        />

        {error && (
          <p className="mt-5 rounded-xl border border-alert/40 bg-alert/5 px-4 py-3 text-[13.5px] text-alert">
            {error}
          </p>
        )}

        <div className="rise rise-1 mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DOMAINS.map((d) => {
            const meta = DOMAIN_META[d] ?? FALLBACK_DOMAIN;
            const Icon = meta.icon;
            const active = domain === d;
            return (
              <button
                key={d}
                onClick={() => setDomain(d)}
                aria-pressed={active}
                className={cn(
                  "group rounded-2xl border p-4 text-left transition-all duration-200",
                  active
                    ? "border-signal bg-wash shadow-[var(--shadow-card)]"
                    : "border-edge-soft bg-slab hover:-translate-y-0.5 hover:border-signal-deep hover:shadow-[var(--shadow-card)]",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    active ? "bg-signal text-on-signal" : "bg-raise text-signal",
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                <p className="mt-3 text-[14px] font-semibold">{DOMAIN_LABEL[d]}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-dim">{meta.blurb}</p>
              </button>
            );
          })}
        </div>

        <details className="rise rise-2 mt-6">
          <summary className="cursor-pointer text-[13.5px] font-medium text-signal">
            Tailor it to a specific job (optional)
          </summary>
          <Card className="mt-3 p-5">
            <label htmlFor="role" className="label">
              Paste the job advert
            </label>
            <textarea
              id="role"
              value={roleContext}
              onChange={(e) => setRoleContext(e.target.value)}
              rows={3}
              placeholder="Or just say what the person will actually do day to day."
              className="field resize-none text-[13.5px]"
            />
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-muted">
              <input
                type="checkbox"
                checked={useSearch}
                onChange={(e) => setUseSearch(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-signal)]"
              />
              <span>
                Check what this job is really like today
                <span className="block text-[12px] text-dim">
                  Takes a little longer. We look it up and show our sources.
                </span>
              </span>
            </label>
          </Card>
        </details>

        <div className="rise rise-3 mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => void build(false)} iconRight={<ArrowRight size={17} />}>
            Build my test
          </Button>
          <Button variant="outline" size="lg" onClick={() => void build(true)} icon={<Play size={16} />}>
            Use the ready-made one
          </Button>
        </div>
        <p className="mt-3 text-[12.5px] text-dim">
          The ready-made one starts instantly. A fresh one takes about 30 seconds.
        </p>
      </Shell>
    );
  }

  if (!challenge) return null;

  // ══════════════════════════════════════════════════════ consent
  if (stage === "consent") {
    return (
      <Shell>
        {cameraPermission}
        <PageHeader
          back={{ label: "Pick something else" }}
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Take the test", href: "/challenge" },
            { label: DOMAIN_LABEL[challenge.domain] },
          ]}
          eyebrow={`${DOMAIN_LABEL[challenge.domain]} · about ${challenge.estimatedMinutes} minutes`}
          title={challenge.title}
          description={challenge.roleContext}
        />

        <div className="rise rise-1 mt-8 grid gap-4 md:grid-cols-2">
          <Card accent="var(--color-skill-verification)" className="p-5">
            <h2 className="text-[14.5px] font-semibold">What we record</h2>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {WE_RECORD.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-data" />
                  {i}
                </li>
              ))}
            </ul>
          </Card>
          <Card accent="var(--color-proof)" className="p-5">
            <h2 className="text-[14.5px] font-semibold">What we never do</h2>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {WE_NEVER.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-proof" />
                  {i}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <details className="rise rise-2 mt-4">
          <summary className="cursor-pointer text-[13px] font-medium text-signal">
            Read the full notice
          </summary>
          <p className="mt-2 rounded-xl border border-edge-soft bg-deep p-4 text-[13px] leading-relaxed text-muted">
            {challenge.transparencyNotice}
          </p>
        </details>

        <div className="rise rise-3 mt-6 grid gap-4 md:grid-cols-2">
          <Card raised accent="var(--color-signal)" className="p-5">
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-signal" aria-hidden="true" />
              <h2 className="text-[14.5px] font-semibold">Camera check</h2>
              <CameraStatusChip status={camera.status} className="ml-auto" />
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              The camera stays on for the whole test. It watches for a blank picture, a
              missing face, or eyes off the screen, and shows you what it sees the entire
              time. Nothing is recorded.
            </p>
            <div className="mt-4 flex flex-col items-start gap-3">
              <CameraPreview attach={camera.attach} status={camera.status} size="md" />
              {camera.error && <p className="text-[12.5px] text-alert">{camera.error}</p>}
              {camera.on ? (
                <p className="text-[12.5px] text-dim">
                  {camera.modelReady
                    ? "Sit so your face is in the frame and look at the screen."
                    : "Camera is on. Loading the face check…"}
                </p>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => void openCamera()}
                  loading={camera.status === "starting"}
                  loadingLabel="Starting camera…"
                  icon={<Camera size={15} />}
                >
                  {camera.error ? "Try the camera again" : "Turn on camera"}
                </Button>
              )}
            </div>
          </Card>

          <Card raised className="p-5">
            <label htmlFor="name" className="label">
              Your name
            </label>
            <input
              id="name"
              className="field"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="This is what goes on your results"
            />
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-relaxed text-muted">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-signal)]"
              />
              I&apos;ve read the above and I want to take this test.
            </label>
            <Button
              size="lg"
              full
              className="mt-5"
              disabled={!agreed || !camera.on}
              title={!camera.on ? "Turn on the camera first" : undefined}
              onClick={() => {
                startedAt.current = Date.now();
                setStage("brief");
              }}
              iconRight={<ArrowRight size={17} />}
            >
              Start
            </Button>
            {!camera.on && (
              <p className="mt-2 text-[12px] text-dim">The camera has to be on to start.</p>
            )}
          </Card>
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════ brief
  if (stage === "brief") {
    return (
      <Shell>
        {cameraDock}
        <Progress stage="brief" />
        <PageHeader
          back={{ label: "Back" }}
          eyebrow="What's happening"
          title={challenge.situation}
          className="mt-6"
        />

        <div className="rise rise-1 mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <Card raised accent="var(--color-signal)" className="p-6">
            <p className="eyebrow">Your job</p>
            <p className="mt-2 text-[15.5px] leading-relaxed">{challenge.deliverable}</p>

            <h2 className="mt-6 text-[13px] font-semibold text-muted">
              We&apos;ll be looking for
            </h2>
            <ul className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {challenge.requirements.map((r) => (
                <li key={r.id} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                  {r.text}
                </li>
              ))}
            </ul>

            <p className="mt-5 flex items-start gap-2 rounded-xl border border-edge-soft bg-deep px-3.5 py-3 text-[13px] leading-relaxed text-muted">
              <Wrench size={15} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
              Your teammate can open {challenge.tools.length} tools. Ask what they checked —
              they don&apos;t always pick the right one.
            </p>
          </Card>

          <div className="space-y-3">
            <p className="eyebrow">What you&apos;ve been given</p>
            {challenge.contextDocs.map((d) => (
              <Card key={d.label} className="p-4">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="shrink-0 text-dim" aria-hidden="true" />
                  <span className="badge text-[10px]">{d.kind}</span>
                  <span className="truncate text-[12px] text-dim">{d.label}</span>
                </div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-muted">
                  {d.body}
                </pre>
              </Card>
            ))}
          </div>
        </div>

        <div className="rise rise-2 mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={() => {
              setStage("work");
              void enterFullscreen();
            }}
            iconRight={<ArrowRight size={17} />}
          >
            Open my workspace
          </Button>
          <span className="text-[12.5px] text-dim">
            Goes full screen. Leaving it, or the tab, counts as a warning. Two warnings, then the
            test ends and scores what you&apos;ve done.
          </span>
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════ calibration
  if (stage === "calibration") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8">
        <AssessmentBar
          stage="calibration"
          cameraStatus={camera.status}
          warnings={strikePolicy.strikes.length}
        />
        <AwayCurtain visible={away} />
        {cameraCurtain}
        {cameraDock}
        {strikeModal}
        <div className="mt-5">
          <CalibrationStep
            domain={challenge.domain}
            situation={challenge.situation}
            onDone={(payload) => {
              setCalibration(payload);
              setStage("defence");
            }}
            onSkip={() => setStage("defence")}
          />
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════ defence
  if (stage === "defence") {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <AssessmentBar
          stage="defence"
          cameraStatus={camera.status}
          warnings={strikePolicy.strikes.length}
        />
        <AwayCurtain visible={away} />
        {cameraCurtain}
        {cameraDock}
        {strikeModal}
        {error && (
          <p className="mt-5 rounded-xl border border-alert/40 bg-alert/5 px-4 py-3 text-[13.5px] text-alert">
            {error}
          </p>
        )}
        <div className="mt-5">
          <DefenceStep
            challenge={challenge}
            work={work}
            onDone={(answers) => void submit(answers)}
          />
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════ scoring
  if (stage === "scoring") {
    return (
      <Shell>
        <Progress stage="scoring" />
        <div className="mt-8">
          <LoadingSteps
            title="Working out your results…"
            active={2}
            steps={[
              "Checking if the AI's mistakes reached your work",
              "Reading what you questioned and what you accepted",
              "Marking your trust quiz",
              "Working out six skill scores",
              "Signing results that belong to you",
            ]}
          />
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════ workspace
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-4">
      <AwayCurtain visible={away} />
      {cameraCurtain}
      {cameraDock}
      {strikeModal}

      <AssessmentBar
        stage="work"
        cameraStatus={camera.status}
        warnings={strikePolicy.strikes.length}
        action={
          <Button
            size="sm"
            onClick={() => setStage("calibration")}
            disabled={work.trim().length < 40}
            title={work.trim().length < 40 ? "Write a little more first" : undefined}
            iconRight={<ArrowRight size={15} />}
          >
            Done — next step
          </Button>
        }
      />

      {/* Task, collapsible so it never eats the workspace */}
      <Card className="mt-3 overflow-hidden">
        <button
          type="button"
          onClick={() => setTaskOpen(!taskOpen)}
          aria-expanded={taskOpen}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raise"
        >
          <span className="badge badge-brand shrink-0 text-[10px]">Your job</span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
            {challenge.deliverable}
          </span>
          <ChevronDown
            size={15}
            className={cn("shrink-0 text-dim transition-transform", taskOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ gridTemplateRows: taskOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-edge-soft bg-deep p-4">
              <p className="text-[13.5px] leading-relaxed">{challenge.situation}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {challenge.contextDocs.map((d) => (
                  <div key={d.label} className="rounded-lg border border-edge-soft bg-slab p-3">
                    <p className="truncate text-[11px] font-medium text-dim">{d.label}</p>
                    <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted">
                      {d.body}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-3">
        <FocusBar
          counts={counts}
          camera={camera.counts}
          isFullscreen={isFullscreen}
          onEnterFullscreen={() => void enterFullscreen()}
          onExitFullscreen={() => void exitFullscreen()}
        />
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="flex min-h-[58vh] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-edge-soft bg-deep px-4 py-3">
            <span className="text-[13px] font-semibold">Your work</span>
            <span className="ml-auto text-[11px] text-dim">
              {work.length} characters · {pasteCount} pastes
            </span>
          </div>
          <textarea
            value={work}
            onChange={(e) => onWorkChange(e.target.value)}
            onPaste={(e) => {
              setPasteCount((n) => n + 1);
              pastedChars.current += e.clipboardData.getData("text").length;
            }}
            spellCheck={false}
            aria-label="Your work"
            className="min-h-0 flex-1 resize-none bg-slab p-4 font-mono text-[13px] leading-relaxed text-bright outline-none"
          />
        </Card>

        <Card className="flex min-h-[58vh] flex-col overflow-hidden">
          <CounterpartPanel
            challenge={challenge}
            work={work}
            turns={turns}
            onTurns={setTurns}
          />
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ helpers */

/** The bar that stays visible through every stage of the test. */
function AssessmentBar({
  stage,
  cameraStatus,
  warnings,
  action,
}: {
  stage: Stage;
  cameraStatus: CameraStatus;
  warnings: number;
  action?: React.ReactNode;
}) {
  const index = STEPS.findIndex((s) => s.stage === stage);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-edge-soft bg-slab px-4 py-3">
      <Mark size={22} />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-tight">
          {STEPS[index]?.label ?? "Test"}
        </p>
        <p className="text-[11px] text-dim">
          Step {index + 1} of {STEPS.length}
        </p>
      </div>
      <StepBar total={STEPS.length} done={index + 1} className="min-w-[120px] flex-1" />
      <CameraStatusChip status={cameraStatus} className="hidden sm:inline-flex" />
      <StrikePill used={warnings} />
      {action}
      <Link
        href="/"
        className={buttonStyles({ variant: "ghost", size: "sm" })}
        title="Leave the test"
      >
        <X size={15} />
        Exit
      </Link>
    </div>
  );
}

/** The step list, shown on the calmer stages. */
function Progress({ stage }: { stage: Stage }) {
  const index = STEPS.findIndex((s) => s.stage === stage);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
      {STEPS.map((s, i) => {
        const done = i < index;
        const now = i === index;
        return (
          <li key={s.stage} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                done
                  ? "bg-proof/15 text-proof"
                  : now
                    ? "bg-signal text-on-signal"
                    : "border border-edge text-dim",
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={cn("text-[12.5px]", now ? "font-semibold" : "text-dim")}>
              <span className="hidden sm:inline">{s.label}</span>
              <span className="sm:hidden">{s.short}</span>
            </span>
            {i < STEPS.length - 1 && (
              <span className="hidden h-px w-5 bg-edge-soft sm:inline-block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-5 py-10">{children}</div>;
}
