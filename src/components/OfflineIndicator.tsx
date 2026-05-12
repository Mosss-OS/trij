import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator({ className }: { className?: string }) {
  const online = useOnlineStatus();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        online
          ? "bg-urgency-green-bg text-urgency-green"
          : "bg-muted text-muted-foreground",
        className
      )}
      aria-label={online ? "Online" : "Offline"}
    >
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {online ? "Online" : "Offline"}
    </span>
  );
}
