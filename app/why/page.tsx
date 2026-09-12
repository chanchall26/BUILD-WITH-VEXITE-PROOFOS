import { ArrowRight, Eye, FileSearch, Scale, Timer, UserCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Comparison } from "@/components/visuals/comparison";

export const metadata = { title: "Why different" };

/**
 * The argument, on one page.
 *
 * Everyone else checks that a real person is in the chair. That is becoming
 * free, and it answers a question that no longer decides a hire. This page
 * says what we check instead, and why the way we check it is the point.
 */

const SHIFT = [
  {
    icon: UserCheck,
    from: "Is this a real person?",
    to: "What can this person prove they can do?",
    body: "Video tools already check that a human is on the call. Knowing someone is real tells you nothing about whether they can do the job next to an AI that is confidently wrong.",
  },
  {
    icon: Eye,
    from: "Watch them, secretly",
    to: "Watch, and show them everything",
    body: "The camera is on during the test, and every count it produces is on the candidate's screen while it is being counted. No frame is stored or sent. Nothing hidden, nothing recorded.",
  },
  {
    icon: Scale,
    from: "A score, from a black box",
    to: "Evidence, with the score calculated from it",
    body: "Nothing is saved as a number. Every score opens up into the exact moments behind it, quoted word for word, with a fingerprint. Run it again and you get the same result.",
  },
];

const RULES = [
  {
    n: "1",
    title: "Evidence is stored. Scores are calculated.",
    body: "Our data design has no score column anywhere in it. Ask why you got 71 and you get a list, not a shrug.",
  },
  {
    n: "2",
    title: "No evidence, no number.",
    body: "A skill you never demonstrated says unproven. It does not say 50. Thin evidence pulls the score towards the middle; only repeated, real evidence moves it to an extreme.",
  },
  {
    n: "3",
    title: "The AI never decides the score.",
    body: "AI builds the task and quotes what you said. Whether a planted mistake reached your work is decided by comparing text, character by character. The trust quiz is arithmetic against an answer key the browser never sees.",
  },
  {
    n: "4",
    title: "Coverage, never a verdict.",
    body: "We tell an employer what share of the role you have proven, and name the gap. There is no threshold anywhere in the code that turns that into hire or reject. A person decides.",
  },
];

const OWN = [
  {
    icon: Wallet,
    title: "You own it",
    body: "The result is a signed credential that lives with you, not on a company's platform. Share it at every job, not just one.",
  },
  {
    icon: FileSearch,
    title: "You choose what to share",
    body: "Untick a skill and it is not sent. The signature still checks out. An employer can see you held something back, but not what.",
  },
  {
    icon: Timer,
    title: "It fades honestly",
    body: "AI judgment halves in 120 days because the tools move fast. Clear writing halves in 540. A stale passport never reads like a fresh one.",
  },
];

export default function WhyPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        back={{ href: "/", label: "Back to home" }}
        crumbs={[{ label: "Home", href: "/" }, { label: "Why different" }]}
        eyebrow="Why different"
        title="Everyone else checks you are real. We check what you can do."
        description="Identity checks are becoming free, and they answer a question that no longer decides a hire. The job now means supervising an AI that sounds certain and is sometimes wrong. That is what we measure, and we measure it in the open."
      />

      {/* The shift ---------------------------------------------------------- */}
      <div className="rise rise-1 mt-9 grid gap-4 md:grid-cols-3">
        {SHIFT.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.to} hover className="p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-wash text-signal">
                <Icon size={18} aria-hidden="true" />
              </span>
              <p className="mt-4 text-[12.5px] text-dim line-through decoration-alert/60">{s.from}</p>
              <h2 className="mt-1 text-[15.5px] font-semibold tracking-[-0.015em]">{s.to}</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{s.body}</p>
            </Card>
          );
        })}
      </div>

      {/* Side by side ------------------------------------------------------- */}
      <section className="rise rise-2 mt-12">
        <p className="eyebrow">Side by side</p>
        <h2 className="headline mt-2 measure-wide">Seven rows, ten seconds.</h2>
        <div className="mt-6">
          <Comparison />
        </div>
      </section>

      {/* Four rules --------------------------------------------------------- */}
      <section className="rise rise-3 mt-12">
        <p className="eyebrow">The four rules</p>
        <h2 className="headline mt-2 measure-wide">Not slogans. Each one is enforced in code and covered by a test.</h2>
        <ol className="mt-6 grid gap-px overflow-hidden rounded-xl border border-edge-soft bg-edge-soft sm:grid-cols-2">
          {RULES.map((r) => (
            <li key={r.n} className="bg-slab p-6">
              <div className="flex items-baseline gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal text-[12px] font-semibold text-on-signal">
                  {r.n}
                </span>
                <h3 className="text-[16px] font-semibold tracking-[-0.015em]">{r.title}</h3>
              </div>
              <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{r.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Ownership ---------------------------------------------------------- */}
      <section className="rise rise-4 mt-12">
        <p className="eyebrow">Who it belongs to</p>
        <h2 className="headline mt-2 measure-wide">One passport, every employer.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {OWN.map((o) => {
            const Icon = o.icon;
            return (
              <Card key={o.title} className="p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-raise text-signal">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.015em]">{o.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{o.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* The camera, honestly ---------------------------------------------- */}
      <section className="rise rise-5 mt-12">
        <div className="panel-raised p-6">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">
            The camera is on. Here is exactly what it does.
          </h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Proctoring tools record you and send the video to a stranger. We do the opposite.
            The camera feed never leaves your device. A small model running in your browser
            watches for three things and turns them into counts: is the picture blank or
            covered, is there one face in view, and are the eyes on the screen. You see your
            own preview and every count the whole time. The counts go on the record for a
            person to read. The video goes nowhere.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/compliance" className={buttonStyles({ variant: "outline", size: "sm" })}>
              Read the compliance page
            </Link>
            <Link href="/faq" className={buttonStyles({ variant: "ghost", size: "sm" })}>
              Camera questions in the FAQ
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/challenge" className={buttonStyles({ size: "lg" })}>
          Prove you&apos;re real
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link href="/engine" className={buttonStyles({ variant: "outline", size: "lg" })}>
          How it works
        </Link>
      </div>
    </div>
  );
}
