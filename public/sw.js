var SW_VERSION = "2.0.0";
var CACHE_NAME = "trij-shell-" + SW_VERSION;
var CHUNK_SIZE = 50 * 1024 * 1024;

// Active download tracking
var activeDownloads = {};

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
    clients.forEach(function (client) {
      client.postMessage({ type: "process-sync", timestamp: Date.now() });
    });
  } catch (e) {
    console.error("[SW] handleBackgroundSync error:", e);
  }
}

// Open IndexedDB for download persistence
function openDB() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open("trij-downloads-sw", 1);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains("chunks")) {
        db.createObjectStore("chunks", { keyPath: ["jobId", "index"] });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function sha256(data) {
  return crypto.subtle.digest("SHA-256", data).then(function (hash) {
    var hex = "";
    var bytes = new Uint8Array(hash);
    for (var i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
  });
}

function postToClients(msg) {
  self.clients.matchAll({ type: "window" }).then(function (clients) {
    clients.forEach(function (c) { c.postMessage(msg); });
  });
}

async function performDownload(jobId, url, totalBytes, sha256PerChunk) {
  var totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
  var downloadedBytes = 0;
  var startTime = Date.now();

  // Get existing chunks from IndexedDB
  var db = await openDB();
  var existingChunks = await db.getAll("chunks");
  existingChunks = existingChunks.filter(function (c) { return c.jobId === jobId; });
  var completedIndices = new Set(existingChunks.map(function (c) { return c.index; }));
  existingChunks.forEach(function (c) { downloadedBytes += c.size; });
  var startIndex = completedIndices.size;

  for (var i = startIndex; i < totalChunks; i++) {
    if (activeDownloads[jobId] === "paused" || activeDownloads[jobId] === "cancelled") {
      postToClients({ type: "download-status", jobId: jobId, status: activeDownloads[jobId], downloadedBytes: downloadedBytes, totalBytes: totalBytes });
      return;
    }

    var start = i * CHUNK_SIZE;
    var end = Math.min(start + CHUNK_SIZE, totalBytes) - 1;

    try {
      var resp = await fetch(jobId === "trij-model-url" ? url : url, {
        headers: { Range: "bytes=" + start + "-" + end },
        cache: "no-store",
      });

      if (!resp.ok && resp.status !== 206) {
        postToClients({ type: "download-error", jobId: jobId, error: "Server does not support Range requests" });
        return;
      }

      var data = await resp.arrayBuffer();
      var hash = await sha256(data);

      if (sha256PerChunk && sha256PerChunk[i] && hash !== sha256PerChunk[i]) {
        postToClients({ type: "download-error", jobId: jobId, error: "SHA-256 mismatch on chunk " + i });
        return;
      }

      await db.put("chunks", { jobId: jobId, index: i, data: data, sha256: hash, size: data.byteLength });
      downloadedBytes += data.byteLength;

      var elapsed = (Date.now() - startTime) / 1000;
      var speed = downloadedBytes / Math.max(elapsed, 1);
      var remaining = totalBytes - downloadedBytes;

      postToClients({
        type: "download-progress",
        jobId: jobId,
        percent: Math.round((downloadedBytes / totalBytes) * 100),
        downloadedBytes: downloadedBytes,
        totalBytes: totalBytes,
        speedBytesPerSec: Math.round(speed),
        etaSec: speed > 0 ? Math.round(remaining / speed) : Infinity,
        status: "downloading",
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      postToClients({ type: "download-error", jobId: jobId, error: err.message });
      return;
    }
  }

  postToClients({
    type: "download-progress",
    jobId: jobId,
    percent: 100,
    downloadedBytes: totalBytes,
    totalBytes: totalBytes,
    speedBytesPerSec: 0,
    etaSec: 0,
    status: "completed",
  });
  delete activeDownloads[jobId];
}

self.addEventListener("message", function (event) {
  var data = event.data;
  if (!data) return;

  switch (data.type) {
    case "download-start":
      activeDownloads[data.jobId] = "downloading";
      performDownload(data.jobId, data.url, data.totalBytes, data.sha256PerChunk || []);
      break;
    case "download-pause":
      activeDownloads[data.jobId] = "paused";
      break;
    case "download-cancel":
      activeDownloads[data.jobId] = "cancelled";
      break;
  }
});
