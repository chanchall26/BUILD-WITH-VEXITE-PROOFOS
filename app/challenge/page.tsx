"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalibrationStep } from "@/components/challenge/calibration-step";
import { CounterpartPanel } from "@/components/challenge/counterpart-panel";
import { DefenceStep } from "@/components/challenge/defence-step";
import {
  AwayCurtain,
  FocusBar,
  useFocusGuard,
} from "@/components/challenge/focus-mode";
import {
  DOMAINS,
  DOMAIN_LABEL,
  type CalibrationAnswer,
  type ChallengeSpec,
  type DefenceAnswer,
  type Domain,
  type Turn,
} from "@/lib/domain";

type Stage =
  | "pick"
  | "building"
  | "consent"
  | "brief"
  | "work"
  | "calibration"
  | "defence"
  | "scoring";

/** The steps a candidate walks through, for the progress bar. */
const STEPS: { stage: Stage; label: string }[] = [
  { stage: "brief", label: "Read the situation" },
  { stage: "work", label: "Do the work" },
  { stage: "calibration", label: "Judge 10 AI answers" },
  { stage: "defence", label: "Explain your choices" },
  { stage: "scoring", label: "Get your results" },
];

const WE_RECORD = [
  "The work you write, and everything you say to your AI teammate.",
  "Your answers in the trust quiz.",
  "The words from two short spoken answers. The recording itself is deleted straight after.",
  "Simple counts: pastes, edits, time taken, and times you left the test.",
];

const WE_NEVER = [
  "No camera. No microphone recording kept. No screen recording.",
  "Nothing about how you sound, your accent, or your mood.",
  "Nothing about you outside this task.",
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

  // Integrity monitoring runs from the moment the task opens until submission.
  const guarded = stage === "work" || stage === "calibration" || stage === "defence";
  const { counts, isFullscreen, away, enterFullscreen, exitFullscreen } =
    useFocusGuard(guarded);

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
        setError("We could not load the sample test. Please refresh.");
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
      if (!res.ok || !data.challenge) throw new Error(data?.error ?? "Could not build it.");
      setChallenge(data.challenge);
      setWork(data.challenge.workspaceSeed ?? "");
      setStage("consent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setStage("pick");
    }
  }

  function onWorkChange(next: string) {
    const delta = next.length - work.length;
    if (delta > 0) typedChars.current += delta;
    revisions.current += 1;
    setWork(next);
  }

  async function submit(defence: DefenceAnswer[]) {
    if (!challenge) return;
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

  // ------------------------------------------------------------------ pick
  if (stage === "pick" || stage === "building") {
    const busy = stage === "building";
    return (
      <Shell>
        <div className="rise">
          <span className="eyebrow">The test · about 16 minutes</span>
          <h1 className="headline mt-3 max-w-2xl">What kind of work do you do?</h1>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-muted">
            Pick one and we will build a short, realistic task from that world. You will
            work on it alongside an AI teammate. That teammate will be confidently wrong
            four times, and noticing is the point.
          </p>
        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-alert/40 bg-alert/5 px-4 py-3 text-[13.5px] text-alert">
            {error}
          </p>
        )}

        <div className="rise rise-1 mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              aria-pressed={domain === d}
              disabled={busy}
              className={`panel-interactive rounded-xl border p-4 text-left ${
                domain === d
                  ? "border-signal bg-wash text-bright"
                  : "border-edge-soft bg-slab text-muted"
              }`}
            >
              <span className="text-[14px] font-medium">{DOMAIN_LABEL[d]}</span>
            </button>
          ))}
        </div>

        <details className="rise rise-2 mt-6 max-w-2xl">
          <summary className="cursor-pointer text-[13.5px] text-signal">
            Want it tailored to a specific job? (optional)
          </summary>
          <div className="mt-3">
            <textarea
              value={roleContext}
              onChange={(e) => setRoleContext(e.target.value)}
              rows={3}
              disabled={busy}
              placeholder="Paste the job advert, or just say what the person will actually do day to day."
              className="field resize-none text-[13.5px]"
            />
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-muted">
              <input
                type="checkbox"
                checked={useSearch}
                onChange={(e) => setUseSearch(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--color-signal)]"
              />
              <span>
                Check what this job is really like today first.
                <span className="block text-[12px] text-dim">
                  Takes a little longer. We look it up and show you our sources.
                </span>
              </span>
            </label>
          </div>
        </details>

        <div className="rise rise-3 mt-8 flex flex-wrap items-center gap-3">
          <button
            className="btn btn-primary btn-lg"
            disabled={busy}
            onClick={() => void build(false)}
          >
            {busy ? "Building your test…" : "Build my test"}
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => void build(true)}>
            Use the ready-made one
          </button>
        </div>
        {busy && (
          <p className="thinking mt-4 text-[13.5px]">
            Writing the situation, the data, the tools and four hidden mistakes…
          </p>
        )}
        <p className="mt-3 text-[12.5px] text-dim">
          The ready-made one starts instantly. Building a fresh one takes about 30 seconds.
        </p>
      </Shell>
    );
  }

  if (!challenge) return null;

  // --------------------------------------------------------------- consent
  if (stage === "consent") {
    return (
      <Shell>
        <div className="rise">
          <span className="eyebrow">{DOMAIN_LABEL[challenge.domain]}</span>
          <h1 className="headline mt-3">{challenge.title}</h1>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-muted">
            {challenge.roleContext} About {challenge.estimatedMinutes} minutes of work, then
            a short quiz and two spoken questions.
          </p>
        </div>

        <div className="rise rise-1 mt-8 grid gap-4 md:grid-cols-2">
          <div className="panel p-5">
            <h2 className="text-[14.5px] font-semibold">What we record</h2>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {WE_RECORD.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-5">
            <h2 className="text-[14.5px] font-semibold">What we never do</h2>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {WE_NEVER.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-proof" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel rise rise-2 mt-4 p-5">
          <span className="eyebrow">The full notice</span>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            {challenge.transparencyNotice}
          </p>
        </div>

        <div className="panel-raised rise rise-3 mt-6 max-w-lg p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-medium">Your name</span>
            <input
              className="field"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="This is what goes on your results"
            />
          </label>
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[var(--color-signal)]"
            />
            I have read the above and I want to take this test.
          </label>
          <button
            className="btn btn-primary btn-lg mt-5 w-full"
            disabled={!agreed}
            onClick={() => {
              startedAt.current = Date.now();
              setStage("brief");
            }}
          >
            Start
          </button>
        </div>
      </Shell>
    );
  }

  // ----------------------------------------------------------------- brief
  if (stage === "brief") {
    return (
      <Shell>
        <Progress stage="brief" />
        <div className="rise">
          <span className="eyebrow">What is happening</span>
          <h1 className="headline mt-3 max-w-3xl">{challenge.situation}</h1>
        </div>

        <div className="rise rise-1 mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="panel-raised p-6">
            <span className="eyebrow">Your job</span>
            <p className="mt-2 text-[15.5px] leading-relaxed">{challenge.deliverable}</p>
            <h2 className="mt-6 text-[13px] font-semibold text-muted">
              We will be looking for
            </h2>
            <ul className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {challenge.requirements.map((r) => (
                <li key={r.id} className="flex gap-2.5">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-dim" />
                  {r.text}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-lg border border-edge-soft bg-deep px-3.5 py-3 text-[13px] leading-relaxed text-muted">
              Your AI teammate can look things up in {challenge.tools.length} tools. Ask it
              what it checked. It does not always check the right one.
            </p>
          </div>

          <div className="space-y-3">
            {challenge.contextDocs.map((d) => (
              <div key={d.label} className="panel p-4">
                <div className="flex items-center gap-2">
                  <span className="chip">{d.kind}</span>
                  <span className="text-[12px] text-dim">{d.label}</span>
                </div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-muted">
                  {d.body}
                </pre>
              </div>
            ))}
          </div>
        </div>

        <div className="rise rise-2 mt-8 flex flex-wrap items-center gap-3">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              setStage("work");
              void enterFullscreen();
            }}
          >
            Open my workspace
          </button>
          <span className="text-[12.5px] text-dim">
            This will go full screen. You can leave at any time.
          </span>
        </div>
      </Shell>
    );
  }

  // ----------------------------------------------------------- calibration
  if (stage === "calibration") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Progress stage="calibration" />
        <div className="mb-4">
          <FocusBar
            counts={counts}
            isFullscreen={isFullscreen}
            onEnterFullscreen={() => void enterFullscreen()}
            onExitFullscreen={() => void exitFullscreen()}
          />
        </div>
        <AwayCurtain visible={away} />
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
    );
  }

  // --------------------------------------------------------------- defence
  if (stage === "defence") {
    return (
      <Shell>
        <Progress stage="defence" />
        <div className="mb-4">
          <FocusBar
            counts={counts}
            isFullscreen={isFullscreen}
            onEnterFullscreen={() => void enterFullscreen()}
            onExitFullscreen={() => void exitFullscreen()}
          />
        </div>
        <AwayCurtain visible={away} />
        {error && (
          <p className="mb-4 rounded-xl border border-alert/40 bg-alert/5 px-4 py-3 text-[13.5px] text-alert">
            {error}
          </p>
        )}
        <DefenceStep
          challenge={challenge}
          work={work}
          onDone={(answers) => void submit(answers)}
        />
      </Shell>
    );
  }

  // --------------------------------------------------------------- scoring
  if (stage === "scoring") {
    return (
      <Shell>
        <Progress stage="scoring" />
        <div className="panel-raised p-10 text-center">
          <p className="thinking text-[18px]">Working out your results…</p>
          <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-left text-[13.5px] text-muted">
            <li>Checking whether the AI&apos;s four mistakes ended up in your work</li>
            <li>Reading what you questioned and what you accepted</li>
            <li>Marking your trust quiz against the real answers</li>
            <li>Working out six skill scores from what you actually did</li>
            <li>Signing a result that belongs to you</li>
          </ul>
        </div>
      </Shell>
    );
  }

  // ------------------------------------------------------------- workspace
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5">
      <AwayCurtain visible={away} />

      <div className="mb-3">
        <Progress stage="work" compact />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium">Your job</p>
          <p className="max-w-2xl truncate text-[13px] text-muted">{challenge.deliverable}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button className="btn btn-quiet" onClick={() => setStage("brief")}>
            Read it again
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setStage("calibration")}
            disabled={work.trim().length < 40}
            title={
              work.trim().length < 40 ? "Write a little more before moving on" : undefined
            }
          >
            Done — next step
          </button>
        </div>
      </div>

      <div className="mb-3">
        <FocusBar
          counts={counts}
          isFullscreen={isFullscreen}
          onEnterFullscreen={() => void enterFullscreen()}
          onExitFullscreen={() => void exitFullscreen()}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="panel flex min-h-[62vh] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-edge-soft px-4 py-2.5">
            <span className="text-[12.5px] font-medium">Your work</span>
            <span className="ml-auto text-[11.5px] text-dim">
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
            className="min-h-0 flex-1 resize-none bg-deep p-4 font-mono text-[13px] leading-relaxed text-bright outline-none"
          />
          <div className="border-t border-edge-soft px-4 py-2 text-[11.5px] text-dim">
            Write here. Everything you keep, change or paste becomes part of your record.
          </div>
        </div>

        <div className="panel flex min-h-[62vh] flex-col overflow-hidden">
          <CounterpartPanel
            challenge={challenge}
            work={work}
            turns={turns}
            onTurns={setTurns}
          />
        </div>
      </div>
    </div>
  );
}

/** Where you are, out of five. */
function Progress({ stage, compact = false }: { stage: Stage; compact?: boolean }) {
  const index = STEPS.findIndex((s) => s.stage === stage);
  return (
    <ol
      className={`flex flex-wrap items-center gap-x-2 gap-y-2 ${compact ? "mb-1" : "mb-8"}`}
      aria-label={`Step ${index + 1} of ${STEPS.length}`}
    >
      {STEPS.map((s, i) => {
        const done = i < index;
        const now = i === index;
        return (
          <li key={s.stage} className="flex items-center gap-2">
            <span
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold ${
                done
                  ? "bg-proof/15 text-proof"
                  : now
                    ? "bg-signal text-on-signal"
                    : "border border-edge text-dim"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`text-[12.5px] ${now ? "font-medium text-bright" : "text-dim"} ${
                compact && !now ? "hidden sm:inline" : ""
              }`}
            >
              {s.label}
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
