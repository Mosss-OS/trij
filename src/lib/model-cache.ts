import { getModelId, setModelId, clearOllamaCache } from "@/lib/gemma";

export interface StorageInfo {
  usage: number;
  quota: number;
  available: string;
  percentUsed: number;
}

export interface ModelStatus {
  modelId: string;
  downloaded: boolean;
  downloadDate: string | null;
  sizeBytes: number;
}

const MODEL_SIZE_ESTIMATE = 1.5 * 1024 * 1024 * 1024; // ~1.5 GB for Gemma 4 E2B
const STORAGE_KEY = "trij_model_download_date";

export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    if (!navigator.storage?.estimate) {
      return { usage: 0, quota: 0, available: "Unknown", percentUsed: 0 };
    }
    const est = await navigator.storage.estimate();
    const usage = est.usage ?? 0;
    const quota = est.quota ?? 0;
    return {
      usage,
      quota,
      available: formatBytes(quota - usage),
      percentUsed: quota > 0 ? Math.round((usage / quota) * 100) : 0,
    };
  } catch {
    return { usage: 0, quota: 0, available: "Unknown", percentUsed: 0 };
  }
}

export function getModelStatus(): ModelStatus {
  const date = localStorage.getItem(STORAGE_KEY);
  return {
    modelId: getModelId(),
    downloaded: !!date,
    downloadDate: date,
    sizeBytes: MODEL_SIZE_ESTIMATE,
  };
}

export function markModelDownloaded(): void {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}

export function clearModelDownloadFlag(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function clearModelCache(): Promise<void> {
  clearModelDownloadFlag();
  setModelId(getModelId());

  try {
    const keys = await caches.keys();
    for (const key of keys) {
      if (key.includes("mlc") || key.includes("webllm") || key.includes("gemma")) {
        await caches.delete(key);
      }
    }
  } catch {
    // cache cleanup failure is non-critical
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function hasEnoughStorage(storage: StorageInfo): boolean {
  const available = storage.quota - storage.usage;
  return available >= MODEL_SIZE_ESTIMATE;
}
