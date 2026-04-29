import type { EffectiveTimerState, TimerRow } from "@/lib/types";
import { clamp } from "@/lib/utils";

export type TimerSnapshot = {
  state: EffectiveTimerState;
  remainingSeconds: number;
  totalSeconds: number;
  progress: number;
  startsInSeconds: number;
  label: string;
};

export function getServerNowMs(serverOffsetMs: number) {
  return Date.now() + serverOffsetMs;
}

export function deriveTimerSnapshot(timer: TimerRow, nowMs: number): TimerSnapshot {
  const startMs = new Date(timer.start_at).getTime();
  const endMs = new Date(timer.end_at).getTime();
  const totalSeconds = Math.max(timer.duration_seconds, 1);

  if (timer.status === "ended") {
    return {
      state: "ended",
      remainingSeconds: 0,
      totalSeconds,
      progress: 1,
      startsInSeconds: 0,
      label: "Finalizado",
    };
  }

  if (timer.status === "paused") {
    const fallbackRemaining = Math.max(Math.ceil((endMs - nowMs) / 1000), 0);
    const remainingSeconds =
      timer.paused_remaining_seconds ?? fallbackRemaining;

    return {
      state: "paused",
      remainingSeconds,
      totalSeconds,
      progress: clamp(1 - remainingSeconds / totalSeconds, 0, 1),
      startsInSeconds: 0,
      label: "Pausado",
    };
  }

  if (nowMs < startMs) {
    return {
      state: "scheduled",
      remainingSeconds: totalSeconds,
      totalSeconds,
      progress: 0,
      startsInSeconds: Math.ceil((startMs - nowMs) / 1000),
      label: "Programado",
    };
  }

  if (nowMs >= endMs) {
    return {
      state: "ended",
      remainingSeconds: 0,
      totalSeconds,
      progress: 1,
      startsInSeconds: 0,
      label: "Finalizado",
    };
  }

  const remainingSeconds = Math.max(Math.ceil((endMs - nowMs) / 1000), 0);

  return {
    state: "running",
    remainingSeconds,
    totalSeconds,
    progress: clamp(1 - remainingSeconds / totalSeconds, 0, 1),
    startsInSeconds: 0,
    label: "En vivo",
  };
}

export function formatSeconds(totalSeconds: number) {
  const safeSeconds = Math.max(Math.floor(totalSeconds), 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

export function stateTone(state: EffectiveTimerState) {
  if (state === "running") return "live";
  if (state === "paused") return "warning";
  if (state === "ended") return "danger";
  return "neutral";
}
