import Link from "next/link";
import { Mark } from "./mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-edge-soft bg-deep">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-[12.5px] text-dim md:flex-row md:items-center">
        <span className="inline-flex items-center gap-2">
          <Mark size={18} />
          PROOFOS — we keep the proof, and work out the score from it.
        </span>
        <nav className="flex flex-wrap gap-4 md:ml-auto" aria-label="Footer">
          <Link href="/demo" className="transition-colors hover:text-signal">
            Guided tour
          </Link>
          <Link href="/engine" className="transition-colors hover:text-signal">
            How it works
          </Link>
          <Link href="/verify" className="transition-colors hover:text-signal">
            Check a passport
          </Link>
          <a href="/.well-known/did.json" className="transition-colors hover:text-signal">
            Public key
          </a>
        </nav>
      </div>
    </footer>
  );
}
