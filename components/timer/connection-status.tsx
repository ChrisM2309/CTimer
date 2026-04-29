import { Wifi, WifiOff } from "lucide-react";
import type { ConnectionState } from "@/lib/use-timer-data";

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const connected = state === "connected";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 py-2 text-[11px] font-black uppercase tracking-[.14em] text-white/68">
      {connected ? <Wifi size={14} aria-hidden /> : <WifiOff size={14} aria-hidden />}
      {connected ? "Sincronizado" : "Reconectando..."}
    </div>
  );
}
