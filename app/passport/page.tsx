"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { CalibrationPlot } from "@/components/calibration-plot";
import { DisclosureControl } from "@/components/disclosure-control";
import { ProofGraph } from "@/components/proof-graph";
import {
  DIMENSION_BLURB,
  DIMENSION_LABEL,
  type Dimension,
  type Passport,
  type SessionResult,
} from "@/lib/domain";
import { freshnessFor, freshnessTone, liveTrustHealth } from "@/lib/freshness";
import { FIXTURE_PASSPORTS } from "@/lib/fixtures";

interface Stored {
  result: SessionResult;
  passport: Passport;
  credential: { jwt: string; sdJwt: string; disclosureCount: number };
}

const TONE_CLASS: Record<string, string> = {
  proof: "is-proof",
  signal: "",
  caution: "is-caution",
  alert: "is-alert",
};

export default function PassportPage() {
  const [data, setData] = useState<Stored | null>(null);
  const [missing, setMissing] = useState(false);
  const [presentation, setPresentation] = useState<string | null>(null);
  const [disclosed, setDisclosed] = useState<Dimension[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = sessionStorage.getItem("proofos.result");
      if (!stored) {
        if (!cancelled) setMissing(true);
        return;
      }
      try {
        const parsed = JSON.parse(stored) as Stored;
        if (cancelled) return;
        setData(parsed);
        setPresentation(parsed.credential.sdJwt);
        setDisclosed(parsed.passport.claims.map((c) => c.dimension));
        rememberLocally(parsed.passport);
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!presentation) return;
    // A full SD-JWT is far too long for a scannable code, so the QR carries a
    // verification link and the presentation travels as a file or a paste.
    const compact = presentation.length > 1200 ? presentation.slice(0, 0) : presentation;
    QRCode.toDataURL(compact || `${window.location.origin}/verify`, {
      width: 320,
      margin: 1,
      color: { dark: "#e9edf7", light: "#0e121d" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [presentation]);

  const live = useMemo(
    () => (data ? liveTrustHealth(data.passport.claims) : null),
    [data],
  );

  if (missing) {
    return (
      <Shell>
        <h1 className="headline">No passport in this browser.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Take a proof challenge to earn one, or open a seeded passport to see what a
          finished record looks like.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/challenge" className="btn btn-primary">
            Take the challenge
          </Link>
          <Link href="/employer" className="btn btn-ghost">
            See a seeded record
          </Link>
          <Link href="/verify" className="btn btn-quiet">
            Verify a credential →
          </Link>
        </div>
        <p className="mt-8 text-[12.5px] text-dim">
          Nothing is stored on our side. A passport lives in your browser and in the signed
          credential you hold, which is the point.
        </p>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <p className="thinking text-[15px]">Opening your passport…</p>
      </Shell>
    );
  }

  const { passport, result, credential } = data;
  const unproven = passport.claims.filter((c) => c.score === null);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      {/* Headline -------------------------------------------------------- */}
      <div className="rise panel-raised relative overflow-hidden p-6 sm:p-8">
        <div className="signal-rule absolute inset-x-0 top-0 h-px" />
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1">
            <span className="eyebrow">Proof passport</span>
            <h1 className="headline mt-2">{passport.holder}</h1>
            <p className="mt-1 text-[14px] text-muted">
              {result.observations.length} observations across {passport.sessions.length}{" "}
              {passport.sessions.length === 1 ? "session" : "sessions"} ·{" "}
              {passport.claims.filter((c) => c.score !== null).length} of{" "}
              {passport.claims.length} capabilities proven
            </p>
            {result.source === "fixture" && (
              <span className="chip mt-3 border-signal-deep/50 text-signal">
                fixture mode — no API key configured
              </span>
            )}
          </div>

          <div className="flex gap-8">
            <Headline label="Trust health" value={live} hint="freshness-weighted" />
            <Headline
              label="AI judgment"
              value={passport.ajq.score}
              hint="across six facets"
            />
          </div>
        </div>

        <p className="mt-6 max-w-3xl border-t border-edge-soft pt-5 text-[15px] leading-relaxed text-bright">
          {result.narrative}
        </p>

        {result.flags.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {result.flags.map((f) => (
              <li key={f} className="flex gap-2 text-[13px] leading-relaxed text-caution">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-caution" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-6">
          {/* Proof graph ------------------------------------------------- */}
          <Panel
            title="Proof graph"
            note="Select any node. Every number resolves to the observations that produced it."
          >
            <ProofGraph
              trustHealth={live}
              dimensions={result.profile.dimensions}
              facets={result.profile.ajq.facets}
              observations={result.observations}
              observationCount={result.observations.length}
            />
          </Panel>

          {/* Calibration ------------------------------------------------- */}
          {result.calibration && result.calibration.answered > 0 && (
            <Panel title="Trust calibration">
              <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
                <CalibrationPlot result={result.calibration} />
                <div>
                  <dl className="grid grid-cols-2 gap-4">
                    <Stat
                      label="Labels correct"
                      value={`${Math.round(result.calibration.accuracy * 100)}%`}
                    />
                    <Stat
                      label="Mean trust error"
                      value={`${result.calibration.calibrationError}`}
                    />
                    <Stat
                      label="Bias"
                      value={`${result.calibration.bias > 0 ? "+" : ""}${result.calibration.bias}`}
                    />
                    <Stat
                      label="Unsafe outputs trusted"
                      value={String(result.calibration.dangerousMisses)}
                    />
                  </dl>
                  <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
                    {result.calibration.bias > 12
                      ? "You trust AI output more than the evidence warrants. That is the failure mode that ships bugs quickly and confidently."
                      : result.calibration.bias < -12
                        ? "You under-trust sound work. Safer than the alternative, but it costs you the speed the tool exists to give you."
                        : "Your confidence tracked what each output deserved, which is the whole point of the exercise."}
                  </p>
                  {result.calibration.dangerousMisses > 0 && (
                    <p className="mt-3 rounded-lg border border-alert/30 bg-alert/5 px-3 py-2.5 text-[12.5px] leading-relaxed text-alert">
                      You would have acted on {result.calibration.dangerousMisses}{" "}
                      {result.calibration.dangerousMisses === 1 ? "output" : "outputs"} that
                      cause real damage. This is weighted more heavily than any other error
                      in the set.
                    </p>
                  )}
                </div>
              </div>

              <details className="mt-5 border-t border-edge-soft pt-4">
                <summary className="cursor-pointer text-[13px] text-signal">
                  Show every item and what it actually was
                </summary>
                <ul className="mt-3 space-y-3">
                  {result.calibration.outcomes.map((o, i) => (
                    <li key={o.id} className="text-[12.5px] leading-relaxed">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="numeral text-[11px] text-dim">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className={o.labelCorrect ? "text-proof" : "text-caution"}>
                          {o.labelCorrect ? "labelled correctly" : `actually ${o.truth}`}
                        </span>
                        <span className="text-dim">
                          you trusted {o.trust}, warranted {o.idealTrust}
                        </span>
                      </div>
                      <p className="mt-1 text-muted">{o.why}</p>
                    </li>
                  ))}
                </ul>
              </details>
            </Panel>
          )}

          {/* Coaching ---------------------------------------------------- */}
          <Panel
            title="What to do about it"
            note="Every candidate gets this, whichever way the decision goes."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-[13px] font-semibold text-proof">Strengths</h3>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted">
                  {result.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-caution">Gaps</h3>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted">
                  {result.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            </div>

            <ol className="mt-6 space-y-4 border-t border-edge-soft pt-5">
              {result.coaching.map((c, i) => (
                <li key={c.title} className="flex gap-3">
                  <span className="numeral mt-0.5 text-[12px] text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[14.5px] font-medium">{c.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{c.action}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{c.why}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        {/* Sidebar ------------------------------------------------------- */}
        <div className="space-y-6">
          <Panel title="Freshness">
            <p className="text-[12.5px] leading-relaxed text-muted">
              Evidence decays. Each capability has its own half-life, because knowing how
              someone handled AI tooling eighteen months ago says very little about today.
            </p>
            <ul className="mt-4 space-y-3">
              {passport.claims.map((c) => {
                const f = freshnessFor(c.dimension, c.verifiedAt);
                return (
                  <li key={c.dimension}>
                    <div className="flex items-baseline gap-2 text-[12.5px]">
                      <span>{DIMENSION_LABEL[c.dimension]}</span>
                      <span className="numeral ml-auto text-dim">
                        {Math.round(f * 100)}%
                      </span>
                    </div>
                    <div className={`meter mt-1 ${TONE_CLASS[freshnessTone(f)]}`}>
                      <span style={{ width: `${f * 100}%` }} />
                    </div>
                    <p className="mt-1 text-[10.5px] text-dim">
                      revalidate by {c.revalidateBy.slice(0, 10)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {unproven.length > 0 && (
            <Panel title="Not yet proven">
              <p className="text-[12.5px] leading-relaxed text-muted">
                No evidence was recorded for these, so no number is claimed. Each one is a
                twenty-minute exercise away from being on the record.
              </p>
              <ul className="mt-3 space-y-2">
                {unproven.map((c) => (
                  <li key={c.dimension} className="rounded-lg border border-edge-soft p-3">
                    <p className="text-[13px]">{DIMENSION_LABEL[c.dimension]}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-dim">
                      {DIMENSION_BLURB[c.dimension]}
                    </p>
                  </li>
                ))}
              </ul>
              <Link href="/employer" className="btn btn-ghost mt-4">
                Build the missing evidence
              </Link>
            </Panel>
          )}

          <Panel title="Your credential">
            <DisclosureControl
              passport={passport}
              onPresent={(p, d) => {
                setPresentation(p);
                setDisclosed(d);
              }}
            />

            {qr && (
              <div className="mt-5 border-t border-edge-soft pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt="QR code linking to the PROOFOS verifier"
                  className="mx-auto w-40 rounded-lg border border-edge"
                />
                <p className="mt-2 text-center text-[11px] text-dim">
                  Scan for the verifier. The presentation itself travels as a file.
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="btn btn-ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(presentation ?? credential.sdJwt);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied" : "Copy presentation"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  const blob = new Blob([presentation ?? credential.sdJwt], {
                    type: "application/vc+sd-jwt",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${passport.id}.sd-jwt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </button>
              <Link href="/verify" className="btn btn-quiet">
                Verify it →
              </Link>
            </div>

            <dl className="mt-5 space-y-1.5 border-t border-edge-soft pt-4 text-[11.5px] text-dim">
              <Row label="Credential" value={passport.id} />
              <Row label="Issued" value={passport.issuedAt.slice(0, 10)} />
              <Row label="Signature" value="Ed25519 · vc+sd-jwt" />
              <Row label="Disclosed" value={`${disclosed.length}/${passport.claims.length}`} />
              <Row label="Evidence root" value={passport.evidenceRoot.slice(0, 16)} />
              <Row label="Status index" value={String(passport.statusIndex)} />
            </dl>

            <button
              className="btn btn-quiet mt-4 px-0 text-[12px] text-alert"
              onClick={async () => {
                await fetch("/api/revoke", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    statusIndex: passport.statusIndex,
                    restore: revoked,
                  }),
                });
                setRevoked(!revoked);
              }}
            >
              {revoked ? "Restore this credential" : "Revoke this credential"}
            </button>
            <p className="mt-1 text-[11px] leading-relaxed text-dim">
              Revoking flips one bit in the public status list. The signature stays valid —
              that is how signatures work — and every verifier that checks the list sees it
              withdrawn.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Headline({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null;
  hint: string;
}) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="numeral mt-1 text-[52px] leading-none text-bright">
        {value ?? "—"}
      </div>
      <div className="mt-1 text-[11.5px] text-dim">{hint}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] leading-snug text-dim">{label}</dt>
      <dd className="numeral mt-0.5 text-[22px] text-bright">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="truncate font-mono">{value}</dd>
    </div>
  );
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-5 sm:p-6">
      <span className="eyebrow">{title}</span>
      {note && <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-5 py-16">{children}</div>;
}

/** Kept in this browser only, so the employer console has something to rank. */
function rememberLocally(passport: Passport) {
  try {
    const pool = JSON.parse(localStorage.getItem("proofos.pool") ?? "[]") as Passport[];
    if (pool.some((p) => p.id === passport.id)) return;
    const seeded = new Set(FIXTURE_PASSPORTS.map((p) => p.id));
    const kept = pool.filter((p) => p?.id && !seeded.has(p.id));
    localStorage.setItem("proofos.pool", JSON.stringify([passport, ...kept].slice(0, 12)));
  } catch {
    /* a blocked or full store is not worth interrupting anyone over */
  }
}
