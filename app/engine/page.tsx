"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonStyles } from "@/components/ui/button";
import { MODELS } from "@/lib/config";
import type { GeminiCall } from "@/lib/domain";

/**
 * How the product works, written for the person taking the test.
 *
 * The technical detail is real and worth showing, but it belongs behind a
 * disclosure. Somebody deciding whether to trust their career to this needs to
 * know what is measured and what is not. They do not need our model names.
 */

const STEPS = [
  {
    n: "1",
    title: "We build a real task",
    body: "From the job advert, or from the kind of work you picked. Real data, working tools, and four mistakes hidden inside it on purpose.",
  },
  {
    n: "2",
    title: "You work, with an AI teammate",
    body: "It looks things up and gives you confident answers. Four of them are wrong. You can see which tools it opened, so the clues are always there.",
  },
  {
    n: "3",
    title: "We write down what happened",
    body: "Not opinions. Specific moments, quoted in your own words, each stamped with a time and a fingerprint so it cannot be changed later.",
  },
  {
    n: "4",
    title: "Scores are calculated from that",
    body: "Six skills, worked out from the moments we wrote down. Nothing is stored as a score. Ask why you got a number and you get the list.",
  },
];

const NOT_ALLOWED = [
  {
    q: "Did the AI's mistake end up in your work?",
    a: "Decided by comparing text, letter by letter. No AI involved.",
  },
  {
    q: "How did you do on the trust quiz?",
    a: "Plain arithmetic against the real answers, which never leave our server.",
  },
  {
    q: "What are your six skill scores?",
    a: "Calculated from the recorded moments, by a formula anyone can check.",
  },
  {
    q: "Should this person be hired?",
    a: "We never answer this. There is no code anywhere that decides it.",
  },
];

const MEASURED = [
  "The work you wrote, and every message to your AI teammate",
  "Which of the AI's mistakes you spotted, and which you did not",
  "How often you asked it for evidence before believing it",
  "Your answers in the trust quiz, and how confident you were",
  "Whether you can explain your own choices out loud",
  "Counts: pastes, edits, time taken, times you left the test",
];

const NOT_MEASURED = [
  "Your face, your voice, or your screen",
  "How you sound, your accent, or how fluent you are",
  "Your background, your education, or where you live",
  "Your mood, your personality, or anything guessed about you",
  "Anything at all outside this one task",
];

interface Pool {
  keys: number;
  sidelined: { key: number; model: string; retryInSeconds: number }[];
}

const TECHNICAL = [
  ["Task design and marking", MODELS.architect, "Structured output, fixed seed, high reasoning"],
  ["The AI teammate", MODELS.workhorse, "Tool calling, then streaming"],
  ["Reading job adverts", MODELS.architect, "PDF and image understanding"],
  ["Live statistics", MODELS.workhorse, "Web search with citations"],
  ["Spoken answers", MODELS.transcribe, "Speech to text, audio then deleted"],
  ["Reading questions aloud", MODELS.speech, "Text to speech"],
  ["Matching skills to jobs", MODELS.embedding, "Embeddings"],
];

export default function HowItWorksPage() {
  const [calls, setCalls] = useState<GeminiCall[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [pool, setPool] = useState<Pool>({ keys: 0, sidelined: [] });

  useEffect(() => {
    const load = () =>
      fetch("/api/calls")
        .then((r) => r.json())
        .then((d: { calls: GeminiCall[]; demoMode: boolean; pool?: Pool }) => {
          setCalls(d.calls ?? []);
          setDemoMode(d.demoMode);
          setPool(d.pool ?? { keys: 0, sidelined: [] });
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        back={{ href: "/", label: "Back to home" }}
        crumbs={[{ label: "Home", href: "/" }, { label: "How it works" }]}
        eyebrow="How it works"
        title="Know exactly what is measured before you agree to it."
        description="Most tests never tell you. Here is the whole thing in four steps, plus what we look at and what we refuse to look at."
      />

      {/* Four steps ------------------------------------------------------ */}
      <ol className="rise rise-1 mt-9 grid gap-px overflow-hidden rounded-xl border border-edge-soft bg-edge-soft sm:grid-cols-2">
        {STEPS.map((s) => (
          <li key={s.n} className="bg-slab p-6">
            <div className="flex items-baseline gap-3">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal text-[12px] font-semibold text-on-signal">
                {s.n}
              </span>
              <h2 className="text-[16.5px] font-semibold tracking-[-0.015em]">{s.title}</h2>
            </div>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>

      {/* What is and is not measured -------------------------------------- */}
      <div className="rise rise-2 mt-6 grid gap-5 md:grid-cols-2">
        <div className="panel p-6">
          <h2 className="text-[15px] font-semibold text-proof">What we look at</h2>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
            {MEASURED.map((m) => (
              <li key={m} className="flex gap-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-proof" />
                {m}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-6">
          <h2 className="text-[15px] font-semibold text-alert">What we never look at</h2>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
            {NOT_MEASURED.map((m) => (
              <li key={m} className="flex gap-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-alert" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* What the AI is not allowed to decide ----------------------------- */}
      <section className="rise rise-3 mt-6">
        <div className="panel-raised p-6">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
            Which parts the AI is not allowed to decide
          </h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            An AI builds the task and points at things you said. It does not set your
            scores. Anything you could reasonably argue with is calculated, so you can check
            it and so it comes out the same every time.
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {NOT_ALLOWED.map((item) => (
              <div key={item.q} className="rounded-lg border border-edge-soft bg-deep p-4">
                <dt className="text-[13.5px] font-medium">{item.q}</dt>
                <dd className="mt-1.5 text-[13px] leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Technical, folded away -------------------------------------------- */}
      <details className="panel mt-6 p-6">
        <summary className="cursor-pointer text-[14px] font-medium text-signal">
          Technical details, for developers and reviewers
        </summary>

        <div className="mt-5 space-y-6">
          <p className="text-[13.5px] leading-relaxed text-muted">
            Built on the Google Gemini API. Each part of the system uses the capability that
            actually fits it rather than sending everything to one model. Every instruction
            we send lives in a single file, <code className="font-mono">lib/prompts.ts</code>
            , so a disputed result can be argued about against something readable.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-edge">
                  <th className="py-2 pr-4 font-medium text-dim">Where</th>
                  <th className="py-2 pr-4 font-medium text-dim">Model</th>
                  <th className="py-2 font-medium text-dim">Capability</th>
                </tr>
              </thead>
              <tbody>
                {TECHNICAL.map(([where, model, capability]) => (
                  <tr key={where} className="border-b border-edge-soft align-top">
                    <td className="py-2.5 pr-4">{where}</td>
                    <td className="py-2.5 pr-4 font-mono text-[11.5px] text-data">{model}</td>
                    <td className="py-2.5 text-muted">{capability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {demoMode && (
            <p className="rounded-lg border border-signal-deep/40 bg-wash px-4 py-3 text-[13px] leading-relaxed text-signal">
              No API key is configured, so everything runs from built-in sample answers and
              is labelled as such. Add a key and every row below becomes a real request.
            </p>
          )}

          {pool.keys > 1 && (
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
              <span className="eyebrow">Key pool</span>
              {Array.from({ length: pool.keys }, (_, i) => i + 1).map((n) => {
                const cooling = pool.sidelined.filter((s) => s.key === n);
                return (
                  <span
                    key={n}
                    className={`chip ${cooling.length ? "border-caution/40 text-caution" : "border-proof/40 text-proof"}`}
                  >
                    key {n}
                    {cooling.length
                      ? ` · cooling ${Math.max(...cooling.map((c) => c.retryInSeconds))}s`
                      : ""}
                  </span>
                );
              })}
              <span className="text-dim">
                Requests rotate across the pool, and a rate-limited key steps aside until its
                window clears.
              </span>
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow">Live call log</span>
              <span className="chip border-data/40 text-data">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-data" />
                refreshing
              </span>
            </div>
            <div className="panel mt-3 overflow-hidden">
              {calls.length === 0 ? (
                <p className="p-5 text-[13px] text-dim">
                  Nothing yet. Use the product in another tab and come back.
                </p>
              ) : (
                <ul className="divide-y divide-[--color-edge-soft]">
                  {calls.slice(0, 20).map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5"
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          c.ok ? (c.fixture ? "bg-signal" : "bg-proof") : "bg-alert"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-[13px]">{c.label}</span>
                      <span className="font-mono text-[11.5px] text-data">{c.model}</span>
                      {c.key && <span className="text-[11px] text-dim">key {c.key}</span>}
                      <span className="numeral ml-auto text-[11.5px] text-muted">
                        {c.ms}ms
                      </span>
                      {c.note && (
                        <span className="w-full truncate text-[11px] text-dim">{c.note}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </details>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/challenge" className={buttonStyles({ size: "lg" })}>
          Take the test
        </Link>
        <Link href="/demo" className={buttonStyles({ variant: "outline" })}>
          Guided tour
        </Link>
      </div>
    </div>
  );
}
