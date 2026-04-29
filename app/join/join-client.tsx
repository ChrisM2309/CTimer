"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { ConnectionStatus } from "@/components/timer/connection-status";
import { MessageOverlay } from "@/components/timer/message-overlay";
import { SponsorStrip } from "@/components/timer/sponsor-strip";
import { TimerFace } from "@/components/timer/timer-face";
import { useTimerData } from "@/lib/use-timer-data";
import { ensureAnonymousSession, joinTimer } from "@/lib/supabase";
import { normalizeCode, safeErrorMessage } from "@/lib/utils";

export function JoinClient({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [timerId, setTimerId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoJoinedRef = useRef(false);
  const { bundle, connectionState, error: dataError, serverOffsetMs } =
    useTimerData(timerId);

  const handleJoin = useCallback(
    async (nextCode = code) => {
      const normalizedCode = normalizeCode(nextCode);
      if (!normalizedCode) {
        setError("Ingresa el código de sesión.");
        return;
      }

      setJoining(true);
      setError(null);

      try {
        await ensureAnonymousSession();
        const joinedTimerId = await joinTimer(normalizedCode);
        setCode(normalizedCode);
        setTimerId(joinedTimerId);
        window.history.replaceState(null, "", `/join?code=${normalizedCode}`);
      } catch (nextError) {
        setError(safeErrorMessage(nextError));
      } finally {
        setJoining(false);
      }
    },
    [code],
  );

  useEffect(() => {
    if (initialCode && !autoJoinedRef.current) {
      autoJoinedRef.current = true;
      handleJoin(initialCode);
    }
  }, [handleJoin, initialCode]);

  function requestFullscreen() {
    document.documentElement.requestFullscreen?.();
  }

  function copyCode() {
    navigator.clipboard?.writeText(code);
  }

  if (!timerId) {
    return (
      <main className="viewer-shell grid min-h-screen place-items-center px-5 py-8">
        <Panel tone="dark" className="w-full max-w-xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[.24em] text-[var(--color-warm)]">
            Viewer
          </p>
          <h1 className="text-5xl font-black uppercase leading-none tracking-[-.06em]">
            Unirme a timer
          </h1>
          <form
            className="mt-7 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleJoin();
            }}
          >
            <Field label="Código" tone="dark">
              <TextInput
                autoComplete="off"
                className="uppercase"
                maxLength={6}
                onChange={(event) => setCode(normalizeCode(event.target.value))}
                placeholder="ABC123"
                value={code}
              />
            </Field>
            {error ? (
              <div className="rounded-[20px] border border-[rgba(197,23,46,.25)] bg-[rgba(197,23,46,.12)] p-4 text-sm font-semibold text-[var(--color-red)]">
                {error}
              </div>
            ) : null}
            <Button disabled={joining} type="submit">
              {joining ? <Loader2 className="animate-spin" size={16} aria-hidden /> : null}
              Entrar
            </Button>
          </form>
        </Panel>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="viewer-shell grid min-h-screen place-items-center px-5 py-8">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[var(--color-red)]" size={34} aria-hidden />
          <p className="mt-4 text-sm font-black uppercase tracking-[.18em] text-white/60">
            Sincronizando sesión
          </p>
          {dataError ? (
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-red)]">
              {dataError}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="viewer-shell flex min-h-screen flex-col">
      <MessageOverlay text={bundle.message?.text} />

      <div className="flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="relative z-20 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <ConnectionStatus state={connectionState} />
            <button
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 py-2 text-[11px] font-black uppercase tracking-[.14em] text-white/68"
              onClick={copyCode}
              type="button"
            >
              <Copy size={14} aria-hidden />
              Código {bundle.timer.code}
            </button>
          </div>
          <Button onClick={requestFullscreen} size="sm" variant="ghost">
            <Maximize2 size={15} aria-hidden />
            Fullscreen
          </Button>
        </header>

        <TimerFace
          className="flex-1"
          contentAboveTimer={
            <SponsorStrip
              assets={bundle.assets}
              className="mx-auto w-full max-w-3xl rounded-[24px] border border-white/10 bg-black/45 px-4 py-4 backdrop-blur sm:px-5 sm:py-5"
              force={bundle.force}
              mode={bundle.timer.sponsor_mode}
              rotationSeconds={bundle.timer.rotation_seconds}
              serverOffsetMs={serverOffsetMs}
            />
          }
          serverOffsetMs={serverOffsetMs}
          timer={bundle.timer}
          variant="viewer"
        />
      </div>
    </main>
  );
}
