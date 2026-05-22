const DB_NAME = "trij-downloads";
const DB_VERSION = 1;
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB

export interface DownloadChunk {
  index: number;
  data: ArrayBuffer;
  sha256: string;
  size: number;
}

export interface DownloadJob {
  id: string;
  url: string;
  totalBytes: number;
  chunkSize: number;
  downloadedBytes: number;
  chunksCompleted: number;
  totalChunks: number;
  status: "idle" | "downloading" | "paused" | "completed" | "failed" | "cancelled";
  fileName: string;
  sha256PerChunk: string[];
  startedAt: number | null;
  updatedAt: number;
  error?: string;
}

export interface DownloadProgress {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSec: number;
  status: DownloadJob["status"];
}

type ProgressCallback = (progress: DownloadProgress) => void;

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("jobs")) {
        db.createObjectStore("jobs", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("chunks")) {
        const cs = db.createObjectStore("chunks", { keyPath: ["jobId", "index"] });
        cs.createIndex("jobId", "jobId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function sha256(data: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest("SHA-256", data).then((hash) => {
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex;
  });
}

export async function saveJob(job: DownloadJob): Promise<void> {
  const db = await openDB();
  await db.put("jobs", job);
}

export async function getJob(jobId: string): Promise<DownloadJob | undefined> {
  const db = await openDB();
  return db.get("jobs", jobId);
}

export async function saveChunk(jobId: string, chunk: DownloadChunk): Promise<void> {
  const db = await openDB();
  await db.put("chunks", { jobId, ...chunk });
}

export async function getChunks(jobId: string): Promise<DownloadChunk[]> {
  const db = await openDB();
  const chunks = await db.getAllFromIndex("chunks", "jobId", jobId);
  return chunks.map((c: any) => ({
    index: c.index,
    data: c.data,
    sha256: c.sha256,
    size: c.size,
  }));
}

export async function removeJob(jobId: string): Promise<void> {
  const db = await openDB();
  await db.delete("jobs", jobId);
  const chunks = await db.getAllFromIndex("chunks", "jobId", jobId);
  for (const c of chunks) {
    await db.delete("chunks", [jobId, c.index]);
  }
}

const activeDownloads = new Map<string, { abort: AbortController }>();

export async function startDownload(
  job: DownloadJob,
  onProgress: ProgressCallback,
): Promise<void> {
  const existing = activeDownloads.get(job.id);
  if (existing) {
    existing.abort.abort();
    activeDownloads.delete(job.id);
  }

  const controller = new AbortController();
  activeDownloads.set(job.id, controller);

  job.status = "downloading";
  job.startedAt = job.startedAt ?? Date.now();
  await saveJob(job);

  try {
    const existingChunks = await getChunks(job.id);
    const completedIndices = new Set(existingChunks.map((c) => c.index));
    job.chunksCompleted = completedIndices.size;
    job.downloadedBytes = existingChunks.reduce((s, c) => s + c.size, 0);

    for (let i = 0; i < job.totalChunks; i++) {
      if (controller.signal.aborted) break;

      const savedJob = await getJob(job.id);
      if (!savedJob || savedJob.status === "paused" || savedJob.status === "cancelled") break;

      if (completedIndices.has(i)) continue;

      const start = i * job.chunkSize;
      const end = Math.min(start + job.chunkSize, job.totalBytes) - 1;
      const headers: Record<string, string> = { Range: `bytes=${start}-${end}` };

      const resp = await fetch(job.url, {
        headers,
        signal: controller.signal,
        cache: "no-store",
      });

      if (!resp.ok && resp.status !== 206) {
        throw new Error(`Server returned ${resp.status} — does not support Range requests`);
      }

      const data = await resp.arrayBuffer();
      const hash = await sha256(data);

      const expectedHash = job.sha256PerChunk[i];
      if (expectedHash && hash !== expectedHash) {
        throw new Error(`Chunk ${i} SHA-256 mismatch: expected ${expectedHash}, got ${hash}`);
      }

      const chunk: DownloadChunk = { index: i, data, sha256: hash, size: data.byteLength };
      await saveChunk(job.id, chunk);

      job.chunksCompleted = i + 1;
      job.downloadedBytes += data.byteLength;
      job.updatedAt = Date.now();
      await saveJob(job);

      const elapsed = (Date.now() - (job.startedAt ?? Date.now())) / 1000;
      const speed = job.downloadedBytes / Math.max(elapsed, 1);
      const remaining = job.totalBytes - job.downloadedBytes;
      onProgress({
        percent: Math.round((job.downloadedBytes / job.totalBytes) * 100),
        downloadedBytes: job.downloadedBytes,
        totalBytes: job.totalBytes,
        speedBytesPerSec: Math.round(speed),
        etaSec: speed > 0 ? Math.round(remaining / speed) : Infinity,
        status: "downloading",
      });
    }

    const finalJob = await getJob(job.id);
    if (!finalJob || finalJob.status === "cancelled") return;
    if (controller.signal.aborted) return;

    if (job.downloadedBytes >= job.totalBytes) {
      job.status = "completed";
    } else if (finalJob.status !== "paused") {
      job.status = "completed";
    }
    job.updatedAt = Date.now();
    await saveJob(job);

    onProgress({
      percent: 100,
      downloadedBytes: job.totalBytes,
      totalBytes: job.totalBytes,
      speedBytesPerSec: 0,
      etaSec: 0,
      status: job.status,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    job.status = "failed";
    job.error = (err as Error).message;
    job.updatedAt = Date.now();
    await saveJob(job);
    onProgress({
      percent: Math.round((job.downloadedBytes / job.totalBytes) * 100),
      downloadedBytes: job.downloadedBytes,
      totalBytes: job.totalBytes,
      speedBytesPerSec: 0,
      etaSec: Infinity,
      status: "failed",
    });
  } finally {
    activeDownloads.delete(job.id);
  }
}

export function pauseDownload(jobId: string): void {
  const dl = activeDownloads.get(jobId);
  if (dl) {
    dl.abort.abort();
    activeDownloads.delete(jobId);
  }
}

export async function resumeDownload(
  job: DownloadJob,
  onProgress: ProgressCallback,
): Promise<void> {
  job.status = "downloading";
  await saveJob(job);
  return startDownload(job, onProgress);
}

export function createDownloadJob(
  id: string,
  url: string,
  totalBytes: number,
  fileName: string,
  sha256PerChunk?: string[],
): DownloadJob {
  const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);
  return {
    id,
    url,
    totalBytes,
    chunkSize: CHUNK_SIZE,
    downloadedBytes: 0,
    chunksCompleted: 0,
    totalChunks,
    status: "idle",
    fileName,
    sha256PerChunk: sha256PerChunk ?? [],
    startedAt: null,
    updatedAt: Date.now(),
  };
}

export async function* iterateChunks(jobId: string): AsyncGenerator<Uint8Array> {
  const chunks = await getChunks(jobId);
  chunks.sort((a, b) => a.index - b.index);
  for (const chunk of chunks) {
    yield new Uint8Array(chunk.data);
  }
}

export async function assembleBlob(jobId: string, mimeType = "application/octet-stream"): Promise<Blob> {
  const parts: BlobPart[] = [];
  const chunks = await getChunks(jobId);
  chunks.sort((a, b) => a.index - b.index);
  for (const chunk of chunks) {
    parts.push(chunk.data);
  }
  return new Blob(parts, { type: mimeType });
}
