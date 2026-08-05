import { cn } from "@/lib/utils";

const tones = {
  danger: "border-[rgb(180_35_59_/_35%)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  live: "border-[rgb(22_133_116_/_35%)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
  neutral: "border-[var(--color-border)] bg-[var(--color-background-subtle)] text-[var(--color-foreground-muted)]",
  warning: "border-[rgb(154_107_18_/_35%)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  sand: "border-[rgb(51_190_172_/_40%)] bg-[var(--color-accent-soft)] text-[var(--color-foreground)]",
};

export function StatusBadge({ children, className, tone = "neutral" }: {
  children: React.ReactNode;
  className?: string;
  tone?: keyof typeof tones;
}) {
  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[.14em]", tones[tone], className)}>{children}</span>;
}
