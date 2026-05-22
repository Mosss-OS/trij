import { useEffect, useState, useCallback } from "react";
import { pendingCount, processSyncQueue, retryFailedSyncItems } from "@/lib/sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n";
import { RefreshCw, CheckCircle2, CloudOff, AlertTriangle, Wifi } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SyncState {
  pending: number;
  syncing: boolean;
  lastSynced: string | null;
}

export function NetworkStatusBar() {
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
    try {
      const retried = await retryFailedSyncItems();
      const result = await processSyncQueue();
      setState({
        pending: await pendingCount(),
        syncing: false,
        lastSynced: new Date().toISOString(),
      });
      if (retried > 0 || result.ok > 0 || result.failed > 0) {
        refresh();
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setState((s) => ({ ...s, syncing: false }));
    }
  };

  // Determine status color and message
  const getStatusColor = () => {
    if (!online) return "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400";
    if (state.pending > 0) return "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400";
    return "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400";
  };

  const getStatusIcon = () => {
    if (!online) return <CloudOff className="h-4 w-4" />;
    if (state.syncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (state.pending > 0) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (!online) return t("networkOfflineMessage");
    if (state.syncing) return t("networkSyncing");
    if (state.pending > 0) return `${t("networkPendingItems")} ${state.pending}`;
    if (state.lastSynced) {
      return `${t("networkLastSynced")} ${formatDistanceToNow(new Date(state.lastSynced), { addSuffix: true })}`;
    }
    return t("networkOnline");
  };

  const canSync = online && state.pending > 0 && !state.syncing;

  return (
    <button
      onClick={canSync ? handleSync : undefined}
      disabled={!canSync}
      className={`w-full border-b px-4 py-2 text-left text-sm transition-colors ${
        canSync ? "cursor-pointer hover:opacity-80" : "cursor-default"
      } ${getStatusColor()}`}
      aria-live="polite"
      role="status"
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">{getStatusMessage()}</span>
          {online && !state.syncing && <Wifi className="h-3 w-3 opacity-60" />}
        </div>
        {canSync && (
          <div className="flex items-center gap-1 text-xs opacity-60">
            <RefreshCw className="h-3 w-3" />
            {t("networkTapToSync")}
          </div>
        )}
      </div>
    </button>
  );
}
