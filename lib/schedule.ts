import { DateTime } from "luxon";
import type { ScheduleValues } from "@/lib/types";

export function getDefaultTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function toLocalInput(iso: string, timezone: string) {
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(timezone || "UTC")
    .toFormat("yyyy-LL-dd'T'HH:mm");
}

export function localInputToDateTime(value: string, timezone: string) {
  return DateTime.fromISO(value, { zone: timezone || "UTC" });
}

export function dateTimeToLocalInput(value: DateTime) {
  return value.toFormat("yyyy-LL-dd'T'HH:mm");
}

export function secondsBetween(start: DateTime, end: DateTime) {
  let normalizedEnd = end;

  while (normalizedEnd <= start) {
    normalizedEnd = normalizedEnd.plus({ days: 1 });
  }

  return Math.max(Math.round(normalizedEnd.diff(start, "seconds").seconds), 1);
}

export function buildScheduleValues(
  startLocal: string,
  endLocal: string,
  durationSeconds: number,
  timezone: string,
): ScheduleValues | null {
  const zone = timezone || "UTC";
  const start = localInputToDateTime(startLocal, zone);
  let end = localInputToDateTime(endLocal, zone);

  if (!start.isValid || !end.isValid || durationSeconds <= 0) {
    return null;
  }

  while (end <= start) {
    end = end.plus({ days: 1 });
  }

  return {
    timezone: zone,
    startAt: start.toUTC().toISO({ suppressMilliseconds: true }) ?? "",
    endAt: end.toUTC().toISO({ suppressMilliseconds: true }) ?? "",
    durationSeconds: Math.max(Math.round(end.diff(start, "seconds").seconds), 1),
  };
}

export function createDefaultSchedule(): ScheduleValues {
  const timezone = getDefaultTimezone();
  const start = DateTime.now().setZone(timezone).plus({ minutes: 5 }).startOf("minute");
  const end = start.plus({ hours: 1 });

  return {
    timezone,
    startAt: start.toUTC().toISO({ suppressMilliseconds: true }) ?? "",
    endAt: end.toUTC().toISO({ suppressMilliseconds: true }) ?? "",
    durationSeconds: 3600,
  };
}
