import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  language: string;
  modelId: string;
  voiceEnabled: boolean;
  cloudFallbackConsent: boolean;
  setLanguage: (l: string) => void;
  setModelId: (id: string) => void;
  setVoiceEnabled: (b: boolean) => void;
  setCloudFallbackConsent: (b: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en-US",
      modelId: "gemma-2-2b-it-q4f16_1-MLC",
      voiceEnabled: true,
      cloudFallbackConsent: false,
      setLanguage: (language) => set({ language }),
      setModelId: (modelId) => set({ modelId }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setCloudFallbackConsent: (cloudFallbackConsent) => set({ cloudFallbackConsent }),
    }),
    {
      name: "trij-settings",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as never)
      ),
    }
  )
);
