import Link from "next/link";

export const metadata = { title: "Demo path" };

const PATH = [
  {
    t: "0:00",
    title: "Open with the question the judges already have",
    href: "/",
    label: "Home",
    say: "AI can fake an interview. Everyone is building products to check whether the person on the call is real. That is becoming a checkbox inside Zoom. The question that actually decides a hire in 2026 is different: can this person be trusted to supervise a machine that is confidently wrong?",
    show: "The live statistics strip. Point at the citation row: Gemini fetched those with Google Search a moment ago.",
  },
  {
    t: "0:25",
    title: "Upload the job description",
    href: "/employer",
    label: "Employer",
    say: "An employer drops in the posting. Gemini says which six capabilities the work actually depends on, and weights them — correcting for the fact that postings overstate tooling and understate judgment.",
    show: "Press the sample posting, then Analyse and match. Read out one 'why' line.",
  },
  {
    t: "0:55",
    title: "Meet the AI coworker",
    href: "/challenge",
    label: "Challenge",
    say: "The candidate gets a colleague, not an assistant. It has tools and it uses them. Watch what it consults.",
    show: "Use the seeded scenario, consent, skim the brief, open the workspace, and ask: what is causing the errors?",
  },
  {
    t: "1:25",
    title: "The moment the whole product turns on",
    href: "/challenge",
    label: "Challenge",
    say: "It checked the database metrics, saw CPU at 82%, and concluded the database is the bottleneck. It never opened the endpoint latency, which shows one route at 2140ms and the other three completely flat. Its reasoning is correlation dressed as a diagnosis. If I paste this, that goes on my record.",
    show: "Point at the 'consulted check_db_metrics' chip above the reply, then type: that's correlation, not causation — what does the per-endpoint latency say?",
  },
  {
    t: "1:55",
    title: "Calibration, then defending your own work",
    href: "/challenge",
    label: "Challenge",
    say: "Ten AI outputs. Some are right and hedged, some are wrong and certain, and some would cost you a database if you acted on them. We are not scoring whether you spot the wrong one. We are scoring whether your confidence tracked reality. Then Gemini reads what I actually built and asks two questions only its author can answer.",
    show: "Judge three calibration items, continue, then type one defence answer. Mention the audio is discarded.",
  },
  {
    t: "2:25",
    title: "Evidence, not a score",
    href: "/passport",
    label: "Passport",
    say: "This is the part I care about. Nothing here is stored as a number. Click any node and you get the observations that produced it, each one quoted, hashed, and labelled with whether a model or a string comparison found it. Capabilities with no evidence say unproven, not fifty.",
    show: "Click AI Judgment in the proof graph, then Detect, then read one observation aloud including its hash.",
  },
  {
    t: "2:50",
    title: "The candidate owns it, and can hold things back",
    href: "/passport",
    label: "Passport",
    say: "This role cares about AI judgment and verification. It does not need my communication score, so I do not send it. The signature still verifies, and the employer can see that I withheld something without seeing what.",
    show: "Untick two capabilities, build the presentation, copy it.",
  },
  {
    t: "3:10",
    title: "Verify it, then break it",
    href: "/verify",
    label: "Verify",
    say: "Verified offline against a published key. No account, no call back to us. Now change one character.",
    show: "Paste, verify, read the millisecond count, then press Tamper with it.",
  },
  {
    t: "3:30",
    title: "Close on what nobody else demos",
    href: "/engine",
    label: "Engine",
    say: "Twelve Gemini capabilities, each doing one job. And a list of things the model is explicitly not allowed to decide, because everything a candidate could dispute is computed rather than judged. We do not ask employers to trust an AI score. We give them evidence of what someone actually demonstrated, and let a human decide.",
    show: "The live call log, then the 'what Gemini is not allowed to decide' panel.",
  },
];

const CAST = [
  {
    name: "Aditi R.",
    line: "Trust health 79, AI judgment 84. Went to the endpoint numbers before accepting the database story and asked for evidence twice.",
  },
  {
    name: "Rohan M.",
    line: "Trust health 47, AI judgment 21. Fast and fluent, and every conclusion is the counterpart's. Raised the connection pool to 200 on a pool running at 34%.",
  },
  {
    name: "K. Verma",
    line: "Trust health 60, execution 89, authorship 14. The best write-up of the three. It arrived as one paste from outside the session and the defence named nothing specific to it.",
  },
];

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <span className="eyebrow">Demo path</span>
      <h1 className="headline mt-3">Three and a half minutes, in order.</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
        Everything below runs with no API key, from deterministic fixtures, so the demo
        cannot fail on someone else&apos;s network. With a key configured the same path runs
        on live Gemini calls and the engine page shows them arriving.
      </p>

      <ol className="mt-10 space-y-3">
        {PATH.map((s) => (
          <li key={s.t} className="panel p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="numeral text-[13px] text-signal">{s.t}</span>
              <h2 className="text-[16px] font-semibold tracking-[-0.015em]">{s.title}</h2>
              <Link
                href={s.href}
                className="chip ml-auto hover:border-signal-deep hover:text-signal"
              >
                {s.label} →
              </Link>
            </div>
            <p className="mt-3 border-l-2 border-signal-deep/50 pl-3 text-[14px] leading-relaxed text-bright">
              {s.say}
            </p>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-dim">On screen: {s.show}</p>
          </li>
        ))}
      </ol>

      <div className="panel-raised mt-10 p-6">
        <span className="eyebrow">The seeded pool, and why it is these three</span>
        <ul className="mt-4 space-y-3">
          {CAST.map((c) => (
            <li key={c.name} className="text-[14px] leading-relaxed">
              <span className="font-medium text-signal">{c.name}</span>
              <span className="text-muted"> — {c.line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-edge-soft pt-4 text-[13px] leading-relaxed text-muted">
          Ranked on the quality of the artifact alone, the order is Verma, Aditi, Rohan.
          Ranked on what the role actually needs, it is Aditi, then a conversation about
          Verma, then Rohan nowhere near a pager. That inversion is the argument for the
          whole product, and it is the one thing to make sure the judges see.
        </p>
      </div>

      <div className="panel mt-6 p-6">
        <span className="eyebrow">If something goes wrong on stage</span>
        <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
          <li>
            Counterpart silent: it falls back to fixtures automatically and still plays its
            scripted move. Carry on.
          </li>
          <li>
            No microphone: press &ldquo;Type it instead&rdquo;. Assessed identically, and the
            fallback is part of the accessibility argument rather than an excuse.
          </li>
          <li>
            Evaluation slow: the employer page is seeded with three finished passports that
            need nothing, and the verifier works on any credential you already copied.
          </li>
          <li>
            Anything else: every page renders standalone. Skip forward and keep talking.
          </li>
        </ul>
      </div>
    </div>
  );
}
