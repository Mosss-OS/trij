export type EngineKind = "webllm" | "wasm" | "cpu" | "ollama" | "demo" | "cloud" | "google";

export interface EngineCapability {
  kind: EngineKind;
  label: string;
  estimatedLatency: string;
  estimatedTokensPerSec: number;
  gpuRequired: boolean;
  webgpuRequired: boolean;
  wasmRequired: boolean;
  fullyOffline: boolean;
}

export const ENGINE_CAPABILITIES: Record<EngineKind, EngineCapability> = {
  webllm: {
    kind: "webllm",
    label: "GPU (WebLLM)",
    estimatedLatency: "5–15 seconds",
    estimatedTokensPerSec: 30,
    gpuRequired: true,
    webgpuRequired: true,
    wasmRequired: false,
    fullyOffline: true,
  },
  wasm: {
    kind: "wasm",
    label: "WASM (llama.cpp)",
    estimatedLatency: "15–30 seconds",
    estimatedTokensPerSec: 8,
    gpuRequired: false,
    webgpuRequired: false,
    wasmRequired: true,
    fullyOffline: true,
  },
  cpu: {
    kind: "cpu",
    label: "CPU (quantised)",
    estimatedLatency: "30–60 seconds",
    estimatedTokensPerSec: 4,
    gpuRequired: false,
    webgpuRequired: false,
    wasmRequired: false,
    fullyOffline: true,
  },
  ollama: {
    kind: "ollama",
    label: "Ollama (local)",
    estimatedLatency: "2–10 seconds",
    estimatedTokensPerSec: 25,
    gpuRequired: false,
    webgpuRequired: false,
    wasmRequired: false,
    fullyOffline: true,
  },
  cloud: {
    kind: "cloud",
    label: "Cloud",
    estimatedLatency: "3–8 seconds",
    estimatedTokensPerSec: 40,
    gpuRequired: false,
    webgpuRequired: false,
    wasmRequired: false,
    fullyOffline: false,
  },
  google: {
    kind: "google",
    label: "Google AI Studio",
    estimatedLatency: "2–5 seconds",
    estimatedTokensPerSec: 50,
    gpuRequired: false,
    webgpuRequired: false,
    wasmRequired: false,
    fullyOffline: false,
  },
  demo: {
    kind: "demo",
    label: "Demo",
    estimatedLatency: "2 seconds",
    estimatedTokensPerSec: 100,
    gpuRequired: false,
    webgpuRequired: false,
    wasmRequired: false,
    fullyOffline: true,
  },
};

export const ENGINE_PRECEDENCE: EngineKind[] = ["webllm", "wasm", "cpu", "ollama", "cloud", "demo"];

let _benchmarkResults: Record<string, number> = {};
const BENCHMARK_STORAGE_KEY = "trij-engine-benchmarks";

export function loadBenchmarks(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BENCHMARK_STORAGE_KEY);
    if (raw) {
      _benchmarkResults = JSON.parse(raw);
    }
  } catch {
    _benchmarkResults = {};
  }
  return _benchmarkResults;
}

export function saveBenchmark(kind: EngineKind, tokensPerSec: number) {
  _benchmarkResults[kind] = tokensPerSec;
  try {
    localStorage.setItem(BENCHMARK_STORAGE_KEY, JSON.stringify(_benchmarkResults));
  } catch {
    /* noop */
  }
}

export function getEnginePerformanceExpectation(kind: EngineKind): string {
  const cap = ENGINE_CAPABILITIES[kind];
  return cap?.estimatedLatency ?? "Unknown";
}

export async function benchmarkEngine(
  kind: EngineKind,
  runFn: () => Promise<number>,
): Promise<number> {
  const tokensPerSec = await runFn();
  saveBenchmark(kind, tokensPerSec);
  return tokensPerSec;
}
