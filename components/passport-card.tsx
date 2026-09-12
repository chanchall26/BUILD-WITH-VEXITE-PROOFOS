import { DIMENSION_LABEL, type Passport } from "@/lib/domain";
import { freshnessFor, freshnessTone, liveTrustHealth } from "@/lib/freshness";
import { Mark } from "./mark";

/**
 * A passport, rendered as the object it is meant to feel like.
 *
 * This exists because "evidence-backed portable credential" is an abstraction
 * until somebody sees one. It shows the whole argument at a glance: a headline
 * number, six capabilities with the evidence count that earned each, a freshness
 * reading, and at least one capability sitting at "unproven" so the honesty of
 * the thing is visible rather than claimed.
 */

const TONE_CLASS: Record<string, string> = {
  proof: "is-proof",
  signal: "",
  caution: "is-caution",
  alert: "is-alert",
};

export function PassportCard({
  passport,
  at,
  compact = false,
}: {
  passport: Passport;
  /** Fixed timestamp so a server-rendered card cannot drift from the client. */
  at: number;
  compact?: boolean;
}) {
  const health = liveTrustHealth(passport.claims, at);
  const claims = compact ? passport.claims.slice(0, 4) : passport.claims;

  return (
    <div className="panel-raised relative overflow-hidden">
      <div className="signal-rule absolute inset-x-0 top-0 h-px" />

      <div className="flex items-start gap-4 p-5 pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Mark size={17} />
            <span className="eyebrow">Proof passport</span>
          </div>
          <p className="mt-2 truncate text-[17px] font-semibold tracking-[-0.02em]">
            {passport.holder}
          </p>
          <p className="mt-0.5 text-[12px] text-dim">
            {passport.observationCount} observations ·{" "}
            {passport.claims.filter((c) => c.score !== null).length} of{" "}
            {passport.claims.length} proven
          </p>
        </div>

        <div className="text-right">
          <div className="numeral text-[38px] leading-none text-bright">
            {health ?? "—"}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-dim">
            trust health
          </div>
        </div>
      </div>

      <ul className="space-y-2.5 px-5 pb-4">
        {claims.map((c) => {
          const fresh = freshnessFor(c.dimension, c.verifiedAt, at);
          return (
            <li key={c.dimension}>
              <div className="flex items-baseline gap-2 text-[12.5px]">
                <span className={c.score === null ? "text-dim" : "text-muted"}>
                  {DIMENSION_LABEL[c.dimension]}
                </span>
                <span
                  className={`numeral ml-auto ${c.score === null ? "text-[10.5px] uppercase tracking-wider text-dim" : "text-signal"}`}
                >
                  {c.score ?? "unproven"}
                </span>
              </div>
              <div className={`meter mt-1 ${TONE_CLASS[freshnessTone(fresh)]}`}>
                <span
                  style={{ width: c.score === null ? "0%" : `${c.score}%` }}
                  className={c.score === null ? "opacity-0" : ""}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-edge-soft px-5 py-3 text-[10.5px] text-dim">
        <span className="inline-flex items-center gap-1.5 text-proof">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-proof" />
          Ed25519 signed
        </span>
        <span>selective disclosure</span>
        <span>revocable</span>
        <span className="ml-auto font-mono">{passport.id}</span>
      </div>
    </div>
  );
}
