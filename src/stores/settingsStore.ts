import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { EngineKind } from "@/lib/gemma";

interface SettingsState {
  language: string;
  modelId: string;
  voiceEnabled: boolean;
  voiceTestMode: boolean;
  voiceGuidedMode: boolean;
  voiceSpeed: number;
  cloudFallbackConsent: boolean;
  engineKind: EngineKind | "auto";
  ollamaUrl: string;
  ollamaModel: string;
  disclaimerAccepted: boolean;
  disclaimerAcceptedAt: string | null;
  chwName: string;
  minConfidenceForLocalCare: number;
  thinkingMode: boolean;
  kioskMode: boolean;
  lockTimeoutMinutes: number;
  tutorialCompleted: boolean;
  tutorialSkipped: boolean;
  sunlightMode: boolean;
  biometricEnabled: boolean;
  completeTutorial: () => void;
  skipTutorial: () => void;
  resetTutorial: () => void;
  setSunlightMode: (enabled: boolean) => void;
  setLanguage: (l: string) => void;
  setModelId: (id: string) => void;
  setVoiceEnabled: (b: boolean) => void;
  setVoiceTestMode: (b: boolean) => void;
  setVoiceGuidedMode: (b: boolean) => void;
  setVoiceSpeed: (v: number) => void;
  setCloudFallbackConsent: (b: boolean) => void;
  setEngineKind: (k: EngineKind | "auto") => void;
  setOllamaUrl: (u: string) => void;
  setOllamaModel: (m: string) => void;
  acceptDisclaimer: (chwName: string) => void;
  setChwName: (name: string) => void;
  setMinConfidenceForLocalCare: (v: number) => void;
  setThinkingMode: (enabled: boolean) => void;
  setKioskMode: (enabled: boolean) => void;
  setLockTimeoutMinutes: (minutes: number) => void;
  setBiometricEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en-US",
      modelId: "Phi-3.5-vision-instruct-q4f16_1-MLC",
      voiceEnabled: true,
      voiceTestMode: false,
      voiceGuidedMode: false,
      voiceSpeed: 1.0,
      cloudFallbackConsent: false,
      engineKind: "auto",
      ollamaUrl: "http://localhost:11434",
      ollamaModel: "gemma4:latest",
      disclaimerAccepted: false,
      disclaimerAcceptedAt: null,
      chwName: "",
      minConfidenceForLocalCare: 70,
      thinkingMode: false,
      kioskMode: false,
      lockTimeoutMinutes: 5,
      tutorialCompleted: false,
      tutorialSkipped: false,
      sunlightMode: false,
      biometricEnabled: false,
      completeTutorial: () => set({ tutorialCompleted: true }),
      skipTutorial: () => set({ tutorialSkipped: true }),
      resetTutorial: () => set({ tutorialCompleted: false, tutorialSkipped: false }),
      setSunlightMode: (sunlightMode) => set({ sunlightMode }),
      setLanguage: (language) => set({ language }),
      setModelId: (modelId) => set({ modelId }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setVoiceTestMode: (voiceTestMode) => set({ voiceTestMode }),
      setVoiceGuidedMode: (voiceGuidedMode) => set({ voiceGuidedMode }),
      setVoiceSpeed: (voiceSpeed) => set({ voiceSpeed }),
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
      setMinConfidenceForLocalCare: (minConfidenceForLocalCare) =>
        set({ minConfidenceForLocalCare }),
      setThinkingMode: (enabled: boolean) => set({ thinkingMode: enabled }),
      setKioskMode: (enabled: boolean) => set({ kioskMode: enabled }),
      setLockTimeoutMinutes: (lockTimeoutMinutes) => set({ lockTimeoutMinutes }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
    }),
    {
      name: "trij-settings",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);
