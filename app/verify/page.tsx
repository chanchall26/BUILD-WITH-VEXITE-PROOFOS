"use client";

import {
  BadgeCheck,
  FileWarning,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { SkillIcon } from "@/components/visuals/skill-meta";
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
  const toast = useToast();

  async function verify(value: string) {
    setBusy(true);
    setOutcome(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });
      const data = (await res.json()) as Outcome;
      setOutcome(data);
      toast.show(
        data.valid ? (data.revoked ? "Real, but withdrawn" : "Checked — it's real") : "Not valid",
        data.valid && !data.revoked ? "success" : "error",
      );
    } catch {
      setOutcome({ valid: false, reason: "We couldn't reach the checker. Try again." });
      toast.show("Couldn't reach the checker", "error");
    } finally {
      setBusy(false);
    }
  }

  function loadMine() {
    const stored = sessionStorage.getItem("proofos.result");
    if (!stored) return toast.show("No results saved in this browser", "error");
    try {
      const parsed = JSON.parse(stored) as { credential: { sdJwt: string } };
      setToken(parsed.credential.sdJwt);
      void verify(parsed.credential.sdJwt);
    } catch {
      toast.show("Couldn't read your saved results", "error");
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

  const state = !outcome
    ? null
    : !outcome.valid
      ? "invalid"
      : outcome.revoked
        ? "revoked"
        : "valid";

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <PageHeader
        back={{ href: "/", label: "Back to home" }}
        crumbs={[{ label: "Home", href: "/" }, { label: "Check a passport" }]}
        eyebrow="Check a passport"
        title="Is this real, and has it been changed?"
        description="Paste someone's results. We check the signature and answer in milliseconds. No account, and we keep no record that you checked."
      />

      {/* Input ------------------------------------------------------------ */}
      <Card raised className="mt-8 p-5 sm:p-6">
        <label htmlFor="token" className="label">
          Paste the results code
        </label>
        <textarea
          id="token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder="Paste the long code someone sent you…"
          className="field resize-none break-all font-mono text-[11.5px] leading-relaxed"
        />

        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button
            size="lg"
            loading={busy}
            loadingLabel="Checking…"
            disabled={!token.trim()}
            onClick={() => void verify(token)}
            icon={<ScanLine size={17} />}
          >
            Check it
          </Button>
          <Button variant="outline" onClick={loadMine}>
            Use my own results
          </Button>
          <Button variant="ghost" disabled={!token} onClick={tamper}>
            Change one character
          </Button>
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-dim">
          Try that last button. It changes a single character and the check fails instantly.
          That is what stops anyone editing their scores.
        </p>
      </Card>

      {/* Result ----------------------------------------------------------- */}
      {!outcome && !busy && (
        <EmptyState
          className="mt-6"
          icon={<ShieldCheck size={26} />}
          title="Nothing checked yet"
          description="Paste a code above, or press “Use my own results” if you have taken the test in this browser."
        />
      )}

      {outcome && (
        <div className="pop-in mt-6">
          <Card
            raised
            className="overflow-hidden"
            accent={
              state === "valid"
                ? "var(--color-proof)"
                : state === "revoked"
                  ? "var(--color-caution)"
                  : "var(--color-alert)"
            }
          >
            <div className="flex items-start gap-4 p-6">
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                  state === "valid"
                    ? "bg-proof/12 text-proof"
                    : state === "revoked"
                      ? "bg-caution/12 text-caution"
                      : "bg-alert/12 text-alert"
                }`}
                aria-hidden="true"
              >
                {state === "valid" ? (
                  <ShieldCheck size={26} />
                ) : state === "revoked" ? (
                  <ShieldAlert size={26} />
                ) : (
                  <ShieldX size={26} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={`title ${
                    state === "valid"
                      ? "text-proof"
                      : state === "revoked"
                        ? "text-caution"
                        : "text-alert"
                  }`}
                >
                  {state === "valid"
                    ? "Real and unchanged"
                    : state === "revoked"
                      ? "Real, but withdrawn"
                      : "Not valid"}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  {state === "valid"
                    ? `Checked in ${outcome.ms ?? 0}ms without contacting anyone.`
                    : state === "revoked"
                      ? "Whoever issued these results has withdrawn them. Do not rely on them."
                      : outcome.reason}
                </p>
              </div>
            </div>

            {outcome.valid && (
              <>
                <dl className="grid grid-cols-2 gap-px border-y border-edge-soft bg-edge-soft sm:grid-cols-4">
                  {[
                    { label: "Name", value: outcome.holder ?? "—" },
                    { label: "Proof recorded", value: String(outcome.observationCount ?? 0) },
                    { label: "Tests taken", value: String(outcome.sessionCount ?? 0) },
                    { label: "Kept private", value: String(outcome.withheld ?? 0) },
                  ].map((f) => (
                    <div key={f.label} className="bg-slab px-4 py-3.5">
                      <dt className="text-[10.5px] font-medium uppercase tracking-wider text-dim">
                        {f.label}
                      </dt>
                      <dd className="mt-1 truncate text-[14px] font-semibold">{f.value}</dd>
                    </div>
                  ))}
                </dl>

                {claims.length > 0 && (
                  <div className="p-6">
                    <p className="eyebrow">Skills they chose to show</p>
                    <ul className="mt-3 space-y-2.5">
                      {claims.map((c) => {
                        const dim = c.dimension as Dimension;
                        const fresh = freshnessFor(dim, c.verifiedAt);
                        return (
                          <li key={c.dimension} className="flex items-center gap-3">
                            <SkillIcon dimension={dim} size={14} />
                            <span className="flex-1 text-[13.5px]">{DIMENSION_LABEL[dim]}</span>
                            <span className="numeral text-[14px] font-semibold text-signal">
                              {c.score ?? "—"}
                            </span>
                            <span className="badge text-[10px]">
                              {Math.round(fresh * 100)}% fresh
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {(outcome.withheld ?? 0) > 0 && (
                  <p className="mx-6 mb-6 rounded-xl border border-edge-soft bg-deep px-4 py-3 text-[12.5px] leading-relaxed text-muted">
                    They kept {outcome.withheld} other{" "}
                    {outcome.withheld === 1 ? "score" : "scores"} private. You can tell
                    something was held back, but not what. Applying for one job should not
                    mean handing over everything.
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* What this proves -------------------------------------------------- */}
      <Card className="mt-6 p-6">
        <p className="eyebrow">What this check proves</p>
        <ul className="mt-3.5 space-y-3">
          {[
            {
              ok: true,
              icon: BadgeCheck,
              text: "We issued exactly these scores, and nobody has edited them since.",
            },
            {
              ok: true,
              icon: ShieldCheck,
              text: "How much proof sits behind them. That count cannot be hidden.",
            },
            {
              ok: false,
              icon: FileWarning,
              text: "It does not prove the sender is the person who earned it. That is a different problem, and we will not pretend we have solved it.",
            },
          ].map((r) => {
            const Icon = r.icon;
            return (
              <li key={r.text} className="flex gap-3 text-[13.5px] leading-relaxed text-muted">
                <Icon
                  size={16}
                  className={`mt-0.5 shrink-0 ${r.ok ? "text-proof" : "text-caution"}`}
                  aria-hidden="true"
                />
                {r.text}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex items-center gap-1.5 border-t border-edge-soft pt-4 text-[12px] text-dim">
          <Sparkles size={12} aria-hidden="true" />
          Anyone can download{" "}
          <a
            href="/.well-known/did.json"
            className="font-medium text-signal underline underline-offset-2"
          >
            our public key
          </a>{" "}
          and run this check themselves, forever, without us.
        </p>
      </Card>
    </div>
  );
}
