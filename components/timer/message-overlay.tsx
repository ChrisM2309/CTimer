export function MessageOverlay({ text }: { text: string | null | undefined }) {
  if (!text) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-5 z-[var(--z-overlay)] mx-auto max-w-5xl rounded-[28px] border border-[rgb(51_190_172_/_42%)] bg-[var(--color-overlay)] px-6 py-5 text-center text-[var(--color-foreground-on-dark)] shadow-[var(--shadow-strong)] backdrop-blur md:top-8">
      <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[var(--color-accent)]">
        Mensaje del Master
      </p>
      <p className="mt-2 text-xl font-black uppercase leading-tight tracking-[-.02em] sm:text-3xl">
        {text}
      </p>
    </div>
  );
}
