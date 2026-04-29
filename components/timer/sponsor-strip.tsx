"use client";

import { useEffect, useMemo, useState } from "react";
import type { SponsorMode, TimerAssetForceRow, TimerAssetRow } from "@/lib/types";

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
  force,
  mode,
  rotationSeconds,
  serverOffsetMs,
}: {
  assets: TimerAssetRow[];
  force: TimerAssetForceRow | null;
  mode: SponsorMode;
  rotationSeconds: number;
  serverOffsetMs: number;
}) {
  const enabledAssets = useMemo(
    () => assets.filter((asset) => asset.enabled),
    [assets],
  );
  const [index, setIndex] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now() + serverOffsetMs);
  const [randomAssets, setRandomAssets] = useState<TimerAssetRow[]>([]);

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

  if (!activeAsset) {
    return (
      <div className="border-t border-white/10 bg-black/50 px-5 py-4 text-center text-[11px] font-black uppercase tracking-[.18em] text-white/38">
        Sponsor strip listo para imágenes
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 bg-black/68 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        <img
          alt="Sponsor activo"
          className="h-14 max-w-full object-contain sm:h-20"
          src={activeAsset.url}
        />
        {forcedAsset ? (
          <span className="ml-4 rounded-full border border-[rgba(201,176,138,.42)] px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-[var(--color-warm)]">
            Force
          </span>
        ) : null}
      </div>
    </div>
  );
}
