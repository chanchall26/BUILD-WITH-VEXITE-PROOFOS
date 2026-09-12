"use client";

import { CornerDownLeft, Search, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import type { ChallengeSpec, Turn } from "@/lib/domain";


/**
 * The AI teammate.
 *
 * The chip row above each reply is the important part of this component. It
 * shows what the teammate went and looked at before answering, which is how a
 * candidate can see it consulted the database chart and never opened the one
 * that mattered. Everything the assessment measures is visible to the person
 * being assessed, while it happens.
 */

function niceToolName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CounterpartPanel({
  challenge,
  work,
  turns,
  onTurns,
}: {
  challenge: ChallengeSpec;
  work: string;
  turns: Turn[];
  onTurns: (turns: Turn[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [consulting, setConsulting] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setBusy(true);
    setConsulting(true);

    const withCandidate: Turn[] = [
      ...turns,
      { role: "candidate", text: message, at: Date.now() },
    ];
    onTurns(withCandidate);

    try {
      const res = await fetch("/api/counterpart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, work, history: turns, message }),
      });
      if (!res.ok || !res.body) throw new Error("unavailable");

      const beatHeader = res.headers.get("X-Proofos-Beat");
      const toolHeader = res.headers.get("X-Proofos-Tools");
      let toolCalls: Turn["toolCalls"] = [];
      if (toolHeader) {
        try {
          toolCalls = JSON.parse(decodeURIComponent(toolHeader));
        } catch {
          toolCalls = [];
        }
      }
      setConsulting(false);

      let running: Turn[] = [
        ...withCandidate,
        {
          role: "counterpart",
          text: "",
          at: Date.now(),
          beats: beatHeader ? [Number(beatHeader)] : undefined,
          toolCalls,
        },
      ];
      onTurns(running);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        running = [...running.slice(0, -1), { ...running[running.length - 1], text }];
        onTurns(running);
      }
    } catch {
      onTurns([
        ...withCandidate,
        {
          role: "counterpart",
          text: "_I've dropped off for a moment. Carry on without me — working alone is a real choice here._",
          at: Date.now(),
        },
      ]);
    } finally {
      setConsulting(false);
      setBusy(false);
    }
  }

  const asked = turns.filter((t) => t.role === "candidate").length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Identity ------------------------------------------------------- */}
      <div className="flex items-center gap-2.5 border-b border-edge-soft bg-deep px-4 py-3">
        <span
          className="relative flex h-8 w-8 items-center justify-center rounded-xl text-on-signal"
          style={{
            background: "linear-gradient(135deg,var(--color-signal),var(--color-violet))",
          }}
          aria-hidden="true"
        >
          <Sparkles size={15} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-deep bg-proof" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight">Your AI teammate</p>
          <p className="text-[11px] text-dim">
            {busy ? "working…" : "ready"} · {asked} {asked === 1 ? "message" : "messages"}
          </p>
        </div>
      </div>

      {/* Conversation --------------------------------------------------- */}
      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="rounded-xl border border-edge-soft bg-deep p-4">
            <p className="text-[13px] font-medium">Treat them like a colleague.</p>
            <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-muted">
              <li>They can look things up. Ask what they checked.</li>
              <li>If the reasoning does not add up, say so.</li>
              <li>Ignoring them and working alone is a real choice.</li>
            </ul>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i}>
            {turn.role === "candidate" ? (
              <div className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-signal px-3.5 py-2.5 text-[13.5px] leading-relaxed text-on-signal">
                  {turn.text}
                </p>
              </div>
            ) : (
              <div className="max-w-[92%]">
                {turn.toolCalls && turn.toolCalls.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-wider text-dim">
                      <Search size={10} aria-hidden="true" />
                      opened
                    </span>
                    {turn.toolCalls.map((c, j) => (
                      <span key={j} className="badge badge-data text-[10px]">
                        {niceToolName(c.name)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="rounded-2xl rounded-bl-md border border-edge-soft bg-deep px-3.5 py-3">
                  {turn.text ? (
                    <Markdown text={turn.text} className="text-[13.5px]" />
                  ) : (
                    <span className="thinking text-[13px]">writing…</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {consulting && (
          <div className="flex items-center gap-2 text-[12.5px] text-dim">
            <Search size={13} className="animate-pulse" aria-hidden="true" />
            <span className="thinking">looking things up…</span>
          </div>
        )}
      </div>

      {/* Composer ------------------------------------------------------- */}
      <div className="border-t border-edge-soft p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Ask a question, or push back…"
            aria-label="Message your AI teammate"
            className="field resize-none text-[13.5px]"
          />
          <Button
            onClick={() => void send()}
            disabled={!draft.trim()}
            loading={busy}
            loadingLabel=""
            className="h-[48px] px-3.5"
            aria-label="Send"
          >
            <CornerDownLeft size={16} />
          </Button>
        </div>
        <p className="mt-2 truncate text-[10.5px] text-dim">
          They can open: {challenge.tools.map((t) => niceToolName(t.name)).join(", ") || "nothing"}
        </p>
      </div>
    </div>
  );
}
