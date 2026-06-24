import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function OfflineIndicator({ className }: { className?: string }) {
  const { t } = useI18n();
  const online = useOnlineStatus();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        online ? "bg-urgency-green-bg text-urgency-green" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300 dark:border-amber-700",
        className,
      )}
      aria-label={online ? t("online") : t("offline")}
    >
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {online ? t("online") : t("offline")}
    </span>
  );
}
