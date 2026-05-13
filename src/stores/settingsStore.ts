import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { EngineKind } from "@/lib/gemma";

interface SettingsState {
  language: string;
  modelId: string;
  voiceEnabled: boolean;
  cloudFallbackConsent: boolean;
  engineKind: EngineKind | "auto";
  ollamaUrl: string;
  ollamaModel: string;
  disclaimerAccepted: boolean;
  disclaimerAcceptedAt: string | null;
  chwName: string;
  minConfidenceForLocalCare: number;
  setLanguage: (l: string) => void;
  setModelId: (id: string) => void;
  setVoiceEnabled: (b: boolean) => void;
  setCloudFallbackConsent: (b: boolean) => void;
  setEngineKind: (k: EngineKind | "auto") => void;
  setOllamaUrl: (u: string) => void;
  setOllamaModel: (m: string) => void;
  acceptDisclaimer: (chwName: string) => void;
  setChwName: (name: string) => void;
  setMinConfidenceForLocalCare: (v: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en-US",
      modelId: "gemma-2-2b-it-q4f16_1-MLC",
      voiceEnabled: true,
      cloudFallbackConsent: false,
      engineKind: "auto",
      ollamaUrl: "http://localhost:11434",
      ollamaModel: "gemma4:latest",
      disclaimerAccepted: false,
      disclaimerAcceptedAt: null,
      chwName: "",
      minConfidenceForLocalCare: 70,
      setLanguage: (language) => set({ language }),
      setModelId: (modelId) => set({ modelId }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setCloudFallbackConsent: (cloudFallbackConsent) => set({ cloudFallbackConsent }),
      setEngineKind: (engineKind) => set({ engineKind }),
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
      setOllamaModel: (ollamaModel) => set({ ollamaModel }),
      acceptDisclaimer: (chwName) =>
        set({
          disclaimerAccepted: true,
          disclaimerAcceptedAt: new Date().toISOString(),
          chwName,
        }),
      setChwName: (chwName) => set({ chwName }),
      setMinConfidenceForLocalCare: (minConfidenceForLocalCare) => set({ minConfidenceForLocalCare }),
    }),
    {
      name: "trij-settings",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as never)
      ),
    }
  )
);
