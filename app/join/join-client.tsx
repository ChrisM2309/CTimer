"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Loader2, Maximize2, Minimize2 } from "lucide-react";
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const autoJoinedRef = useRef(false);
  const { bundle, connectionState, error: dataError, serverOffsetMs } =
    useTimerData(timerId);
  const hasSponsors = Boolean(bundle?.assets.some((asset) => asset.enabled));

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    handleFullscreenChange();

    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
        return;
      }

      await document.documentElement.requestFullscreen?.();
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(code);
  }

  if (!timerId) {
    return (
      <main className="viewer-shell grid min-h-screen place-items-center px-5 py-8">
        <Panel tone="dark" className="w-full max-w-xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-[var(--color-accent)]">
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
              <div className="rounded-[20px] border border-[rgb(180_35_59_/_30%)] bg-[var(--color-danger-soft)] p-4 text-sm font-semibold text-[var(--color-danger)]">
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
          <Loader2 className="mx-auto animate-spin text-[var(--color-accent)]" size={34} aria-hidden />
          <p className="mt-4 text-sm font-black uppercase tracking-[.18em] text-white/60">
            Sincronizando sesión
          </p>
          {dataError ? (
            <p className="mt-3 max-w-md text-sm leading-6 text-[var(--color-danger)]">
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

      <div className="viewer-frame">
        <header className="viewer-toolbar relative z-20">
          <div className="viewer-toolbar__meta">
            <ConnectionStatus className="viewer-connection-status" state={connectionState} />
            <button
              aria-label={`Copiar código público ${bundle.timer.code}`}
              className="viewer-code-button"
              onClick={copyCode}
              type="button"
            >
              <Copy size={14} aria-hidden />
              Código {bundle.timer.code}
            </button>
          </div>
          <Button
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Entrar en pantalla completa"}
            className="viewer-fullscreen-button"
            onClick={toggleFullscreen}
            size="sm"
            title={isFullscreen ? "Salir de pantalla completa" : "Entrar en pantalla completa"}
            variant="ghost"
          >
            {isFullscreen ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}
            {isFullscreen ? "Salir" : "Fullscreen"}
          </Button>
        </header>

        <TimerFace
          className="flex-1"
          contentAboveTimer={
            hasSponsors ? (
              <SponsorStrip
                assets={bundle.assets}
                className="viewer-sponsor"
                force={bundle.force}
                mode={bundle.timer.sponsor_mode}
                rotationSeconds={bundle.timer.rotation_seconds}
                serverOffsetMs={serverOffsetMs}
              />
            ) : null
          }
          serverOffsetMs={serverOffsetMs}
          showTenths
          timer={bundle.timer}
          variant="viewer"
          viewerHasSponsors={hasSponsors}
        />
      </div>
    </main>
  );
}
