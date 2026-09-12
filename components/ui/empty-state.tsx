import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Nothing here yet, said properly.
 *
 * A blank panel makes people think something is broken. An empty state says
 * what is missing, why, and gives them the one button that fixes it.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-wash text-signal">
          {icon}
        </span>
      )}
      <p className="text-[16px] font-semibold tracking-[-0.015em]">{title}</p>
      {description && (
        <p className="measure mt-2 text-[13.5px] leading-relaxed text-muted">{description}</p>
      )}
      {(action || secondary) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {action}
          {secondary}
        </div>
      )}
    </div>
  );
}
