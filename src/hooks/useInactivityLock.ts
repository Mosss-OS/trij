import { useEffect, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function useInactivityLock() {
  const setScreenLocked = useSessionStore((s) => s.setScreenLocked);
  const lockTimeoutMinutes = useSettingsStore((s) => s.lockTimeoutMinutes);
  const screenLocked = useSessionStore((s) => s.screenLocked);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (lockTimeoutMinutes <= 0) return;
    if (screenLocked) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setScreenLocked(true);
    }, lockTimeoutMinutes * 60 * 1000);
  };

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"] as const;

    const handler = () => resetTimer();

    resetTimer();

    events.forEach((ev) => window.addEventListener(ev, handler));

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && lockTimeoutMinutes > 0) {
        setScreenLocked(true);
      } else if (document.visibilityState === "visible" && screenLocked) {
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handler));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lockTimeoutMinutes, screenLocked]);
}
