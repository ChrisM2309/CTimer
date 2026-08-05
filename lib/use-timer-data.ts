"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { TimerBundle } from "@/lib/types";
import { useAuthState } from "@/components/auth/auth-provider";
import {
  fetchTimerBundle,
  getServerTimeOffset,
  subscribeToTimer,
} from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/utils";

export type ConnectionState = "connecting" | "connected" | "reconnecting";

export function useTimerData(timerId: string | null) {
  const { state: authState, user } = useAuthState();
  const authUserId = user?.id ?? null;
  const [bundle, setBundle] = useState<TimerBundle | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const connectionStateRef = useRef<ConnectionState>("connecting");
  const viewGenerationRef = useRef(0);

  const setConnection = useCallback((nextState: ConnectionState) => {
    connectionStateRef.current = nextState;
    setConnectionState(nextState);
  }, []);

  const syncServerTime = useCallback(async () => {
    const offset = await getServerTimeOffset();
    setServerOffsetMs(offset);
    return offset;
  }, []);

  const refresh = useCallback(async () => {
    const generation = viewGenerationRef.current;
    if (!timerId || !authUserId || refreshInFlight.current) return;

    refreshInFlight.current = true;

    try {
      const [nextBundle] = await Promise.all([
        fetchTimerBundle(timerId),
        syncServerTime(),
      ]);
      if (generation === viewGenerationRef.current) {
        setBundle(nextBundle);
        setError(null);
      }
    } catch (nextError) {
      if (generation === viewGenerationRef.current) {
        setError(safeErrorMessage(nextError));
      }
      if (generation === viewGenerationRef.current && connectionStateRef.current === "connected") {
        setConnection("reconnecting");
      }
    } finally {
      refreshInFlight.current = false;
    }
  }, [authUserId, setConnection, syncServerTime, timerId]);

  useEffect(() => {
    const generation = viewGenerationRef.current + 1;
    viewGenerationRef.current = generation;
    queueMicrotask(() => {
      if (generation === viewGenerationRef.current) {
        setBundle(null);
        setError(null);
        setConnection("connecting");
      }
    });

    if (!timerId || !authUserId || authState === "loading" || authState === "signed_out") return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const connect = async () => {
      try {
        await refresh();
        if (cancelled) return;

        channel = subscribeToTimer(
          timerId,
          authUserId,
          () => {
            void refresh();
          },
          (status) => {
            if (cancelled) return;

            if (status === "SUBSCRIBED") {
              setConnection("connected");
              void refresh();
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              setConnection("reconnecting");
            }
          },
        );
      } catch (nextError) {
        if (!cancelled) {
          setError(safeErrorMessage(nextError));
          setConnection("reconnecting");
        }
      }
    };

    void connect();

    const poll = window.setInterval(() => {
      if (connectionStateRef.current !== "connected") {
        refresh();
      }
    }, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, [authState, authUserId, refresh, setConnection, timerId]);

  return {
    bundle,
    connectionState,
    error,
    refresh,
    serverOffsetMs,
    syncServerTime,
  };
}
