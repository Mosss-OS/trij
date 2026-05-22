import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getJob,
  saveJob,
  startDownload,
  resumeDownload,
  pauseDownload,
  removeJob,
  createDownloadJob,
  type DownloadJob,
  type DownloadProgress,
} from "@/lib/resumable-download";
import { Pause, Play, XCircle, Download, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  jobId: string;
  url: string;
  totalBytes: number;
  fileName: string;
  onComplete?: () => void;
  onError?: (err: string) => void;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatEta(sec: number): string {
  if (!isFinite(sec)) return "—";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

export function ResumableDownload({ jobId, url, totalBytes, fileName, onComplete, onError }: Props) {
  const { t } = useI18n();
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [initializing, setInitializing] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    getJob(jobId).then((existing) => {
      if (!mountedRef.current) return;
      if (existing && existing.status !== "completed" && existing.status !== "failed" && existing.status !== "cancelled") {
        setJob(existing);
        const pct = existing.totalBytes > 0 ? Math.round((existing.downloadedBytes / existing.totalBytes) * 100) : 0;
        setProgress({
          percent: pct,
          downloadedBytes: existing.downloadedBytes,
          totalBytes: existing.totalBytes,
          speedBytesPerSec: 0,
          etaSec: Infinity,
          status: existing.status,
        });
      } else if (!existing) {
        const j = createDownloadJob(jobId, url, totalBytes, fileName);
        setJob(j);
      }
      setInitializing(false);
    });
    return () => { mountedRef.current = false; };
  }, [jobId, url, totalBytes, fileName]);

  const handleProgress = useCallback((p: DownloadProgress) => {
    if (mountedRef.current) setProgress(p);
  }, []);

  const handleStart = useCallback(async () => {
    if (!job) return;
    await startDownload(job, handleProgress);
    const updated = await getJob(jobId);
    if (updated && mountedRef.current) {
      setJob(updated);
      if (updated.status === "completed") onComplete?.();
    }
  }, [job, jobId, handleProgress, onComplete]);

  const handlePause = useCallback(() => {
    pauseDownload(jobId);
    getJob(jobId).then((j) => {
      if (j && mountedRef.current) {
        j.status = "paused";
        j.updatedAt = Date.now();
        saveJob(j).then(() => setJob(j));
      }
    });
  }, [jobId]);

  const handleResume = useCallback(async () => {
    if (!job) return;
    await resumeDownload(job, handleProgress);
    const updated = await getJob(jobId);
    if (updated && mountedRef.current) {
      setJob(updated);
      if (updated.status === "completed") onComplete?.();
    }
  }, [job, jobId, handleProgress, onComplete]);

  const handleCancel = useCallback(async () => {
    pauseDownload(jobId);
    await removeJob(jobId);
    if (mountedRef.current) {
      setJob(null);
      setProgress(null);
    }
  }, [jobId]);

  if (initializing) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-xs text-muted-foreground">{t("notDownloaded")}</div>
    );
  }

  const isActive = job.status === "downloading";
  const isPaused = job.status === "paused";
  const isComplete = job.status === "completed";
  const isFailed = job.status === "failed";

  const speed = progress?.speedBytesPerSec ?? 0;
  const eta = progress?.etaSec ?? Infinity;
  const pct = progress?.percent ?? 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{fileName}</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <Progress
          value={isComplete ? 100 : pct}
          className={`h-2 ${isFailed ? "[&>*]:bg-destructive" : ""}`}
        />
        {isActive && (
          <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>
            {t("downloadingModel")} &middot; {formatSpeed(speed)}
          </span>
            <span>{formatEta(eta)} {t("remaining")}</span>
          </div>
        )}
      </div>

      {isFailed && job.error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{job.error}</span>
        </div>
      )}

      {isComplete && (
        <div className="flex items-center gap-2 text-xs text-urgency-green">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">{t("downloaded")}</span>
        </div>
      )}

      <div className="flex gap-2">
        {(isActive || isPaused) && (
          <Button size="sm" variant="outline" onClick={isPaused ? handleResume : handlePause} className="gap-1.5">
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {isPaused ? t("resume") : t("pause")}
          </Button>
        )}
        {job.status === "idle" && (
          <Button size="sm" onClick={handleStart} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {t("downloadModel")}
          </Button>
        )}
        {isFailed && (
          <Button size="sm" variant="outline" onClick={handleResume} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            {t("retry")}
          </Button>
        )}
        {(isActive || isPaused || isFailed) && (
          <Button size="sm" variant="ghost" onClick={handleCancel} className="gap-1.5 text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" />
            {t("cancel")}
          </Button>
        )}
        {isComplete && (
          <Button size="sm" variant="ghost" onClick={handleCancel} className="gap-1.5 text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" />
            {t("clearCache")}
          </Button>
        )}
      </div>
    </div>
  );
}
