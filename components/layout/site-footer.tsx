import Link from "next/link";
import { Mark } from "@/components/mark";

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
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-edge-soft bg-deep">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Mark size={26} />
            <p className="measure mt-3 text-[13.5px] leading-relaxed text-muted">
              We keep the proof, and work out the score from it. Never the other way round.
            </p>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-dim">
              <span>No camera</span>
              <span>No screen recording</span>
              <span>You own your results</span>
            </p>
          </div>

          {GROUPS.map((g) => (
            <nav key={g.title} aria-label={g.title}>
              <p className="eyebrow">{g.title}</p>
              <ul className="mt-3 space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-muted transition-colors hover:text-signal"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-edge-soft pt-6 text-[12px] text-dim">
          <span>PROOFOS</span>
          <a
            href="/.well-known/did.json"
            className="transition-colors hover:text-signal"
          >
            Public key
          </a>
          <a
            href="https://github.com/chanchall26/BUILD-WITH-VEXITE-PROOFOS"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-signal"
          >
            Source code
          </a>
          <span className="ml-auto">MIT licensed</span>
        </div>
      </div>
    </footer>
  );
}
