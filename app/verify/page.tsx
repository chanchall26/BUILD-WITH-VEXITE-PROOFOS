"use client";

import { useState } from "react";
import { DIMENSION_LABEL, type Dimension, type PassportClaim } from "@/lib/domain";
import { freshnessFor } from "@/lib/freshness";

interface Outcome {
  valid: boolean;
  holder?: string;
  passportId?: string;
  issuer?: string;
  issuedAt?: string;
  evidenceRoot?: string;
  observationCount?: number;
  sessionCount?: number;
  revoked?: boolean;
  disclosed?: { name: string; value: unknown }[];
  withheld?: number;
  reason?: string;
  ms?: number;
}

export default function VerifyPage() {
  const [token, setToken] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify(value: string) {
    setBusy(true);
    setOutcome(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      setOutcome(await res.json());
    } catch {
      setOutcome({ valid: false, reason: "Verifier unreachable." });
    } finally {
      setBusy(false);
    }
  }

  function loadMine() {
    const stored = sessionStorage.getItem("proofos.result");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { credential: { sdJwt: string } };
      setToken(parsed.credential.sdJwt);
      void verify(parsed.credential.sdJwt);
    } catch {
      /* nothing to load */
    }
  }

  function tamper() {
    const [jwt, ...rest] = token.split("~").filter(Boolean);
    const parts = jwt?.split(".");
    if (!parts || parts.length !== 3) return;
    const body = parts[1];
    const at = Math.floor(body.length / 2);
    const swapped = body[at] === "A" ? "B" : "A";
    const altered =
      [`${parts[0]}.${body.slice(0, at)}${swapped}${body.slice(at + 1)}.${parts[2]}`, ...rest].join(
        "~",
      ) + "~";
    setToken(altered);
    void verify(altered);
  }

  const claims = (outcome?.disclosed ?? [])
    .filter((d) => d.name.startsWith("claim:"))
    .map((d) => d.value as PassportClaim);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <span className="eyebrow">Check a result</span>
      <h1 className="headline mt-3">Is this real, and has it been changed?</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-muted">
        Paste someone&apos;s results below. We check the digital signature and tell you
        straight away. You do not need an account, we do not look anything up, and we do not
        keep a record that you checked.
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-dim">
        Anyone can download{" "}
        <a href="/.well-known/did.json" className="text-signal underline underline-offset-2">
          our public key
        </a>{" "}
        once and do this check themselves, forever, without us.
      </p>

      <textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        rows={7}
        spellCheck={false}
        placeholder="Paste the long code someone sent you…"
        aria-label="Results code to check"
        className="field mt-7 resize-none break-all font-mono text-[11.5px] leading-relaxed"
      />

      <div className="mt-3 flex flex-wrap gap-2.5">
        <button
          className="btn btn-primary btn-lg"
          disabled={busy || !token.trim()}
          onClick={() => void verify(token)}
        >
          {busy ? "Checking…" : "Check it"}
        </button>
        <button className="btn btn-ghost" onClick={loadMine}>
          Use my own results
        </button>
        <button className="btn btn-ghost" disabled={!token} onClick={tamper}>
          Change one character
        </button>
      </div>
      <p className="mt-2 text-[12.5px] text-dim">
        Try the last button. It changes a single character, and the check fails instantly.
        That is what stops anyone editing their scores.
      </p>

      {outcome && (
        <div
          className={`rise panel mt-7 border p-6 ${
            outcome.valid
              ? outcome.revoked
                ? "border-caution/50"
                : "border-proof/40"
              : "border-alert/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[15px] font-bold ${
                outcome.valid
                  ? outcome.revoked
                    ? "bg-caution/15 text-caution"
                    : "bg-proof/15 text-proof"
                  : "bg-alert/15 text-alert"
              }`}
              aria-hidden="true"
            >
              {outcome.valid ? (outcome.revoked ? "!" : "✓") : "✕"}
            </span>
            <div>
              <p
                className={`text-[16px] font-semibold ${
                  outcome.valid
                    ? outcome.revoked
                      ? "text-caution"
                      : "text-proof"
                    : "text-alert"
                }`}
              >
                {outcome.valid
                  ? outcome.revoked
                    ? "Real, but withdrawn"
                    : "Real and unchanged"
                  : "Not valid"}
              </p>
              <p className="text-[12.5px] text-dim">
                {outcome.valid
                  ? outcome.revoked
                    ? "These results were withdrawn by whoever issued them. Do not rely on them."
                    : `Checked in ${outcome.ms ?? 0}ms, without contacting anyone.`
                  : outcome.reason}
              </p>
            </div>
          </div>

          {outcome.valid && (
            <>
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-edge-soft pt-5 text-[13px] sm:grid-cols-4">
                <Field label="Name" value={outcome.holder ?? "—"} />
                <Field label="Moments recorded" value={String(outcome.observationCount ?? 0)} />
                <Field label="Tests taken" value={String(outcome.sessionCount ?? 0)} />
                <Field label="Kept private" value={String(outcome.withheld ?? 0)} />
              </dl>

              {claims.length > 0 && (
                <div className="mt-5 border-t border-edge-soft pt-5">
                  <span className="eyebrow">Skills they chose to show</span>
                  <ul className="mt-3 space-y-2.5">
                    {claims.map((c) => {
                      const f = freshnessFor(c.dimension as Dimension, c.verifiedAt);
                      return (
                        <li key={c.dimension} className="flex items-baseline gap-3 text-[13px]">
                          <span>{DIMENSION_LABEL[c.dimension as Dimension]}</span>
                          <span className="numeral ml-auto text-signal">
                            {c.score ?? "unproven"}
                          </span>
                          <span className="numeral w-16 text-right text-dim">
                            {Math.round(f * 100)}% fresh
                          </span>
                          <span className="numeral w-20 text-right text-dim">
                            {c.evidence} obs
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {(outcome.withheld ?? 0) > 0 && (
                <p className="mt-4 rounded-lg border border-edge-soft bg-deep px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted">
                  They kept {outcome.withheld} other{" "}
                  {outcome.withheld === 1 ? "score" : "scores"} private. You can tell
                  something was held back, but not what it was. That is by design: applying
                  for one job should not mean handing over everything.
                </p>
              )}

              <dl className="mt-5 space-y-1.5 border-t border-edge-soft pt-4 font-mono text-[11px] text-dim">
                <Row label="issuer" value={outcome.issuer ?? "—"} />
                <Row label="credential" value={outcome.passportId ?? "—"} />
                <Row label="issued" value={(outcome.issuedAt ?? "").slice(0, 19)} />
                <Row label="evidence root" value={outcome.evidenceRoot ?? "—"} />
              </dl>
            </>
          )}
        </div>
      )}

      <div className="panel mt-8 p-5">
        <span className="eyebrow">What this check does and does not prove</span>
        <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-muted">
          <li className="flex gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-proof" />
            It proves we issued exactly these scores, and that nobody has edited them since.
          </li>
          <li className="flex gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-proof" />
            It proves how much evidence sits behind them, because that count cannot be
            hidden.
          </li>
          <li className="flex gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-alert" />
            It does not prove the person who sent it is the person who earned it. That is a
            different problem, and we are not going to pretend we have solved it.
          </li>
        </ul>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-dim">{label}</dt>
      <dd className="mt-0.5 truncate text-bright">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
