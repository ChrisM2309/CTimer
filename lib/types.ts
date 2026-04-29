export type TimerStatus = "scheduled" | "paused" | "ended";
export type EffectiveTimerState = "scheduled" | "running" | "paused" | "ended";
export type SponsorMode = "ordered" | "random";
export type ForceMode = "timed" | "hold";
export type AdminAction = "start" | "pause" | "resume" | "reset" | "end";

export type TimerRow = {
  id: string;
  code: string;
  name: string;
  timezone: string;
  start_at: string;
  end_at: string;
  duration_seconds: number;
  status: TimerStatus;
  paused_remaining_seconds: number | null;
  paused_at: string | null;
  sponsor_mode: SponsorMode;
  rotation_seconds: number;
  created_at: string;
  updated_at: string;
};

export type TimerMessageRow = {
  timer_id: string;
  text: string | null;
  updated_at: string;
};

export type TimerAssetRow = {
  id: string;
  timer_id: string;
  url: string;
  enabled: boolean;
  sort_order: number;
  created_at: string;
};

export type TimerAssetForceRow = {
  timer_id: string;
  active: boolean;
  asset_id: string | null;
  mode: ForceMode | null;
  until_at: string | null;
  updated_at: string;
};

export type TimerBundle = {
  timer: TimerRow;
  message: TimerMessageRow | null;
  assets: TimerAssetRow[];
  force: TimerAssetForceRow | null;
};

export type ScheduleValues = {
  timezone: string;
  startAt: string;
  endAt: string;
  durationSeconds: number;
};

export type CreateTimerResult = {
  code: string;
  admin_token: string;
  timer_id: string;
};
