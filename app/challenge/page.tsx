"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalibrationStep } from "@/components/challenge/calibration-step";
import { CounterpartPanel } from "@/components/challenge/counterpart-panel";
import { DefenceStep } from "@/components/challenge/defence-step";
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
  | "designing"
  | "consent"
  | "brief"
  | "work"
  | "calibration"
  | "defence"
  | "evaluating";

const RECORDED = [
  "The work you produce, and every message you exchange with the AI counterpart.",
  "Your judgements in the calibration set, and how far you said you would act on each one.",
  "A transcript of two short spoken answers about your own decisions. The audio is discarded once transcribed.",
  "Counts only: paste events, edits, and elapsed time.",
];

const NOT_RECORDED = [
  "No camera, no screen recording, no browser lockdown, no extension.",
  "No analysis of your voice for accent, emotion, tone or fluency.",
  "Nothing inferred about you beyond the decisions visible in this task.",
  "No hire or reject decision is produced by this system.",
];

export default function ChallengePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("pick");
  const [domain, setDomain] = useState<Domain>("software");
  const [roleContext, setRoleContext] = useState("");
  const [calibrateRole, setCalibrateRole] = useState(false);
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

  // Deep link straight into the seeded challenge, for the demo path.
  useEffect(() => {
    if (window.location.hash !== "#seeded") return;
    let cancelled = false;
    void (async () => {
      setStage("designing");
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
        setError("Could not load the seeded challenge.");
        setStage("pick");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function design(seeded: boolean) {
    setStage("designing");
    setError(null);
    try {
      const res = seeded
        ? await fetch("/api/challenge")
        : await fetch("/api/challenge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domain,
              roleContext: roleContext.trim() || undefined,
              calibrate: calibrateRole,
            }),
          });
      const data = await res.json();
      if (!res.ok || !data.challenge) throw new Error(data?.error ?? "Design failed.");
      setChallenge(data.challenge);
      setWork(data.challenge.workspaceSeed ?? "");
      setStage("consent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not design a challenge.");
      setStage("pick");
    }
  }

  /** Telemetry counters live in refs, so they are updated here rather than
   *  inside a state updater, which must stay a pure function of its input. */
  function onWorkChange(next: string) {
    const delta = next.length - work.length;
    if (delta > 0) typedChars.current += delta;
    revisions.current += 1;
    setWork(next);
  }

  async function submit(defence: DefenceAnswer[]) {
    if (!challenge) return;
    setStage("evaluating");
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
          },
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Evaluation failed.");
      sessionStorage.setItem("proofos.result", await res.text());
      router.push("/passport");
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} Your work is still here — try submitting again.`
          : "Evaluation failed.",
      );
      setStage("defence");
    }
  }

  // ------------------------------------------------------------------ pick
  if (stage === "pick" || stage === "designing") {
    return (
      <Shell>
        <span className="eyebrow">Proof challenge</span>
        <h1 className="headline mt-3 max-w-2xl">
          Pick the work you want on the record.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Gemini designs a twelve-minute simulation from that world, with real tools, real
          evidence, and an AI coworker that is confidently wrong four times.
        </p>

        {error && (
          <p className="mt-5 rounded-lg border border-alert/40 bg-alert/5 px-4 py-3 text-[13.5px] text-alert">
            {error}
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              aria-pressed={domain === d}
              disabled={stage === "designing"}
              className={`rounded-xl border p-4 text-left transition-colors ${
                domain === d
                  ? "border-signal bg-wash text-bright"
                  : "border-edge-soft bg-slab text-muted hover:border-edge hover:text-bright"
              }`}
            >
              <span className="text-[14px] font-medium">{DOMAIN_LABEL[d]}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 max-w-2xl">
          <label className="block">
            <span className="mb-1.5 block text-[13px] text-muted">
              Anything about the role, optional
            </span>
            <textarea
              value={roleContext}
              onChange={(e) => setRoleContext(e.target.value)}
              rows={3}
              disabled={stage === "designing"}
              placeholder="Paste a posting, or a sentence about what this person will actually do."
              className="field resize-none text-[13.5px]"
            />
          </label>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={calibrateRole}
              onChange={(e) => setCalibrateRole(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#7189ff]"
            />
            <span>
              Calibrate against the live market.
              <span className="block text-[12px] text-dim">
                Gemini searches what this role actually involves in 2026 before designing
                the simulation, and cites what it read.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            className="btn btn-primary"
            disabled={stage === "designing"}
            onClick={() => void design(false)}
          >
            {stage === "designing" ? "Designing…" : "Design my challenge"}
          </button>
          <button
            className="btn btn-ghost"
            disabled={stage === "designing"}
            onClick={() => void design(true)}
          >
            Use the seeded scenario
          </button>
          {stage === "designing" && (
            <span className="thinking text-[13px]">
              writing competencies, tools, evidence and four planted defects…
            </span>
          )}
        </div>
      </Shell>
    );
  }

  if (!challenge) return null;

  // --------------------------------------------------------------- consent
  if (stage === "consent") {
    return (
      <Shell>
        <span className="eyebrow">{DOMAIN_LABEL[challenge.domain]}</span>
        <h1 className="headline mt-3">{challenge.title}</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          {challenge.roleContext} About {challenge.estimatedMinutes} minutes of work, then a
          calibration set and two spoken questions.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="panel p-5">
            <h2 className="text-[14px] font-semibold text-bright">What is recorded</h2>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {RECORDED.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-signal" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-5">
            <h2 className="text-[14px] font-semibold text-bright">What is never collected</h2>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {NOT_RECORDED.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-proof" />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel mt-4 p-5">
          <span className="eyebrow">Transparency notice</span>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            {challenge.transparencyNotice}
          </p>
        </div>

        <div className="mt-8 max-w-md space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] text-muted">Your name</span>
            <input
              className="field"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="How it should read on your passport"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#7189ff]"
            />
            I understand what is recorded and I want to take this challenge.
          </label>
          <button
            className="btn btn-primary"
            disabled={!agreed}
            onClick={() => {
              startedAt.current = Date.now();
              setStage("brief");
            }}
          >
            Begin
          </button>
        </div>
      </Shell>
    );
  }

  // ----------------------------------------------------------------- brief
  if (stage === "brief") {
    return (
      <Shell>
        <span className="eyebrow">The situation</span>
        <h1 className="headline mt-3 max-w-3xl">{challenge.situation}</h1>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="panel-raised p-6">
            <span className="eyebrow">What to deliver</span>
            <p className="mt-2 text-[15px] leading-relaxed text-bright">
              {challenge.deliverable}
            </p>
            <h2 className="mt-6 text-[13px] font-semibold text-muted">
              What the record will look for
            </h2>
            <ul className="mt-2 space-y-1.5 text-[13.5px] leading-relaxed text-muted">
              {challenge.requirements.map((r) => (
                <li key={r.id} className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-dim" />
                  {r.text}
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-edge-soft pt-3 text-[12.5px] leading-relaxed text-dim">
              Your AI counterpart has {challenge.tools.length} tools it can consult. You can
              ask it what it looked at, and you should.
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

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={() => setStage("work")}>
            Open the workspace
          </button>
          <span className="text-[12.5px] text-dim">
            The clock started when you pressed Begin. It is context, not a limit.
          </span>
        </div>
      </Shell>
    );
  }

  // ----------------------------------------------------------- calibration
  if (stage === "calibration") {
    return (
      <div className="mx-auto max-w-4xl px-5 py-10">
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
        {error && (
          <p className="mb-4 rounded-lg border border-alert/40 bg-alert/5 px-4 py-3 text-[13.5px] text-alert">
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

  // ------------------------------------------------------------ evaluating
  if (stage === "evaluating") {
    return (
      <Shell>
        <div className="panel-raised p-10 text-center">
          <p className="thinking text-[17px]">Building your evidence record…</p>
          <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-[13px] text-dim">
            <li>Checking which planted defects reached your finished work</li>
            <li>Reading the conversation for what you questioned and what you accepted</li>
            <li>Scoring your calibration against what each output actually deserved</li>
            <li>Deriving six capabilities from the observations, and nothing else</li>
            <li>Signing a passport that belongs to you</li>
          </ul>
        </div>
      </Shell>
    );
  }

  // ------------------------------------------------------------- workspace
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="eyebrow">Workspace</span>
        <span className="max-w-xl truncate text-[13px] text-muted">
          {challenge.deliverable}
        </span>
        <button className="btn btn-quiet ml-auto" onClick={() => setStage("brief")}>
          Re-read the brief
        </button>
        <button
          className="btn btn-primary"
          onClick={() => setStage("calibration")}
          disabled={work.trim().length < 40}
        >
          Submit and continue
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="panel flex min-h-[64vh] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-edge-soft px-4 py-2.5">
            <span className="text-[12.5px] font-medium">Your work</span>
            <span className="ml-auto text-[11px] text-dim">
              {work.length} chars · {pasteCount} pastes
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
            className="min-h-0 flex-1 resize-none bg-void p-4 font-mono text-[13px] leading-relaxed text-bright outline-none"
          />
          <div className="border-t border-edge-soft px-4 py-2 text-[11px] text-dim">
            Everything here becomes evidence, including what you paste and what you delete.
          </div>
        </div>

        <div className="panel flex min-h-[64vh] flex-col overflow-hidden">
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

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-5 py-12">{children}</div>;
}
