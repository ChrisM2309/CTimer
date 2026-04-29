"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Field, TextInput } from "@/components/ui/field";
import type { ScheduleValues } from "@/lib/types";
import {
  buildScheduleValues,
  dateTimeToLocalInput,
  localInputToDateTime,
  secondsBetween,
  toLocalInput,
} from "@/lib/schedule";

export function ScheduleEditor({
  disabled,
  initial,
  onChange,
  showRunningWarning,
}: {
  disabled?: boolean;
  initial: ScheduleValues;
  onChange: (values: ScheduleValues | null) => void;
  showRunningWarning?: boolean;
}) {
  const initialLocal = useMemo(
    () => ({
      duration: initial.durationSeconds,
      end: toLocalInput(initial.endAt, initial.timezone),
      start: toLocalInput(initial.startAt, initial.timezone),
      timezone: initial.timezone,
    }),
    [initial.durationSeconds, initial.endAt, initial.startAt, initial.timezone],
  );

  const [startLocal, setStartLocal] = useState(initialLocal.start);
  const [endLocal, setEndLocal] = useState(initialLocal.end);
  const [durationSeconds, setDurationSeconds] = useState(initialLocal.duration);
  const [timezone, setTimezone] = useState(initialLocal.timezone);

  useEffect(() => {
    queueMicrotask(() => {
      setStartLocal(initialLocal.start);
      setEndLocal(initialLocal.end);
      setDurationSeconds(initialLocal.duration);
      setTimezone(initialLocal.timezone);
    });
  }, [initialLocal]);

  useEffect(() => {
    onChange(buildScheduleValues(startLocal, endLocal, durationSeconds, timezone));
  }, [durationSeconds, endLocal, onChange, startLocal, timezone]);

  function handleStartChange(value: string) {
    setStartLocal(value);

    const start = localInputToDateTime(value, timezone);
    if (!start.isValid) return;

    if (durationSeconds > 0) {
      setEndLocal(dateTimeToLocalInput(start.plus({ seconds: durationSeconds })));
      return;
    }

    const end = localInputToDateTime(endLocal, timezone);
    if (end.isValid) {
      setDurationSeconds(secondsBetween(start, end));
    }
  }

  function handleDurationChange(value: string) {
    const nextDuration = Math.max(Number.parseInt(value, 10) || 0, 0);
    setDurationSeconds(nextDuration);

    const start = localInputToDateTime(startLocal, timezone);
    if (start.isValid && nextDuration > 0) {
      setEndLocal(dateTimeToLocalInput(start.plus({ seconds: nextDuration })));
    }
  }

  function handleEndChange(value: string) {
    setEndLocal(value);

    const start = localInputToDateTime(startLocal, timezone);
    const end = localInputToDateTime(value, timezone);
    if (start.isValid && end.isValid) {
      setDurationSeconds(secondsBetween(start, end));
    }
  }

  function handleTimezoneChange(value: string) {
    setTimezone(value.trim() || "UTC");
  }

  function quickDuration(seconds: number) {
    setDurationSeconds(seconds);
    const start = localInputToDateTime(startLocal, timezone);
    if (start.isValid) {
      setEndLocal(dateTimeToLocalInput(start.plus({ seconds })));
    }
  }

  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-4 shadow-[0_12px_30px_rgba(0,0,0,.05)] sm:p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[.2em] text-[var(--color-red)]">
            Programacion
          </p>
          <p className="mt-1 text-sm leading-6 text-black/62">
            Inicio, duracion y fin se recalculan con la regla &quot;ultimo campo editado gana&quot;.
          </p>
        </div>
        {showRunningWarning ? (
          <span className="rounded-full border border-[rgba(197,23,46,.28)] bg-[rgba(197,23,46,.1)] px-3 py-1 text-[11px] font-black uppercase tracking-[.14em] text-[var(--color-red)]">
            Afecta todas las pantallas
          </span>
        ) : null}
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-2">
          <Field label="Hora de inicio">
            <TextInput
              disabled={disabled}
              onChange={(event) => handleStartChange(event.target.value)}
              type="datetime-local"
              value={startLocal}
            />
          </Field>
          <Field label="Hora de fin">
            <TextInput
              disabled={disabled}
              onChange={(event) => handleEndChange(event.target.value)}
              type="datetime-local"
              value={endLocal}
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <Field label="Duracion (segundos)">
            <TextInput
              disabled={disabled}
              min={1}
              onChange={(event) => handleDurationChange(event.target.value)}
              type="number"
              value={durationSeconds}
            />
          </Field>
          <Field label="Timezone">
            <TextInput
              className="text-[13px] sm:text-sm"
              disabled={disabled}
              onBlur={() => {
                if (!DateTime.local().setZone(timezone).isValid) {
                  setTimezone("UTC");
                }
              }}
              onChange={(event) => handleTimezoneChange(event.target.value)}
              value={timezone}
            />
          </Field>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-black/8 pt-4">
        {[600, 1200, 1800, 3600, 5400].map((seconds) => (
          <button
            className="rounded-[14px] border border-[rgba(201,176,138,.68)] bg-[rgba(243,231,217,.72)] px-3 py-2 text-[11px] font-black uppercase tracking-[.12em] text-[var(--color-graphite)] transition hover:-translate-y-px hover:border-[var(--color-graphite)] disabled:opacity-50"
            disabled={disabled}
            key={seconds}
            onClick={() => quickDuration(seconds)}
            type="button"
          >
            {seconds / 60} min
          </button>
        ))}
      </div>
    </div>
  );
}
