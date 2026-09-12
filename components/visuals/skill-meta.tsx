import {
  BadgeCheck,
  Brain,
  Compass,
  Eye,
  Fingerprint,
  Hammer,
  MessageSquare,
  PenLine,
  ScanSearch,
  ShieldQuestion,
  Target,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart3,
  Braces,
  Briefcase,
  HeartHandshake,
  Megaphone,
  Microscope,
  Palette,
  Users,
  Wallet,
} from "lucide-react";
import type { AjqFacet, Dimension, Domain } from "@/lib/domain";

/**
 * One icon and one colour per concept, used everywhere that concept appears.
 *
 * Consistency here is what lets somebody recognise "verification" on the
 * results page from having seen it on the home page, without reading a word.
 */

export const SKILL_META: Record<
  Dimension,
  { icon: LucideIcon; colour: string; short: string; plain: string }
> = {
  ai_judgment: {
    icon: Brain,
    colour: "var(--color-skill-ai)",
    short: "AI judgment",
    plain: "Spotting when the AI is wrong",
  },
  reasoning: {
    icon: Compass,
    colour: "var(--color-skill-reasoning)",
    short: "Reasoning",
    plain: "Telling cause from coincidence",
  },
  execution: {
    icon: Hammer,
    colour: "var(--color-skill-execution)",
    short: "Getting it done",
    plain: "Finishing the actual job",
  },
  verification: {
    icon: ScanSearch,
    colour: "var(--color-skill-verification)",
    short: "Checking",
    plain: "Asking for proof before acting",
  },
  communication: {
    icon: MessageSquare,
    colour: "var(--color-skill-communication)",
    short: "Explaining",
    plain: "Making it clear to the next person",
  },
  authorship: {
    icon: Fingerprint,
    colour: "var(--color-skill-authorship)",
    short: "It's really yours",
    plain: "Evidence you did the work",
  },
};

export const FACET_META: Record<
  AjqFacet,
  { icon: LucideIcon; colour: string; question: string }
> = {
  detect: {
    icon: Eye,
    colour: "var(--color-skill-ai)",
    question: "Do you notice when it's wrong?",
  },
  question: {
    icon: ShieldQuestion,
    colour: "var(--color-skill-reasoning)",
    question: "Do you push back on weak claims?",
  },
  verify: {
    icon: ScanSearch,
    colour: "var(--color-skill-verification)",
    question: "Do you ask to see the proof?",
  },
  direct: {
    icon: Compass,
    colour: "var(--color-skill-execution)",
    question: "Can you steer it the right way?",
  },
  correct: {
    icon: PenLine,
    colour: "var(--color-skill-communication)",
    question: "Can you fix what it got wrong?",
  },
  decide: {
    icon: Target,
    colour: "var(--color-skill-authorship)",
    question: "Do you know when not to trust it?",
  },
};

export const DOMAIN_META: Record<Domain, { icon: LucideIcon; blurb: string }> = {
  software: { icon: Braces, blurb: "Fix a live system under pressure" },
  data: { icon: BarChart3, blurb: "Find the story the numbers really tell" },
  product: { icon: Target, blurb: "Decide what to build and what to drop" },
  marketing: { icon: Megaphone, blurb: "Judge a campaign on the evidence" },
  finance: { icon: Wallet, blurb: "Check the model before you trust it" },
  support: { icon: HeartHandshake, blurb: "Solve it without making it worse" },
  hr: { icon: Users, blurb: "Handle a people problem carefully" },
  design: { icon: Palette, blurb: "Defend a design decision" },
  research: { icon: Microscope, blurb: "Separate finding from guessing" },
};

export const FALLBACK_DOMAIN = { icon: Briefcase, blurb: "A real task from your world" };

/** A skill icon in its own colour, on a soft tinted tile. */
export function SkillIcon({
  dimension,
  size = 18,
  tile = true,
}: {
  dimension: Dimension;
  size?: number;
  tile?: boolean;
}) {
  const meta = SKILL_META[dimension];
  const Icon = meta.icon;
  if (!tile) return <Icon size={size} style={{ color: meta.colour }} aria-hidden="true" />;
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl"
      style={{
        width: size * 2,
        height: size * 2,
        background: `color-mix(in srgb, ${meta.colour} 13%, transparent)`,
        color: meta.colour,
      }}
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  );
}

export function VerifiedSeal({ size = 16 }: { size?: number }) {
  return <BadgeCheck size={size} className="text-proof" aria-hidden="true" />;
}
