import { Wifi, WifiOff } from "lucide-react";
import type { ConnectionState } from "@/lib/use-timer-data";
import { cn } from "@/lib/utils";

export function ConnectionStatus({ className, state }: { className?: string; state: ConnectionState }) {
  const connected = state === "connected";

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-3 py-2 text-[11px] font-bold uppercase tracking-[.14em] text-white/68", className)}>
      {connected ? <Wifi size={14} aria-hidden /> : <WifiOff size={14} aria-hidden />}
      {connected ? "Sincronizado" : "Reconectando..."}
    </div>
  );
}
