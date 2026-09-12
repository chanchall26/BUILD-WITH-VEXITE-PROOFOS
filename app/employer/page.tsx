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
      <span className="eyebrow">For employers</span>
      <h1 className="headline mt-3 max-w-2xl">
        What does this job need, and who can prove it?
      </h1>
      <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-muted">
        Paste your job advert. We work out which six skills the work really needs, then show
        how much of that each person has actually proved, and how recent that proof is. We
        never tell you who to hire.
      </p>

      <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        {/* Posting ------------------------------------------------------ */}
        <div className="panel-raised h-fit p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13.5px] font-medium">Your job advert</span>
            <textarea
              value={posting}
              onChange={(e) => setPosting(e.target.value)}
              rows={11}
              placeholder="Paste the advert, or just write a few honest sentences about what this person will actually do."
              className="field resize-none text-[13px] leading-relaxed"
            />
          </label>
          <button
            className="btn btn-quiet mt-2 px-0 text-[12.5px]"
            onClick={() => setPosting(FIXTURE_ROLE_INPUT)}
          >
            Use an example advert
          </button>

          <div className="mt-4 border-t border-edge-soft pt-4">
            <label className="block">
              <span className="mb-1.5 block text-[13.5px] font-medium">
                Or upload a PDF or photo
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
              className="mt-1 h-4 w-4 accent-[var(--color-signal)]"
            />
            <span>
              Check what this job is really like today.
              <span className="block text-[12px] text-dim">
                Adverts talk a lot about tools and barely mention judgement. We look up what
                the job actually involves before deciding what matters.
              </span>
            </span>
          </label>

          <button
            className="btn btn-primary btn-lg mt-5 w-full"
            disabled={busy || (!posting.trim() && !file)}
            onClick={() => void analyse()}
          >
            {busy ? "Reading your advert…" : "Find who fits"}
          </button>
          {error && <p className="mt-3 text-[13px] text-alert">{error}</p>}
        </div>

        {/* Requirements + pool ------------------------------------------ */}
        <div className="space-y-5">
          {!role && !busy && (
            <div className="panel flex min-h-[320px] items-center justify-center p-8 text-center">
              <p className="max-w-xs text-[13.5px] leading-relaxed text-dim">
                The six skills your job needs will appear here, then everyone who has taken
                the test is scored against them.
              </p>
            </div>
          )}

          {busy && (
            <div className="panel p-8">
              <p className="thinking text-[15px]">
                {calibrate
                  ? "Looking up what this job really involves, then weighing it up…"
                  : "Working out which skills this job actually needs…"}
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
              <span className="eyebrow">How much they have proved</span>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">
                How much of what this job needs each person has actually proved, and proved
                recently. This is not a ranking of people.
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
                            ? "Every skill this job needs is covered."
                            : `Still to prove: ${m.gaps.map((g) => DIMENSION_LABEL[g]).join(", ")}`}
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
                  <th className="py-2 pr-3 font-medium text-dim">Skill</th>
                  <th className="py-2 pr-3 font-medium text-dim">Job needs</th>
                  <th className="py-2 pr-3 font-medium text-dim">They have</th>
                  <th className="py-2 pr-3 font-medium text-dim">Fresh</th>
                  <th className="py-2 font-medium text-dim">Why</th>
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

            <p className="mt-5 rounded-lg border border-edge-soft bg-deep px-4 py-3 text-[13.5px] leading-relaxed text-muted">
              <span className="font-medium text-bright">{current.holder}</span> has proved{" "}
              <span className="font-medium text-signal">{current.coverage}%</span> of what
              this job needs. We are not telling you to hire or reject. You decide, with the
              proof in front of you.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button className="btn btn-primary">Invite to interview</button>
              <button className="btn btn-ghost">Ask for more proof</button>
              <button className="btn btn-quiet">Save a decision</button>
            </div>
            <p className="mt-2 text-[11.5px] text-dim">
              These buttons do nothing in the demo. In a real deployment they write the
              record of who decided what, which the law now requires.
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
