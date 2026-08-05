"use client";

import { useEffect, useMemo, useState } from "react";
import type { SponsorMode, TimerAssetForceRow, TimerAssetRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function SponsorStrip({
  assets,
  className,
  force,
  mode,
  rotationSeconds,
  serverOffsetMs,
}: {
  assets: TimerAssetRow[];
  className?: string;
  force: TimerAssetForceRow | null;
  mode: SponsorMode;
  rotationSeconds: number;
  serverOffsetMs: number;
}) {
  const enabledAssets = useMemo(() => assets.filter((asset) => asset.enabled), [assets]);
  const [index, setIndex] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now() + serverOffsetMs);
  const [randomAssets, setRandomAssets] = useState<TimerAssetRow[]>([]);
  const [failedAssetId, setFailedAssetId] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setIndex(0);
      setRandomAssets(shuffle(enabledAssets));
    });
  }, [enabledAssets, mode]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setNowMs(Date.now() + serverOffsetMs);
    }, 500);

    return () => window.clearInterval(tick);
  }, [serverOffsetMs]);

  useEffect(() => {
    if (enabledAssets.length <= 1) return;

    const interval = window.setInterval(() => {
      setIndex((current) => {
        if (mode === "ordered") {
          return (current + 1) % enabledAssets.length;
        }

        return (current + 1) % Math.max(enabledAssets.length, 1);
      });

      if (mode === "random") {
        setRandomAssets((current) => {
          const queue = current.length <= 1 ? shuffle(enabledAssets) : current;
          return queue.slice(1);
        });
      }
    }, Math.max(rotationSeconds, 3) * 1000);

    return () => window.clearInterval(interval);
  }, [enabledAssets, mode, rotationSeconds]);

  const forcedAsset = useMemo(() => {
    if (!force?.active || !force.asset_id) return null;
    if (force.mode === "timed" && force.until_at) {
      const untilMs = new Date(force.until_at).getTime();
      if (nowMs >= untilMs) return null;
    }

    return enabledAssets.find((asset) => asset.id === force.asset_id) ?? null;
  }, [enabledAssets, force, nowMs]);

  const activeAsset = forcedAsset
    ? forcedAsset
    : mode === "random"
      ? randomAssets[0] ?? enabledAssets[index % Math.max(enabledAssets.length, 1)]
      : enabledAssets[index % Math.max(enabledAssets.length, 1)];

  if (!activeAsset || failedAssetId === activeAsset.id) {
    return null;
  }

  const displayName = (activeAsset.sponsor_name ?? "").trim();
  const displayTier = (activeAsset.sponsor_tier ?? "").trim();

  return (
    <div className={cn("viewer-sponsor", className)}>
      <div className="viewer-sponsor__content">
        <div className="viewer-sponsor__media">
          <img
            alt={displayName ? `Sponsor: ${displayName}` : "Sponsor activo"}
            className="viewer-sponsor__image"
            onError={() => setFailedAssetId(activeAsset.id)}
            src={activeAsset.url}
          />
        </div>

        {displayName || displayTier ? (
          <div className="viewer-sponsor__label flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            {displayTier ? (
              <span className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--color-accent)]">
                {displayTier}
              </span>
            ) : null}
            {displayName ? (
              <span className="text-xs font-black uppercase tracking-[.14em] text-white/70">
                {displayName}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
