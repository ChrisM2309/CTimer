import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  tone = "light",
  ...props
}: HTMLAttributes<HTMLElement> & {
  tone?: "light" | "dark" | "sand";
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-xl)] border p-6 shadow-[var(--shadow-soft)]",
        tone === "light" &&
          "border-[var(--color-border)] bg-white text-[var(--color-graphite)]",
        tone === "dark" &&
          "border-white/10 bg-[var(--color-graphite-850)] text-[var(--color-light)] shadow-[var(--shadow-strong)]",
        tone === "sand" &&
          "border-[rgba(201,176,138,.42)] bg-[var(--color-soft-warm)] text-[var(--color-graphite)]",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  tone = "light",
}: {
  action?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
  tone?: "light" | "dark";
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-black uppercase tracking-[.22em] text-[var(--color-red)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-black uppercase leading-none tracking-[-.03em]">
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-3 max-w-2xl text-sm leading-6",
              tone === "dark" ? "text-white/68" : "text-black/62",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-black/15 bg-white/72 p-6 text-sm leading-6 text-black/62">
      <strong className="mb-1 block text-sm font-black uppercase tracking-[.12em] text-[var(--color-graphite)]">
        {title}
      </strong>
      {description}
    </div>
  );
}
