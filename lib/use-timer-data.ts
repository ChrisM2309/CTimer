"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { TimerBundle } from "@/lib/types";
import {
  fetchTimerBundle,
  getServerTimeOffset,
  subscribeToTimer,
} from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/utils";

export type ConnectionState = "connecting" | "connected" | "reconnecting";

export function useTimerData(timerId: string | null) {
  const [bundle, setBundle] = useState<TimerBundle | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const connectionStateRef = useRef<ConnectionState>("connecting");

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
    if (!timerId || refreshInFlight.current) return;

    refreshInFlight.current = true;

    try {
      const [nextBundle] = await Promise.all([
        fetchTimerBundle(timerId),
        syncServerTime(),
      ]);
      setBundle(nextBundle);
      setError(null);
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
      if (connectionStateRef.current === "connected") {
        setConnection("reconnecting");
      }
    } finally {
      refreshInFlight.current = false;
    }
  }, [setConnection, syncServerTime, timerId]);

  useEffect(() => {
    if (!timerId) return;

    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setConnection("connecting");
        refresh();
      }
    });

    try {
      channel = subscribeToTimer(
        timerId,
        () => {
          refresh();
        },
        (status) => {
          if (cancelled) return;

          if (status === "SUBSCRIBED") {
            setConnection("connected");
            refresh();
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
      queueMicrotask(() => {
        setError(safeErrorMessage(nextError));
        setConnection("reconnecting");
      });
    }

    const poll = window.setInterval(() => {
      if (connectionStateRef.current !== "connected") {
        refresh();
      }
    }, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [refresh, setConnection, timerId]);

  return {
    bundle,
    connectionState,
    error,
    refresh,
    serverOffsetMs,
    syncServerTime,
  };
}
