import Link from "next/link";
import { isDemoMode } from "@/lib/config";
import { Wordmark } from "./mark";
import { ThemeToggle } from "./theme-toggle";

/** Plain labels. Somebody arriving cold should know where each one goes. */
const LINKS = [
  { href: "/challenge", label: "Take the test" },
  { href: "/passport", label: "My results" },
  { href: "/employer", label: "For employers" },
  { href: "/verify", label: "Check a passport" },
];

export function SiteHeader() {
  const demo = isDemoMode();
  return (
    <header className="sticky top-0 z-40 border-b border-edge-soft bg-void/85 backdrop-blur-xl">
      <div className="mx-auto flex h-15 max-w-6xl items-center gap-3 px-5 py-3">
        <Link href="/" aria-label="PROOFOS home" className="shrink-0">
          <Wordmark />
        </Link>

        <nav className="ml-auto hidden items-center gap-0.5 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-raise hover:text-bright"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-2">
          {demo && (
            <span
              className="chip hidden border-signal-deep/40 text-signal sm:inline-flex"
              title="Running on built-in sample answers so you can try everything without setting anything up."
            >
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-signal" />
              demo mode
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>

      <div className="overflow-x-auto border-t border-edge-soft md:hidden">
        <nav className="flex gap-1 px-4 py-2" aria-label="Main, mobile">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-muted"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
