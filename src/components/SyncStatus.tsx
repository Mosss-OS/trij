import { useEffect, useState } from "react";
import { pendingCount, processSyncQueue } from "@/lib/sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CloudUpload, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncStatus({ className }: { className?: string }) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const c = await pendingCount();
        if (alive) setPending(c);
      } catch {
        /* db not ready */
      }
    };
    refresh();
    const t = setInterval(refresh, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!online || pending === 0 || syncing) return;
    setSyncing(true);
    processSyncQueue().finally(() => setSyncing(false));
  }, [online, pending, syncing]);

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        pending === 0 && !syncing ? "text-muted-foreground" : "font-medium text-foreground",
        className,
      )}
    >
      {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
      {!syncing && pending > 0 && <CloudUpload className="h-3.5 w-3.5 text-primary" />}
      {!syncing && pending === 0 && <CheckCircle2 className="h-3.5 w-3.5 text-urgency-green" />}
      {syncing ? "Syncing" : pending > 0 ? `${pending} pending` : "Synced"}
    </span>
  );
}
