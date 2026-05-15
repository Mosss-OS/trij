import { useEffect, useState, useRef } from "react";
import { pendingCount, processSyncQueue, type SyncProgressItem } from "@/lib/sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  CloudUpload,
  CheckCircle2,
  Loader2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncSummary {
  total: number;
  ok: number;
  failed: number;
  items: SyncProgressItem[];
}

export function SyncStatus({ className }: { className?: string }) {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [expanded, setExpanded] = useState(false);
  const summaryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const t = setInterval(refresh, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!online || pending === 0 || syncing) return;
    const items: SyncProgressItem[] = [];
    setSyncing(true);
    setSummary(null);
    processSyncQueue((item) => {
      items.push(item);
    }).then((result) => {
      setSyncing(false);
      const s: SyncSummary = { total: items.length, ok: result.ok, failed: result.failed, items };
      setSummary(s);
      if (summaryTimeout.current) clearTimeout(summaryTimeout.current);
      summaryTimeout.current = setTimeout(() => setSummary(null), 8000);
    });
  }, [online, pending, syncing]);

  const showSummary = summary && !syncing && summary.total > 0;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        disabled={!showSummary && pending === 0 && !syncing}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs transition-colors",
          pending === 0 && !syncing && !showSummary
            ? "text-muted-foreground"
            : "font-medium text-foreground",
        )}
      >
        {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
        {!syncing && showSummary && summary.failed > 0 && (
          <XCircle className="h-3.5 w-3.5 text-destructive" />
        )}
        {!syncing && showSummary && summary.failed === 0 && (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        )}
        {!syncing && !showSummary && pending > 0 && (
          <CloudUpload className="h-3.5 w-3.5 text-primary" />
        )}
        {!syncing && !showSummary && pending === 0 && (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        )}

        {syncing && `Syncing ${pending} item(s)...`}
        {!syncing &&
          showSummary &&
          `${summary.ok} synced` + (summary.failed > 0 ? `, ${summary.failed} failed` : "")}
        {!syncing && !showSummary && (pending > 0 ? `${pending} pending` : "Synced")}

        {(showSummary || (!syncing && pending > 0)) && (
          <span className="ml-0.5">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        )}
      </button>

      {expanded && showSummary && summary.items.length > 0 && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border bg-card p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Sync results ({summary.ok} ok, {summary.failed} failed)
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {summary.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg bg-secondary/30 p-2 text-xs"
              >
                {item.status === "ok" && (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
                )}
                {item.status === "failed" && (
                  <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-destructive" />
                )}
                {item.status === "syncing" && (
                  <Loader2 className="mt-0.5 h-3 w-3 animate-spin text-primary" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {item.table.slice(0, -1)}: {item.recordId.slice(0, 8)}
                  </p>
                  {item.error && (
                    <p className="mt-0.5 break-words text-[10px] text-muted-foreground">
                      {item.error}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {expanded && !syncing && !showSummary && pending > 0 && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border bg-card p-3 shadow-lg">
          <p className="text-xs text-muted-foreground">
            {pending} item(s) waiting for sync. They will sync automatically when online.
          </p>
        </div>
      )}
    </div>
  );
}
