import { ArrowRight, MonitorPlay, Plus, ShieldCheck } from "lucide-react";
import { ActionLink, Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

export default function Home() {
  return (
    <main className="app-shell">
      <section className="tech-grid red-corner min-h-[72vh] px-5 py-6 text-[var(--color-light)] md:px-8 md:py-10">
        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div className="py-10 md:py-20">
            <p className="mb-5 text-xs font-black uppercase tracking-[.28em] text-white/62">
              CTIMER · sincronización para eventos
            </p>
            <h1 className="max-w-5xl text-[clamp(4.2rem,12vw,9rem)] font-black uppercase leading-[.86] tracking-[-.06em]">
              Timer <span className="text-[var(--color-red)]">preciso</span> para multi-salón.
            </h1>
            <p className="mt-7 max-w-3xl text-lg font-medium leading-8 text-white/76">
              Crea un código, proyecta el link en varios salones y controla tiempo,
              mensajes y sponsors desde un único panel Master.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/create" size="lg">
                <Plus size={18} aria-hidden />
                Crear timer
              </ActionLink>
              <ActionLink href="#join" size="lg" variant="ghost">
                Unirme
                <ArrowRight size={18} aria-hidden />
              </ActionLink>
            </div>
          </div>

          <Panel tone="dark" className="relative z-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.22em] text-[var(--color-warm)]">
                  Live system
                </p>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-.04em]">
                  Operación sincronizada
                </h2>
              </div>
              <MonitorPlay className="text-[var(--color-red)]" size={34} aria-hidden />
            </div>
            <div className="grid gap-3">
              {[
                ["01", "1 código por sesión", "Viewers entran por link, QR o código manual."],
                ["02", "Master único", "Start, pause, reset, mensajes y sponsor strip."],
                ["03", "Resiliente", "Cuenta local y re-sincroniza con server time."],
              ].map(([step, title, copy]) => (
                <div
                  className="grid grid-cols-[58px_1fr] gap-4 rounded-[24px] border border-white/10 bg-white/[.045] p-4"
                  key={step}
                >
                  <span className="grid size-11 place-items-center rounded-full bg-[var(--color-red)] text-xs font-black">
                    {step}
                  </span>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[.12em]">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-white/60">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      <section className="light-grid px-5 py-10 md:px-8" id="join">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[.92fr_1.08fr]">
          <Panel>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[.22em] text-[var(--color-red)]">
              Acceso rápido
            </p>
            <h2 className="text-4xl font-black uppercase leading-none tracking-[-.045em]">
              Entrar como viewer
            </h2>
            <form action="/join" className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label="Código de sesión">
                <TextInput
                  autoComplete="off"
                  inputMode="text"
                  maxLength={6}
                  name="code"
                  placeholder="ABC123"
                />
              </Field>
              <Button className="self-end" type="submit">
                Entrar
                <ArrowRight size={16} aria-hidden />
              </Button>
            </form>
          </Panel>

          <Panel tone="sand" className="grid content-between gap-6">
            <div>
              <ShieldCheck size={34} className="mb-5 text-[var(--color-red)]" aria-hidden />
              <h2 className="text-3xl font-black uppercase tracking-[-.04em]">
                Diseñado para eventos reales.
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-black/62">
                El modo programado funciona sin el admin abierto. Las pantallas
                mantienen el conteo con el último estado conocido y ajustan al
                reconectar.
              </p>
            </div>
            <ActionLink href="/create" variant="secondary">
              Crear nueva sesión
              <Plus size={16} aria-hidden />
            </ActionLink>
          </Panel>
        </div>
      </section>
    </main>
  );
}
