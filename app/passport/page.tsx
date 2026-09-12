"use client";

import {
  Award,
  CircleCheck,
  Copy,
  Download,
  Lightbulb,
  PartyPopper,
  ScanLine,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { BackLink, PageHeader } from "@/components/layout/page-header";
import { AjqRadar } from "@/components/ajq-radar";
import { CalibrationPlot } from "@/components/calibration-plot";
import { DisclosureControl } from "@/components/disclosure-control";
import { SkillCard } from "@/components/results/skill-card";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { SkillIcon } from "@/components/visuals/skill-meta";
import {
  DIMENSION_LABEL,
  type Dimension,
  type Passport,
  type SessionResult,
} from "@/lib/domain";
import { FIXTURE_PASSPORTS } from "@/lib/fixtures";
import { freshnessFor, freshnessTone, liveTrustHealth } from "@/lib/freshness";
import { cn } from "@/lib/utils";

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
  const [revoked, setRevoked] = useState(false);
  const toast = useToast();

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
    // Black on white in both themes. Scanners cope badly with inverted codes.
    QRCode.toDataURL(`${window.location.origin}/verify`, {
      width: 320,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(setQr)
      .catch(() => setQr(null));
  }, [presentation]);

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader back={{ href: "/", label: "Back to home" }} title="No results here yet" />
        <EmptyState
          className="mt-8"
          icon={<Award size={26} />}
          title="You haven't taken the test in this browser"
          description="Take it once and your results appear here. Nothing is stored on our side, so they live in your browser and in the code you keep."
          action={
            <Link href="/challenge" className={buttonStyles({ size: "lg" })}>
              Take the test
            </Link>
          }
          secondary={
            <Link href="/employer" className={buttonStyles({ variant: "outline" })}>
              See an example
            </Link>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        {/* A loading screen still needs a way out. */}
        <BackLink href="/" label="Back to home" />
        <Skeleton className="mt-6 h-9 w-56" />
        <Skeleton className="mt-6 h-44 w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
        <p className="sr-only" role="status">
          Opening your results
        </p>
      </div>
    );
  }

  const { passport, result, credential } = data;
  const health = liveTrustHealth(passport.claims);
  const proven = passport.claims.filter((c) => c.score !== null).length;
  const unproven = passport.claims.filter((c) => c.score === null);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        back={{ href: "/challenge", label: "Back to the test" }}
        crumbs={[{ label: "Home", href: "/" }, { label: "My results" }]}
        eyebrow="Your results"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {passport.holder}
            <span className="badge badge-proof">
              <PartyPopper size={12} aria-hidden="true" />
              Test complete
            </span>
          </span>
        }
      />

      {/* Headline --------------------------------------------------------- */}
      <Card raised className="rise rise-1 mt-7 overflow-hidden">
        <div className="mesh absolute inset-0 -z-10" aria-hidden="true" />
        <div className="flex flex-col items-center gap-7 p-7 sm:flex-row sm:p-8">
          <ProgressRing
            value={health}
            size={132}
            label="trust score"
            colour="var(--color-signal)"
          />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="measure-wide text-[16px] leading-relaxed">{result.narrative}</p>

            <div className="mt-5 flex flex-wrap justify-center gap-6 sm:justify-start">
              {[
                { label: "Skills proven", value: `${proven}/6` },
                { label: "Moments recorded", value: String(result.observations.length) },
                {
                  label: "AI judgment",
                  value: passport.ajq.score === null ? "—" : String(passport.ajq.score),
                },
              ].map((s) => (
                <div key={s.label}>
                  <p className="numeral text-[22px] font-bold leading-none">{s.value}</p>
                  <p className="mt-1 text-[11.5px] text-dim">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {result.flags.length > 0 && (
          <ul className="space-y-1.5 border-t border-edge-soft bg-caution/[0.05] px-7 py-4">
            {result.flags.map((f) => (
              <li key={f} className="flex gap-2 text-[13px] leading-relaxed text-caution">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-caution" />
                {f}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Six skills ------------------------------------------------------- */}
      <section className="mt-10">
        <h2 className="title">Your six skills</h2>
        <p className="measure-wide mt-1.5 text-[14px] text-muted">
          Every score comes from recorded moments. Open any card to read them.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.profile.dimensions.map((d, i) => (
            <SkillCard
              key={d.dimension}
              score={d}
              verifiedAt={passport.issuedAt}
              observations={result.observations}
              index={i}
            />
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          {/* Trust quiz -------------------------------------------------- */}
          {result.calibration && result.calibration.answered > 0 && (
            <Card className="p-6">
              <h2 className="title">Your trust quiz</h2>
              <p className="mt-1.5 text-[13.5px] text-muted">
                Did your confidence match what each answer actually deserved?
              </p>

              <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr]">
                <CalibrationPlot result={result.calibration} />
                <div>
                  <dl className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: "Labels right",
                        value: `${Math.round(result.calibration.accuracy * 100)}%`,
                      },
                      { label: "Average error", value: String(result.calibration.calibrationError) },
                      {
                        label: "Bias",
                        value: `${result.calibration.bias > 0 ? "+" : ""}${result.calibration.bias}`,
                      },
                      {
                        label: "Unsafe trusted",
                        value: String(result.calibration.dangerousMisses),
                      },
                    ].map((s) => (
                      <div key={s.label}>
                        <dt className="text-[11px] text-dim">{s.label}</dt>
                        <dd className="numeral mt-0.5 text-[20px] font-bold">{s.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
                    {result.calibration.bias > 12
                      ? "You trust AI more than the evidence justifies. That is the habit that ships bugs quickly and confidently."
                      : result.calibration.bias < -12
                        ? "You under-trust good work. Safer than the opposite, but it costs you the speed the tool exists for."
                        : "Your confidence tracked reality. That is exactly the point of the exercise."}
                  </p>

                  {result.calibration.dangerousMisses > 0 && (
                    <p className="mt-3 rounded-xl border border-alert/30 bg-alert/5 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-alert">
                      You would have acted on {result.calibration.dangerousMisses} answer
                      {result.calibration.dangerousMisses === 1 ? "" : "s"} that cause real
                      damage. This counts more than any other mistake in the set.
                    </p>
                  )}
                </div>
              </div>

              <details className="mt-5 border-t border-edge-soft pt-4">
                <summary className="cursor-pointer text-[13px] font-medium text-signal">
                  Show every question and what it really was
                </summary>
                <ul className="mt-3 space-y-3">
                  {result.calibration.outcomes.map((o, i) => (
                    <li key={o.id} className="text-[12.5px] leading-relaxed">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="numeral text-[11px] text-dim">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className={o.labelCorrect ? "text-proof" : "text-caution"}>
                          {o.labelCorrect ? "you got it right" : `actually ${o.truth}`}
                        </span>
                        <span className="text-dim">
                          you trusted {o.trust}, it deserved {o.idealTrust}
                        </span>
                      </div>
                      <p className="mt-1 text-muted">{o.why}</p>
                    </li>
                  ))}
                </ul>
              </details>
            </Card>
          )}

          {/* Coaching ---------------------------------------------------- */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-wash text-signal">
                <Lightbulb size={17} aria-hidden="true" />
              </span>
              <div>
                <h2 className="title">How to get better</h2>
                <p className="text-[12.5px] text-dim">
                  Everyone gets this, whatever the company decides.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[12.5px] font-semibold text-proof">What went well</p>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted">
                  {result.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[12.5px] font-semibold text-caution">What to work on</p>
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
                  <span className="numeral mt-0.5 shrink-0 text-[12px] font-bold text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[14.5px] font-semibold">{c.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{c.action}</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{c.why}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Sidebar -------------------------------------------------------- */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="title">AI judgment, in parts</h2>
            <p className="mt-1 text-[12.5px] text-dim">
              One number hides the lopsided cases, which are the interesting ones.
            </p>
            <div className="mt-4">
              <AjqRadar facets={result.profile.ajq.facets} />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="title">How fresh this is</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
              Proof fades. Each skill fades at its own speed.
            </p>
            <ul className="mt-4 space-y-3">
              {passport.claims.map((c) => {
                const f = freshnessFor(c.dimension, c.verifiedAt);
                return (
                  <li key={c.dimension}>
                    <div className="flex items-center gap-2 text-[12.5px]">
                      <SkillIcon dimension={c.dimension} size={11} tile={false} />
                      <span className="truncate">{DIMENSION_LABEL[c.dimension]}</span>
                      <span className="numeral ml-auto text-dim">
                        {Math.round(f * 100)}%
                      </span>
                    </div>
                    <div className={cn("meter mt-1 h-1", TONE_CLASS[freshnessTone(f)])}>
                      <span style={{ width: `${f * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {unproven.length > 0 && (
            <Card className="p-6">
              <h2 className="title">Not shown yet</h2>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                Nothing in this test showed these, so we give no number. Each is a
                twenty-minute exercise away.
              </p>
              <ul className="mt-3 space-y-2">
                {unproven.map((c) => (
                  <li
                    key={c.dimension}
                    className="flex items-center gap-2.5 rounded-xl border border-edge-soft p-3"
                  >
                    <SkillIcon dimension={c.dimension} size={13} />
                    <span className="text-[13px]">{DIMENSION_LABEL[c.dimension]}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Share ------------------------------------------------------- */}
          <Card raised className="p-6">
            <h2 className="title">Share your results</h2>
            <div className="mt-4">
              <DisclosureControl
                passport={passport}
                onPresent={(p, d) => {
                  setPresentation(p);
                  setDisclosed(d);
                  toast.show("Shareable version ready");
                }}
              />
            </div>

            {qr && (
              <div className="mt-5 border-t border-edge-soft pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt="QR code linking to the PROOFOS checker"
                  className="mx-auto w-36 rounded-xl border border-edge bg-white p-1.5"
                />
                <p className="mt-2 text-center text-[11px] text-dim">
                  Scan to open the checker
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Copy size={14} />}
                onClick={async () => {
                  await navigator.clipboard.writeText(presentation ?? credential.sdJwt);
                  toast.show("Copied to your clipboard");
                }}
              >
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={14} />}
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
                  toast.show("Downloaded");
                }}
              >
                Download
              </Button>
              <Link
                href="/verify"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
              >
                <ScanLine size={14} />
                Check it
              </Link>
            </div>

            <dl className="mt-5 space-y-1.5 border-t border-edge-soft pt-4 text-[11.5px] text-dim">
              {[
                ["Shared", `${disclosed.length}/${passport.claims.length} skills`],
                ["Issued", passport.issuedAt.slice(0, 10)],
                ["Signature", "Ed25519"],
                ["ID", passport.id],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt>{k}</dt>
                  <dd className="truncate font-mono">{v}</dd>
                </div>
              ))}
            </dl>

            <button
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-alert transition-opacity hover:opacity-75"
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
                toast.show(revoked ? "Results restored" : "Results withdrawn");
              }}
            >
              {revoked ? <Undo2 size={13} /> : <CircleCheck size={13} />}
              {revoked ? "Put these back" : "Withdraw these results"}
            </button>
            <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
              Withdrawing does not delete copies people already have. Anyone who checks is
              told they were pulled.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Kept in this browser only, so the employer view has something to show. */
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
