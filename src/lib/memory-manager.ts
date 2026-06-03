import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export interface MemoryInfo {
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
  estimatedMemoryUsage: string;
  memoryPressure: boolean;
}

export type MemoryPressureLevel = "normal" | "warning" | "critical";

let pressureListeners: Array<(level: MemoryPressureLevel) => void> = [];
let currentLevel: MemoryPressureLevel = "normal";
let pressureTimeout: ReturnType<typeof setTimeout> | null = null;

function getDeviceMemory(): number | null {
  try {
    return (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? null;
  } catch {
    return null;
  }
}

function getHardwareConcurrency(): number | null {
  try {
    return navigator.hardwareConcurrency ?? null;
  } catch {
    return null;
  }
}

export function getMemoryInfo(): MemoryInfo {
  return {
    deviceMemory: getDeviceMemory(),
    hardwareConcurrency: getHardwareConcurrency(),
    estimatedMemoryUsage: estimateMemoryUsage(),
    memoryPressure: currentLevel !== "normal",
  };
}

function estimateMemoryUsage(): string {
  const dm = getDeviceMemory();
  if (dm === null) return "Unknown";
  if (dm <= 2) return "High (limited device)";
  if (dm <= 4) return "Moderate";
  return "Low (sufficient memory)";
}

export function isMemoryConstrained(): boolean {
  const dm = getDeviceMemory();
  const hc = getHardwareConcurrency();
  if (dm !== null && dm <= 4) return true;
  if (hc !== null && hc <= 4) return true;
  return false;
}

export function subscribeToMemoryPressure(
  listener: (level: MemoryPressureLevel) => void,
): () => void {
  pressureListeners.push(listener);
  return () => {
    pressureListeners = pressureListeners.filter((l) => l !== listener);
  };
}

function notifyPressure(level: MemoryPressureLevel) {
  currentLevel = level;
  pressureListeners.forEach((l) => l(level));
}

export function detectMemoryPressure(): MemoryPressureLevel {
  const dm = getDeviceMemory();
  const hc = getHardwareConcurrency();
  const support = typeof window !== "undefined" &&
    "memory" in performance &&
    (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;

  if (support) {
    const mem = (performance as unknown as {
      memory: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    }).memory;
    const ratio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
    if (ratio > 0.9) return "critical";
    if (ratio > 0.7) return "warning";
  }

  if (dm !== null && dm <= 2) return "critical";
  if (dm !== null && dm <= 4) return "warning";
  if (hc !== null && hc <= 2) return "critical";
  if (hc !== null && hc <= 4) return "warning";
  return "normal";
}

export function startMemoryMonitoring(intervalMs = 30000): () => void {
  const check = () => {
    const level = detectMemoryPressure();
    notifyPressure(level);
  };
  check();
  const interval = setInterval(check, intervalMs);
  return () => clearInterval(interval);
}

export async function releaseGpuBuffers(): Promise<void> {
  try {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) return;
    const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    if (!gpu) return;

    const adapter = await gpu.requestAdapter();
    if (!adapter) return;
    const d = await (adapter as { requestDevice: () => Promise<{ destroy: () => void }> }).requestDevice();
    d.destroy();
  } catch {
    // GPU release best-effort
  }
}

export function getMemoryPressureAction(level: MemoryPressureLevel): {
  title: string;
  description: string;
  action: "none" | "suggest_demo" | "suggest_switch" | "force_reload";
} {
  switch (level) {
    case "critical":
      return {
        title: "Critical memory pressure",
        description: "Your device is running low on memory. AI may become unstable.",
        action: "suggest_demo",
      };
    case "warning":
      return {
        title: "Memory running low",
        description: "Consider closing other tabs or switching to demo mode.",
        action: "suggest_switch",
      };
    default:
      return { title: "", description: "", action: "none" };
  }
}

export function getEngineSuggestion(): "webllm" | "demo" | "cloud" {
  const dm = getDeviceMemory();
  const hc = getHardwareConcurrency();
  if (dm !== null && dm <= 2) return "demo";
  if (dm !== null && dm <= 4 && hc !== null && hc <= 4) return "demo";
  if (dm !== null && dm >= 8) return "webllm";
  return "cloud";
}
