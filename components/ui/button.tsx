import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "warm" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-foreground-on-dark)] shadow-[0_12px_28px_rgb(32_82_152_/_22%)] hover:border-[var(--color-primary-hover)] hover:bg-[var(--color-primary-hover)]",
  secondary:
    "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-foreground-on-dark)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]",
  warm:
    "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-foreground)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]",
  ghost:
    "border-white/15 bg-white/[.04] text-[var(--color-foreground-on-dark)] hover:border-[var(--color-accent)] hover:bg-white/[.1]",
  danger:
    "border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-foreground-on-dark)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-[11px]",
  md: "min-h-11 px-4 text-xs",
  lg: "min-h-13 px-6 text-sm",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border font-bold uppercase tracking-[.12em] transition duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45";

export function Button({
  className,
  size = "md",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return <button className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)} {...props} />;
}

export function ActionLink({
  children,
  className,
  href,
  size = "md",
  variant = "primary",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <Link className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)} href={href} {...props}>
      {children}
    </Link>
  );
}
