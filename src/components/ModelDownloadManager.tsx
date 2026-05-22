import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ResumableDownload } from "@/components/ResumableDownload";
import { Download, Trash2, HardDrive, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface DownloadableModel {
  url: string;
  totalBytes: number;
  fileName: string;
}

const MODEL_DOWNLOADS: Record<string, DownloadableModel | null> = {
  // WebLLM models are handled internally; add direct-download GGUF models here.
  // "gguf-model-id": { url: "https://...", totalBytes: 2_000_000_000, fileName: "model.gguf" },
};

export function ModelDownloadManager() {
  const { t } = useI18n();
  const engineKind = useSettingsStore((s) => s.engineKind);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [model, setModel] = useState<ModelStatus>(() => getModelStatus());
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [engineLoaded, setEngineLoaded] = useState(false);
  const [hasWebGPU, setHasWebGPU] = useState<boolean | null>(null);
  const mountRef = useRef(true);

  useEffect(() => {
    mountRef.current = true;
    supportsWebGPU().then(setHasWebGPU);
    getStorageInfo().then(setStorage);
    return () => { mountRef.current = false; };
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
      if (mountRef.current) toast.success(t("loaded"));
    } catch (err) {
      if (mountRef.current) toast.error(t("failedPrefix") + (err as Error).message);
    } finally {
      if (mountRef.current) setDownloading(false);
    }
  }, [model, t]);

  const handleClearCache = useCallback(async () => {
    await clearModelCache();
    setModel(getModelStatus());
    setEngineLoaded(false);
    setDownloadProgress(0);
    if (mountRef.current) toast.success(t("clearCache"));
  }, [t]);

  const refreshing = async () => {
    setStorage(await getStorageInfo());
    setModel(getModelStatus());
    setEngineLoaded(isLoaded("webllm" as EngineKind));
  };

  const insufficient = storage && !hasEnoughStorage(storage);
  const show = engineKind === "auto" || engineKind === "webllm";
  const directModel = MODEL_DOWNLOADS[model.modelId];

  if (!show) return null;

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold">{t("onDeviceModel")}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={refreshing} title={t("refresh")}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("modelLabel")}</span>
          <span className="font-medium">{model.modelId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("sizeLabel")}</span>
          <span className="font-medium">{formatBytes(model.sizeBytes)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("statusLabel")}</span>
          <span className="flex items-center gap-1.5 font-medium">
            {engineLoaded || isLoaded("webllm" as EngineKind) ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-urgency-green" /> {t("loaded")}
              </>
            ) : model.downloaded ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-urgency-green" /> {t("downloaded")}
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-urgency-yellow" /> {t("notDownloaded")}
              </>
            )}
          </span>
        </div>
        {model.downloadDate && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("downloaded")}</span>
            <span className="font-medium">{new Date(model.downloadDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {storage && (
        <div className="space-y-1.5 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("storageLabel")}</span>
            <span className="font-medium">
              {t("pctUsed").replace("{pct}", String(storage.percentUsed))}
            </span>
          </div>
          <Progress value={storage.percentUsed} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {formatBytes(storage.usage)} {t("of")} {formatBytes(storage.quota)} {t("used")} &middot;{" "}
            {storage.available} {t("available")}
          </p>
        </div>
      )}

      {insufficient && (
        <div className="flex items-start gap-2 rounded-xl border border-urgency-yellow/30 bg-urgency-yellow-bg/40 p-3 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-yellow" />
          <p className="text-muted-foreground">{t("notEnoughSpace")}</p>
        </div>
      )}

      {!hasWebGPU && (
        <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          {t("webgpuNotAvailableBrowser")}
        </div>
      )}

      {downloading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("downloadingModel")}</span>
            <span className="font-medium">{downloadProgress}%</span>
          </div>
          <Progress value={downloadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">{t("loadingWeights")}</p>
        </div>
      )}

      {directModel && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("resumableDownload")}</p>
          <ResumableDownload
            jobId="trij-model"
            url={directModel.url}
            totalBytes={directModel.totalBytes}
            fileName={directModel.fileName}
            onComplete={() => setModel(getModelStatus())}
          />
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
          {downloading
            ? t("downloadingModel")
            : model.downloaded
              ? t("reloadModel")
              : t("downloadModel")}
        </Button>
        <Button
          onClick={handleClearCache}
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!model.downloaded && !engineLoaded}
        >
          <Trash2 className="h-4 w-4" />
          {t("clearCache")}
        </Button>
      </div>
    </div>
  );
}
