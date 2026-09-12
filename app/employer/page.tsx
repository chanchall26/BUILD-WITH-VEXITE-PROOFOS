"use client";

import { Briefcase, Check, Search, Sparkles, Target, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { Dropzone, type PickedFile } from "@/components/ui/dropzone";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { SkillIcon, SKILL_META } from "@/components/visuals/skill-meta";
import {
  DIMENSION_LABEL,
  type Dimension,
  type Passport,
  type RoleMatch,
  type RoleSpec,
} from "@/lib/domain";
import { FIXTURE_NARRATIVE, FIXTURE_PASSPORTS, FIXTURE_ROLE_INPUT } from "@/lib/fixtures";
import { freshnessFor, liveTrustHealth } from "@/lib/freshness";
import { cn } from "@/lib/utils";

interface Gap {
  title: string;
  minutes: number;
  prompt: string;
  whatItProves: string;
  successLooksLike: string[];
}

export default function EmployerPage() {
  const [posting, setPosting] = useState("");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [useSearch, setUseSearch] = useState(false);
  const [role, setRole] = useState<RoleSpec | null>(null);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pool, setPool] = useState<Passport[]>(FIXTURE_PASSPORTS);
  const [matches, setMatches] = useState<RoleMatch[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [gap, setGap] = useState<{ dimension: Dimension; gap: Gap } | null>(null);
  const [gapBusy, setGapBusy] = useState<Dimension | null>(null);
  const toast = useToast();

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
          calibrate: useSearch,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.role) throw new Error(data?.error ?? "We couldn't read that.");
      setRole(data.role);
      setSources(data.sources ?? []);

      const m = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: data.role, passports: pool }),
      });
      const matched = await m.json();
      setMatches(matched.matches ?? []);
      setSelected(matched.matches?.[0]?.passportId ?? null);
      toast.show(`Matched ${matched.matches?.length ?? 0} people`);
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} Nothing was lost — try again.`
          : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
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
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        back={{ href: "/", label: "Back to home" }}
        crumbs={[{ label: "Home", href: "/" }, { label: "For employers" }]}
        eyebrow="For employers"
        title="What does this job need, and who can prove it?"
        description="Paste your advert. We work out which six skills the work really needs, then show how much of that each person has proved. We never tell you who to hire."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Input ---------------------------------------------------------- */}
        <Card raised className="h-fit p-5">
          <label htmlFor="advert" className="label">
            Your job advert
          </label>
          <textarea
            id="advert"
            value={posting}
            onChange={(e) => setPosting(e.target.value)}
            rows={8}
            placeholder="Paste it here, or write a few honest sentences about what this person will actually do."
            className="field resize-none text-[13px] leading-relaxed"
          />
          <button
            className="mt-2 text-[12.5px] font-medium text-signal transition-colors hover:text-violet"
            onClick={() => setPosting(FIXTURE_ROLE_INPUT)}
          >
            Use an example advert
          </button>

          <p className="my-4 flex items-center gap-3 text-[11.5px] text-dim">
            <span className="h-px flex-1 bg-edge-soft" />
            or upload
            <span className="h-px flex-1 bg-edge-soft" />
          </p>

          <Dropzone file={file} onFile={setFile} label="Drop a PDF or photo" />

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 border-t border-edge-soft pt-4 text-[13px] leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={useSearch}
              onChange={(e) => setUseSearch(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--color-signal)]"
            />
            <span>
              Check what this job is really like today
              <span className="block text-[12px] text-dim">
                Adverts overdo the tools and barely mention judgement.
              </span>
            </span>
          </label>

          <Button
            size="lg"
            full
            className="mt-5"
            loading={busy}
            loadingLabel="Reading your advert…"
            disabled={!posting.trim() && !file}
            onClick={() => void analyse()}
            icon={<Search size={17} />}
          >
            Find who fits
          </Button>

          {error && (
            <p className="mt-3 rounded-xl border border-alert/40 bg-alert/5 px-3.5 py-2.5 text-[13px] text-alert">
              {error}
            </p>
          )}
        </Card>

        {/* Requirements + people ------------------------------------------ */}
        <div className="space-y-5">
          {!role && !busy && (
            <EmptyState
              icon={<Briefcase size={26} />}
              title="No job analysed yet"
              description="Paste an advert on the left and we'll show which six skills it really needs, then score everyone against them."
            />
          )}

          {busy && (
            <>
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-28 w-full" />
            </>
          )}

          {role && (
            <Card raised className="rise p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="title">{role.title}</h2>
                <span className="badge">{role.seniority}</span>
              </div>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{role.summary}</p>

              <ul className="mt-5 space-y-3">
                {role.requirements.map((r) => (
                  <li key={r.dimension}>
                    <div className="flex items-center gap-2.5">
                      <SkillIcon dimension={r.dimension} size={13} />
                      <span className="text-[13px] font-medium">{r.label}</span>
                      <span className="numeral ml-auto text-[12px] text-dim">
                        {r.weight}/5
                      </span>
                    </div>
                    <div className="meter mt-1.5 h-1.5">
                      <span
                        style={{
                          width: `${(r.weight / 5) * 100}%`,
                          background: SKILL_META[r.dimension].colour,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-dim">{r.why}</p>
                  </li>
                ))}
              </ul>

              {sources.length > 0 && (
                <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-edge-soft pt-3 text-[11px] text-dim">
                  <span className="inline-flex items-center gap-1 text-data">
                    <Sparkles size={11} aria-hidden="true" /> Checked against:
                  </span>
                  {sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="transition-colors hover:text-signal"
                    >
                      {s.title.slice(0, 38)}
                    </a>
                  ))}
                </p>
              )}
            </Card>
          )}

          {matches.length > 0 && (
            <div className="rise rise-1">
              <div className="mb-3 flex items-center gap-2">
                <Users size={15} className="text-dim" aria-hidden="true" />
                <h2 className="title">Who has proved what</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((m) => {
                  const active = current?.passportId === m.passportId;
                  return (
                    <button
                      key={m.passportId}
                      onClick={() => setSelected(m.passportId)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all duration-200",
                        active
                          ? "border-signal bg-wash shadow-[var(--shadow-card)]"
                          : "border-edge-soft bg-slab hover:-translate-y-0.5 hover:border-signal-deep hover:shadow-[var(--shadow-card)]",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-[14.5px] font-semibold">{m.holder}</span>
                        <CountUp
                          value={m.coverage}
                          suffix="%"
                          className="numeral ml-auto text-[17px] font-bold text-signal"
                        />
                      </div>
                      <div className="meter mt-2.5 h-1.5">
                        <span style={{ width: `${m.coverage}%` }} />
                      </div>
                      <p className="mt-2 text-[11.5px] leading-snug text-dim">
                        {m.gaps.length === 0
                          ? "Every skill covered"
                          : `Still to prove: ${m.gaps.map((g) => SKILL_META[g].short).join(", ")}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail ------------------------------------------------------------ */}
      {current && currentPassport && (
        <div className="rise mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Card raised className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <ProgressRing value={current.coverage} size={88} stroke={8} label="covered" />
              <div className="min-w-0 flex-1">
                <h2 className="title">{current.holder}</h2>
                <p className="mt-1 text-[12.5px] text-dim">
                  Trust score {liveTrustHealth(currentPassport.claims) ?? "—"} ·{" "}
                  {currentPassport.observationCount} pieces of proof
                </p>
                {FIXTURE_NARRATIVE[current.passportId] && (
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">
                    {FIXTURE_NARRATIVE[current.passportId]}
                  </p>
                )}
              </div>
            </div>

            {/* Coverage: a table on desktop, cards on mobile */}
            <ul className="mt-6 space-y-2.5">
              {current.rows.map((r) => (
                <li
                  key={r.dimension}
                  className={cn(
                    "rounded-xl border p-3.5",
                    r.covered ? "border-proof/30 bg-proof/[0.04]" : "border-edge-soft bg-deep",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <SkillIcon dimension={r.dimension} size={13} />
                    <span className="text-[13.5px] font-medium">{r.label}</span>
                    {r.covered ? (
                      <Check size={15} className="text-proof" aria-hidden="true" />
                    ) : (
                      <X size={15} className="text-caution" aria-hidden="true" />
                    )}
                    <span className="ml-auto flex items-center gap-3 text-[11.5px] text-dim">
                      <span>job needs {r.required}/5</span>
                      <span className="numeral font-semibold text-bright">
                        {r.held ?? "—"}
                      </span>
                      <span>{Math.round(r.freshness * 100)}% fresh</span>
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{r.note}</p>
                </li>
              ))}
            </ul>

            <p className="mt-5 rounded-xl border border-edge-soft bg-deep px-4 py-3.5 text-[13.5px] leading-relaxed text-muted">
              <span className="font-semibold text-bright">{current.holder}</span> has proved{" "}
              <span className="font-semibold text-signal">{current.coverage}%</span> of what
              this job needs. We are not telling you to hire or reject. You decide, with the
              proof in front of you.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button size="sm">Invite to interview</Button>
              <Button variant="outline" size="sm">
                Ask for more proof
              </Button>
              <Button variant="ghost" size="sm">
                Save a decision
              </Button>
            </div>
            <p className="mt-2 text-[11.5px] text-dim">
              These do nothing in the demo. In a real deployment they record who decided
              what, which the law now requires.
            </p>
          </Card>

          <div className="space-y-5">
            {current.gaps.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-wash text-signal">
                    <Target size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold">Close the gap</h3>
                    <p className="text-[12px] text-dim">Not a rejection. A short exercise.</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {current.gaps.map((d) => (
                    <Button
                      key={d}
                      variant="outline"
                      size="sm"
                      loading={gapBusy === d}
                      loadingLabel="Designing…"
                      onClick={() => void buildGap(d)}
                    >
                      {DIMENSION_LABEL[d]}
                    </Button>
                  ))}
                </div>

                {gap && (
                  <div className="pop-in mt-4 rounded-xl border border-signal/35 bg-wash p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[14px] font-semibold">{gap.gap.title}</h4>
                      <span className="badge badge-brand ml-auto text-[10px]">
                        {gap.gap.minutes} min
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">
                      {gap.gap.prompt}
                    </p>
                    <ul className="mt-2.5 space-y-1 text-[12px] leading-relaxed text-muted">
                      {gap.gap.successLooksLike.map((s) => (
                        <li key={s} className="flex gap-2">
                          <Check
                            size={12}
                            className="mt-1 shrink-0 text-proof"
                            aria-hidden="true"
                          />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            <Card className="p-5">
              <h3 className="text-[15px] font-semibold">How fresh their proof is</h3>
              <ul className="mt-3.5 space-y-3">
                {currentPassport.claims.map((c) => {
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
                      <div className="meter mt-1 h-1">
                        <span style={{ width: `${f * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
