"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock4, Crown, RefreshCw } from "lucide-react";
import { ActionLink, Button } from "@/components/ui/button";
import { EmptyState, Panel, SectionHeader } from "@/components/ui/panel";
import type { MyTimerRow } from "@/lib/types";
import { ensureAnonymousSession, listMyTimers } from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/utils";

function groupTimers(rows: MyTimerRow[]) {
  const owned = rows.filter((row) => row.member_role === "admin");
  const recents = rows;
  return { owned, recents };
}

export function MyTimers() {
  const [rows, setRows] = useState<MyTimerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { owned, recents } = useMemo(() => groupTimers(rows), [rows]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureAnonymousSession();
      const data = await listMyTimers({ limit: 12, offset: 0 });
      setRows(data);
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
  }, [refresh]);

  return (
    <Panel>
      <SectionHeader
        eyebrow="Mi cuenta"
        title="Mis timers"
        description="Tus sesiones recientes (incluye timers donde entraste como viewer) y los timers que administras."
        action={
          <div className="flex flex-wrap gap-2">
            <ActionLink href="/account" variant="secondary">
              Cuenta
              <ArrowRight size={16} aria-hidden />
            </ActionLink>
            <Button disabled={loading} onClick={refresh} variant="secondary">
              <RefreshCw size={16} aria-hidden />
              Actualizar
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4 rounded-[20px] border border-[rgb(180_35_59_/_25%)] bg-[var(--color-danger-soft)] p-4 text-sm font-semibold text-[var(--color-danger)]">
          {error}
        </div>
      ) : null}

      {!rows.length && !loading ? (
        <EmptyState
          title="Sin timers todavía"
          description="Crea una sesión o únete con un código y aparecerá aquí."
        />
      ) : (
        <div className="grid gap-6">
          <TimerGroup title="Recientes" icon="recent" rows={recents.slice(0, 6)} />
          <TimerGroup title="Owned (admin)" icon="owned" rows={owned.slice(0, 6)} />
        </div>
      )}
    </Panel>
  );
}

function TimerGroup({
  rows,
  title,
  icon,
}: {
  rows: MyTimerRow[];
  title: string;
  icon: "recent" | "owned";
}) {
  if (!rows.length) {
    return null;
  }

  return (
    <div>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[.18em] text-[var(--color-foreground-muted)]">
        {title}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div
            className="rounded-[24px] border border-black/10 bg-white/70 p-4"
            key={`${row.id}-${row.member_joined_at}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[var(--color-foreground-muted)]">
                  Código
                </p>
                <p className="mt-1 text-2xl font-extrabold tracking-[.12em] text-[var(--color-foreground)]">
                  {row.code}
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-black/62">
                  {row.name}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--color-foreground-muted)]">
                {icon === "owned" ? <Crown size={14} aria-hidden /> : <Clock4 size={14} aria-hidden />}
                {row.member_role}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionLink href={`/join?code=${row.code}`} size="sm" variant="secondary">
                Abrir viewer
                <ArrowRight size={16} aria-hidden />
              </ActionLink>
              {row.member_role === "admin" ? (
                <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-[.14em] text-[var(--color-foreground-muted)]">
                  Usa tu link Master guardado
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
