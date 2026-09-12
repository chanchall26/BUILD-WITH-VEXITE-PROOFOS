import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Accordion } from "@/components/ui/accordion";
import { buttonStyles } from "@/components/ui/button";

export const metadata = { title: "FAQ" };

/**
 * The questions people actually ask, grouped by who is asking.
 *
 * Answers are short and specific. Where the honest answer is "it depends" or
 * "we do not do that", it says so rather than reassuring.
 */

const GROUPS: { title: string; items: { id: string; title: string; body: React.ReactNode }[] }[] = [
  {
    title: "Taking the test",
    items: [
      {
        id: "how-long",
        title: "How long does it take?",
        body: "About sixteen minutes: two to read the situation, ten to do the work with your AI teammate, three for the trust quiz, and ninety seconds to explain two of your own decisions out loud or in writing.",
      },
      {
        id: "what-is-tested",
        title: "What is actually being tested?",
        body: "Not whether you can prompt. Whether you can catch an AI when it is confidently wrong. Your teammate gives you four wrong answers during the task. Whether each one reaches your finished work, and whether you asked for evidence before believing it, is what the record is built from.",
      },
      {
        id: "can-i-use-ai",
        title: "Can I use AI during the test?",
        body: "You are expected to. The AI teammate is part of the test. Using another tool outside the test is not blocked either, but leaving the test, and how much of your work arrives by paste, are counted and shown to you live.",
      },
      {
        id: "no-mic",
        title: "What if I do not want to speak?",
        body: "Type instead. The two defence answers can be spoken or written and are scored the same way. If you speak, the audio is turned into text and deleted straight away.",
      },
      {
        id: "interrupted",
        title: "What if I get interrupted?",
        body: "Nothing is lost and nothing is failed. The test pauses when you switch away and carries on when you come back. The time away is counted and shown on your record as a number. One interruption is a life happening, and the thresholds are set so it never produces a flag on its own.",
      },
    ],
  },
  {
    title: "The camera",
    items: [
      {
        id: "camera-why",
        title: "Why is the camera on?",
        body: "So an employer reading your record knows that the person explaining the work was the one sitting there doing it. That is the whole purpose. It is not there to watch your face or judge you.",
      },
      {
        id: "camera-detects",
        title: "What does the camera actually detect?",
        body: (
          <>
            Three things, and only these three. Whether the picture is blank, black or
            covered. Whether one face is in view, none, or more than one. And whether your
            eyes are on the screen, from eye-gaze geometry and head position. Each becomes a
            count in seconds, shown to you live: <em>looked away 4 times, 22 seconds</em>.
          </>
        ),
      },
      {
        id: "camera-stored",
        title: "Is the video recorded or sent anywhere?",
        body: "No. Every frame is analysed by a small model running inside your browser and discarded. Not one frame is uploaded, stored, or replayed. Only the counts leave your device. You can confirm this in the source code.",
      },
      {
        id: "camera-face",
        title: "Do you recognise my face or identify me?",
        body: "No. The model finds a face and eye landmarks; it does not produce a face template, an embedding, or an identity. It cannot tell who is in frame, only that one face is. Nothing is kept, so there is nothing to match against later.",
      },
      {
        id: "camera-look-away",
        title: "What happens if I look away, or close my eyes?",
        body: "A glance is nothing. Looking away for more than a moment starts a count, which stops when you look back. Reading notes, checking a second screen or thinking with your eyes closed all count as seconds away, and only very long totals produce a flag. The flag is a number, never an accusation.",
      },
      {
        id: "camera-off",
        title: "What if my camera turns off or goes black mid-test?",
        body: "The test pauses with a notice on screen and waits for you to turn it back on or uncover it. Nothing is lost. The seconds it was off count as blank time on your record.",
      },
      {
        id: "camera-refuse",
        title: "Can I refuse the camera?",
        body: "The camera has to be on to start the test, because it is part of what makes the record trustworthy. If you cannot allow it, the test will not start, and nothing about you is recorded.",
      },
      {
        id: "camera-emotion",
        title: "Do you measure attention, stress or emotion?",
        body: "No. Inferring emotion from a face in a hiring context is banned under the EU AI Act, and it is a useless signal anyway. We compute geometry, not feelings.",
      },
    ],
  },
  {
    title: "Results and scores",
    items: [
      {
        id: "ajq",
        title: "What is the AI Judgment Quotient?",
        body: "A single figure built from six skills: spotting the AI's mistakes, checking things, knowing when to trust it, sticking to the brief, explaining your decisions, and being the real author of your work. Each skill is calculated from recorded moments, and the headline is weighted by how fresh those moments are.",
      },
      {
        id: "calibration",
        title: "What is trust calibration?",
        body: "Ten things an AI said. Some are right but cautious, some are wrong but certain, and two would be unsafe to act on. We do not mark right and wrong. We check whether your confidence matched reality.",
      },
      {
        id: "how-scored",
        title: "How is my score calculated?",
        body: "Nothing is stored as a score. Every number is worked out fresh from the moments on your record, each quoted word for word with a timestamp and a fingerprint. Whether a planted mistake reached your work is decided by comparing text, character by character. The quiz is arithmetic. An AI is never allowed to set a number.",
      },
      {
        id: "unproven",
        title: "Why does a skill say unproven instead of a number?",
        body: "Because you never demonstrated it in this task. We would rather say so than invent a 50. With thin evidence the score is pulled towards the middle; only repeated, real evidence moves it to an extreme.",
      },
      {
        id: "hire",
        title: "Does PROOFOS decide whether I get hired?",
        body: "No. It never outputs hire, reject, pass or fail, and there is no threshold in the code that could. An employer sees what share of the role you have proven and the exact gap. A person decides, with the evidence in front of them.",
      },
      {
        id: "expire",
        title: "Does my passport expire?",
        body: "Each skill fades on its own timer. AI judgment halves in 120 days because the tools change fast. Communication halves in 540 days because writing clearly does not go stale. You can retake a test at any time to refresh it.",
      },
    ],
  },
  {
    title: "Ownership and sharing",
    items: [
      {
        id: "own",
        title: "Who owns my results?",
        body: "You do. The result is a signed credential that lives in your browser and wherever you choose to keep it. We store nothing on our servers.",
      },
      {
        id: "share",
        title: "Can I choose what an employer sees?",
        body: "Yes. Untick any skill before you share and it is not sent. The signature still checks out. The employer can see you held something back, but not what.",
      },
      {
        id: "revoke",
        title: "Can I withdraw a credential?",
        body: "Yes. Revocation is one bit in a public list. An employer checking your credential learns whether it was withdrawn without telling us which credential they asked about.",
      },
      {
        id: "verify",
        title: "How does an employer verify a credential?",
        body: (
          <>
            They paste it on the{" "}
            <Link href="/verify" className="text-signal hover:underline">
              verify page
            </Link>
            . It is checked in milliseconds against our public key, offline, with no account
            and no call back to us. Change one character and it fails.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <PageHeader
        back={{ href: "/", label: "Back to home" }}
        crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
        eyebrow="FAQ"
        title="Straight answers."
        description="Everything people ask before they take the test, and everything employers ask before they trust one. If a question is missing, the source code is public and the answer is in there."
      />

      <div className="mt-9 space-y-10">
        {GROUPS.map((g, i) => (
          <section key={g.title} className={`rise rise-${i + 1}`}>
            <p className="eyebrow mb-3">{g.title}</p>
            <Accordion items={g.items} />
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/challenge" className={buttonStyles({ size: "lg" })}>
          Prove you&apos;re real
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link href="/guide" className={buttonStyles({ variant: "outline", size: "lg" })}>
          Read the guide first
        </Link>
      </div>
    </div>
  );
}
