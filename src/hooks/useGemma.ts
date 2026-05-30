import { useState, useEffect, useCallback, useRef } from "react";
import {
  detectEngine,
  loadEngine,
  isLoaded,
  supportsWebGPU,
  type EngineKind,
  type InitProgressReport,
} from "@/lib/gemma";
import { useSettingsStore } from "@/stores/settingsStore";

export interface UseGemmaReturn {
  kind: EngineKind;
  webgpuAvailable: boolean | null;
  loaded: boolean;
  loading: boolean;
  progress: number;
  progressText: string;
  error: string | null;
  load: () => Promise<void>;
}

export function useGemma(): UseGemmaReturn {
  const enginePref = useSettingsStore((s) => s.engineKind);
  const [kind, setKind] = useState<EngineKind>("demo");
  const [webgpuAvailable, setWebgpu] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const loadAttempted = useRef(false);

  useEffect(() => {
    supportsWebGPU()
      .then(setWebgpu)
      .catch(() => setWebgpu(false));
  }, []);

  useEffect(() => {
    detectEngine(enginePref)
      .then(setKind)
      .catch(() => setKind("demo"));
  }, [enginePref]);

  const load = useCallback(async () => {
    if (loadAttempted.current || kind === "demo") return;
    setLoading(true);
    setError(null);
    try {
      await loadEngine(kind, (r: InitProgressReport) => {
        setProgress(Math.round((r.progress || 0) * 100));
        setProgressText(r.text || "Loading model...");
      });
      setLoaded(true);
      loadAttempted.current = true;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    if (isLoaded(kind)) {
      setLoaded(true);
      loadAttempted.current = true;
    }
  }, [kind]);

  return { kind, webgpuAvailable, loaded, loading, progress, progressText, error, load };
}
