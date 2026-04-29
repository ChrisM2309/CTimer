"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Loader2, QrCode, ShieldCheck } from "lucide-react";
import QRCode from "qrcode";
import { ActionLink, Button } from "@/components/ui/button";
import { Field, SelectField, TextInput } from "@/components/ui/field";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { ScheduleEditor } from "@/components/timer/schedule-editor";
import { createDefaultSchedule } from "@/lib/schedule";
import type { CreateTimerResult, ScheduleValues, SponsorMode } from "@/lib/types";
import { createTimer, ensureAnonymousSession, isSupabaseConfigured } from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/utils";

export function CreateTimerClient() {
  const defaultSchedule = useMemo(() => createDefaultSchedule(), []);
  const [name, setName] = useState("Evento principal");
  const [schedule, setSchedule] = useState<ScheduleValues | null>(defaultSchedule);
  const [rotationSeconds, setRotationSeconds] = useState(10);
  const [sponsorMode, setSponsorMode] = useState<SponsorMode>("ordered");
  const [result, setResult] = useState<CreateTimerResult | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const links = useMemo(() => {
    if (!result || typeof window === "undefined") return null;

    const origin = window.location.origin;
    return {
      admin: `${origin}/admin?code=${result.code}&token=${result.admin_token}`,
      join: `${origin}/join?code=${result.code}`,
    };
  }, [result]);

  useEffect(() => {
    if (!links?.join) return;

    QRCode.toDataURL(links.join, {
      margin: 1,
      scale: 7,
      color: {
        dark: "#161616",
        light: "#f3e7d9",
      },
    }).then(setQrDataUrl);
  }, [links?.join]);

  const handleCreate = useCallback(async () => {
    if (!schedule) {
      setError("Revisa la programación antes de crear el timer.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await ensureAnonymousSession();
      const created = await createTimer({
        name,
        rotationSeconds,
        schedule,
        sponsorMode,
      });
      setResult(created);
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [name, rotationSeconds, schedule, sponsorMode]);

  function copy(value: string) {
    navigator.clipboard?.writeText(value);
  }

  return (
    <main className="app-shell light-grid min-h-screen px-5 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.24em] text-[var(--color-red)]">
              Crear sesión
            </p>
            <h1 className="mt-3 text-5xl font-black uppercase leading-[.95] tracking-normal md:text-7xl">
              Nuevo CTIMER
            </h1>
          </div>
          <ActionLink href="/" variant="secondary">
            Volver al home
          </ActionLink>
        </div>

        {!isSupabaseConfigured() ? (
          <Panel tone="sand" className="mb-6">
            Faltan las variables públicas de Supabase. Configura
            `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
          </Panel>
        ) : null}

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.18fr)_minmax(360px,.82fr)] 2xl:items-start">
          <Panel className="p-5 sm:p-6 md:p-7">
            <SectionHeader
              eyebrow="Master setup"
              title="Configuración base"
              description="Define el nombre visible, la programación y los ajustes iniciales de la franja de sponsors."
            />

            <div className="grid gap-6">
              <Field label="Nombre del timer">
                <TextInput
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. Nuevo timer"
                  value={name}
                />
              </Field>

              <ScheduleEditor initial={defaultSchedule} onChange={setSchedule} />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <Field label="Modo sponsor">
                  <SelectField
                    onChange={(event) => setSponsorMode(event.target.value as SponsorMode)}
                    value={sponsorMode}
                  >
                    <option value="ordered">Ordenado</option>
                    <option value="random">Aleatorio</option>
                  </SelectField>
                </Field>
                <Field label="Rotación (segundos)">
                  <TextInput
                    max={120}
                    min={3}
                    onChange={(event) =>
                      setRotationSeconds(Number.parseInt(event.target.value, 10) || 10)
                    }
                    type="number"
                    value={rotationSeconds}
                  />
                </Field>
              </div>

              {error ? (
                <div className="rounded-[20px] border border-[rgba(197,23,46,.25)] bg-[rgba(197,23,46,.08)] p-4 text-sm font-semibold text-[var(--color-red)]">
                  {error}
                </div>
              ) : null}

              <Button disabled={loading || !schedule || !name.trim()} onClick={handleCreate}>
                {loading ? <Loader2 className="animate-spin" size={16} aria-hidden /> : null}
                Crear timer
              </Button>
            </div>
          </Panel>

          <Panel className="p-5 sm:p-6 2xl:self-start" tone="dark">
            <SectionHeader
              eyebrow="Output"
              title="Accesos"
              description="El token admin se muestra una sola vez. Guarda el link Master."
              tone="dark"
            />

            {result && links ? (
              <div className="grid gap-4">
                <div className="rounded-[28px] border border-[rgba(201,176,138,.36)] bg-[rgba(201,176,138,.1)] p-5">
                  <p className="text-[11px] font-black uppercase tracking-[.18em] text-[var(--color-warm)]">
                    Código viewer
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                    <strong className="text-5xl font-black tracking-[.08em]">
                      {result.code}
                    </strong>
                    <Button variant="ghost" onClick={() => copy(result.code)}>
                      <Copy size={16} aria-hidden />
                      Copiar
                    </Button>
                  </div>
                </div>

                {qrDataUrl ? (
                  <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/[.05] p-5 sm:grid-cols-[180px_1fr] sm:items-center">
                    <img
                      alt="QR para entrar al timer"
                      className="w-full rounded-[20px]"
                      src={qrDataUrl}
                    />
                    <div>
                      <QrCode className="mb-3 text-[var(--color-red)]" aria-hidden />
                      <p className="text-sm font-semibold leading-6 text-white/66">
                        Este QR abre directamente el viewer con el código de sesión.
                      </p>
                    </div>
                  </div>
                ) : null}

                <LinkRow label="Viewer link" onCopy={copy} value={links.join} />
                <LinkRow label="Admin link" onCopy={copy} value={links.admin} />
                <div className="rounded-[24px] border border-white/10 bg-white/[.04] p-4 text-sm leading-6 text-white/62">
                  <ShieldCheck className="mb-2 text-[var(--color-warm)]" aria-hidden />
                  El token no se guarda en texto plano. La base solo conserva su hash.
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[.04] p-8 text-sm leading-6 text-white/55 xl:min-h-[280px]">
                Al crear la sesión aparecerán el código, el link viewer, el QR y
                el link Master con token.
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}

function LinkRow({
  label,
  onCopy,
  value,
}: {
  label: string;
  onCopy: (value: string) => void;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[.04] p-4">
      <p className="mb-2 text-[11px] font-black uppercase tracking-[.16em] text-white/45">
        {label}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all rounded-[16px] bg-black/35 px-3 py-2 text-xs text-white/78">
          {value}
        </code>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onCopy(value)} type="button">
            <Copy size={16} aria-hidden />
            Copiar
          </Button>
          <ActionLink
            href={value}
            rel="noreferrer noopener"
            target="_blank"
            variant="ghost"
          >
            <ExternalLink size={16} aria-hidden />
            Abrir
          </ActionLink>
        </div>
      </div>
    </div>
  );
}
