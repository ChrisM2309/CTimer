"use client";

import {
  createClient,
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import type {
  AdminAction,
  CreateTimerResult,
  ForceMode,
  MyTimerRow,
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

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isAnonymousUser(user: User | null | undefined, accessToken?: string) {
  if (!user) return false;
  const userRecord = user as User & {
    is_anonymous?: boolean;
  };
  const tokenClaims = userRecord.app_metadata?.provider === "anonymous"
    ? { is_anonymous: true }
    : null;

  return Boolean(
    userRecord.is_anonymous ||
      tokenClaims?.is_anonymous ||
      decodeJwtPayload(accessToken ?? (user as User & { access_token?: string }).access_token ?? "")
        ?.is_anonymous === true,
  );
}

function isAnonymousStoredSession(value: string) {
  try {
    const parsed = JSON.parse(value) as {
      user?: User & { is_anonymous?: boolean };
      access_token?: string;
    };
    return Boolean(
      parsed.user?.is_anonymous ||
        parsed.user?.app_metadata?.provider === "anonymous" ||
        decodeJwtPayload(parsed.access_token ?? "")?.is_anonymous === true,
    );
  } catch {
    return false;
  }
}

function createSessionAwareStorage() {
  return {
    getItem(key: string) {
      if (typeof window === "undefined") return null;
      return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      if (typeof window === "undefined") return;
      if (isAnonymousStoredSession(value)) {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      }
    },
    removeItem(key: string) {
      if (typeof window === "undefined") return;
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    },
  };
}

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
        storage: createSessionAwareStorage(),
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
  if (session) {
    // Migrate legacy anonymous sessions out of localStorage. Account sessions
    // continue to use localStorage through the storage adapter above.
    if (isAnonymousUser(session.user, session.access_token)) {
      const { data: migrated, error: migrationError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      if (migrationError) throw migrationError;
      return migrated.session ?? session;
    }
    return session;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session) {
    throw new Error("No se pudo iniciar sesión anónima en Supabase.");
  }

  return data.session;
}

export async function getCurrentSession() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

export async function getCurrentUser() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function signUpWithPassword(email: string, password: string) {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned) throw new Error("Ingresa un email válido.");
  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const { data, error } = await getSupabaseBrowserClient().auth.signUp({
    email: cleaned,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned || !password) throw new Error("Ingresa email y contraseña.");

  const { data, error } = await getSupabaseBrowserClient().auth.signInWithPassword({
    email: cleaned,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
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
    sponsorName?: string | null;
    sponsorTier?: string | null;
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
    p_sponsor_name: asset.sponsorName ?? null,
    p_sponsor_tier: asset.sponsorTier ?? null,
  });

  if (error) throw error;
  return data as string;
}

export async function adminDeleteAsset(code: string, adminToken: string, assetId: string) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.rpc("admin_delete_asset", {
    p_code: normalizeCode(code),
    p_admin_token: adminToken.trim(),
    p_asset_id: assetId,
  });

  if (error) throw error;
}

export async function listMyTimers(payload?: { limit?: number; offset?: number }) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("list_my_timers", {
    p_limit: payload?.limit ?? 12,
    p_offset: payload?.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as MyTimerRow[];
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
  userId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  onStatus: (status: string) => void,
): RealtimeChannel {
  const supabase = getSupabaseBrowserClient();

  return supabase
    .channel(`timer:${timerId}:${userId}`)
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
