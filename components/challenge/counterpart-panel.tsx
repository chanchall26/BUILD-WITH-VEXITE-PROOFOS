"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/markdown";
import type { ChallengeSpec, Turn } from "@/lib/domain";

/**
 * The AI counterpart panel.
 *
 * The tool strip above each reply is the important part of this component. It
 * shows what the counterpart went and looked at before answering, which means
 * a candidate can see that it consulted the database metrics and never opened
 * the endpoint latency. Everything the assessment measures is visible to the
 * person being assessed while it is happening.
 */
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
      if (!res.ok || !res.body) throw new Error("counterpart unavailable");

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
          text: "_I've dropped off for a moment. Carry on without me — working the problem alone is a legitimate way to do this._",
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
      <div className="flex items-center gap-2 border-b border-edge-soft px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-signal" />
        <span className="text-[12.5px] font-medium">AI teammate</span>
        <span className="ml-auto text-[11px] text-dim">
          {asked} {asked === 1 ? "message" : "messages"}
        </span>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && (
          <div className="rounded-lg border border-edge-soft bg-deep p-4 text-[13px] leading-relaxed text-muted">
            <p className="mb-2 font-medium text-bright">
              Talk to them like a colleague, not a search box.
            </p>
            <p>
              They can look things up, so ask them what they checked. If the reasoning does
              not add up, say so. You can also ignore them completely and do it yourself.
              That is a real choice, and your record will say that is what you did.
            </p>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i}>
            <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-dim">
              {turn.role === "candidate" ? "You" : "Counterpart"}
            </div>

            {turn.role === "candidate" ? (
              <p className="whitespace-pre-wrap rounded-lg border border-edge-soft bg-raise p-3 text-[13.5px] leading-relaxed">
                {turn.text}
              </p>
            ) : (
              <div className="rounded-lg border border-edge-soft bg-void">
                {turn.toolCalls && turn.toolCalls.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-edge-soft px-3 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-dim">
                      they opened
                    </span>
                    {turn.toolCalls.map((c, j) => (
                      <span key={j} className="chip border-data/30 text-data">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="p-3">
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
          <p className="thinking text-[12.5px]">looking things up before answering…</p>
        )}
      </div>

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
            placeholder="Ask a question, or push back… (Ctrl+Enter to send)"
            aria-label="Message your AI teammate"
            className="field resize-none text-[13.5px]"
          />
          <button
            onClick={() => void send()}
            disabled={busy || !draft.trim()}
            className="btn btn-primary h-[46px]"
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-dim">
          They can open: {challenge.tools.map((t) => t.name).join(", ") || "nothing"}
        </p>
      </div>
    </div>
  );
}
