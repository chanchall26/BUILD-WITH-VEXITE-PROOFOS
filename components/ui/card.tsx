import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Cards carry almost every surface in the product, so the variants are
 * deliberately few: flat for dense lists, raised for anything that should feel
 * like an object, and an optional accent stripe to colour-code a category.
 */
export function Card({
  children,
  className,
  raised = false,
  hover = false,
  accent,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
  hover?: boolean;
  /** A CSS colour, usually a --color-skill-* variable. */
  accent?: string;
  as?: "div" | "li" | "section" | "article";
}) {
  return (
    <Tag
      className={cn(
        raised ? "card-raised" : "card",
        hover && "card-hover",
        accent && "relative overflow-hidden",
        className,
      )}
    >
      {accent && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: accent }}
        />
      )}
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  hint,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold tracking-[-0.015em]">{title}</h3>
        {hint && <p className="mt-1 text-[13px] leading-relaxed text-muted">{hint}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
