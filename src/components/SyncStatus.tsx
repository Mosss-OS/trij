import { useEffect, useState, useRef } from "react";
import {
  pendingCount,
  processSyncQueue,
  type SyncProgressItem,
  getDeadLetterItems,
  retryDeadLetterItem,
  deleteDeadLetterItem,
} from "@/lib/sync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  CloudUpload,
  CheckCircle2,
  Loader2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface SyncSummary {
  total: number;
  ok: number;
  failed: number;
  deadLetter: number;
  items: SyncProgressItem[];
}

interface DeadLetterItem {
  id?: number;
  table: string;
  recordId: string;
  lastError: string;
}

export function SyncStatus({ className }: { className?: string }) {
  const { t } = useI18n();
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [deadLetterItems, setDeadLetterItems] = useState<DeadLetterItem[]>([]);
  const [showDeadLetter, setShowDeadLetter] = useState(false);
  const summaryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const c = await pendingCount();
        if (alive) setPending(c);
        const dl = await getDeadLetterItems();
        if (alive) setDeadLetterItems(dl);
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
      const s: SyncSummary = {
        total: items.length,
        ok: result.ok,
        failed: result.failed,
        deadLetter: result.deadLetter,
        items,
      };
      setSummary(s);
      if (summaryTimeout.current) clearTimeout(summaryTimeout.current);
      summaryTimeout.current = setTimeout(() => setSummary(null), 8000);
    });
  }, [online, pending, syncing]);

  const showSummary = summary && !syncing && summary.total > 0;
  const hasDeadLetter = deadLetterItems.length > 0;

  const handleRetry = async (id: number) => {
    await retryDeadLetterItem(id);
    const dl = await getDeadLetterItems();
    setDeadLetterItems(dl);
  };

  const handleDelete = async (id: number) => {
    await deleteDeadLetterItem(id);
    const dl = await getDeadLetterItems();
    setDeadLetterItems(dl);
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        disabled={!showSummary && pending === 0 && !syncing && !hasDeadLetter}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs transition-colors",
          pending === 0 && !syncing && !showSummary && !hasDeadLetter
            ? "text-muted-foreground"
            : "font-medium text-foreground",
        )}
      >
        {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
        {!syncing && hasDeadLetter && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
        {!syncing && showSummary && summary.failed > 0 && (
          <XCircle className="h-3.5 w-3.5 text-destructive" />
        )}
        {!syncing && showSummary && summary.failed === 0 && !hasDeadLetter && (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        )}
        {!syncing && !showSummary && pending > 0 && (
          <CloudUpload className="h-3.5 w-3.5 text-primary" />
        )}
        {!syncing && !showSummary && pending === 0 && !hasDeadLetter && (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        )}

        {syncing && `${t("syncing")} ${pending} ${t("items")}...`}
        {!syncing &&
          showSummary &&
          `${summary.ok} ${t("synced")}` +
            (summary.failed > 0 ? `, ${summary.failed} ${t("failed")}` : "") +
            (summary.deadLetter > 0 ? `, ${summary.deadLetter} ${t("deadLetter")}` : "")}
        {!syncing && !showSummary && (pending > 0 ? `${pending} ${t("pending")}` : t("synced"))}
        {!syncing && hasDeadLetter && ` (${deadLetterItems.length} ${t("deadLetter")})`}

        {(showSummary || (!syncing && pending > 0) || hasDeadLetter) && (
          <span className="ml-0.5">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        )}
      </button>

      {/* Dead Letter Section */}
      {expanded && hasDeadLetter && !showDeadLetter && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-amber-500/30 bg-amber-50 p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-amber-800">
              {t("deadLetterItems")} ({deadLetterItems.length})
            </p>
            <button
              onClick={() => setShowDeadLetter(true)}
              className="text-xs text-amber-600 hover:text-amber-800 underline"
            >
              {t("viewDetails")}
            </button>
          </div>
          <p className="text-xs text-amber-700">{t("deadLetterDescription")}</p>
        </div>
      )}

      {/* Dead Letter Details */}
      {expanded && showDeadLetter && hasDeadLetter && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-amber-500/30 bg-amber-50 p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-amber-800">
              {t("deadLetterItems")} ({deadLetterItems.length})
            </p>
            <button
              onClick={() => setShowDeadLetter(false)}
              className="text-xs text-amber-600 hover:text-amber-800"
            >
              {t("hideDetails")}
            </button>
          </div>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {deadLetterItems.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg bg-white/50 p-2 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-amber-900">
                    {item.table}: {item.recordId.slice(0, 8)}
                  </p>
                  <p className="mt-0.5 break-words text-[10px] text-amber-700">{item.lastError}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => item.id && handleRetry(item.id)}
                    className="rounded p-1 hover:bg-amber-100"
                    title={t("retry")}
                  >
                    <RotateCw className="h-3 w-3 text-amber-600" />
                  </button>
                  <button
                    onClick={() => item.id && handleDelete(item.id)}
                    className="rounded p-1 hover:bg-amber-100"
                    title={t("delete")}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Regular Sync Queue Section */}
      {expanded && showSummary && summary.items.length > 0 && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border bg-card p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {t("syncResults")} ({summary.ok} {t("ok")}, {summary.failed} {t("failed")},{" "}
            {summary.deadLetter} {t("deadLetter")})
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
                {item.status === "dead_letter" && (
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
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
            {pending} {t("items")} {t("waitingForSync")}
          </p>
        </div>
      )}
    </div>
  );
}
