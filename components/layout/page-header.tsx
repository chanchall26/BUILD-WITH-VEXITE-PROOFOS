"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Back navigation, on every page that is not the home page.
 *
 * Prefers a real destination over browser history, because history sends
 * people somewhere unpredictable when they arrived from a shared link. Falls
 * back to `router.back()` only when there is genuinely nowhere named to go.
 */
export function BackLink({
  href,
  label = "Back",
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const shared =
    "group inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-[13.5px] font-medium text-muted transition-colors hover:bg-raise hover:text-bright";

  const icon = (
    <ArrowLeft
      size={15}
      className="transition-transform duration-200 group-hover:-translate-x-0.5"
      aria-hidden="true"
    />
  );

  if (href) {
    return (
      <Link href={href} className={cn(shared, className)}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={cn(shared, className)}>
      {icon}
      {label}
    </button>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-dim">
        {crumbs.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={13} className="shrink-0" aria-hidden="true" />}
            {c.href && i < crumbs.length - 1 ? (
              <Link href={c.href} className="transition-colors hover:text-signal">
                {c.label}
              </Link>
            ) : (
              <span className={i === crumbs.length - 1 ? "text-muted" : undefined}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The top of every inner page: where you came from, where you are, what this
 * page is, and the one action that matters here.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  crumbs,
  actions,
  icon,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  back?: { href?: string; label?: string };
  crumbs?: Crumb[];
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("rise", className)}>
      {(back || crumbs) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {back && <BackLink href={back.href} label={back.label} />}
          {crumbs && crumbs.length > 0 && <Breadcrumbs crumbs={crumbs} />}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="headline mt-2 flex items-center gap-3">
            {icon && <span className="shrink-0 text-signal">{icon}</span>}
            <span className="min-w-0">{title}</span>
          </h1>
          {description && (
            <div className="measure-wide mt-3 text-[15px] leading-relaxed text-muted">
              {description}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div>}
      </div>
    </header>
  );
}
