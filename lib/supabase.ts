"use client";

import {
  createClient,
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type {
  AdminAction,
  CreateTimerResult,
  ForceMode,
  ScheduleValues,
  SponsorMode,
  TimerAssetRow,
  TimerBundle,
  TimerRow,
} from "@/lib/types";
import { normalizeCode } from "@/lib/utils";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SPONSOR_BUCKET = "ctimer-sponsors";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseBrowserClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 8,
        },
      },
    });
  }

  return browserClient;
}

export async function ensureAnonymousSession() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session) {
    throw new Error("No se pudo iniciar sesión anónima en Supabase.");
  }

  return data.session;
}

export async function getServerTimeOffset() {
  const supabase = getSupabaseBrowserClient();
  const requestedAt = Date.now();
  const { data, error } = await supabase.rpc("get_server_time");
  const receivedAt = Date.now();

  if (error) throw error;

  const serverMs = new Date(data as string).getTime();
  const localMidpoint = requestedAt + (receivedAt - requestedAt) / 2;
  return serverMs - localMidpoint;
}

export async function createTimer(payload: {
  name: string;
  schedule: ScheduleValues;
  rotationSeconds: number;
  sponsorMode: SponsorMode;
}) {
  const { name, schedule, rotationSeconds, sponsorMode } = payload;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("create_timer", {
    p_name: name,
    p_timezone: schedule.timezone,
    p_start_at: schedule.startAt,
    p_end_at: schedule.endAt,
    p_duration_seconds: schedule.durationSeconds,
    p_rotation_seconds: rotationSeconds,
    p_sponsor_mode: sponsorMode,
  });

  if (error) throw error;
  return data as CreateTimerResult;
}

export async function joinTimer(code: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("join_timer", {
    p_code: normalizeCode(code),
  });

  if (error) throw error;
  return data as string;
}

export async function adminJoinTimer(code: string, adminToken: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("admin_join_timer", {
    p_code: normalizeCode(code),
    p_admin_token: adminToken.trim(),
  });

  if (error) throw error;
  return data as string;
}

export async function fetchTimerBundle(timerId: string): Promise<TimerBundle> {
  const supabase = getSupabaseBrowserClient();
  const [timerResult, messageResult, assetsResult, forceResult] =
    await Promise.all([
      supabase.from("timers").select("*").eq("id", timerId).maybeSingle(),
      supabase
        .from("timer_messages")
        .select("*")
        .eq("timer_id", timerId)
        .maybeSingle(),
      supabase
        .from("timer_assets")
        .select("*")
        .eq("timer_id", timerId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("timer_asset_force")
        .select("*")
        .eq("timer_id", timerId)
        .maybeSingle(),
    ]);

  if (timerResult.error) throw timerResult.error;
  if (messageResult.error) throw messageResult.error;
  if (assetsResult.error) throw assetsResult.error;
  if (forceResult.error) throw forceResult.error;
  if (!timerResult.data) {
    throw new Error(
      "No se pudo leer el timer. Revisa que el usuario haya hecho join y que las policies RLS usen ctimer_is_timer_member().",
    );
  }

  return {
    timer: timerResult.data as TimerRow,
    message: messageResult.data,
    assets: (assetsResult.data ?? []) as TimerAssetRow[],
    force: forceResult.data,
  };
}

export async function adminAction(
  code: string,
  adminToken: string,
  action: AdminAction,
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_action", {
    p_code: normalizeCode(code),
    p_admin_token: adminToken.trim(),
    p_action: action,
  });

  if (error) throw error;
}

export async function adminUpdateSchedule(
  code: string,
  adminToken: string,
  schedule: ScheduleValues,
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_update_schedule", {
    p_code: normalizeCode(code),
    p_admin_token: adminToken.trim(),
    p_timezone: schedule.timezone,
    p_start_at: schedule.startAt,
    p_end_at: schedule.endAt,
    p_duration_seconds: schedule.durationSeconds,
  });

  if (error) throw error;
}

export async function adminSetMessage(
  code: string,
  adminToken: string,
  text: string | null,
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_set_message", {
    p_code: normalizeCode(code),
    p_admin_token: adminToken.trim(),
    p_text: text,
  });

  if (error) throw error;
}

export async function adminSetSponsorMode(
  code: string,
  adminToken: string,
  mode: SponsorMode,
  rotationSeconds: number,
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_set_sponsor_mode", {
    p_code: normalizeCode(code),
    p_admin_token: adminToken.trim(),
    p_mode: mode,
    p_rotation_seconds: rotationSeconds,
  });

  if (error) throw error;
}

export async function adminUpsertAsset(
  code: string,
  adminToken: string,
  asset: {
    id?: string | null;
    url: string;
    enabled: boolean;
    sortOrder: number;
  },
) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("admin_upsert_asset", {
    p_code: normalizeCode(code),
    p_admin_token: adminToken.trim(),
    p_asset_id: asset.id ?? null,
    p_url: asset.url,
    p_enabled: asset.enabled,
    p_sort_order: asset.sortOrder,
  });

  if (error) throw error;
  return data as string;
}

export async function adminForceAsset(
  code: string,
  adminToken: string,
  assetId: string,
  mode: ForceMode,
  seconds: number | null,
) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_force_asset", {
    p_code: normalizeCode(code),
    p_admin_token: adminToken.trim(),
    p_asset_id: assetId,
    p_mode: mode,
    p_seconds: seconds,
  });

  if (error) throw error;
}

export async function adminClearForce(code: string, adminToken: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_clear_force", {
    p_code: normalizeCode(code),
    p_admin_token: adminToken.trim(),
  });

  if (error) throw error;
}

export async function uploadSponsorImage(timerId: string, file: File) {
  const supabase = getSupabaseBrowserClient();
  const cleanName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `${timerId}/${randomId}-${cleanName || "sponsor-image"}`;

  const { error } = await supabase.storage
    .from(SPONSOR_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(SPONSOR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function subscribeToTimer(
  timerId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  onStatus: (status: string) => void,
): RealtimeChannel {
  const supabase = getSupabaseBrowserClient();

  return supabase
    .channel(`timer:${timerId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "timers", filter: `id=eq.${timerId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "timer_messages",
        filter: `timer_id=eq.${timerId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "timer_assets",
        filter: `timer_id=eq.${timerId}`,
      },
      onChange,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "timer_asset_force",
        filter: `timer_id=eq.${timerId}`,
      },
      onChange,
    )
    .subscribe(onStatus);
}
