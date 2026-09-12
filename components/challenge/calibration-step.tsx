"use client";

import { useEffect, useState } from "react";
import {
  TRUTH_LABEL,
  type CalibrationAnswer,
  type CalibrationItem,
  type Domain,
  type TruthLabel,
} from "@/lib/domain";

/**
 * Trust calibration.
 *
 * Ten AI outputs. For each, two answers: what it is, and how far you would act
 * on it. Both are needed, because they measure different things — knowing an
 * output is wrong and still acting on it is a different failure from not
 * knowing.
 *
 * The answer key is never sent to this component. It is sealed server-side and
 * travels back with the answers as an opaque blob.
 */

const LABELS: TruthLabel[] = ["correct", "partial", "wrong", "dangerous"];

const LABEL_TONE: Record<TruthLabel, string> = {
  correct: "border-proof/50 bg-proof/10 text-proof",
  partial: "border-data/50 bg-data/10 text-data",
  wrong: "border-caution/50 bg-caution/10 text-caution",
  dangerous: "border-alert/50 bg-alert/10 text-alert",
};

export function CalibrationStep({
  domain,
  situation,
  onDone,
  onSkip,
}: {
  domain: Domain;
  situation: string;
  onDone: (payload: { sealed: string; answers: CalibrationAnswer[] }) => void;
  onSkip: () => void;
}) {
  const [items, setItems] = useState<CalibrationItem[] | null>(null);
  const [sealed, setSealed] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, { label?: TruthLabel; trust: number }>>(
    {},
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/calibration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, situation: situation.slice(0, 3000) }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.items?.length) return setFailed(true);
        setItems(data.items);
        setSealed(data.sealed);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [domain, situation]);

  if (failed) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-[15px]">The calibration set could not be built.</p>
        <p className="mt-2 text-[13px] text-dim">
          Your work and your conversation are already recorded. Skipping leaves the decide
          facet with less evidence, which the passport will say.
        </p>
        <button className="btn btn-ghost mt-5" onClick={onSkip}>
          Continue without it
        </button>
      </div>
    );
  }

  if (!items) {
    return (
      <div className="panel p-10 text-center">
        <p className="thinking text-[15px]">Gemini is writing your calibration set…</p>
        <p className="mt-2 text-[13px] text-dim">
          Ten outputs from the same world you just worked in. The answer key stays on the
          server.
        </p>
      </div>
    );
  }

  const answered = Object.values(answers).filter((a) => a.label).length;

  return (
    <div>
      <div className="panel-raised p-6 sm:p-7">
        <span className="eyebrow">Trust calibration</span>
        <h2 className="headline mt-2 text-[26px]">
          Ten things an AI told someone. Which would you act on?
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted">
          Say what each output is, and how far you would act on it before checking. Being
          right is half of it. The other half is whether your confidence matched what the
          output actually deserved, which is the thing that decides whether you are safe to
          leave alone with a model.
        </p>
        <p className="mt-3 text-[12.5px] text-dim">
          Answer as many as you like and move on. Unanswered items are excluded rather than
          counted against you.
        </p>
      </div>

      <ol className="mt-5 space-y-4">
        {items.map((item, i) => {
          const current = answers[item.id] ?? { trust: 50 };
          return (
            <li key={item.id} className="panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="numeral text-[12px] text-signal">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[12px] text-dim">{item.context}</span>
                <span className="chip ml-auto">
                  AI stated {item.statedConfidence}% confidence
                </span>
              </div>

              <p className="mt-3 border-l-2 border-edge pl-3 text-[14px] leading-relaxed text-bright">
                {item.claim}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {LABELS.map((label) => (
                  <button
                    key={label}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, [item.id]: { ...current, label } }))
                    }
                    aria-pressed={current.label === label}
                    className={`rounded-lg border px-3 py-1.5 text-[12.5px] transition-colors ${
                      current.label === label
                        ? LABEL_TONE[label]
                        : "border-edge text-muted hover:border-[#2b3457] hover:text-bright"
                    }`}
                  >
                    {TRUTH_LABEL[label]}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <label
                  className="flex items-center gap-3 text-[12.5px] text-muted"
                  htmlFor={`trust-${item.id}`}
                >
                  <span className="w-[112px] shrink-0">How far you&apos;d act on it</span>
                  <input
                    id={`trust-${item.id}`}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={current.trust}
                    onChange={(e) =>
                      setAnswers((a) => ({
                        ...a,
                        [item.id]: { ...current, trust: Number(e.target.value) },
                      }))
                    }
                    className="h-1 flex-1 cursor-pointer accent-[#7189ff]"
                  />
                  <span className="numeral w-9 text-right text-bright">{current.trust}</span>
                </label>
                <p className="mt-1 pl-[124px] text-[11px] text-dim">
                  0 means you would verify everything first. 100 means you would ship it.
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-4 mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-slab/95 p-4 backdrop-blur">
        <span className="text-[13px] text-muted">
          {answered} of {items.length} judged
        </span>
        <button
          className="btn btn-primary ml-auto"
          disabled={answered === 0}
          onClick={() =>
            onDone({
              sealed,
              answers: Object.entries(answers)
                .filter(([, a]) => a.label)
                .map(([id, a]) => ({ id, label: a.label as TruthLabel, trust: a.trust })),
            })
          }
        >
          Continue to the defence
        </button>
        <button className="btn btn-quiet" onClick={onSkip}>
          Skip this section
        </button>
      </div>
    </div>
  );
}
