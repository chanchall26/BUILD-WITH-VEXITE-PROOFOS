import Link from "next/link";
import { AjqRadar } from "@/components/ajq-radar";
import { MarketPulse } from "@/components/market-pulse";
import { PassportCard } from "@/components/passport-card";
import { AJQ_FACETS, FACET_LABEL, FACET_QUESTION } from "@/lib/domain";
import { FIXTURE_PASSPORTS } from "@/lib/fixtures";

/**
 * A fixed reference time for the sample passport. The page is prerendered, so
 * calling Date.now() here would bake in the build time and drift from what the
 * browser computes, which React reports as a hydration mismatch.
 */
const SNAPSHOT_AT = Date.parse("2026-09-12T12:00:00.000Z");

const LAYERS = [
  {
    n: "01",
    title: "A job advert becomes a real task",
    who: "Employer · 1 minute",
    body: "Paste the advert, upload the PDF, or photograph the whiteboard. We work out which six skills the job really needs, then build a twelve-minute task from that world, with real data, working tools, and four hidden mistakes.",
  },
  {
    n: "02",
    title: "The candidate works with an AI teammate",
    who: "Candidate · 12 minutes",
    body: "Not a chatbot. A teammate that looks things up, forms an opinion, and says it with confidence. Four times it gets it wrong the way a clever, fast colleague gets things wrong: it claims more than the data shows, it is sure about the wrong fix, it hides a small error inside good work, and it quietly changes the goalposts.",
  },
  {
    n: "03",
    title: "Then we check their sense of when to trust AI",
    who: "Candidate · 4 minutes",
    body: "Ten things an AI said. Some are right but cautious. Some are wrong but confident. Two would cause real damage if you acted on them. We are not marking right and wrong. We are checking whether their confidence matched reality.",
  },
  {
    n: "04",
    title: "It all becomes proof they own",
    who: "Both sides · straight away",
    body: "Every score opens up into the exact moments behind it, quoted in their own words. The result is signed, portable, and reusable at the next company. They choose what to share, it can be withdrawn, and it fades over time because skills go out of date.",
  },
];

const PRINCIPLES = [
  {
    title: "We keep the proof, not the score",
    body: "No score is ever saved. Every number is worked out fresh from what actually happened. Ask why you got 71 and you get the fourteen specific things you did, quoted word for word. Run it again and you get 71 again.",
  },
  {
    title: "No proof means no number",
    body: "If a skill was never shown, it says unproven. It does not say 50. Most of the harm assessment tools do comes from confident-looking numbers built on nothing at all.",
  },
  {
    title: "The AI never decides your score",
    body: "The AI builds the task, plays the teammate, and points at things you said. That is all. Whether its hidden mistake ended up in your work is decided by comparing text. The trust quiz is marked by arithmetic. Anything you could argue with is calculated, not judged.",
  },
  {
    title: "We report coverage, never a verdict",
    body: "We tell an employer you have proof for 82% of what the job needs, and name the other 18%. There is no line anywhere in our code that turns that into hire or reject. A person decides that.",
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
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div className="rise">
              <span className="eyebrow">Proof of skill for the AI workplace</span>
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
                Anyone can write a perfect CV now. PROOFOS gives people a short, real task
                and an AI teammate that is sometimes wrong, then shows an employer exactly
                what happened. Not who you are. What you can actually do.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/challenge" className="btn btn-primary btn-lg">
                  Take the test
                </Link>
                <Link href="/employer" className="btn btn-ghost btn-lg">
                  I&apos;m hiring
                </Link>
              </div>
              <p className="mt-3 text-[12.5px] text-dim">
                Takes about 16 minutes. Nothing to install. No camera.
              </p>
            </div>

            {/* What comes out of it, shown rather than described. */}
            <div className="rise mx-auto w-full max-w-sm lg:max-w-none">
              <PassportCard passport={FIXTURE_PASSPORTS[0]} at={SNAPSHOT_AT} />
              <p className="mt-3 text-center text-[12px] leading-relaxed text-dim lg:text-left">
                A finished passport. Every number here was calculated from the 36
                observations behind it, and each bar fades as that evidence ages.
              </p>
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
              <span className="eyebrow">Why now</span>
              <h2 className="headline mt-3 max-w-lg">
                Checking someone is real no longer tells you anything useful.
              </h2>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted">
                <p>
                  Lots of new tools check whether the person on the video call is a real
                  human. Fair enough. But video apps are adding that themselves, for free.
                </p>
                <p>
                  More importantly, it answers the wrong question. Knowing a real person sat
                  in the chair tells you nothing about whether they can do the job.
                </p>
                <p className="text-bright">
                  The job now means sitting next to an AI all day. It is fast, it sounds
                  certain, and sometimes it is completely wrong. Employers have stopped
                  asking &ldquo;do you use AI?&rdquo; and started asking &ldquo;can I trust
                  you to catch it when it is wrong?&rdquo; Nobody measures that. We do.
                </p>
              </div>
            </div>

            <div className="panel-raised overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[--color-edge-soft]">
                <div className="p-5">
                  <span className="eyebrow">Tests today</span>
                  <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-muted">
                    <li>Do it again at every company.</li>
                    <li>Proves a human was there.</li>
                    <li>Never expires, or expires randomly.</li>
                    <li>The company keeps it. You do not.</li>
                    <li>Gives you a score and no reason.</li>
                  </ul>
                </div>
                <div className="bg-wash p-5">
                  <span className="eyebrow text-signal">PROOFOS</span>
                  <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed">
                    <li>Do it once. Reuse it anywhere.</li>
                    <li>Proves what you did, and how you handled AI.</li>
                    <li>Fades over time, skill by skill.</li>
                    <li>You keep it. You choose what to share.</li>
                    <li>Shows the proof. The score comes from it.</li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-edge-soft px-5 py-4 text-[12.5px] leading-relaxed text-dim">
                One is a gate you walk through and forget. The other is something you own
                and keep building on.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AJQ -------------------------------------------------------------- */}
      <section className="border-b border-edge-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <span className="eyebrow">The new score</span>
          <h2 className="headline mt-3 max-w-2xl">
            Not how well you prompt. How well you catch it when it is wrong.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            Being good at prompts stops mattering every time a new model comes out. Knowing
            when the answer in front of you is wrong never stops mattering. We measure six
            things, and each one only gets a score if you actually showed it.
          </p>

          <div className="mt-9 grid items-start gap-8 lg:grid-cols-[auto_1fr] lg:gap-12">
            <div className="panel mx-auto w-full max-w-[320px] p-5 lg:mx-0">
              <AjqRadar facets={FIXTURE_PASSPORTS[0].ajq.facets} />
            </div>

            <ol className="grid gap-px overflow-hidden rounded-xl border border-edge-soft bg-edge-soft sm:grid-cols-2">
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
          </div>

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
          <span className="eyebrow">Step by step</span>
          <h2 className="headline mt-3 max-w-xl">Four steps, about sixteen minutes.</h2>
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
              <span className="eyebrow">See it happen</span>
              <h2 className="headline mt-3">A teammate that read the wrong chart.</h2>
              <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-muted">
                <p>
                  Your AI teammate has tools and it uses them. Here it checks the database
                  chart, sees the CPU at 82%, and decides. It never opens the chart that
                  breaks the numbers down by page, which would show that only one page got
                  slower and everything else is fine.
                </p>
                <p>
                  You can see exactly which tools it opened. The gap between what it read
                  and what it should have read is sitting right there, if you look.
                </p>
                <p className="text-bright">
                  Copy its answer and that shows up in your record. We check by comparing
                  the text, not by asking another AI, so the finding holds up if you
                  disagree with it.
                </p>
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-edge-soft px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-signal" />
                <span className="text-[12px] font-medium text-muted">AI teammate</span>
                <span className="chip ml-auto">opened: database chart</span>
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
                Almost every request touches the database, so &ldquo;95% of slow ones touch
                the database&rdquo; tells you nothing. It is like saying 95% of car crashes
                involve cars. The chart it skipped shows one page at 2140ms and the other
                three completely normal.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Principles ------------------------------------------------------- */}
      <section className="border-b border-edge-soft">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <span className="eyebrow">Our promises</span>
          <h2 className="headline mt-3 max-w-xl">Four rules we do not break.</h2>
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
            No camera. No screen recording. Nothing judged about how you sound. The test
            does run full screen and counts if you switch tabs, but you can see those
            counts the whole time and leaving is never blocked. What you say about your own
            decisions is proof. How you say it is nobody&apos;s business.
          </p>
        </div>
      </section>

      {/* Close ------------------------------------------------------------ */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="panel-raised relative overflow-hidden p-8 sm:p-12">
            <div className="signal-rule absolute inset-x-0 top-0 h-px" />
            <h2 className="headline max-w-2xl">
              Give it sixteen minutes. You will learn something about yourself.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
              The ready-made task is a payment system that started breaking after an update.
              Your AI teammate will be confidently wrong four times. You get your full
              results either way, and you keep them.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/challenge" className="btn btn-primary btn-lg">
                Take the test
              </Link>
              <Link href="/employer" className="btn btn-ghost btn-lg">
                See the employer view
              </Link>
              <Link href="/demo" className="btn btn-quiet">
                Take the guided tour →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
