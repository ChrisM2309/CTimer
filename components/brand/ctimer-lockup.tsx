import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function CTimerLockup({
  className,
  compact = false,
  href = "/",
  light = false,
}: {
  className?: string;
  compact?: boolean;
  href?: string;
  light?: boolean;
}) {
  return (
    <Link
      aria-label="CTimer, una herramienta de C3"
      className={cn("inline-flex items-center gap-3", className)}
      href={href}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          compact ? "size-8" : "size-10",
          light ? "" : "rounded-[10px] bg-[var(--color-surface-dark)] p-1",
        )}
      >
        <Image
          alt="Logo oficial de C3"
          className="size-full object-contain"
          height={1600}
          priority
          src="/brand/logo-c3-claro-con-color.png"
          width={1600}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "brand-display text-xl font-extrabold tracking-[-.04em]",
            light ? "text-[var(--color-foreground-on-dark)]" : "text-[var(--color-foreground)]",
          )}
        >
          CTimer
        </span>
        {!compact ? (
          <span
            className={cn(
              "mt-1 text-[10px] font-semibold uppercase tracking-[.13em]",
              light ? "text-white/65" : "text-[var(--color-foreground-muted)]",
            )}
          >
            Una herramienta de C3
          </span>
        ) : null}
      </span>
    </Link>
  );
}
