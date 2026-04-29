import Link from "next/link";

export function SiteFooter({
  floating = false,
  variant = "default",
}: {
  floating?: boolean;
  variant?: "default" | "micro";
}) {
  if (variant === "micro" && floating) {
    return (
      <footer className="pointer-events-none fixed inset-x-0 bottom-3 z-40 px-3 text-[var(--color-light)]">
        <div className="pointer-events-auto mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-white/10 bg-black/72 px-4 py-2 text-[11px] font-semibold backdrop-blur">
          <span className="font-black uppercase tracking-[.18em] text-[var(--color-warm)]">
            CTIMER
          </span>
          <a
            className="text-white/72 transition hover:text-[var(--color-warm)]"
            href="https://christophermarroquin.dev"
            rel="noreferrer noopener"
            target="_blank"
          >
            christophermarroquin.dev
          </a>
          <Link
            className="text-white/72 transition hover:text-[var(--color-warm)]"
            href="/"
          >
            Inicio
          </Link>
        </div>
      </footer>
    );
  }

  if (variant === "micro") {
    return (
      <footer className="border-t border-white/8 bg-[var(--color-graphite-900)] px-5 py-3 text-[var(--color-light)] md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-black uppercase tracking-[.18em] text-[var(--color-warm)]">
              CTIMER
            </span>
            <span className="text-white/45">Temporizador sincronizado</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-white/72">
            <a
              className="transition hover:text-[var(--color-warm)]"
              href="https://christophermarroquin.dev"
              rel="noreferrer noopener"
              target="_blank"
            >
              christophermarroquin.dev
            </a>
            <Link className="transition hover:text-[var(--color-warm)]" href="/">
              CTIMER Home
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-white/8 bg-[var(--color-graphite-900)] px-5 py-5 text-[var(--color-light)] md:px-8 md:py-6">
      <div className="mx-auto grid max-w-7xl gap-5 rounded-[22px] border border-white/8 bg-[var(--color-graphite-850)] p-4 sm:grid-cols-[1.15fr_.85fr] sm:p-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.22em] text-[var(--color-warm)]">
            CTIMER
          </p>
          <h2 className="mt-2 text-xl font-black uppercase tracking-[-.04em] sm:text-2xl">
            Sincronizacion para eventos
          </h2>
          <p className="mt-2.5 max-w-xl text-sm leading-6 text-white/68">
            CTIMER conecta salas, proyectores y equipos con un solo control de
            tiempo en vivo.
          </p>
        </div>

        <div className="grid content-start gap-2.5">
          <p className="text-[11px] font-black uppercase tracking-[.22em] text-[var(--color-warm)]">
            Sitios
          </p>
          <a
            className="text-sm font-semibold text-white/82 transition hover:text-[var(--color-warm)]"
            href="https://christophermarroquin.dev"
            rel="noreferrer noopener"
            target="_blank"
          >
            christophermarroquin.dev
          </a>
          <Link
            className="text-sm font-semibold text-white/82 transition hover:text-[var(--color-warm)]"
            href="/"
          >
            CTIMER Home
          </Link>
          <p className="pt-0.5 text-xs text-white/45">
            (c) {new Date().getFullYear()} CTIMER by Christopher Marroquin
          </p>
        </div>
      </div>
    </footer>
  );
}
