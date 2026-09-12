import Link from "next/link";
import { isDemoMode } from "@/lib/config";
import { Wordmark } from "./mark";

const LINKS = [
  { href: "/challenge", label: "Prove it" },
  { href: "/passport", label: "Passport" },
  { href: "/employer", label: "Employer" },
  { href: "/verify", label: "Verify" },
  { href: "/engine", label: "Gemini engine" },
];

export function SiteHeader() {
  const fixture = isDemoMode();
  return (
    <header className="sticky top-0 z-40 border-b border-edge-soft bg-void/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5">
        <Link href="/" aria-label="PROOFOS home">
          <Wordmark />
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-raise hover:text-bright"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {fixture && (
          <span
            className="chip ml-auto border-signal-deep/50 text-signal md:ml-2"
            title="No GEMINI_API_KEY is configured, so responses come from deterministic fixtures."
          >
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-signal" />
            fixture mode
          </span>
        )}
      </div>
      <div className="overflow-x-auto border-t border-edge-soft md:hidden">
        <nav className="flex gap-1 px-4 py-2" aria-label="Main, mobile">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] text-muted"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
