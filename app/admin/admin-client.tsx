"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Copy,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  Save,
  Square,
  Upload,
} from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, SelectField, TextArea, TextInput } from "@/components/ui/field";
import { EmptyState, Panel, SectionHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { ScheduleEditor } from "@/components/timer/schedule-editor";
import { TimerFace } from "@/components/timer/timer-face";
import { ConnectionStatus } from "@/components/timer/connection-status";
import { useTimerData } from "@/lib/use-timer-data";
import type {
  AdminAction,
  ScheduleValues,
  SponsorMode,
  TimerAssetRow,
} from "@/lib/types";
import {
  adminAction,
  adminClearForce,
  adminForceAsset,
  adminJoinTimer,
  adminSetMessage,
  adminSetSponsorMode,
  adminUpdateSchedule,
  adminUpsertAsset,
  ensureAnonymousSession,
  uploadSponsorImage,
} from "@/lib/supabase";
import { createDefaultSchedule } from "@/lib/schedule";
import { deriveTimerSnapshot, getServerNowMs, stateTone } from "@/lib/timer";
import { normalizeCode, safeErrorMessage } from "@/lib/utils";

type ConfirmKind = "start" | "reset" | "end" | null;

export function AdminClient({
  initialCode,
  initialToken,
}: {
  initialCode: string;
  initialToken: string;
}) {
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [token, setToken] = useState(initialToken.trim());
  const [timerId, setTimerId] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [schedule, setSchedule] = useState<ScheduleValues | null>(null);
  const [message, setMessage] = useState("");
  const [messageDurationSeconds, setMessageDurationSeconds] = useState(20);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [forceSeconds, setForceSeconds] = useState(20);
  const [sponsorMode, setSponsorMode] = useState<SponsorMode>("ordered");
  const [rotationSeconds, setRotationSeconds] = useState(10);
  const [viewerQrDataUrl, setViewerQrDataUrl] = useState<string | null>(null);

  const { bundle, connectionState, error: dataError, refresh, serverOffsetMs } =
    useTimerData(timerId);
  const messageClearTimerRef = useRef<number | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const timer = bundle?.timer ?? null;
  const assets = bundle?.assets ?? [];
  const defaultSchedule = useMemo(() => createDefaultSchedule(), []);
  const scheduleInitial = useMemo<ScheduleValues>(() => {
    if (!timer) return defaultSchedule;

    return {
      durationSeconds: timer.duration_seconds,
      endAt: timer.end_at,
      startAt: timer.start_at,
      timezone: timer.timezone,
    };
  }, [defaultSchedule, timer]);
  const snapshot = timer
    ? deriveTimerSnapshot(timer, getServerNowMs(serverOffsetMs))
    : null;
  const sponsorSettingsDirty = timer
    ? sponsorMode !== timer.sponsor_mode || rotationSeconds !== timer.rotation_seconds
    : false;
  const viewerLink = useMemo(() => {
    if (typeof window === "undefined" || !code) return "";
    return `${window.location.origin}/join?code=${code}`;
  }, [code]);
  const shouldConfirmStart = Boolean(
    snapshot &&
      snapshot.state !== "ended" &&
      snapshot.progress > 0 &&
      snapshot.progress < 1,
  );

  useEffect(() => {
    if (!timer) return;
    queueMicrotask(() => {
      setMessage(bundle?.message?.text ?? "");
      setSponsorMode(timer.sponsor_mode);
      setRotationSeconds(timer.rotation_seconds);
    });
  }, [bundle?.message?.text, timer]);

  useEffect(() => {
    return () => {
      if (messageClearTimerRef.current) {
        window.clearTimeout(messageClearTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!viewerLink) return;

    QRCode.toDataURL(viewerLink, {
      margin: 1,
      scale: 6,
      color: {
        dark: "#161616",
        light: "#f3e7d9",
      },
    }).then(setViewerQrDataUrl);
  }, [viewerLink]);

  const connectAdmin = useCallback(async () => {
    if (!code || !token) {
      setError("Agrega código y token admin.");
      return;
    }

    setBooting(true);
    setError(null);

    try {
      await ensureAnonymousSession();
      const joinedTimerId = await adminJoinTimer(code, token);
      setTimerId(joinedTimerId);
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBooting(false);
    }
  }, [code, token]);

  useEffect(() => {
    if (initialCode && initialToken) {
      queueMicrotask(() => {
        connectAdmin();
      });
    }
  }, [connectAdmin, initialCode, initialToken]);

  async function runAction(action: AdminAction) {
    setBusy(action);
    setError(null);

    try {
      await adminAction(code, token, action);
      await refresh();
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  function triggerStart() {
    if (shouldConfirmStart) {
      setConfirmKind("start");
      return;
    }
    runAction("start");
  }

  async function saveSchedule() {
    if (!schedule) {
      setError("La programación no es válida.");
      return;
    }

    setBusy("schedule");
    setError(null);

    try {
      await adminUpdateSchedule(code, token, schedule);
      await refresh();
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function saveMessage(text: string | null, autoClearSeconds?: number | null) {
    if (messageClearTimerRef.current) {
      window.clearTimeout(messageClearTimerRef.current);
      messageClearTimerRef.current = null;
    }

    setBusy("message");
    setError(null);

    try {
      await adminSetMessage(code, token, text);
      await refresh();

      if (text && autoClearSeconds) {
        messageClearTimerRef.current = window.setTimeout(async () => {
          try {
            await adminSetMessage(code, token, null);
            setMessage("");
            await refresh();
          } catch (nextError) {
            setError(safeErrorMessage(nextError));
          } finally {
            messageClearTimerRef.current = null;
          }
        }, autoClearSeconds * 1000);
      }
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function saveSponsorSettings() {
    setBusy("sponsor-settings");
    setError(null);

    try {
      await adminSetSponsorMode(code, token, sponsorMode, rotationSeconds);
      await refresh();
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function addUploadedAsset() {
    if (!uploadFile || !timerId) return;

    setBusy("asset-upload");
    setError(null);

    try {
      const url = await uploadSponsorImage(timerId, uploadFile);
      await adminUpsertAsset(code, token, {
        enabled: true,
        sortOrder: assets.length + 1,
        url,
      });
      await refresh();
      setUploadFile(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
      setBusy(null);
    }
  }

  async function forceAsset(assetId: string, mode: "timed" | "hold") {
    setBusy(`force-${assetId}`);
    setError(null);

    try {
      await adminForceAsset(code, token, assetId, mode, mode === "timed" ? forceSeconds : null);
      await refresh();
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  async function clearForce() {
    setBusy("clear-force");
    setError(null);

    try {
      await adminClearForce(code, token);
      await refresh();
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }

  function copyText(value: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value);
  }

  function openViewer() {
    if (!viewerLink) return;
    window.open(viewerLink, "_blank", "noopener,noreferrer");
  }

  function downloadViewerQr() {
    if (!viewerQrDataUrl || !code) return;

    const link = document.createElement("a");
    link.href = viewerQrDataUrl;
    link.download = `ctimer-${code.toLowerCase()}-viewer-qr.png`;
    link.click();
  }

  const confirm = {
    start: {
      description:
        "El timer ya está iniciado o avanzado. Si continúas con Start, se reiniciará desde ahora. ¿Confirmar?",
      label: "Sí, reiniciar ahora",
      title: "Confirmar Start",
    },
    end: {
      description:
        "Esto terminará la sesión y los viewers verán FINALIZADO. ¿Confirmar?",
      label: "Terminar",
      title: "Terminar sesión",
    },
    reset: {
      description:
        "Esto reiniciará el timer en TODAS las pantallas. ¿Confirmar?",
      label: "Reiniciar",
      title: "Reiniciar timer",
    },
  } as const;

  return (
    <main className="app-shell light-grid min-h-screen px-5 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.24em] text-[var(--color-red)]">
              Master panel
            </p>
            <h1 className="mt-3 text-5xl font-black uppercase leading-[.95] tracking-normal md:text-7xl">
              Control CTIMER
            </h1>
          </div>
          {snapshot ? (
            <StatusBadge tone={stateTone(snapshot.state)}>{snapshot.label}</StatusBadge>
          ) : null}
        </div>

        {/** EN CASO DE NO TENER TIMER Y/O TOKEN */}
        {!timerId ? (
          <Panel className="max-w-3xl">
            <SectionHeader
              eyebrow="Autorización"
              title="Entrar al panel Master"
              description="El token viene en el link admin generado al crear la sesión."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Código">
                <TextInput
                  onChange={(event) => setCode(normalizeCode(event.target.value))}
                  value={code}
                />
              </Field>
              <Field label="Admin token">
                <TextInput
                  onChange={(event) => setToken(event.target.value)}
                  value={token}
                />
              </Field>
            </div>
            {error ? <ErrorBox message={error} /> : null}
            <Button className="mt-5" disabled={booting} onClick={connectAdmin}>
              {booting ? <Loader2 className="animate-spin" size={16} aria-hidden /> : null}
              Entrar
            </Button>
          </Panel>
        ) : null}

        {timer ? (
          <div className="grid gap-6">
            <div className="grid gap-6">
              <Panel tone="dark" className="grid gap-5 p-4 sm:p-5">
                <TimerFace
                  className="shadow-none"
                  serverOffsetMs={serverOffsetMs}
                  showTenths
                  timer={timer}
                  variant="admin"
                />

                <div className="rounded-[28px] border border-white/10 bg-white/[.045] p-5">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <SectionHeader
                      eyebrow="Estado"
                      title="Controles"
                      description="Las acciones se sincronizan por Realtime y quedan persistidas."
                      tone="dark"
                    />
                    <ConnectionStatus state={connectionState} />
                  </div>
                  <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <Button
                      className="min-h-10"
                      disabled={Boolean(busy)}
                      onClick={triggerStart}
                      size="sm"
                    >
                      <Play size={16} aria-hidden />
                      Start
                    </Button>
                    <Button
                      className="min-h-10"
                      disabled={Boolean(busy) || snapshot?.state !== "running"}
                      onClick={() => runAction("pause")}
                      size="sm"
                      variant="ghost"
                    >
                      <Pause size={16} aria-hidden />
                      Pause
                    </Button>
                    <Button
                      className="min-h-10"
                      disabled={Boolean(busy) || timer.status !== "paused"}
                      onClick={() => runAction("resume")}
                      size="sm"
                      variant="warm"
                    >
                      <Play size={16} aria-hidden />
                      Resume
                    </Button>
                    <Button
                      className="min-h-10"
                      disabled={Boolean(busy)}
                      onClick={() => setConfirmKind("reset")}
                      size="sm"
                      variant="danger"
                    >
                      <RotateCcw size={16} aria-hidden />
                      Reset
                    </Button>
                    <Button
                      className="min-h-10 sm:col-span-2 xl:col-span-4"
                      disabled={Boolean(busy)}
                      onClick={() => setConfirmKind("end")}
                      size="sm"
                      variant="danger"
                    >
                      <Square size={16} aria-hidden />
                      End / Cancelar sesión
                    </Button>
                  </div>

                  <div className="grid gap-2 rounded-[20px] border border-white/10 bg-black/18 p-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Button
                      className="min-h-10"
                      onClick={() => copyText(code)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Copy size={14} aria-hidden />
                      Copiar codigo
                    </Button>
                    <Button
                      className="min-h-10"
                      onClick={() => copyText(viewerLink)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Copy size={14} aria-hidden />
                      Copiar viewer link
                    </Button>
                    <Button
                      className="min-h-10"
                      disabled={!viewerQrDataUrl || !viewerLink}
                      onClick={downloadViewerQr}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <QrCode size={14} aria-hidden />
                      Descargar QR
                    </Button>
                    <Button
                      className="min-h-10"
                      onClick={openViewer}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <ExternalLink size={14} aria-hidden />
                      Abrir viewer
                    </Button>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="grid gap-6">
              <Panel>
                <SectionHeader
                  eyebrow="Tiempo"
                  title="Programación"
                  description="Puedes ajustar inicio, duración o fin incluso en running."
                  action={
                    <Button
                      disabled={!schedule || busy === "schedule"}
                      onClick={saveSchedule}
                      variant="secondary"
                    >
                      <Save size={16} aria-hidden />
                      Guardar
                    </Button>
                  }
                />
                <ScheduleEditor
                  initial={scheduleInitial}
                  onChange={setSchedule}
                  showRunningWarning={snapshot?.state === "running"}
                />
              </Panel>

              <Panel>
                <SectionHeader
                  eyebrow="Overlay"
                  title="Mensaje activo"
                  description="Un mensaje reemplaza al anterior y aparece como overlay en viewers."
                />
                <TextArea
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ej. Regresamos en 5 minutos"
                  value={message}
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_1fr] sm:items-end">
                  <Field label="Mostrar por">
                    <SelectField
                      onChange={(event) =>
                        setMessageDurationSeconds(Number.parseInt(event.target.value, 10))
                      }
                      value={messageDurationSeconds}
                    >
                      {[15, 20, 30].map((seconds) => (
                        <option key={seconds} value={seconds}>
                          {seconds}s
                        </option>
                      ))}
                    </SelectField>
                  </Field>
                  <Button
                    disabled={busy === "message"}
                    onClick={() =>
                      saveMessage(message.trim() || null, messageDurationSeconds)
                    }
                  >
                    Enviar temporal
                  </Button>
                  <Button
                    disabled={busy === "message"}
                    onClick={() => saveMessage(null)}
                    variant="secondary"
                  >
                    Limpiar mensaje
                  </Button>
                </div>
              </Panel>

              <Panel>
                <SectionHeader
                  eyebrow="Sponsors"
                  title="Franja inferior"
                  description="Solo imágenes. Ordenado, aleatorio y force timed/hold."
                  action={
                    sponsorSettingsDirty ? (
                      <PendingIndicator label="Modo sin guardar" />
                    ) : null
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Modo de rotación">
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
                <Button
                  className="mt-4"
                  onClick={saveSponsorSettings}
                  variant={sponsorSettingsDirty ? "primary" : "secondary"}
                >
                  <Save size={16} aria-hidden />
                  {sponsorSettingsDirty ? "Guardar modo *" : "Guardar modo"}
                </Button>

                <div className="mt-6 grid gap-4 rounded-[28px] border border-black/10 bg-white/60 p-4">
                  <div className="grid gap-3">
                    <p className="text-[11px] font-black uppercase tracking-[.18em] text-black/55">
                      Upload a Storage
                    </p>
                    <input
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                      ref={uploadInputRef}
                      type="file"
                    />
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <Button
                        onClick={() => uploadInputRef.current?.click()}
                        type="button"
                        variant="warm"
                      >
                        <Upload size={16} aria-hidden />
                        Seleccionar imagen
                      </Button>
                      <Button
                        disabled={busy === "asset-upload" || !uploadFile}
                        onClick={addUploadedAsset}
                        type="button"
                        variant="secondary"
                      >
                        Subir imagen
                      </Button>
                    </div>
                    <div className="rounded-[18px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-black/62">
                      {uploadFile ? uploadFile.name : "Ningún archivo seleccionado"}
                    </div>
                    {uploadFile ? <PendingIndicator label="Pendiente de subir" /> : null}
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Field className="max-w-52" label="Force timed">
                      <SelectField
                        onChange={(event) =>
                          setForceSeconds(Number.parseInt(event.target.value, 10))
                        }
                        value={forceSeconds}
                      >
                        {[10, 20, 30, 60].map((seconds) => (
                          <option key={seconds} value={seconds}>
                            {seconds}s
                          </option>
                        ))}
                      </SelectField>
                    </Field>
                    <Button onClick={clearForce} variant="danger">
                      <Ban size={16} aria-hidden />
                      Quitar force
                    </Button>
                  </div>

                  {assets.length ? (
                    assets.map((asset) => (
                      <AssetEditor
                        asset={asset}
                        busy={busy}
                        key={asset.id}
                        onForce={forceAsset}
                        onSave={async (nextAsset) => {
                          setBusy(`asset-${asset.id}`);
                          setError(null);
                          try {
                            await adminUpsertAsset(code, token, nextAsset);
                            await refresh();
                          } catch (nextError) {
                            setError(safeErrorMessage(nextError));
                          } finally {
                            setBusy(null);
                          }
                        }}
                      />
                    ))
                  ) : (
                    <EmptyState
                      title="Sin sponsors todavía"
                      description="Agrega una URL o sube una imagen para activar la franja del viewer."
                    />
                  )}
                </div>
              </Panel>
            </div>
          </div>
        ) : timerId ? (
          <Panel>
            <Loader2 className="animate-spin text-[var(--color-red)]" aria-hidden />
            <p className="mt-4 font-bold">Cargando sesión...</p>
          </Panel>
        ) : null}

        {error || dataError ? <ErrorBox message={error ?? dataError ?? ""} /> : null}
      </div>

      <ConfirmDialog
        confirmLabel={confirmKind ? confirm[confirmKind].label : "Confirmar"}
        description={confirmKind ? confirm[confirmKind].description : ""}
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => {
          const action = confirmKind;
          setConfirmKind(null);
          if (action) runAction(action);
        }}
        open={Boolean(confirmKind)}
        title={confirmKind ? confirm[confirmKind].title : ""}
      />
    </main>
  );
}

function AssetEditor({
  asset,
  busy,
  onForce,
  onSave,
}: {
  asset: TimerAssetRow;
  busy: string | null;
  onForce: (assetId: string, mode: "timed" | "hold") => void;
  onSave: (asset: {
    enabled: boolean;
    id: string;
    sortOrder: number;
    url: string;
  }) => void;
}) {
  const [url, setUrl] = useState(asset.url);
  const [enabled, setEnabled] = useState(asset.enabled);
  const [sortOrder, setSortOrder] = useState(asset.sort_order);
  const dirty =
    url !== asset.url ||
    enabled !== asset.enabled ||
    sortOrder !== asset.sort_order;

  useEffect(() => {
    queueMicrotask(() => {
      setUrl(asset.url);
      setEnabled(asset.enabled);
      setSortOrder(asset.sort_order);
    });
  }, [asset.enabled, asset.sort_order, asset.url]);

  return (
    <div className="grid gap-4 rounded-[24px] border border-black/10 bg-white/72 p-4 lg:grid-cols-[120px_1fr]">
      <div className="grid place-items-center rounded-[18px] bg-black/[.04] p-3">
        <img alt="Sponsor" className="max-h-20 object-contain" src={asset.url} />
      </div>
      <div className="grid gap-3">
        <Field label="URL">
          <TextInput onChange={(event) => setUrl(event.target.value)} value={url} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Orden">
            <TextInput
              onChange={(event) =>
                setSortOrder(Number.parseInt(event.target.value, 10) || 0)
              }
              type="number"
              value={sortOrder}
            />
          </Field>
          <label className="flex min-h-11 items-center gap-3 rounded-[18px] border border-black/10 bg-white px-4 py-3 text-xs font-black uppercase tracking-[.14em]">
            <input
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              type="checkbox"
            />
            Habilitado
          </label>
          <Button
            disabled={busy === `asset-${asset.id}`}
            onClick={() =>
              onSave({ enabled, id: asset.id, sortOrder, url })
            }
            variant={dirty ? "primary" : "secondary"}
          >
            {dirty ? "Guardar *" : "Guardar"}
          </Button>
        </div>
        {dirty ? <PendingIndicator label="Asset sin guardar" /> : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onForce(asset.id, "timed")} size="sm" variant="warm">
            Forzar timed
          </Button>
          <button
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-black/50"
            onClick={() => navigator.clipboard?.writeText(asset.url)}
            type="button"
          >
            <Copy size={14} aria-hidden />
            Copiar URL
          </button>
        </div>
      </div>
    </div>
  );
}

function PendingIndicator({ label }: { label: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(197,23,46,.28)] bg-[rgba(197,23,46,.08)] px-3 py-2 text-[11px] font-black uppercase tracking-[.14em] text-[var(--color-red)]">
      * {label}
    </span>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-[20px] border border-[rgba(197,23,46,.25)] bg-[rgba(197,23,46,.08)] p-4 text-sm font-semibold text-[var(--color-red)]">
      {message}
    </div>
  );
}
