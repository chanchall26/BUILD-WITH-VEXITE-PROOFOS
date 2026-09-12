import Link from "next/link";
import { Mark } from "./mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-edge-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-[12.5px] text-dim md:flex-row md:items-center">
        <span className="inline-flex items-center gap-2">
          <Mark size={18} />
          PROOFOS — evidence is stored, scores are derived.
        </span>
        <nav className="flex flex-wrap gap-4 md:ml-auto" aria-label="Footer">
          <Link href="/demo" className="hover:text-bright">
            Demo path
          </Link>
          <Link href="/engine" className="hover:text-bright">
            How Gemini is used
          </Link>
          <Link href="/verify" className="hover:text-bright">
            Verify a passport
          </Link>
          <a href="/.well-known/did.json" className="hover:text-bright">
            did:web document
          </a>
        </nav>
      </div>
    </footer>
  );
}
