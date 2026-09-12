import Link from "next/link";

export const metadata = { title: "Guided tour" };

const PATH = [
  {
    t: "0:00",
    title: "Start with the question everyone already has",
    href: "/",
    label: "Home",
    say: "AI can fake an interview. Everyone is building tools to check the person on the call is real. Video apps are adding that for free. The question that actually decides a hire now is different: can I trust this person to catch the AI when it is wrong?",
    show: "The four statistics. Point at the small line underneath: those were looked up a moment ago, not typed in by us.",
  },
  {
    t: "0:25",
    title: "Turn a job advert into a real task",
    href: "/employer",
    label: "Employer",
    say: "An employer pastes their advert. We work out which six skills the job really needs. Notice it weights judgement higher than the advert does, because adverts always overdo the tools.",
    show: "Press 'Use an example advert', then 'Find who fits'. Read one of the 'why' lines out loud.",
  },
  {
    t: "0:55",
    title: "Meet the AI teammate",
    href: "/challenge",
    label: "The test",
    say: "The candidate does not get a chatbot. They get a teammate that looks things up and has opinions. Watch what it chooses to open.",
    show: "Use the ready-made test, agree, skim the situation, open the workspace. Ask: what is actually causing this?",
  },
  {
    t: "1:25",
    title: "The moment the whole thing turns on",
    href: "/challenge",
    label: "The test",
    say: "It checked the database chart, saw CPU at 82%, and decided the database is the problem. It never opened the chart that breaks it down by page, which shows one page broken and three completely fine. Almost every request touches the database, so its headline number means nothing. If I copy this, that goes on my record.",
    show: "Point at the 'they opened' row above the reply. Then type: that's correlation, not causation — what do the per-page numbers say?",
  },
  {
    t: "1:55",
    title: "The trust quiz, then explaining yourself",
    href: "/challenge",
    label: "The test",
    say: "Ten things an AI said. Some right but cautious, some wrong but certain, and two that would cost you a database. We are not marking right and wrong. We are checking whether their confidence matched reality. Then two questions about their own work, which you cannot paste an answer to.",
    show: "Answer three quiz items, continue, then type one answer. Mention the recording is deleted and typing scores the same.",
  },
  {
    t: "2:25",
    title: "Proof, not a score",
    href: "/passport",
    label: "Results",
    say: "This is the part that matters. Nothing here is saved as a number. Click anything and you get the exact moments behind it, quoted word for word, with a fingerprint. Skills nobody showed say unproven, not fifty.",
    show: "Click AI Judgment in the diagram, then Detect, then read one moment out loud including its fingerprint.",
  },
  {
    t: "2:50",
    title: "They own it, and can hold things back",
    href: "/passport",
    label: "Results",
    say: "This job cares about AI judgment and checking things. It does not need my communication score, so I do not send it. The employer can see I held something back. They cannot see what.",
    show: "Untick two skills, build the shareable version, copy it.",
  },
  {
    t: "3:10",
    title: "Check it, then break it",
    href: "/verify",
    label: "Check",
    say: "Checked in milliseconds, offline, with no account and no call back to us. Now change one character of it.",
    show: "Paste, check, read the millisecond number, then press 'Change one character'.",
  },
  {
    t: "3:30",
    title: "Close on the part nobody else shows",
    href: "/engine",
    label: "How it works",
    say: "Before you agree to a test, you should know exactly what it measures. Here is the whole list, including what we refuse to look at, and which parts the AI is not allowed to decide. We do not ask employers to trust an AI score. We show them what somebody actually did, and let a person decide.",
    show: "The two lists side by side, then 'which parts the AI is not allowed to decide'. Open the technical section if a judge asks.",
  },
];

const CAST = [
  {
    name: "Aditi R.",
    line: "Overall 79, AI judgment 84. Checked the per-page numbers before believing the database story, and asked for evidence twice.",
  },
  {
    name: "Rohan M.",
    line: "Overall 47, AI judgment 21. Fast and confident, and every conclusion came from the AI. Made a change that would have made things worse.",
  },
  {
    name: "K. Verma",
    line: "Overall 60, task quality 89, but authorship 14. The best write-up of the three. It arrived in one paste from outside the test, and the spoken answers named nothing specific to it.",
  },
];

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <div className="rise">
        <span className="eyebrow">Guided tour · three and a half minutes</span>
        <h1 className="headline mt-3">The whole thing, in order.</h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-muted">
          Everything below works without any setup, so it cannot fail on someone else&apos;s
          wifi. Each step says what to show and roughly what to say.
        </p>
      </div>

      <ol className="mt-9 space-y-3">
        {PATH.map((s) => (
          <li key={s.t} className="panel panel-interactive p-5">
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
            <p className="mt-3 border-l-2 border-signal-deep/50 pl-3 text-[14px] leading-relaxed">
              {s.say}
            </p>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-dim">On screen: {s.show}</p>
          </li>
        ))}
      </ol>

      <div className="panel-raised mt-10 p-6">
        <span className="eyebrow">The three example people, and why these three</span>
        <ul className="mt-4 space-y-3">
          {CAST.map((c) => (
            <li key={c.name} className="text-[14px] leading-relaxed">
              <span className="font-semibold text-signal">{c.name}</span>
              <span className="text-muted"> — {c.line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-edge-soft pt-4 text-[13.5px] leading-relaxed text-muted">
          Judged on the quality of the writing alone, the order is Verma, Aditi, Rohan.
          Judged on what the job actually needs, it flips: Aditi first, a conversation about
          Verma second, and Rohan nowhere near the on-call rota. That flip is the entire
          argument. Make sure the judges see it.
        </p>
      </div>

      <div className="panel mt-6 p-6">
        <span className="eyebrow">If something breaks on stage</span>
        <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
          <li>
            AI teammate goes quiet: it falls back to built-in answers automatically and still
            plays its part. Keep going.
          </li>
          <li>
            No microphone: press &ldquo;I&apos;d rather type it&rdquo;. Same marks, and the
            fallback is part of the accessibility story rather than an excuse.
          </li>
          <li>
            Scoring slow: the employer page already has three finished people in it, and the
            checker works on anything you copied earlier.
          </li>
          <li>Anything else: every page works on its own. Skip ahead and keep talking.</li>
        </ul>
      </div>
    </div>
  );
}
