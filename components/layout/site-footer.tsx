import Link from "next/link";
import { CTimerLockup } from "@/components/brand/ctimer-lockup";

export function SiteFooter({ floating = false, variant = "default" }: { floating?: boolean; variant?: "default" | "micro" }) {
  if (variant === "micro" && floating) {
    return <footer className="pointer-events-none fixed inset-x-0 bottom-3 z-40 px-3 text-[var(--color-foreground-on-dark)]"><div className="pointer-events-auto mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-white/10 bg-[var(--color-overlay)] px-4 py-2 text-[11px] font-semibold backdrop-blur"><span className="font-bold text-[var(--color-accent)]">CTimer</span><Link className="text-white/72 transition hover:text-[var(--color-accent)]" href="/">Inicio</Link></div></footer>;
  }

  if (variant === "micro") {
    return <footer className="border-t border-white/8 bg-[var(--color-surface-dark)] px-5 py-3 text-[var(--color-foreground-on-dark)] md:px-8"><div className="mx-auto flex max-w-[var(--container-content)] flex-wrap items-center justify-between gap-2 text-xs"><div className="flex items-center gap-3"><CTimerLockup compact light /><span className="hidden text-white/45 sm:inline">Cronómetros sincronizados</span></div><Link className="text-white/72 transition hover:text-[var(--color-accent)]" href="/">Inicio</Link></div></footer>;
  }

  return <footer className="border-t border-white/8 bg-[var(--color-surface-dark)] px-5 py-7 text-[var(--color-foreground-on-dark)] md:px-8 md:py-9"><div className="mx-auto grid max-w-[var(--container-content)] gap-6 rounded-[var(--radius-lg)] border border-white/10 bg-white/[.04] p-5 sm:grid-cols-[1.15fr_.85fr] sm:p-6"><div><CTimerLockup light /><p className="mt-4 max-w-xl text-sm leading-6 text-white/68">Cronómetros para competencias, eventos y equipos. Una herramienta de Competitive Coding Club.</p></div><div className="grid content-start gap-2.5 sm:justify-items-end"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[var(--color-accent)]">Organización</p><a className="text-sm font-semibold text-white/82 transition hover:text-[var(--color-accent)]" href="https://c3.com.sv/" rel="noreferrer noopener" target="_blank">Competitive Coding Club</a><Link className="text-sm font-semibold text-white/82 transition hover:text-[var(--color-accent)]" href="/">CTimer</Link><p className="pt-1 text-xs text-white/45">© {new Date().getFullYear()} C3 · El Salvador</p></div></div></footer>;
}
