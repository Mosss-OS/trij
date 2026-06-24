import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceAssistant } from "@/lib/voice";
import { useSettingsStore } from "@/stores/settingsStore";

interface VoiceGuidanceState {
  speaking: boolean;
  listening: boolean;
  lastTranscript: string;
}

export function useVoiceGuidance() {
  const language = useSettingsStore((s) => s.language);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const voiceGuidedMode = useSettingsStore((s) => s.voiceGuidedMode);
  const voiceSpeed = useSettingsStore((s) => s.voiceSpeed);
  const voiceRef = useRef<VoiceAssistant | null>(null);
  const [state, setState] = useState<VoiceGuidanceState>({
    speaking: false,
    listening: false,
    lastTranscript: "",
  });

  useEffect(() => {
    if (!voiceRef.current) {
      voiceRef.current = new VoiceAssistant(language);
    }
    voiceRef.current.setLanguage(language);
    voiceRef.current.setRate(voiceSpeed);
  }, [language, voiceSpeed]);

  const active = voiceEnabled && voiceGuidedMode;

  const narrate = useCallback(
    async (text: string): Promise<void> => {
      if (!active || !voiceRef.current) return;
      setState((s) => ({ ...s, speaking: true }));
      try {
        await voiceRef.current.speakAndWait(text);
      } finally {
        setState((s) => ({ ...s, speaking: false }));
      }
    },
    [active],
  );

  const listen = useCallback(async (): Promise<string> => {
    if (!active || !voiceRef.current) {
      throw new Error("Voice not available");
    }
    setState((s) => ({ ...s, listening: true }));
    try {
      const transcript = await voiceRef.current.listen();
      setState((s) => ({ ...s, lastTranscript: transcript }));
      return transcript;
    } finally {
      setState((s) => ({ ...s, listening: false }));
    }
  }, [active]);

  const listenWithTimeout = useCallback(
    async (timeoutMs = 8000): Promise<string> => {
      if (!active || !voiceRef.current) {
        throw new Error("Voice not available");
      }
      setState((s) => ({ ...s, listening: true }));
      try {
        const result = await Promise.race([
          voiceRef.current.listen(),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("Listening timed out")), timeoutMs),
          ),
        ]);
        setState((s) => ({ ...s, lastTranscript: result }));
        return result;
      } finally {
        setState((s) => ({ ...s, listening: false }));
      }
    },
    [active],
  );

  const confirm = useCallback(
    async (prompt: string): Promise<boolean> => {
      if (!active || !voiceRef.current) return false;
      setState((s) => ({ ...s, speaking: true, listening: false }));
      try {
        const result = await voiceRef.current.confirm(prompt);
        return result;
      } finally {
        setState((s) => ({ ...s, speaking: false, listening: false }));
      }
    },
    [active],
  );

  const ask = useCallback(
    async (prompt: string, timeoutMs = 8000): Promise<string | null> => {
      if (!active || !voiceRef.current) return null;
      setState((s) => ({ ...s, speaking: true }));
      try {
        await voiceRef.current.speakAndWait(prompt);
        setState((s) => ({ ...s, speaking: false, listening: true }));
        const result = await Promise.race([
          voiceRef.current.listen(),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("Listening timed out")), timeoutMs),
          ),
        ]);
        setState((s) => ({ ...s, lastTranscript: result }));
        return result;
      } catch {
        return null;
      } finally {
        setState((s) => ({ ...s, speaking: false, listening: false }));
      }
    },
    [active],
  );

  const stop = useCallback(() => {
    voiceRef.current?.stop();
    setState({ speaking: false, listening: false, lastTranscript: "" });
  }, []);

  return { ...state, active, language, narrate, listen, listenWithTimeout, confirm, ask, stop };
}
