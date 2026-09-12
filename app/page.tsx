import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Clock,
  EyeOff,
  MonitorOff,
  Sparkles,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { PassportCard } from "@/components/passport-card";
import { Card } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { AiMistakeDemo } from "@/components/visuals/ai-mistake-demo";
import { Comparison } from "@/components/visuals/comparison";
import { HowItWorks } from "@/components/visuals/how-it-works";
import { SkillOrbit } from "@/components/visuals/skill-orbit";
import { FIXTURE_PASSPORTS } from "@/lib/fixtures";

/**
 * A fixed reference time for the sample passport. The page is prerendered, so
 * calling Date.now() here would bake in the build time and drift from what the
 * browser computes, which React reports as a hydration mismatch.
 */
const SNAPSHOT_AT = Date.parse("2026-09-12T12:00:00.000Z");

const PROMISES = [
  {
    icon: Camera,
    title: "No camera, ever",
    body: "We never watch you. Proof comes from your work, not surveillance.",
  },
  {
    icon: EyeOff,
    title: "Nothing hidden from you",
    body: "Anything we count is on screen while we count it.",
  },
  {
    icon: UserCheck,
    title: "You own the result",
    body: "Share the skills you choose. Withdraw it whenever you want.",
  },
  {
    icon: MonitorOff,
    title: "No verdict from a machine",
    body: "We show the proof. A person makes the decision.",
  },
];

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={className}>
      <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">{children}</div>
    </section>
  );
}

function SectionHead({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <div className="rise mb-10">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="headline mt-2.5 measure-wide">{title}</h2>
      {lead && <p className="measure-wide mt-3 text-[15.5px] leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* ══════════════════════════════════════════ Hero */}
      <section className="relative overflow-hidden">
        <div className="mesh absolute inset-0 -z-10" aria-hidden="true" />
        <div className="grid-faint absolute inset-0 -z-10 opacity-70" aria-hidden="true" />

        <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            <div className="rise">
              <span className="badge badge-brand">
                <Sparkles size={12} aria-hidden="true" />
                Trusted hiring checks · proof, not guesswork
              </span>

              <h1 className="hero-display measure-wide mt-5">
                Prove you&apos;re a real person
                <br />
                who can put AI to work.
              </h1>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/challenge"
                  className={buttonStyles({ size: "lg" })}
                >
                  Take the test
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link
                  href="/employer"
                  className={buttonStyles({ variant: "outline", size: "lg" })}
                >
                  I&apos;m hiring
                </Link>
              </div>

              <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-dim">
                <li className="inline-flex items-center gap-1.5">
                  <Clock size={13} aria-hidden="true" /> About 16 minutes
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Camera size={13} aria-hidden="true" /> No camera
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <BadgeCheck size={13} aria-hidden="true" /> Nothing to install
                </li>
              </ul>
            </div>

            <div className="rise rise-2 mx-auto w-full max-w-sm lg:max-w-none">
              <div className="float-soft">
                <PassportCard passport={FIXTURE_PASSPORTS[0]} at={SNAPSHOT_AT} />
              </div>
              <p className="mt-3.5 text-center text-[12px] leading-relaxed text-dim">
                A finished passport. Every number came from 36 recorded moments, and each bar
                fades as that proof ages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════ How it works */}
      <Section className="border-t border-edge-soft bg-deep">
        <SectionHead
          eyebrow="How it works"
          title="Four steps, about sixteen minutes."
          lead="One short task, one AI teammate that is sometimes wrong, and a passport of what you actually did."
        />
        <HowItWorks />
      </Section>

      {/* ══════════════════════════════════════════ Why now */}
      <Section className="border-t border-edge-soft">
        <SectionHead
          eyebrow="Why now"
          title="Checking someone is real no longer tells you much."
          lead="The job now means sitting next to an AI that sounds certain and is sometimes wrong. Employers have stopped asking whether you use AI. They ask whether you catch it."
        />
        <div className="rise rise-1">
          <Comparison />
        </div>
      </Section>

      {/* ══════════════════════════════════════════ The six skills */}
      <Section className="border-t border-edge-soft bg-deep">
        <SectionHead
          eyebrow="The new score"
          title="Not how well you prompt. How well you catch it."
          lead="Being good at prompts stops mattering with every new model. Knowing when the answer is wrong never does. Pick one to see what it means."
        />
        <div className="rise rise-1">
          <SkillOrbit />
        </div>
      </Section>

      {/* ══════════════════════════════════════════ The demo */}
      <Section className="border-t border-edge-soft">
        <SectionHead
          eyebrow="See it happen"
          title="Your AI teammate read the wrong chart."
          lead="It sounds completely convincing. It checked one thing and skipped two. Open what it missed."
        />
        <div className="rise rise-1">
          <AiMistakeDemo />
        </div>
      </Section>

      {/* ══════════════════════════════════════════ Promises */}
      <Section className="border-t border-edge-soft bg-deep">
        <SectionHead eyebrow="Our promises" title="Four rules we do not break." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((p, i) => {
            const Icon = p.icon;
            return (
              <Card key={p.title} hover className={`rise rise-${i + 1} p-5`}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-wash text-signal">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <h3 className="mt-3.5 text-[15px] font-semibold tracking-[-0.015em]">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{p.body}</p>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* ══════════════════════════════════════════ Close */}
      <Section>
        <div className="rise card-raised relative overflow-hidden p-8 text-center sm:p-14">
          <div className="mesh absolute inset-0 -z-10" aria-hidden="true" />
          <h2 className="headline mx-auto measure-wide">
            Give it sixteen minutes. You will learn something about yourself.
          </h2>
          <p className="measure mx-auto mt-4 text-[15.5px] leading-relaxed text-muted">
            You get your full results either way, and you keep them.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/challenge" className={buttonStyles({ size: "lg" })}>
              Take the test
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href="/employer"
              className={buttonStyles({ variant: "outline", size: "lg" })}
            >
              See the employer view
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
