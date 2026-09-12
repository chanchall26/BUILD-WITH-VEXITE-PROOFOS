"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Wordmark } from "@/components/mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Plain labels. Somebody arriving cold should know where each one goes. */
const LINKS = [
  { href: "/challenge", label: "Take the test" },
  { href: "/passport", label: "My results" },
  { href: "/employer", label: "For employers" },
  { href: "/verify", label: "Check a passport" },
  { href: "/engine", label: "How it works" },
];

/** Scroll position lives in the browser, so it is read as external state. */
function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function SiteHeader({ demoMode }: { demoMode: boolean }) {
  const pathname = usePathname();
  // The drawer remembers which route it was opened on, so a route change
  // closes it by definition. A drawer that survives navigation is a trap, and
  // deriving it beats syncing it shut in an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  // Glass at the top, solid with a border once the page moves under it.
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 8,
    () => false,
  );

  // Never leave the page scrollable behind an open drawer.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Always a visible bar. It reads as the header from the first pixel,
          and gains a shadow once the page moves underneath it. */}
      <header
        className={cn(
          "header-bar sticky top-0 z-50 border-b transition-shadow duration-300",
          scrolled ? "border-edge shadow-[var(--shadow-card)]" : "border-edge-soft",
        )}
      >
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-3 px-5">
          <Link href="/" aria-label="PROOFOS home" className="shrink-0">
            <Wordmark size={30} />
          </Link>

          <nav className="ml-7 hidden items-center gap-1 lg:flex" aria-label="Main">
            {LINKS.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "nav-link relative rounded-xl px-3.5 py-2 text-[14px] transition-colors",
                    active
                      ? "bg-wash text-signal"
                      : "text-muted hover:bg-raise hover:text-bright",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {demoMode && (
              <span
                className="badge badge-brand hidden xl:inline-flex"
                title="Running on built-in sample answers, so you can try everything without setting anything up."
              >
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-signal" />
                demo mode
              </span>
            )}
            <ThemeToggle />
            <Link
              href="/challenge"
              className={buttonStyles({ size: "sm", className: "hidden sm:inline-flex" })}
            >
              Take the test
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-edge text-muted transition-colors hover:text-bright lg:hidden"
            >
              <Menu size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer ---------------------------------------------------- */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            className="absolute inset-0 bg-void/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <div className="slide-up absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-edge bg-slab p-5 pb-8 shadow-[var(--shadow-pop)]">
            <div className="mb-4 flex items-center">
              <Wordmark size={26} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-edge text-muted"
              >
                <X size={17} />
              </button>
            </div>

            <nav aria-label="Mobile" className="space-y-1">
              {LINKS.map((l) => {
                const active = isActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "nav-link flex items-center rounded-xl px-4 py-3.5 text-[15.5px] transition-colors",
                      active ? "bg-wash text-signal" : "text-bright hover:bg-raise",
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <Link
              href="/challenge"
              className={buttonStyles({ size: "lg", full: true, className: "mt-4" })}
            >
              Take the test
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
