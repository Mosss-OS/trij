import { useCallback, useEffect, useRef } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

const utteranceCache = new Map<string, SpeechSynthesisUtterance>();

export function useScreenReader() {
  const kioskMode = useSettingsStore((s) => s.kioskMode);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const language = useSettingsStore((s) => s.language);
  const spokenRef = useRef<Set<string>>(new Set());

  const speak = useCallback(
    (text: string, force = false) => {
      if (!kioskMode && !force) return;
      if (!voiceEnabled && !force) return;
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const key = text.slice(0, 60);
      if (spokenRef.current.has(key)) return;
      spokenRef.current.add(key);

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    [kioskMode, voiceEnabled, language],
  );

  const narrateScreen = useCallback(
    (title: string, description?: string) => {
      if (!kioskMode) return;
      const text = [title, description].filter(Boolean).join(". ");
      speak(text);
    },
    [kioskMode, speak],
  );

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, narrateScreen };
}
