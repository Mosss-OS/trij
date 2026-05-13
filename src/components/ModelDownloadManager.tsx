import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getStorageInfo,
  getModelStatus,
  clearModelCache,
  formatBytes,
  hasEnoughStorage,
  type StorageInfo,
  type ModelStatus,
} from "@/lib/model-cache";
import { supportsWebGPU, loadEngine, isLoaded, type EngineKind } from "@/lib/gemma";
import { useSettingsStore } from "@/stores/settingsStore";
import { Download, Trash2, HardDrive, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function ModelDownloadManager() {
  const engineKind = useSettingsStore((s) => s.engineKind);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [model, setModel] = useState<ModelStatus>(getModelStatus());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [engineLoaded, setEngineLoaded] = useState(false);
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);

  useEffect(() => {
    supportsWebGPU().then(setHasWebGPU);
    getStorageInfo().then(setStorage);
  }, []);

  useEffect(() => {
    const t = setInterval(async () => {
      setStorage(await getStorageInfo());
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      await loadEngine("webllm" as EngineKind, (report) => {
        const pct = Math.round((report.progress || 0) * 100);
        setDownloadProgress(pct);
      });
      setEngineLoaded(true);
      setModel({ ...model, downloaded: true, downloadDate: new Date().toISOString() });
      toast.success("Model loaded successfully");
    } catch (err) {
      toast.error("Download failed: " + (err as Error).message);
    } finally {
      setDownloading(false);
    }
  }, [model]);

  const handleClearCache = useCallback(async () => {
    await clearModelCache();
    setModel(getModelStatus());
    setEngineLoaded(false);
    setDownloadProgress(0);
    toast.success("Model cache cleared");
  }, []);

  const refreshing = async () => {
    setStorage(await getStorageInfo());
    setModel(getModelStatus());
    setEngineLoaded(isLoaded("webllm" as EngineKind));
  };

  const insufficient = storage && !hasEnoughStorage(storage);
  const show = engineKind === "auto" || engineKind === "webllm";

  if (!show) return null;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold">On-device model</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={refreshing} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Model</span>
          <span className="font-medium">{model.modelId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Size</span>
          <span className="font-medium">{formatBytes(model.sizeBytes)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="flex items-center gap-1.5 font-medium">
            {engineLoaded || isLoaded("webllm" as EngineKind) ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-urgency-green" /> Loaded
              </>
            ) : model.downloaded ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-urgency-green" /> Downloaded
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-urgency-yellow" /> Not downloaded
              </>
            )}
          </span>
        </div>
        {model.downloadDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Downloaded</span>
            <span className="font-medium">{new Date(model.downloadDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {storage && (
        <div className="space-y-1.5 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Storage</span>
            <span className="font-medium">{storage.percentUsed}% used</span>
          </div>
          <Progress value={storage.percentUsed} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {formatBytes(storage.usage)} of {formatBytes(storage.quota)} used &middot;{" "}
            {storage.available} available
          </p>
        </div>
      )}

      {insufficient && (
        <div className="flex items-start gap-2 rounded-xl border border-urgency-yellow/30 bg-urgency-yellow-bg/40 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-yellow" />
          <p className="text-muted-foreground">
            Not enough free space. Free up storage or use Ollama / Demo mode.
          </p>
        </div>
      )}

      {!hasWebGPU && (
        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          WebGPU not available on this browser. Use Ollama or Demo mode instead.
        </div>
      )}

      {downloading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Downloading...</span>
            <span className="font-medium">{downloadProgress}%</span>
          </div>
          <Progress value={downloadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Loading model weights. This may take a few minutes on first run.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleDownload}
          disabled={downloading || !hasWebGPU}
          size="sm"
          className="gap-1.5"
        >
          {downloading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloading ? "Downloading..." : model.downloaded ? "Reload model" : "Download model"}
        </Button>
        <Button
          onClick={handleClearCache}
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!model.downloaded && !engineLoaded}
        >
          <Trash2 className="h-4 w-4" />
          Clear cache
        </Button>
      </div>
    </div>
  );
}
