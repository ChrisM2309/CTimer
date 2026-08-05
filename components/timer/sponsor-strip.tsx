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

function weightedPool(assets: TimerAssetRow[]) {
  return assets.flatMap((asset) =>
    Array.from({ length: Math.max(1, Math.min(asset.weight ?? 1, 10)) }, () => asset),
  );
}

function assetKey(asset: TimerAssetRow) {
  return `${asset.id}:${asset.url}`;
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
  const weightedAssets = useMemo(() => weightedPool(enabledAssets), [enabledAssets]);
  const [index, setIndex] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now() + serverOffsetMs);
  const [randomAssets, setRandomAssets] = useState<TimerAssetRow[]>([]);
  const [failedAssetKeys, setFailedAssetKeys] = useState<string[]>([]);

  const availableAssets = useMemo(
    () => weightedAssets.filter((asset) => !failedAssetKeys.includes(assetKey(asset))),
    [failedAssetKeys, weightedAssets],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setIndex(0);
      setRandomAssets(shuffle(availableAssets));
    });
  }, [availableAssets, mode]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setNowMs(Date.now() + serverOffsetMs);
    }, 500);

    return () => window.clearInterval(tick);
  }, [serverOffsetMs]);

  useEffect(() => {
    if (availableAssets.length <= 1) return;

    const interval = window.setInterval(() => {
      setIndex((current) => {
        if (mode === "ordered") {
          return (current + 1) % availableAssets.length;
        }

        return (current + 1) % Math.max(availableAssets.length, 1);
      });

      if (mode === "random") {
        setRandomAssets((current) => {
          return current.length <= 1 ? shuffle(availableAssets) : current.slice(1);
        });
      }
    }, Math.max(rotationSeconds, 3) * 1000);

    return () => window.clearInterval(interval);
  }, [availableAssets, mode, rotationSeconds]);

  const forcedAsset = useMemo(() => {
    if (!force?.active || !force.asset_id) return null;
    if (force.mode === "timed" && force.until_at) {
      const untilMs = new Date(force.until_at).getTime();
      if (nowMs >= untilMs) return null;
    }

    return enabledAssets.find(
      (asset) => asset.id === force.asset_id && !failedAssetKeys.includes(assetKey(asset)),
    ) ?? null;
  }, [enabledAssets, failedAssetKeys, force, nowMs]);

  const activeAsset = forcedAsset
    ? forcedAsset
    : mode === "random"
      ? randomAssets.find((asset) => availableAssets.some((candidate) => candidate.id === asset.id)) ??
        availableAssets[index % Math.max(availableAssets.length, 1)]
      : availableAssets[index % Math.max(availableAssets.length, 1)];

  if (!activeAsset) {
    return null;
  }

  const displayName = (activeAsset.sponsor_name ?? "").trim();
  const displayTier = (activeAsset.sponsor_tier ?? "").trim();

  return (
    <div className={cn("viewer-sponsor", className)}>
      <div className="viewer-sponsor__content">
        <div
          className={cn(
            "viewer-sponsor__media",
            activeAsset.background_mode === "light" && "viewer-sponsor__media--light",
            activeAsset.background_mode === "dark" && "viewer-sponsor__media--dark",
          )}
        >
          <img
            alt={displayName ? `Sponsor: ${displayName}` : "Sponsor activo"}
            className="viewer-sponsor__image"
            decoding="async"
            loading="eager"
            onError={() => {
              const key = assetKey(activeAsset);
              setFailedAssetKeys((current) =>
                current.includes(key) ? current : [...current, key],
              );
            }}
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
