import Link from "next/link";
import { MarketPulse } from "@/components/market-pulse";
import { AJQ_FACETS, FACET_LABEL, FACET_QUESTION } from "@/lib/domain";

const LAYERS = [
  {
    n: "01",
    title: "A role becomes a proof challenge",
    who: "Employer · 60 seconds",
    body: "Drop in the posting as text, a PDF, or a photograph of the hiring meeting whiteboard. Gemini says which six capabilities the role actually depends on and how heavily, then designs a twelve-minute simulation from that world, with the tools, the evidence, and the defects built in.",
  },
  {
    n: "02",
    title: "The candidate manages an AI coworker",
    who: "Candidate · 12 minutes",
    body: "Not an assistant with a bug. A colleague that consults real tools, forms a view, and is wrong the way capable colleagues are wrong: confident, well-argued, and reading the wrong number. It asserts what the data does not support, overstates its certainty, hides a defect inside clean work, and quietly moves the goalposts.",
  },
  {
    n: "03",
    title: "Then their confidence is measured against reality",
    who: "Candidate · 4 minutes",
    body: "Ten AI outputs to judge. Some are right and hedged, some are wrong and certain, some would cause real damage if acted on. What is scored is not accuracy. It is whether their trust tracked what each output actually deserved.",
  },
  {
    n: "04",
    title: "Everything becomes evidence, then a passport they own",
    who: "Both sides · immediately",
    body: "Every score decomposes into the observations behind it, each one quoted and hashed. The passport is signed, portable, selectively disclosable, revocable, and it decays, because a judgment about AI tooling from eighteen months ago says very little about today's.",
  },
];

const PRINCIPLES = [
  {
    title: "Evidence is stored. Scores are derived.",
    body: "Nothing is saved as a number. A capability score is a pure function of the observations behind it, so it can be recomputed, audited, and argued with line by line. Dispute a 71 and you get the fourteen observations that made it.",
  },
  {
    title: "No evidence, no number.",
    body: "A capability nobody has demonstrated reads as unproven, not as 50. Half the harm in assessment comes from confident numbers built on nothing, and the honest answer to an absent signal is to say it is absent.",
  },
  {
    title: "The model never scores.",
    body: "Gemini designs the simulation, plays the coworker, and extracts evidence by quoting it. Whether a planted defect reached the finished work is string comparison. Calibration is arithmetic. Every number a candidate could dispute is computed, not judged.",
  },
  {
    title: "Coverage, never a verdict.",
    body: "Against a role, PROOFOS reports that someone has verified evidence for 82% of what it asks for and names the rest. There is no threshold anywhere in the system that turns that into a recommendation. A human decides.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero ------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-edge-soft">
        <div className="aurora absolute inset-0" aria-hidden="true" />
        <div className="gridwork absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-16 sm:pt-24">
          <div className="rise max-w-3xl">
            <span className="eyebrow">Proof Operating System · built on Google Gemini</span>
            <h1 className="display mt-4">
              The résumé says
              <br />
              what you claim.
              <br />
              <span className="text-signal">This shows what</span>
              <br />
              <span className="text-signal">you can prove.</span>
            </h1>
            <p className="subhead mt-6 max-w-xl">
              PROOFOS is the trust layer for hiring in an AI-native workplace. Not who a
              candidate is. What they can actually do, how well they supervise a machine
              that is sometimes wrong, and whether that proof still holds today.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/challenge" className="btn btn-primary">
                Build my proof passport
              </Link>
              <Link href="/employer" className="btn btn-ghost">
                Verify a candidate
              </Link>
              <Link href="/demo" className="btn btn-quiet">
                Three-minute demo path →
              </Link>
            </div>
          </div>

          <div className="mt-14">
            <MarketPulse />
          </div>
        </div>
      </section>

      {/* The shift ------------------------------------------------------- */}
      <section className="border-b border-edge-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div>
              <span className="eyebrow">The shift</span>
              <h2 className="headline mt-3 max-w-lg">
                Identity verification is solving last year&apos;s problem.
              </h2>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted">
                <p>
                  A wave of products now checks whether the person on the call is real. That
                  matters, and it is rapidly becoming a commodity feature inside the video
                  tools you already pay for.
                </p>
                <p>
                  It also answers a question that no longer decides anything. Knowing a
                  genuine human sat in the chair tells you nothing about whether they can do
                  the work, and in 2026 the work means working next to a fluent, confident,
                  occasionally wrong machine.
                </p>
                <p className="text-bright">
                  Employers have stopped asking whether candidates use AI. They have started
                  asking whether candidates can be trusted to supervise it. Nobody is
                  measuring that.
                </p>
              </div>
            </div>

            <div className="panel-raised overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[--color-edge-soft]">
                <div className="p-5">
                  <span className="eyebrow">What exists</span>
                  <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-muted">
                    <li>One candidate, one check, one credential.</li>
                    <li>Proves a human was present.</li>
                    <li>Expires never, or expires arbitrarily.</li>
                    <li>Owned by the platform, per employer.</li>
                    <li>Produces a score.</li>
                  </ul>
                </div>
                <div className="bg-wash/40 p-5">
                  <span className="eyebrow text-signal">PROOFOS</span>
                  <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-bright">
                    <li>One passport, many capabilities, reused everywhere.</li>
                    <li>Proves what they did, and how they handled AI doing it.</li>
                    <li>Decays on a half-life per capability.</li>
                    <li>Owned by the candidate, disclosed claim by claim.</li>
                    <li>Produces evidence. The score is derived from it.</li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-edge-soft px-5 py-4 text-[12.5px] leading-relaxed text-dim">
                The move is from identity verification to employability verification
                infrastructure. One is a gate. The other is an operating system.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AJQ -------------------------------------------------------------- */}
      <section className="border-b border-edge-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <span className="eyebrow">The new measurement</span>
          <h2 className="headline mt-3 max-w-2xl">
            AI Judgment Quotient. Not how well you prompt — how well you supervise.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            Prompting is a skill with a shelf life measured in model releases. Knowing when
            the answer in front of you is wrong is not. Six facets, each with its own
            evidence trail, each scored only where evidence exists.
          </p>

          <ol className="mt-9 grid gap-px overflow-hidden rounded-xl border border-edge-soft bg-edge-soft sm:grid-cols-2 lg:grid-cols-3">
            {AJQ_FACETS.map((facet, i) => (
              <li key={facet} className="bg-slab p-5">
                <div className="flex items-baseline gap-2.5">
                  <span className="numeral text-[12px] text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[16px] font-semibold tracking-[-0.015em]">
                    {FACET_LABEL[facet]}
                  </h3>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  {FACET_QUESTION[facet]}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-6 max-w-2xl text-[14px] leading-relaxed text-dim">
            The last one carries the most weight and is the hardest to fake. Deciding not to
            act on a confident answer costs something in the moment, and it is the only
            facet that shows up in what a person declines to do.
          </p>
        </div>
      </section>

      {/* How it works ----------------------------------------------------- */}
      <section className="border-b border-edge-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <span className="eyebrow">How it runs</span>
          <h2 className="headline mt-3 max-w-xl">Four layers, about sixteen minutes.</h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-edge-soft bg-edge-soft md:grid-cols-2">
            {LAYERS.map((l) => (
              <li key={l.n} className="bg-slab p-6 sm:p-7">
                <div className="flex items-baseline gap-3">
                  <span className="numeral text-[13px] text-signal">{l.n}</span>
                  <h3 className="text-[17px] font-semibold tracking-[-0.015em]">{l.title}</h3>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{l.body}</p>
                <p className="mt-3 font-mono text-[11.5px] text-dim">{l.who}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Counterpart example ---------------------------------------------- */}
      <section className="border-b border-edge-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <span className="eyebrow">The mechanism</span>
              <h2 className="headline mt-3">
                A coworker who looked at the wrong number.
              </h2>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted">
                <p>
                  The counterpart has tools and it uses them. In the seeded scenario it
                  checks the database metrics, sees CPU at 82%, and reaches a confident
                  conclusion. It does not check the per-endpoint latency, which would show
                  that exactly one route regressed and everything else is flat.
                </p>
                <p>
                  The interface shows the candidate which tools the counterpart consulted.
                  The gap between what it read and what it should have read is sitting right
                  there, in the transcript, for anyone who looks.
                </p>
                <p className="text-bright">
                  Whether the defect reached the finished work is settled by string
                  comparison against a marker, not by a second opinion from a model. That is
                  what makes the finding survive a disagreement.
                </p>
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-edge-soft px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-signal" />
                <span className="text-[12px] font-medium text-muted">AI counterpart</span>
                <span className="chip ml-auto">consulted check_db_metrics</span>
              </div>
              <div className="space-y-3 p-5 text-[13.5px] leading-relaxed">
                <p className="text-muted">
                  I&apos;ve been through the dashboards already.{" "}
                  <span className="rounded bg-wash px-1 text-signal">
                    The database is the bottleneck.
                  </span>
                </p>
                <p className="text-muted">
                  DB CPU has gone from 40% to 82% since Tuesday, and when I sampled the slow
                  requests, 95% of them touch the database. That&apos;s about as clear a
                  signal as you get during an incident.
                </p>
                <p className="text-muted">
                  Quickest path: scale the instance up a tier. Want me to write the change
                  request?
                </p>
              </div>
              <div className="border-t border-edge-soft bg-raise px-5 py-3.5 text-[12.5px] leading-relaxed text-dim">
                Nearly every request touches the database, so the 95% figure carries no
                information at all. The endpoint numbers it did not open show one route at
                2140ms and the other three unchanged.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Principles ------------------------------------------------------- */}
      <section className="border-b border-edge-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <span className="eyebrow">What it refuses to do</span>
          <h2 className="headline mt-3 max-w-xl">Four commitments, enforced in code.</h2>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="panel p-6">
                <h3 className="text-[16px] font-semibold tracking-[-0.015em] text-signal">
                  {p.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-dim">
            No camera. No screen recording. No browser lockdown. No voice analysis. The
            spoken defence is transcribed and the audio discarded, because what someone
            says about their own decisions is evidence and how they sound is not.
          </p>
        </div>
      </section>

      {/* Close ------------------------------------------------------------ */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="panel-raised relative overflow-hidden p-8 sm:p-12">
            <div className="signal-rule absolute inset-x-0 top-0 h-px" />
            <h2 className="headline max-w-2xl">
              Sixteen minutes, and you will learn something about how you handle AI.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              The seeded scenario is a production API that started failing after a deploy.
              The counterpart will be confidently wrong four times. Everything runs without
              an API key, from deterministic fixtures, so it works on any machine.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/challenge" className="btn btn-primary">
                Start the challenge
              </Link>
              <Link href="/employer" className="btn btn-ghost">
                See the employer side
              </Link>
              <Link href="/engine" className="btn btn-quiet">
                Where Gemini does the work →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
