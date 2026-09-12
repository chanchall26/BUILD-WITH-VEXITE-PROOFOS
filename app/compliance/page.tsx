import {
  Ban,
  Camera,
  Check,
  Database,
  FileKey,
  Scale,
  ScanFace,
  ShieldCheck,
  Timer,
  UserX,
  X,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Compliance" };

/**
 * What the law asks of an AI hiring tool, and how each requirement is met.
 *
 * Written so a hiring manager, a works council, or a candidate can read it
 * without a lawyer. Where a claim is enforced in code or covered by a test,
 * it says so, because "we take privacy seriously" means nothing on its own.
 */

const OBLIGATIONS = [
  {
    icon: Scale,
    law: "EU AI Act · Annex III",
    title: "AI used to assess candidates is high-risk",
    body: "From August 2026, tools that evaluate or rank job candidates carry high-risk obligations: transparency to the person, human oversight, logging, and accuracy. We built for that from the start rather than patching it on.",
    how: "Every candidate sees exactly what is measured before agreeing. Every result is a list of evidence a human reads. There is no automatic decision anywhere in the code, and a test checks the output contains no hiring language.",
  },
  {
    icon: Ban,
    law: "EU AI Act · Article 5",
    title: "Emotion recognition in the workplace is banned",
    body: "Inferring emotions from face or voice in employment contexts is a prohibited practice. Some proctoring tools do exactly this and call it engagement scoring.",
    how: "The camera model outputs geometry only: is a face present, where are the eyes pointing, are the eyelids closed. No emotion, mood, attention score or personality guess is computed, stored or shown. Spoken answers become text and the audio is deleted.",
  },
  {
    icon: ScanFace,
    law: "EU AI Act · Article 5 · GDPR Art. 9",
    title: "No biometric identification",
    body: "Face data used to identify a person is special-category data. Matching a face to a stored template, or to a database, needs a legal basis most employers do not have.",
    how: "We never identify anyone. The face landmarker does not produce an embedding, a template or an identity. It cannot tell you who is in frame, only that one face is. Nothing from the camera is stored, so there is nothing to match against.",
  },
  {
    icon: Database,
    law: "GDPR · Art. 5(1)(c) · data minimisation",
    title: "Collect only what the purpose needs",
    body: "A hiring assessment needs the work, the reasoning, and enough context to trust the result. It does not need video, location, device fingerprints or a browsing history.",
    how: "What leaves the browser: the work, the messages to the AI teammate, quiz answers, two short transcripts, and simple counts. What never leaves it: video frames, audio, screen contents, keystrokes. Our servers store nothing; the result travels as a signed credential the candidate holds.",
  },
  {
    icon: UserX,
    law: "GDPR · Art. 22 · automated decisions",
    title: "No decision based solely on automated processing",
    body: "A candidate has the right not to be subject to a decision made only by a machine that significantly affects them.",
    how: "PROOFOS never outputs hire, reject, pass or fail. It shows coverage, names the gap, and quotes the evidence. The decision is made by a person with that in front of them.",
  },
  {
    icon: ShieldCheck,
    law: "GDPR · Art. 15 & 22(3) · explanation",
    title: "The right to an explanation",
    body: "A candidate can ask why they got a number and is entitled to a real answer.",
    how: "Nothing is stored as a score. Every number is calculated fresh from recorded moments, each quoted word for word with a timestamp, a fingerprint, and a label saying whether a computer or a model spotted it. Run it again and you get the same number.",
  },
];

const CAMERA_DOES = [
  "Runs a face-landmark model inside your browser, on your device",
  "Checks whether the picture is blank, black or covered",
  "Checks whether one face is in view, none, or more than one",
  "Checks whether the eyes are on the screen, using eye-gaze geometry",
  "Turns all of that into seconds and counts, shown to you live",
  "Puts those counts, and nothing else, on the record",
];

const CAMERA_NEVER = [
  "Sends a single video frame to any server",
  "Records, stores or replays any video",
  "Identifies you, matches your face, or builds a face template",
  "Guesses emotion, mood, attention, stress or personality",
  "Ends the test without telling you. Two clear warnings come first, on screen, and you can always stop yourself.",
  "Turns a count into a verdict. A person reads the numbers.",
];

const GUARANTEES = [
  {
    icon: FileKey,
    title: "Signed, verifiable offline",
    body: "Results are issued as a signed credential. Anyone can check it in milliseconds with the public key, with no account and no call back to us.",
    link: { href: "/.well-known/did.json", label: "Public key (DID)" },
  },
  {
    icon: Check,
    title: "Selective disclosure",
    body: "The candidate chooses which skills to send. The signature still verifies. The employer can see something was withheld, but not what.",
    link: { href: "/passport", label: "Try it on a passport" },
  },
  {
    icon: Timer,
    title: "Freshness and revocation",
    body: "Each skill fades on its own timer, so an old passport never reads as a fresh one. Revocation is one bit in a public list, checked without telling us which credential was asked about.",
    link: { href: "/verify", label: "Verify a credential" },
  },
];

export default function CompliancePage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <PageHeader
        back={{ href: "/", label: "Back to home" }}
        crumbs={[{ label: "Home", href: "/" }, { label: "Compliance" }]}
        eyebrow="Compliance"
        title="Built for the law that applies to AI in hiring, not around it."
        description="From August 2026, using AI to assess candidates in the EU is legally high-risk. This page lists what that asks of us and how each requirement is met, in code where possible. It is a plain-language summary, not legal advice."
      />

      {/* Obligations ------------------------------------------------------- */}
      <div className="rise rise-1 mt-9 grid gap-4 md:grid-cols-2">
        {OBLIGATIONS.map((o) => {
          const Icon = o.icon;
          return (
            <Card key={o.title} className="p-5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wash text-signal">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <span className="badge text-[10.5px]">{o.law}</span>
              </div>
              <h2 className="mt-3.5 text-[15.5px] font-semibold tracking-[-0.015em]">{o.title}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{o.body}</p>
              <div className="mt-3 rounded-lg border border-edge-soft bg-deep p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-proof">
                  How we meet it
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{o.how}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* The camera --------------------------------------------------------- */}
      <section className="rise rise-2 mt-12">
        <p className="eyebrow">The camera, in full</p>
        <h2 className="headline mt-2 measure-wide">
          On for the whole test. Processed on your device. Never stored.
        </h2>
        <p className="measure-wide mt-3 text-[15px] leading-relaxed text-muted">
          A camera in a hiring tool is only acceptable if the person can see everything it
          does, and it does nothing they cannot see. That is the standard we built to.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card accent="var(--color-proof)" className="p-5">
            <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
              <Camera size={15} className="text-proof" aria-hidden="true" />
              What the camera does
            </h3>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {CAMERA_DOES.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <Check size={14} className="mt-1 shrink-0 text-proof" aria-hidden="true" />
                  {i}
                </li>
              ))}
            </ul>
          </Card>
          <Card accent="var(--color-alert)" className="p-5">
            <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
              <Ban size={15} className="text-alert" aria-hidden="true" />
              What it never does
            </h3>
            <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-muted">
              {CAMERA_NEVER.map((i) => (
                <li key={i} className="flex gap-2.5">
                  <X size={14} className="mt-1 shrink-0 text-alert" aria-hidden="true" />
                  {i}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-dim">
          Thresholds are deliberately high. Glancing at notes or a keyboard is normal and
          never produces a flag. A flag appears only for long stretches, and reads as a
          count: &ldquo;eyes off the screen 12 times, 130 seconds in total&rdquo;, never
          as an accusation. This wording is covered by a test.
        </p>
      </section>

      {/* Guarantees --------------------------------------------------------- */}
      <section className="rise rise-3 mt-12">
        <p className="eyebrow">Technical guarantees</p>
        <h2 className="headline mt-2 measure-wide">What an auditor can check for themselves.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {GUARANTEES.map((g) => {
            const Icon = g.icon;
            return (
              <Card key={g.title} className="flex flex-col p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-raise text-signal">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[15px] font-semibold tracking-[-0.015em]">{g.title}</h3>
                <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted">{g.body}</p>
                <Link
                  href={g.link.href}
                  className="mt-3 text-[13px] font-medium text-signal transition-colors hover:underline"
                >
                  {g.link.label} →
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Data table --------------------------------------------------------- */}
      <section className="rise rise-4 mt-12">
        <p className="eyebrow">Data inventory</p>
        <h2 className="headline mt-2 measure-wide">Every piece of data, where it goes, how long it lives.</h2>
        <div className="mt-6 overflow-x-auto rounded-xl border border-edge-soft">
          <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-edge bg-deep">
                <th className="px-4 py-2.5 font-medium text-dim">Data</th>
                <th className="px-4 py-2.5 font-medium text-dim">Leaves the browser?</th>
                <th className="px-4 py-2.5 font-medium text-dim">Stored by us?</th>
                <th className="px-4 py-2.5 font-medium text-dim">Ends up in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-edge-soft]">
              {[
                ["The work you write", "Yes, for scoring", "No", "Your credential, as quoted moments"],
                ["Messages to the AI teammate", "Yes, for scoring", "No", "Your credential, as quoted moments"],
                ["Trust quiz answers", "Yes, for marking", "No", "Your credential, as a calibration score"],
                ["Spoken answers", "Text only; audio deleted after transcription", "No", "Your credential, as quoted moments"],
                ["Paste, edit, time and focus counts", "Yes", "No", "Your credential, as counts"],
                ["Camera counts (blank, no face, eyes away)", "Yes, as numbers", "No", "Your credential, as counts"],
                ["Camera video frames", "Never", "Never", "Nowhere. Discarded on your device."],
                ["Your face identity or template", "Never computed", "Never", "Nowhere"],
                ["Screen contents, keystrokes, location", "Never collected", "Never", "Nowhere"],
              ].map((row) => (
                <tr key={row[0]} className="align-top">
                  <td className="px-4 py-2.5 font-medium">{row[0]}</td>
                  <td className="px-4 py-2.5 text-muted">{row[1]}</td>
                  <td className="px-4 py-2.5 text-muted">{row[2]}</td>
                  <td className="px-4 py-2.5 text-muted">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/engine" className={buttonStyles({ size: "lg" })}>
          How it works
        </Link>
        <Link href="/faq" className={buttonStyles({ variant: "outline", size: "lg" })}>
          Read the FAQ
        </Link>
        <a
          href="https://github.com/chanchall26/BUILD-WITH-VEXITE-PROOFOS"
          target="_blank"
          rel="noreferrer noopener"
          className={buttonStyles({ variant: "ghost", size: "lg" })}
        >
          Read the source
        </a>
      </div>
    </div>
  );
}
