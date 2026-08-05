import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ children, className, tone = "light", ...props }: HTMLAttributes<HTMLElement> & { tone?: "light" | "dark" | "sand" }) {
  return (
    <section className={cn("rounded-[var(--radius-xl)] border p-6 shadow-[var(--shadow-soft)]", tone === "light" && "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]", tone === "dark" && "border-white/10 bg-[var(--color-surface-dark)] text-[var(--color-foreground-on-dark)] shadow-[var(--shadow-strong)]", tone === "sand" && "border-[rgb(51_190_172_/_30%)] bg-[var(--color-accent-soft)] text-[var(--color-foreground)]", className)} {...props}>
      {children}
    </section>
  );
}

export function SectionHeader({ eyebrow, title, description, action, tone = "light" }: { action?: ReactNode; description?: string; eyebrow?: string; title: string; tone?: "light" | "dark" }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-[var(--color-primary)]">{eyebrow}</p> : null}
        <h2 className="brand-display text-2xl font-extrabold leading-none tracking-[-.03em]">{title}</h2>
        {description ? <p className={cn("mt-3 max-w-2xl text-sm leading-6", tone === "dark" ? "text-white/68" : "text-[var(--color-foreground-muted)]")}>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description }: { description: string; title: string }) {
  return <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-background-subtle)] p-6 text-sm leading-6 text-[var(--color-foreground-muted)]"><strong className="mb-1 block text-sm font-bold uppercase tracking-[.1em] text-[var(--color-foreground)]">{title}</strong>{description}</div>;
}
