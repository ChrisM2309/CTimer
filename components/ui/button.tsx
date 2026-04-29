import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "warm" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--color-red)] bg-[var(--color-red)] text-[var(--color-light)] shadow-[0_16px_34px_rgba(197,23,46,.24)] hover:bg-[var(--color-red-dark)]",
  secondary:
    "border-[var(--color-graphite)] bg-[var(--color-graphite)] text-[var(--color-light)] hover:bg-white hover:text-[var(--color-graphite)]",
  warm:
    "border-[var(--color-warm)] bg-[var(--color-soft-warm)] text-[var(--color-graphite)] hover:border-[var(--color-graphite)]",
  ghost:
    "border-white/15 bg-white/[.04] text-[var(--color-light)] hover:border-[var(--color-warm)] hover:bg-[rgba(201,176,138,.12)]",
  danger:
    "border-[rgba(197,23,46,.48)] bg-[rgba(197,23,46,.12)] text-[var(--color-red)] hover:bg-[var(--color-red)] hover:text-[var(--color-light)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-[11px]",
  md: "min-h-11 px-4 text-xs",
  lg: "min-h-13 px-6 text-sm",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-[16px] border font-black uppercase tracking-[.14em] transition duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-red)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45";

export function Button({
  className,
  size = "md",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
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
    <Link
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}
