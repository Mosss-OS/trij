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
                console.log("[SW] New version available - refresh to activate");
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
      await (reg as unknown as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(
        "trij-sync"
      );
    }
  } catch {
    // background sync not supported
  }
}

export function listenForSyncMessages(
  handler: (event: MessageEvent) => void
): () => void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return () => {};
  const listener = (event: MessageEvent) => {
    if (event.data?.type === "process-sync") {
      handler(event);
    }
  };
  navigator.serviceWorker.addEventListener("message", listener);
  return () => navigator.serviceWorker.removeEventListener("message", listener);
}
