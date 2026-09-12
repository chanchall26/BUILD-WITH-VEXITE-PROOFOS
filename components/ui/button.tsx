import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * One place that decides what a button looks like.
 *
 * Exported as a class helper as well as a component, because links styled as
 * buttons are common and wrapping next/link in a component just to restyle it
 * causes more problems than it solves.
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  full = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  className?: string;
} = {}) {
  return cn(
    "btn",
    `btn-${variant}`,
    size === "sm" && "btn-sm",
    size === "lg" && "btn-lg",
    full && "w-full",
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  /** Shown instead of the label while loading, so the button explains itself. */
  loadingLabel?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  full,
  loading = false,
  loadingLabel,
  icon,
  iconRight,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, full, className })}
    >
      {loading ? (
        <>
          <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
          {loadingLabel ?? children}
        </>
      ) : (
        <>
          {icon}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
}
