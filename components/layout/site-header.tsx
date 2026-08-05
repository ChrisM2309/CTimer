import Link from "next/link";
import { CTimerLockup } from "@/components/brand/ctimer-lockup";

export function SiteHeader() {
  return (
    <header className="relative z-[var(--z-header)] border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-5 backdrop-blur md:px-8">
      <div className="mx-auto flex min-h-18 max-w-[var(--container-content)] items-center justify-between gap-5">
        <CTimerLockup compact />
        <nav aria-label="Navegación principal" className="flex items-center gap-1 sm:gap-2">
          <Link className="header-link hidden sm:inline-flex" href="/">
            Inicio
          </Link>
          <Link className="header-link" href="/create">
            <span className="hidden sm:inline">Crear </span>timer
          </Link>
          <Link className="header-link" href="/account">
            Cuenta
          </Link>
        </nav>
      </div>
    </header>
  );
}
