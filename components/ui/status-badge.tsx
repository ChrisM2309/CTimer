import { cn } from "@/lib/utils";

const tones = {
  danger: "border-[rgba(197,23,46,.35)] bg-[rgba(197,23,46,.12)] text-[var(--color-red)]",
  live: "border-emerald-500/30 bg-emerald-500/12 text-emerald-300",
  neutral:
    "border-black/10 bg-black/[.04] text-black/62",
  warning:
    "border-[rgba(201,176,138,.5)] bg-[rgba(201,176,138,.16)] text-[var(--color-warm)]",
  sand:
    "border-[rgba(201,176,138,.58)] bg-[rgba(243,231,217,.72)] text-[var(--color-graphite)]",
};

export function StatusBadge({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[.16em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
