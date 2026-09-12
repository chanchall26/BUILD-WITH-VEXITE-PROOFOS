"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MODELS } from "@/lib/config";
import type { GeminiCall } from "@/lib/domain";

const USES = [
  {
    capability: "Structured output",
    model: MODELS.architect,
    where: "Challenge design, evidence extraction, role requirements, the written record",
    why: "A rubric and an evidence list are data, not prose. Every one of them comes back against a JSON schema, so nothing downstream has to parse English.",
  },
  {
    capability: "Thinking level",
    model: `${MODELS.architect} · ${MODELS.workhorse}`,
    where: "High for design and evidence, low for counterpart replies",
    why: "Designing a fair assessment deserves deliberation. A colleague's reply deserves to arrive before the candidate loses their train of thought.",
  },
  {
    capability: "Function calling",
    model: MODELS.workhorse,
    where: "The counterpart consulting simulated tools before it answers",
    why: "It is what makes the counterpart a colleague rather than a chatbot, and it lets the interface show which data it read and which it skipped.",
  },
  {
    capability: "Streaming",
    model: MODELS.workhorse,
    where: "The counterpart's reply, after it has consulted its tools",
    why: "The counterpart has to feel like the tool the candidate uses daily, or the behaviour being measured is not the behaviour they would show at work.",
  },
  {
    capability: "Multimodal input",
    model: MODELS.architect,
    where: "A job posting as a PDF or a photograph of a whiteboard",
    why: "Hiring managers have a PDF and a screenshot, not a clean text field.",
  },
  {
    capability: "Google Search grounding",
    model: MODELS.workhorse,
    where: "Market statistics on the landing page, optional role calibration",
    why: "The numbers behind this product change quarterly, and postings describe a role as it was written rather than as it is worked. Both are cited so a reader can check them.",
  },
  {
    capability: "Audio understanding",
    model: MODELS.transcribe,
    where: "The spoken defence",
    why: "Speech becomes text, the audio is discarded, and nothing about the voice itself is measured or stored.",
  },
  {
    capability: "Text-to-speech",
    model: MODELS.speech,
    where: "Reading the defence question aloud",
    why: "Being asked a question is a different experience from reading one, and it is the moment the assessment stops feeling like a form.",
  },
  {
    capability: "Embeddings",
    model: MODELS.embedding,
    where: "Evidence retrieval and capability matching",
    why: "A record that never uses the words a hiring manager types still has to be findable.",
  },
  {
    capability: "Seeded generation",
    model: MODELS.architect,
    where: "Evidence extraction and the written record",
    why: "A fixed seed with a locked rubric means the same session evaluates the same way twice, which is the difference between an assessment and an opinion.",
  },
  {
    capability: "Constrained truth distribution",
    model: MODELS.architect,
    where: "The trust-calibration set",
    why: "The set has to break the link between how confident an output sounds and whether it deserves trust, which is a property of the whole set rather than any one item.",
  },
  {
    capability: "Model fallback tiers",
    model: `${MODELS.architect} → ${MODELS.workhorse} → fixtures`,
    where: "Every call",
    why: "Nobody's assessment fails because a preview model is busy.",
  },
];

const REFUSED = [
  "Whether a planted defect reached the finished work. That is normalised string comparison against a marker.",
  "The trust-calibration score. That is arithmetic against a sealed answer key the browser never sees.",
  "Any capability score. Each one is a pure function of the observations behind it.",
  "Whether to hire anyone. The system produces coverage and evidence, and no decision at all.",
];

export default function EnginePage() {
  const [calls, setCalls] = useState<GeminiCall[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/api/calls")
        .then((r) => r.json())
        .then((d: { calls: GeminiCall[]; demoMode: boolean }) => {
          setCalls(d.calls ?? []);
          setDemoMode(d.demoMode);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <span className="eyebrow">The Gemini engine</span>
      <h1 className="headline mt-3 max-w-2xl">
        Twelve capabilities, each doing one job it is actually suited to.
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        PROOFOS does not call one model for everything and call that an AI product. Each
        part of the system picks the Gemini capability that fits it, and the log below is
        live from this deployment.
      </p>

      {demoMode && (
        <p className="mt-6 rounded-lg border border-signal-deep/40 bg-wash/60 px-4 py-3 text-[13px] leading-relaxed text-signal">
          No <code className="font-mono">GEMINI_API_KEY</code> is configured, so calls are
          served from deterministic fixtures and logged as such. Add a key and every row
          below becomes a real request.
        </p>
      )}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-edge">
              <th className="py-3 pr-4 font-medium text-dim">Capability</th>
              <th className="py-3 pr-4 font-medium text-dim">Model</th>
              <th className="py-3 pr-4 font-medium text-dim">Where</th>
              <th className="py-3 font-medium text-dim">Why there</th>
            </tr>
          </thead>
          <tbody>
            {USES.map((u) => (
              <tr key={u.capability} className="border-b border-edge-soft align-top">
                <td className="py-3.5 pr-4 font-medium text-bright">{u.capability}</td>
                <td className="py-3.5 pr-4 font-mono text-[11.5px] text-data">{u.model}</td>
                <td className="py-3.5 pr-4 text-muted">{u.where}</td>
                <td className="py-3.5 leading-relaxed text-muted">{u.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Live log --------------------------------------------------------- */}
      <div className="mt-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">Live call log</span>
          <span className="chip border-data/30 text-data">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-data" />
            refreshing
          </span>
        </div>
        <p className="mt-2 text-[13px] text-muted">
          The last model calls this server instance made. Use the product in another tab and
          watch them arrive.
        </p>

        <div className="panel mt-4 overflow-hidden">
          {calls.length === 0 ? (
            <p className="p-6 text-[13px] text-dim">
              Nothing yet. Design a challenge or take one, then come back.
            </p>
          ) : (
            <ul className="divide-y divide-[--color-edge-soft]">
              {calls.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      c.ok ? (c.fixture ? "bg-signal" : "bg-proof") : "bg-alert"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-[13px] text-bright">{c.label}</span>
                  <span className="font-mono text-[11.5px] text-data">{c.model}</span>
                  <span className="text-[11.5px] text-dim">{c.capability}</span>
                  <span className="numeral ml-auto text-[11.5px] text-muted">{c.ms}ms</span>
                  {c.note && (
                    <span className="w-full truncate text-[11px] text-dim">{c.note}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <div className="panel p-6">
          <span className="eyebrow">What Gemini is not allowed to decide</span>
          <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-muted">
            {REFUSED.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-alert" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] leading-relaxed text-dim">
            A model extracts evidence and must quote it verbatim. Any observation whose
            quote does not appear in the session is discarded before it reaches a score.
          </p>
        </div>

        <div className="panel p-6">
          <span className="eyebrow">Read the prompts</span>
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
            Every instruction sent to a model lives in one file rather than scattered
            through route handlers, so the thing argued about in a fairness review is a
            reviewable artifact rather than an archaeology exercise.
          </p>
          <p className="mt-3 font-mono text-[12px] text-data">lib/prompts.ts</p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-dim">
            Each one carries the same standing instruction: assess only what is visible in
            the work, and never infer personality, demographics, accent, fluency or
            emotional state.
          </p>
          <Link href="/demo" className="btn btn-ghost mt-4">
            Follow the demo path
          </Link>
        </div>
      </div>
    </div>
  );
}
