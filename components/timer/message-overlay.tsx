export function MessageOverlay({ text }: { text: string | null | undefined }) {
  if (!text) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-5 z-30 mx-auto max-w-5xl rounded-[28px] border border-[rgba(201,176,138,.42)] bg-[rgba(22,22,22,.88)] px-6 py-5 text-center text-[var(--color-light)] shadow-[var(--shadow-strong)] backdrop-blur md:top-8">
      <p className="text-[11px] font-black uppercase tracking-[.22em] text-[var(--color-warm)]">
        Mensaje del Master
      </p>
      <p className="mt-2 text-xl font-black uppercase leading-tight tracking-[-.02em] sm:text-3xl">
        {text}
      </p>
    </div>
  );
}
