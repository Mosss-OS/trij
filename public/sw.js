var SW_VERSION = "1.0.0";
var CACHE_NAME = "trij-shell-" + SW_VERSION;

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) {
            return k.startsWith("trij-shell-") && k !== CACHE_NAME;
          })
          .map(function (k) {
            return caches.delete(k);
          }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("sync", function (event) {
  if (event.tag === "trij-sync") {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  try {
    var clients = await self.clients.matchAll({ type: "window" });
    if (clients.length > 0) {
      clients.forEach(function (client) {
        client.postMessage({ type: "process-sync", timestamp: Date.now() });
      });
    }
  } catch (e) {
    console.error("[SW] handleBackgroundSync error:", e);
  }
}
