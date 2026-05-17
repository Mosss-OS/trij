import { useEffect, useState, useCallback } from "react";
import { pendingCount, processSyncQueue, retryFailedSyncItems } from "@/lib/sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n";
import { RefreshCw, CheckCircle2, CloudOff, AlertTriangle } from "lucide-react";

interface SyncState {
  pending: number;
  syncing: boolean;
  lastSynced: string | null;
}

export function SyncStatusIndicator() {
  const { t } = useI18n();
  const online = useOnlineStatus();
  const [state, setState] = useState<SyncState>({ pending: 0, syncing: false, lastSynced: null });

  const refresh = useCallback(async () => {
    const count = await pendingCount();
    setState((s) => ({ ...s, pending: count }));
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleSync = async () => {
    if (!online || state.syncing) return;
    setState((s) => ({ ...s, syncing: true }));
    const retried = await retryFailedSyncItems();
    const result = await processSyncQueue();
    setState({ pending: await pendingCount(), syncing: false, lastSynced: new Date().toISOString() });
    if (retried > 0 || result.ok > 0 || result.failed > 0) {
      refresh();
    }
  };

  if (!online) {
    return (
      <button
        onClick={handleSync}
        disabled
        className="fixed bottom-20 left-2 z-50 flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground shadow"
        title={t("offline")}
        aria-label={t("offline")}
      >
        <CloudOff className="h-3 w-3" />
        <span>Offline</span>
      </button>
    );
  }

  if (state.pending === 0) {
    return (
      <button
        onClick={handleSync}
        className="fixed bottom-20 left-2 z-50 flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground shadow hover:bg-accent"
        title={t("allSynced")}
        aria-label={t("allSynced")}
      >
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        <span>Synced</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleSync}
      disabled={state.syncing}
      className="fixed bottom-20 left-2 z-50 flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700 shadow hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
      title={`${state.pending} ${t("itemsPendingSync")}`}
      aria-label={`${state.pending} ${t("itemsPendingSync")}`}
    >
      {state.syncing ? (
        <RefreshCw className="h-3 w-3 animate-spin" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      <span>{state.pending}</span>
    </button>
  );
}
