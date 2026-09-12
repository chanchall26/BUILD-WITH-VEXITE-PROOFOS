import { Award, Bot, FileSearch, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Four steps, as a visual timeline rather than four paragraphs.
 *
 * Each step answers the only three questions anybody has about a process:
 * what happens, who does it, and how long it takes.
 */

const STEPS = [
  {
    n: 1,
    icon: FileSearch,
    colour: "var(--color-skill-verification)",
    title: "A job advert becomes a real task",
    body: "We read the advert and build a realistic task from that world, with real data and working tools.",
    who: "Employer",
    time: "1 min",
  },
  {
    n: 2,
    icon: Bot,
    colour: "var(--color-skill-ai)",
    title: "You work with an AI teammate",
    body: "It looks things up and answers with confidence. Four times it is wrong, and you can see what it checked.",
    who: "Candidate",
    time: "12 min",
  },
  {
    n: 3,
    icon: Scale,
    colour: "var(--color-skill-communication)",
    title: "We check your sense of when to trust it",
    body: "Ten AI answers to judge. Some right but cautious, some wrong but certain, two genuinely dangerous.",
    who: "Candidate",
    time: "4 min",
  },
  {
    n: 4,
    icon: Award,
    colour: "var(--color-skill-execution)",
    title: "It becomes proof you own",
    body: "Six skill scores, each opening into the moments behind it. Yours to reuse at any company.",
    who: "Both",
    time: "instant",
  },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        return (
          <Card
            as="li"
            key={s.n}
            hover
            accent={s.colour}
            className={`rise rise-${i + 1} p-6`}
          >
            <div className="flex items-start gap-3.5">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background: `color-mix(in srgb, ${s.colour} 13%, transparent)`,
                  color: s.colour,
                }}
                aria-hidden="true"
              >
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="numeral text-[12px] font-bold"
                    style={{ color: s.colour }}
                  >
                    {String(s.n).padStart(2, "0")}
                  </span>
                  <span className="badge text-[10px]">{s.who}</span>
                  <span className="badge text-[10px]">{s.time}</span>
                </div>
                <h3 className="mt-2 text-[16px] font-semibold tracking-[-0.015em]">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </ol>
  );
}
