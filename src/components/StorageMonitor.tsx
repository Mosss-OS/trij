import { useEffect, useState } from "react";
import { getDB } from "@/lib/db";
import { getStorageInfo } from "@/lib/model-cache";
import { Progress } from "@/components/ui/progress";
import { HardDrive, AlertTriangle, AlertOctagon } from "lucide-react";

interface StorageData {
  used: string;
  quota: string;
  percentUsed: number;
  imageCount: number;
  assessmentCount: number;
  oldestRecord: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

async function collectStorageData(): Promise<StorageData> {
  const info = await getStorageInfo();
  const db = getDB();
  const assessments = await db.assessments.toArray();
  const imageCount = assessments.reduce((sum, a) => sum + (a.images?.length ?? 0), 0);
  const dates = assessments.map((a) => a.createdAt).filter(Boolean).sort();
  const oldestRecord = dates.length > 0 ? dates[0] : null;
  return {
    used: formatBytes(info.usage),
    quota: formatBytes(info.quota),
    percentUsed: info.percentUsed,
    imageCount,
    assessmentCount: assessments.length,
    oldestRecord,
  };
}

export function StorageMonitor() {
  const [data, setData] = useState<StorageData | null>(null);

  useEffect(() => {
    collectStorageData().then(setData);
    const interval = setInterval(() => collectStorageData().then(setData), 30000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return null;

  const critical = data.percentUsed >= 90;
  const warning = data.percentUsed >= 70;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Storage</span>
          <span className="font-mono text-xs text-muted-foreground">
            {data.used} of {data.quota}
          </span>
        </div>
        <Progress
          value={data.percentUsed}
          className={`h-2 ${critical ? "bg-destructive/20" : warning ? "bg-urgency-yellow/20" : ""}`}
        />
        <p className="text-xs text-muted-foreground">
          {data.percentUsed}% used &middot; {data.assessmentCount} assessment(s) &middot;{" "}
          {data.imageCount} image(s)
          {data.oldestRecord && ` · oldest: ${new Date(data.oldestRecord).toLocaleDateString()}`}
        </p>
      </div>

      {critical && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertOctagon className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Storage critically low</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your device is nearly full. Export or delete old assessments to free up space.
            </p>
          </div>
        </div>
      )}

      {warning && !critical && (
        <div className="flex items-start gap-3 rounded-2xl border border-urgency-yellow/30 bg-urgency-yellow/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-urgency-yellow" />
          <div className="text-sm">
            <p className="font-medium text-urgency-yellow">Storage running low</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Consider exporting assessments to free up space.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
