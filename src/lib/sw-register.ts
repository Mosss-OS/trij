export function registerSW(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (newSW) {
            newSW.addEventListener("statechange", () => {
              if (newSW.state === "installed" && navigator.serviceWorker.controller) {
                console.debug("[SW] New version available - refresh to activate");
              }
            });
          }
        });
      })
      .catch((err) => console.error("[SW] Registration failed:", err));
  });
}

export async function registerBackgroundSync(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("sync" in reg) {
      await (
        reg as unknown as ServiceWorkerRegistration & {
          sync: { register: (tag: string) => Promise<void> };
        }
      ).sync.register("trij-sync");
    }
  } catch {
    // background sync not supported
  }
}

export function listenForSyncMessages(handler: (event: MessageEvent) => void): () => void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const listener = (event: MessageEvent) => {
    if (event.data?.type === "process-sync") {
      handler(event);
    }
  };
  navigator.serviceWorker.addEventListener("message", listener);
  return () => navigator.serviceWorker.removeEventListener("message", listener);
}

// Background download via Service Worker
export function swDownloadStart(
  jobId: string,
  url: string,
  totalBytes: number,
  sha256PerChunk?: string[],
): void {
  if (typeof window === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "download-start",
    jobId,
    url,
    totalBytes,
    sha256PerChunk: sha256PerChunk ?? [],
  });
}

export function swDownloadPause(jobId: string): void {
  if (typeof window === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "download-pause",
    jobId,
  });
}

export function swDownloadCancel(jobId: string): void {
  if (typeof window === "undefined" || !navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "download-cancel",
    jobId,
  });
}

export type SWDownloadProgress = {
  type: "download-progress";
  jobId: string;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSec: number;
  status: string;
};

export type SWDownloadError = {
  type: "download-error";
  jobId: string;
  error: string;
};

export type SWDownloadStatus = {
  type: "download-status";
  jobId: string;
  status: string;
  downloadedBytes: number;
  totalBytes: number;
};

export type SWDownloadMessage = SWDownloadProgress | SWDownloadError | SWDownloadStatus;

export function listenForDownloadMessages(
  handler: (msg: SWDownloadMessage) => void,
): () => void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const listener = (event: MessageEvent) => {
    const data = event.data;
    if (
      data?.type === "download-progress" ||
      data?.type === "download-error" ||
      data?.type === "download-status"
    ) {
      handler(data);
    }
  };
  navigator.serviceWorker.addEventListener("message", listener);
  return () => navigator.serviceWorker.removeEventListener("message", listener);
}
