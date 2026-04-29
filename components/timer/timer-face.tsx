"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { StatusBadge } from "@/components/ui/status-badge";
import { deriveTimerSnapshot, formatSeconds, getServerNowMs, stateTone } from "@/lib/timer";
import type { TimerRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TimerFace({
  className,
  contentAboveTimer,
  serverOffsetMs,
  showTenths = false,
  timer,
  variant = "panel",
  viewerHasSponsors = false,
}: {
  className?: string;
  contentAboveTimer?: ReactNode;
  serverOffsetMs: number;
  showTenths?: boolean;
  timer: TimerRow;
  variant?: "admin" | "panel" | "viewer";
  viewerHasSponsors?: boolean;
}) {
  const [nowMs, setNowMs] = useState(() => getServerNowMs(serverOffsetMs));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(getServerNowMs(serverOffsetMs));
    }, variant === "viewer" ? 100 : 500);

    return () => window.clearInterval(interval);
  }, [serverOffsetMs, variant]);

  const snapshot = useMemo(() => deriveTimerSnapshot(timer, nowMs), [nowMs, timer]);

  const start = DateTime.fromISO(timer.start_at)
    .setZone(timer.timezone)
    .toFormat("dd LLL · HH:mm");

  const end = DateTime.fromISO(timer.end_at)
    .setZone(timer.timezone)
    .toFormat("dd LLL · HH:mm");

  const preciseDisplay = useMemo(() => {
    if (!showTenths || snapshot.state !== "running") {
      return null;
    }

    const remainingMs = Math.max(new Date(timer.end_at).getTime() - nowMs, 0);
    const wholeSeconds = Math.floor(remainingMs / 1000);
    const hundredths = Math.floor((remainingMs % 1000) / 10);

    return {
      parts: formatSeconds(wholeSeconds).split(":"),
      hundredths: hundredths.toString().padStart(2, "0"),
    };
  }, [nowMs, showTenths, snapshot.state, timer.end_at]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-[var(--color-graphite)] text-[var(--color-light)] shadow-[var(--shadow-strong)]",
        variant === "viewer" ? "p-7 sm:p-10" : "p-5 sm:p-6",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative z-10">
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3",
            variant === "admin" ? "mb-3" : "mb-5",
          )}
        >
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.24em] text-white/55">
              CTIMER · {timer.code}
            </p>
            <h1
              className={cn(
                "mt-2 font-black uppercase tracking-[-.045em]",
                variant === "viewer"
                  ? "text-3xl sm:text-5xl"
                  : variant === "admin"
                    ? "text-xl sm:text-2xl"
                    : "text-2xl",
              )}
            >
              {timer.name}
            </h1>
          </div>
          <StatusBadge tone={stateTone(snapshot.state)}>{snapshot.label}</StatusBadge>
        </div>

        {contentAboveTimer ? (
          <div className={cn(variant === "viewer" ? "mb-6" : "mb-4")}>{contentAboveTimer}</div>
        ) : null}

        <div
          className={cn(
            "font-black leading-none tracking-[-.05em] text-[var(--color-light)] tabular-nums",
            variant === "viewer"
              ? viewerHasSponsors
                ? preciseDisplay
                  ? "text-[clamp(3.2rem,12.8vw,11.6rem)]"
                  : "text-[clamp(3.5rem,14vw,12.6rem)]"
                : preciseDisplay
                  ? "text-[clamp(4.3rem,17vw,15.4rem)]"
                  : "text-[clamp(5rem,20vw,18rem)]"
              : variant === "admin"
                ? preciseDisplay
                  ? "text-[clamp(2.15rem,5.3vw,3.85rem)] whitespace-nowrap"
                  : "text-[clamp(2.4rem,5.8vw,4.3rem)] whitespace-nowrap"
                : "text-[clamp(3.6rem,9vw,7rem)]",
          )}
        >
          {preciseDisplay ? (
            <div className="inline-flex max-w-full items-end gap-[0.22em] pr-[0.18em]">
              <TimeDigits parts={preciseDisplay.parts} />
              <span className="inline-flex min-w-[1.45ch] justify-start pb-[0.14em] text-[0.28em] tracking-normal text-white/78">
                .{preciseDisplay.hundredths}
              </span>
            </div>
          ) : (
            <TimeDigits parts={formatSeconds(snapshot.remainingSeconds).split(":")} />
          )}
        </div>

        {snapshot.state === "scheduled" ? (
          <p
            className={cn(
              "font-bold uppercase tracking-[.14em] text-[var(--color-warm)]",
              variant === "admin" ? "mt-3 text-xs" : "mt-4 text-sm",
            )}
          >
            Inicia en {formatSeconds(snapshot.startsInSeconds)}
          </p>
        ) : null}

        <div
          className={cn(
            "overflow-hidden rounded-full bg-white/10",
            variant === "admin" ? "mt-4 h-2" : "mt-7 h-3",
          )}
        >
          <div
            className="h-full rounded-full bg-[var(--color-red)] transition-[width] duration-300"
            style={{ width: `${snapshot.progress * 100}%` }}
          />
        </div>

        <div
          className={cn(
            "grid gap-3 font-bold uppercase tracking-[.12em] text-white/55 sm:grid-cols-3",
            variant === "admin" ? "mt-4 text-[11px]" : "mt-5 text-xs",
          )}
        >
          <span>Inicio: {start}</span>
          <span>Fin: {end}</span>
          <span>Zona: {timer.timezone}</span>
        </div>
      </div>
    </div>
  );
}

function TimeDigits({ parts }: { parts: string[] }) {
  return (
    <span className="inline-flex items-baseline">
      {parts.map((part, index) => (
        <span className="inline-flex items-baseline" key={`${part}-${index}`}>
          <span className="inline-flex w-[2.18ch] justify-center">{part}</span>
          {index < parts.length - 1 ? (
            <span className="inline-flex w-[0.48ch] justify-center">:</span>
          ) : null}
        </span>
      ))}
    </span>
  );
}
