"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DIMENSION_LABEL,
  type Dimension,
  type Passport,
  type RoleMatch,
  type RoleSpec,
} from "@/lib/domain";
import { FIXTURE_PASSPORTS, FIXTURE_NARRATIVE, FIXTURE_ROLE_INPUT } from "@/lib/fixtures";
import { freshnessFor, freshnessTone, liveTrustHealth } from "@/lib/freshness";

interface Gap {
  title: string;
  minutes: number;
  prompt: string;
  whatItProves: string;
  successLooksLike: string[];
}

const TONE_CLASS: Record<string, string> = {
  proof: "is-proof",
  signal: "",
  caution: "is-caution",
  alert: "is-alert",
};

export default function EmployerPage() {
  const [posting, setPosting] = useState("");
  const [file, setFile] = useState<{ name: string; data: string; mimeType: string } | null>(
    null,
  );
  const [calibrate, setCalibrate] = useState(false);
  const [role, setRole] = useState<RoleSpec | null>(null);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pool, setPool] = useState<Passport[]>(FIXTURE_PASSPORTS);
  const [matches, setMatches] = useState<RoleMatch[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [gap, setGap] = useState<{ dimension: Dimension; gap: Gap } | null>(null);
  const [gapBusy, setGapBusy] = useState<Dimension | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mine = JSON.parse(localStorage.getItem("proofos.pool") ?? "[]") as Passport[];
        if (cancelled || !Array.isArray(mine) || mine.length === 0) return;
        const seeded = new Set(FIXTURE_PASSPORTS.map((p) => p.id));
        const fresh = mine.filter((p) => p?.id && !seeded.has(p.id));
        if (fresh.length) setPool([...fresh, ...FIXTURE_PASSPORTS]);
      } catch {
        /* seeded pool only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function attach(f: File | null) {
    if (!f) return setFile(null);
    if (f.size > 6_000_000) return setError("Keep the file under 6 MB.");
    const buf = await f.arrayBuffer();
    let binary = "";
    for (const b of new Uint8Array(buf)) binary += String.fromCharCode(b);
    setFile({ name: f.name, data: btoa(binary), mimeType: f.type || "application/pdf" });
    setError(null);
  }

  async function analyse() {
    setBusy(true);
    setError(null);
    setMatches([]);
    setGap(null);
    try {
      const res = await fetch("/api/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: posting.trim() || undefined,
          file: file ? { data: file.data, mimeType: file.mimeType } : undefined,
          calibrate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.role) throw new Error(data?.error ?? "Could not read the posting.");
      setRole(data.role);
      setSources(data.sources ?? []);
      await match(data.role);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function match(target: RoleSpec) {
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: target, passports: pool }),
    });
    const data = await res.json();
    setMatches(data.matches ?? []);
    setSelected(data.matches?.[0]?.passportId ?? null);
  }

  async function buildGap(dimension: Dimension) {
    if (!role) return;
    setGapBusy(dimension);
    try {
      const res = await fetch("/api/gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dimension, roleTitle: role.title }),
      });
      const data = await res.json();
      if (data.gap) setGap({ dimension, gap: data.gap });
    } finally {
      setGapBusy(null);
    }
  }

  const current = useMemo(
    () => matches.find((m) => m.passportId === selected) ?? matches[0],
    [matches, selected],
  );
  const currentPassport = pool.find((p) => p.id === current?.passportId);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <span className="eyebrow">Employer</span>
      <h1 className="headline mt-3 max-w-2xl">
        What does this role need, and who can prove it?
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Gemini reads the posting and says which six capabilities the work actually depends
        on. PROOFOS then reports how much of that each candidate has verified evidence for,
        and how fresh it is. It never returns a hiring recommendation.
      </p>

      <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Posting ------------------------------------------------------ */}
        <div className="panel-raised h-fit p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] text-muted">Job posting</span>
            <textarea
              value={posting}
              onChange={(e) => setPosting(e.target.value)}
              rows={11}
              placeholder="Paste the posting, or a few honest sentences about what this person will actually do."
              className="field resize-none font-mono text-[12.5px] leading-relaxed"
            />
          </label>
          <button
            className="btn btn-quiet mt-2 px-0 text-[12.5px]"
            onClick={() => setPosting(FIXTURE_ROLE_INPUT)}
          >
            Use the sample posting
          </button>

          <div className="mt-4 border-t border-edge-soft pt-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-muted">
                Or attach a PDF or a photograph
              </span>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => void attach(e.target.files?.[0] ?? null)}
                className="block w-full text-[12.5px] text-dim file:mr-3 file:rounded-md file:border file:border-edge file:bg-raise file:px-3 file:py-1.5 file:text-[12.5px] file:text-bright"
              />
            </label>
            {file && <p className="mt-2 text-[12px] text-data">Attached: {file.name}</p>}
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-edge-soft pt-4 text-[13px] leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={calibrate}
              onChange={(e) => setCalibrate(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#7189ff]"
            />
            <span>
              Calibrate against the live market.
              <span className="block text-[12px] text-dim">
                Postings overstate tooling and understate judgment. Gemini searches what the
                role actually involves in 2026 before weighting it.
              </span>
            </span>
          </label>

          <button
            className="btn btn-primary mt-5 w-full"
            disabled={busy || (!posting.trim() && !file)}
            onClick={() => void analyse()}
          >
            {busy ? "Reading the posting…" : "Analyse and match"}
          </button>
          {error && <p className="mt-3 text-[13px] text-alert">{error}</p>}
        </div>

        {/* Requirements + pool ------------------------------------------ */}
        <div className="space-y-5">
          {!role && !busy && (
            <div className="panel flex min-h-[320px] items-center justify-center p-8 text-center">
              <p className="max-w-xs text-[13.5px] leading-relaxed text-dim">
                The capability requirements appear here, then every candidate in the pool is
                scored for coverage against them.
              </p>
            </div>
          )}

          {busy && (
            <div className="panel p-8">
              <p className="thinking text-[15px]">
                {calibrate
                  ? "Searching what this role really involves, then weighting it…"
                  : "Working out which capabilities this role actually depends on…"}
              </p>
            </div>
          )}

          {role && (
            <div className="rise panel-raised p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[18px] font-semibold tracking-[-0.015em]">{role.title}</h2>
                <span className="chip">{role.seniority}</span>
                {role.source === "fixture" && <span className="chip">fixture</span>}
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{role.summary}</p>

              <ul className="mt-4 space-y-2.5">
                {role.requirements.map((r) => (
                  <li key={r.dimension}>
                    <div className="flex items-baseline gap-2 text-[13px]">
                      <span>{r.label}</span>
                      <span className="numeral ml-auto text-signal">{r.weight}/5</span>
                    </div>
                    <div className="meter mt-1">
                      <span style={{ width: `${(r.weight / 5) * 100}%` }} />
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-dim">{r.why}</p>
                  </li>
                ))}
              </ul>

              {sources.length > 0 && (
                <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-edge-soft pt-3 text-[11px] text-dim">
                  <span className="text-data">Calibrated against:</span>
                  {sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hover:text-muted"
                    >
                      {s.title.slice(0, 40)}
                    </a>
                  ))}
                </p>
              )}
            </div>
          )}

          {matches.length > 0 && (
            <div className="panel p-5">
              <span className="eyebrow">Evidence coverage</span>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">
                The share of what this role weights that each candidate has verified,
                still-fresh evidence for. Not a ranking of people.
              </p>
              <ul className="mt-4 space-y-2.5">
                {matches.map((m) => {
                  const active = current?.passportId === m.passportId;
                  return (
                    <li key={m.passportId}>
                      <button
                        onClick={() => setSelected(m.passportId)}
                        className={`w-full rounded-xl border p-4 text-left transition-colors ${
                          active
                            ? "border-signal bg-raise"
                            : "border-edge-soft bg-slab hover:border-edge"
                        }`}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-[15px] font-medium">{m.holder}</span>
                          <span className="numeral ml-auto text-[15px] text-signal">
                            {m.coverage}%
                          </span>
                        </div>
                        <div className="meter mt-2">
                          <span style={{ width: `${m.coverage}%` }} />
                        </div>
                        <p className="mt-2 text-[12px] text-dim">
                          {m.gaps.length === 0
                            ? "Every capability this role weights is covered."
                            : `Not covered: ${m.gaps.map((g) => DIMENSION_LABEL[g]).join(", ")}`}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Detail ---------------------------------------------------------- */}
      {current && currentPassport && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="panel p-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
                {current.holder}
              </h2>
              <span className="numeral text-[13px] text-signal">
                {current.coverage}% covered
              </span>
              <span className="ml-auto text-[12px] text-dim">
                trust health {liveTrustHealth(currentPassport.claims) ?? "—"} ·{" "}
                {currentPassport.observationCount} observations
              </span>
            </div>

            {FIXTURE_NARRATIVE[current.passportId] && (
              <p className="mt-3 border-l-2 border-edge pl-3 text-[14px] leading-relaxed text-muted">
                {FIXTURE_NARRATIVE[current.passportId]}
              </p>
            )}

            <table className="mt-5 w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-edge">
                  <th className="py-2 pr-3 font-medium text-dim">Capability</th>
                  <th className="py-2 pr-3 font-medium text-dim">Role needs</th>
                  <th className="py-2 pr-3 font-medium text-dim">Holds</th>
                  <th className="py-2 pr-3 font-medium text-dim">Fresh</th>
                  <th className="py-2 font-medium text-dim">Note</th>
                </tr>
              </thead>
              <tbody>
                {current.rows.map((r) => (
                  <tr key={r.dimension} className="border-b border-edge-soft align-top">
                    <td className="py-2.5 pr-3">{r.label}</td>
                    <td className="numeral py-2.5 pr-3 text-dim">{r.required}/5</td>
                    <td
                      className={`numeral py-2.5 pr-3 ${r.covered ? "text-proof" : "text-caution"}`}
                    >
                      {r.held ?? "—"}
                    </td>
                    <td className="numeral py-2.5 pr-3 text-dim">
                      {Math.round(r.freshness * 100)}%
                    </td>
                    <td className="py-2.5 text-[12px] leading-relaxed text-muted">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-5 rounded-lg border border-edge-soft bg-void px-4 py-3 text-[13px] leading-relaxed text-muted">
              <span className="text-bright">{current.holder}</span> has verified evidence for{" "}
              <span className="text-signal">{current.coverage}%</span> of this role&apos;s
              defined capability requirements. PROOFOS does not recommend a decision. A named
              reviewer makes it, with the evidence in front of them.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button className="btn btn-ghost">Advance to interview</button>
              <button className="btn btn-ghost">Request further verification</button>
              <button className="btn btn-quiet">Record a decision</button>
            </div>
            <p className="mt-2 text-[11.5px] text-dim">
              Decision controls are inert in this demo. What they would write is the human
              oversight record required under Article 14 of the EU AI Act.
            </p>
          </div>

          <div className="space-y-6">
            <div className="panel p-5">
              <span className="eyebrow">Freshness</span>
              <ul className="mt-3 space-y-3">
                {currentPassport.claims.map((c) => {
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
                    </li>
                  );
                })}
              </ul>
            </div>

            {current.gaps.length > 0 && (
              <div className="panel p-5">
                <span className="eyebrow">Close the gap</span>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                  A missing capability is not a rejection. It is a twenty-minute exercise
                  that would put the evidence on the record.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {current.gaps.map((d) => (
                    <button
                      key={d}
                      className="btn btn-ghost text-[12.5px]"
                      disabled={gapBusy === d}
                      onClick={() => void buildGap(d)}
                    >
                      {gapBusy === d ? "Designing…" : DIMENSION_LABEL[d]}
                    </button>
                  ))}
                </div>

                {gap && (
                  <div className="rise mt-4 rounded-lg border border-signal-deep/40 bg-wash/50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14px] font-medium">{gap.gap.title}</h3>
                      <span className="chip ml-auto">{gap.gap.minutes} min</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">
                      {gap.gap.prompt}
                    </p>
                    <p className="mt-2 text-[12px] leading-relaxed text-dim">
                      {gap.gap.whatItProves}
                    </p>
                    <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-muted">
                      {gap.gap.successLooksLike.map((s) => (
                        <li key={s} className="flex gap-2">
                          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-proof" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
