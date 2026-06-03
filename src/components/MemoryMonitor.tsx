import { useEffect, useState } from "react";
import { getMemoryInfo, type MemoryInfo } from "@/lib/memory-manager";
import { MemoryStick, AlertTriangle, AlertOctagon } from "lucide-react";

export function MemoryMonitor() {
  const [info, setInfo] = useState<MemoryInfo | null>(null);

  useEffect(() => {
    setInfo(getMemoryInfo());
    const interval = setInterval(() => setInfo(getMemoryInfo()), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!info) return null;

  const critical = info.deviceMemory !== null && info.deviceMemory <= 2;
  const warning = info.deviceMemory !== null && info.deviceMemory <= 4 && !critical;

  return (
    <div className="mt-3 space-y-1.5 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <MemoryStick className="h-4 w-4 text-muted-foreground" />
          Memory
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {info.deviceMemory !== null ? `${info.deviceMemory} GB` : "Unknown"}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>CPU cores: {info.hardwareConcurrency ?? "Unknown"}</span>
        <span className={info.memoryPressure ? "text-destructive" : ""}>
          {info.estimatedMemoryUsage}
        </span>
      </div>
      {critical && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs">
          <AlertOctagon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
          <p className="text-destructive">
            Limited device memory — AI may be unstable. Switch to Demo mode for reliable performance.
          </p>
        </div>
      )}
      {warning && !critical && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-urgency-yellow/30 bg-urgency-yellow/5 p-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-urgency-yellow" />
          <p className="text-urgency-yellow">
            Device memory is limited. Close other apps or tabs for best AI performance.
          </p>
        </div>
      )}
    </div>
  );
}
