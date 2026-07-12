/**
 * useNavigationVoice — speaks turn instructions aloud via Web Speech API.
 *
 * Uses the same voice settings (language, speed) as the rest of Trij.
 * Automatically speaks new instructions when the step changes and
 * announces upcoming turns when within 100m.
 */

import { useEffect, useRef, useCallback } from "react";
import { useNavigation } from "@/hooks/useNavigation";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatStep } from "@/lib/navigation/directions";

export function useNavigationVoice() {
  const nav = useNavigation();
  const status = nav.status as string;
  const steps = nav.steps;
  const currentStepIndex = nav.currentStepIndex;
  const isNavigating = nav.isNavigating;
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const voiceSpeed = useSettingsStore((s) => s.voiceSpeed);
  const language = useSettingsStore((s) => s.language);
  const lastSpokenIndex = useRef(-1);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !synthRef.current) return;
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = voiceSpeed;
      utterance.pitch = 1;
      utterance.volume = 1;
      synthRef.current.speak(utterance);
    },
    [voiceEnabled, voiceSpeed, language],
  );

  // Speak new step when it changes
  useEffect(() => {
    if (!isNavigating || status === "error") return;
    if (status === "arrived" && lastSpokenIndex.current !== -2) {
      lastSpokenIndex.current = -2;
      speak("You have arrived at your destination.");
      return;
    }
    if (currentStepIndex === lastSpokenIndex.current) return;
    if (currentStepIndex >= steps.length) return;

    const step = steps[currentStepIndex];
    if (!step) return;

    lastSpokenIndex.current = currentStepIndex;

    // Build spoken instruction
    let text: string;
    if (step.instruction === "depart") {
      const road = step.roadName ? ` onto ${step.roadName}` : "";
      text = `Start navigating${road}. Continue for ${formatMetres(step.distance)}.`;
    } else if (step.instruction === "arrive") {
      text = "You have arrived at your destination.";
    } else {
      const road = step.roadName ? ` onto ${step.roadName}` : "";
      const dir = step.instruction
        .replace("turn_slight_left", "bear left")
        .replace("turn_slight_right", "bear right")
        .replace("turn_sharp_left", "sharp left")
        .replace("turn_sharp_right", "sharp right")
        .replace("turn_left", "turn left")
        .replace("turn_right", "turn right")
        .replace("continue", "continue");
      text = `${dir}${road}. Then ${formatMetres(step.distance)}.`;
    }

    speak(text);
  }, [currentStepIndex, isNavigating, status, steps, speak]);

  // Announce arrival
  useEffect(() => {
    if (status === "arrived") {
      speak("You have arrived at your destination.");
      lastSpokenIndex.current = -1;
    }
  }, [status, speak]);

  // Announce off-route
  useEffect(() => {
    if (status === "off_route") {
      speak("You are off route. Recalculating.");
    }
  }, [status, speak]);

  // Cleanup: cancel speech on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
    };
  }, []);
}

function formatMetres(m: number): string {
  if (m < 100) return `${Math.round(m)} metres`;
  if (m < 1000) return `${Math.round(m / 10) * 10} metres`;
  return `${(m / 1000).toFixed(1)} kilometres`;
}
