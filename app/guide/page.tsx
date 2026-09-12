import {
  ArrowRight,
  Briefcase,
  Camera,
  CircleCheck,
  CirclePlay,
  Clock,
  Globe,
  Lamp,
  Lightbulb,
  Mic,
  MonitorUp,
  Search,
  ShieldCheck,
  ScanEye,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Guide" };

/**
 * The practical guide: how to set up, what each step asks of you, and what
 * every number on screen means. Written for the candidate first, with the
 * employer's three steps at the end.
 */

const SETUP = [
  {
    icon: Clock,
    title: "Sixteen quiet minutes",
    body: "The test pauses if you switch away, but it goes better in one sitting. Silence notifications.",
  },
  {
    icon: Camera,
    title: "Camera at eye level",
    body: "Your face should fill the middle of the preview. A laptop on a desk is fine; a phone propped below your chin is not.",
  },
  {
    icon: Lamp,
    title: "Light on your face",
    body: "A window or lamp in front of you, not behind. A dark picture reads as blank and pauses the test.",
  },
  {
    icon: Globe,
    title: "A recent Chrome or Edge",
    body: "The face check runs in your browser and needs a modern one. Safari and Firefox work, but the camera model is slower.",
  },
  {
    icon: Mic,
    title: "A microphone, optionally",
    body: "For two short spoken answers at the end. Typing scores exactly the same, so this is a preference, not a requirement.",
  },
  {
    icon: MonitorUp,
    title: "One screen, if you can",
    body: "Looking at a second monitor counts as eyes off screen. Nothing fails, but the seconds add up on your record.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Pick your kind of work",
    time: "1 min",
    body: "Choose the field closest to what you do, or paste a job advert and the task is built for that role. The ready-made test starts instantly; a fresh one takes about thirty seconds.",
    tip: "The ready-made one is a real test. It is just built already.",
  },
  {
    n: "2",
    title: "Read what is recorded, turn on the camera, agree",
    time: "1 min",
    body: "Two lists: what we record and what we never do. Then the camera check: allow it, sit so your face is in the frame, and wait for the chip to say Eyes on screen. Enter your name and start.",
    tip: "The name you type goes on your credential. Use the one you would put on a CV.",
  },
  {
    n: "3",
    title: "Read the situation",
    time: "2 min",
    body: "A short brief, a deliverable, and the documents you have been given. Read the documents. Your AI teammate will quote some of them and skip others, and the difference is where the mistakes hide.",
    tip: "Note which tools your teammate can open. You will want to ask what it actually checked.",
  },
  {
    n: "4",
    title: "Do the work, with your AI teammate",
    time: "10 min",
    body: "Write your deliverable on the left. Ask your teammate anything on the right. It looks things up, has opinions, and is confidently wrong four times. Every reply shows what it opened before answering.",
    tip: "When it sounds certain, ask for the evidence. 'What did the per-page numbers say?' is worth more than any prompt trick.",
  },
  {
    n: "5",
    title: "Judge ten AI answers",
    time: "3 min",
    body: "Ten things an AI said, one at a time. Rate how far you would trust each one. Some are right but hedged, some are wrong but certain, two would be unsafe to act on.",
    tip: "You are scored on whether your confidence matched reality, not on getting a right answer.",
  },
  {
    n: "6",
    title: "Explain two of your own choices",
    time: "90 sec",
    body: "Two questions about decisions in your own work. Speak or type. This is the part nobody can paste an answer to, and it is how we know the author is the person in the chair.",
    tip: "Name specifics. 'I rolled back because the checkout page alone was failing' beats 'I used my judgement'.",
  },
  {
    n: "7",
    title: "Get your results, and keep them",
    time: "30 sec",
    body: "Six skills, each opening into the exact moments behind it. Untick anything you do not want to share, build the shareable version, and it is yours.",
    tip: "Skills you never demonstrated say unproven. That is honest, not a bad mark.",
  },
];

const COUNTS = [
  { label: "Tab switches", means: "Times you left the tab or window for more than a moment." },
  { label: "Left full screen", means: "Times you exited full screen during the test." },
  { label: "Copied out", means: "Times text was copied from the test." },
  { label: "Seconds away", means: "Total time the tab was hidden or unfocused." },
  { label: "Looked away", means: "Stretches where your eyes were off the screen for more than a moment." },
  { label: "Eyes off screen (s)", means: "Total seconds of those stretches, including eyes closed." },
  { label: "Camera blank (s)", means: "Seconds the picture was black, covered, or the camera was off." },
  { label: "No face (s)", means: "Seconds with nobody in frame." },
  {
    label: "Warnings",
    means:
      "Two, for a problem that goes on: leaving the tab or full screen, no face, a second person, eyes away for a while, or a dark camera. A third ends the test and scores what you have done.",
  },
];

const EMPLOYER = [
  {
    icon: Briefcase,
    title: "Turn a job advert into a test",
    body: "Paste the advert, or drop the PDF. We work out which six skills the role really needs and weight them. It usually rates judgment higher than the advert does, because adverts overdo the tools.",
    href: "/employer",
    label: "Open the employer view",
  },
  {
    icon: Search,
    title: "Find who fits, and see the gap",
    body: "Coverage, never a verdict: what share of the role each candidate has proven, and exactly what they have not. Every number opens into evidence quoted from the session.",
    href: "/employer",
    label: "Find who fits",
  },
  {
    icon: ShieldCheck,
    title: "Verify a credential a candidate sends you",
    body: "Paste it. It is checked in milliseconds against our public key, offline, with no account. Change a character and it fails. You can also see whether anything was withheld.",
    href: "/verify",
    label: "Verify a credential",
  },
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        back={{ href: "/", label: "Back to home" }}
        crumbs={[{ label: "Home", href: "/" }, { label: "Guide" }]}
        eyebrow="Guide"
        title="Everything you need before you press start."
        description="How to set up, what each of the seven steps asks of you, and what every number on the screen means. Read it once; the test itself explains as it goes."
        actions={
          <Link href="/demo" className={buttonStyles({ variant: "outline", size: "sm" })}>
            <CirclePlay size={15} aria-hidden="true" />
            Guided tour instead
          </Link>
        }
      />

      {/* Setup -------------------------------------------------------------- */}
      <section className="rise rise-1 mt-9">
        <p className="eyebrow">Before you start</p>
        <h2 className="headline mt-2 measure-wide">Six things that make it go smoothly.</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SETUP.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="p-4">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wash text-signal">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <h3 className="text-[14px] font-semibold">{s.title}</h3>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Steps -------------------------------------------------------------- */}
      <section className="rise rise-2 mt-12">
        <p className="eyebrow">The seven steps</p>
        <h2 className="headline mt-2 measure-wide">About sixteen minutes, start to finish.</h2>
        <ol className="mt-6 space-y-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal text-[13px] font-semibold text-on-signal">
                    {s.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-[16px] font-semibold tracking-[-0.015em]">{s.title}</h3>
                      <span className="badge text-[10.5px]">{s.time}</span>
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.body}</p>
                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-edge-soft bg-deep px-3 py-2.5 text-[13px] leading-relaxed text-muted">
                      <Lightbulb size={14} className="mt-0.5 shrink-0 text-caution" aria-hidden="true" />
                      {s.tip}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* The counts --------------------------------------------------------- */}
      <section className="rise rise-3 mt-12">
        <p className="eyebrow">What the numbers mean</p>
        <h2 className="headline mt-2 measure-wide">Every count on your screen, explained.</h2>
        <p className="measure-wide mt-3 text-[15px] leading-relaxed text-muted">
          These sit in a strip above your workspace, and the camera ones under your preview
          in the corner. They are counted openly and go on your record as numbers for a
          person to read. None of them fails anything on its own.
        </p>
        <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-edge-soft bg-edge-soft sm:grid-cols-2">
          {COUNTS.map((c) => (
            <div key={c.label} className="bg-slab px-5 py-4">
              <dt className="text-[13.5px] font-semibold">{c.label}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-muted">{c.means}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: CircleCheck, text: "Eyes on screen: the camera sees one face, looking at the screen." },
            { icon: ScanEye, text: "Looking away / Eyes closed: counted after a moment, stops when you look back." },
            { icon: Camera, text: "Camera blank / off: the test pauses until the picture is back. Nothing is lost." },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <p key={s.text} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-dim">
                <Icon size={14} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
                {s.text}
              </p>
            );
          })}
        </div>
      </section>

      {/* Employers ---------------------------------------------------------- */}
      <section className="rise rise-4 mt-12">
        <p className="eyebrow">For employers</p>
        <h2 className="headline mt-2 measure-wide">Three steps, no account.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {EMPLOYER.map((e) => {
            const Icon = e.icon;
            return (
              <Card key={e.title} className="flex flex-col p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-raise text-signal">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.015em]">{e.title}</h3>
                <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted">{e.body}</p>
                <Link
                  href={e.href}
                  className="mt-3 text-[13px] font-medium text-signal transition-colors hover:underline"
                >
                  {e.label} →
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/challenge" className={buttonStyles({ size: "lg" })}>
          Prove you&apos;re real
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link href="/faq" className={buttonStyles({ variant: "outline", size: "lg" })}>
          Still have a question?
        </Link>
      </div>
    </div>
  );
}
