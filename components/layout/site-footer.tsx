import { ArrowRight, CameraOff, Code2, KeyRound, MonitorOff, Scale, UserCheck } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/mark";
import { buttonStyles } from "@/components/ui/button";

const PROMISES = [
  { icon: CameraOff, label: "No camera" },
  { icon: MonitorOff, label: "No screen recording" },
  { icon: UserCheck, label: "You own your results" },
];

const GROUPS = [
  {
    title: "Product",
    links: [
      { href: "/challenge", label: "Take the test" },
      { href: "/passport", label: "My results" },
      { href: "/employer", label: "For employers" },
      { href: "/verify", label: "Check a passport" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/engine", label: "How it works" },
      { href: "/demo", label: "Guided tour" },
    ],
  },
  {
    title: "Open",
    links: [
      { href: "/.well-known/did.json", label: "Public key", icon: KeyRound },
      {
        href: "https://github.com/chanchall26/BUILD-WITH-VEXITE-PROOFOS",
        label: "Source code",
        icon: Code2,
        external: true,
      },
      { href: "https://opensource.org/license/mit", label: "MIT licensed", icon: Scale, external: true },
    ],
  },
];

const YEAR = 2026;

export function SiteFooter() {
  return (
    <footer className="relative mt-20 overflow-hidden border-t border-edge-soft bg-deep">
      {/* The same brand hairline the passport wears, so the page closes on it. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal to-transparent opacity-70"
      />
      <div className="mesh absolute inset-0 -z-10 opacity-40" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-5 pb-8 pt-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] lg:gap-10">
          {/* Brand ---------------------------------------------------------- */}
          <div>
            <Wordmark size={30} tagline />
            <p className="measure mt-5 font-display text-[17px] font-semibold leading-snug tracking-[-0.015em] text-bright">
              We keep the proof, and work out the score from it.{" "}
              <span className="bg-gradient-to-r from-signal to-violet bg-clip-text text-transparent">
                Never the other way round.
              </span>
            </p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {PROMISES.map((p) => {
                const Icon = p.icon;
                return (
                  <li
                    key={p.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-slab px-3 py-1.5 text-[12px] font-medium text-muted"
                  >
                    <Icon size={13} className="text-proof" aria-hidden="true" />
                    {p.label}
                  </li>
                );
              })}
            </ul>

            <Link href="/challenge" className={buttonStyles({ size: "sm", className: "mt-6" })}>
              Take the test
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {/* Links ---------------------------------------------------------- */}
          {GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <p className="eyebrow">{g.title}</p>
              <ul className="mt-4 space-y-2.5">
                {g.links.map((l) => {
                  const Icon = "icon" in l ? l.icon : null;
                  const cls =
                    "group inline-flex items-center gap-2 text-[13.5px] text-muted transition-colors hover:text-bright";
                  const inner = (
                    <>
                      {Icon && (
                        <Icon
                          size={14}
                          className="text-dim transition-colors group-hover:text-signal"
                          aria-hidden="true"
                        />
                      )}
                      <span className="underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-signal">
                        {l.label}
                      </span>
                    </>
                  );
                  return (
                    <li key={l.href}>
                      {"external" in l && l.external ? (
                        <a href={l.href} target="_blank" rel="noreferrer noopener" className={cls}>
                          {inner}
                        </a>
                      ) : (
                        <Link href={l.href} className={cls}>
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        {/* Legal ------------------------------------------------------------ */}
        <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-edge-soft pt-6 text-[12px] text-dim">
          <span className="wordmark text-[12px] text-muted">
            PROOF<span className="wordmark-accent">OS</span>
          </span>
          <span>© {YEAR}</span>
          <span className="hidden sm:inline">Built in the open</span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            <Scale size={12} aria-hidden="true" />
            MIT licensed
          </span>
        </div>
      </div>
    </footer>
  );
}
