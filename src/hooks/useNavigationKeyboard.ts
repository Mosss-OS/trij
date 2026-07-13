/**
 * useNavigationKeyboard — keyboard shortcuts for the navigation panel.
 *
 * - Escape: stop navigation
 * - R: rate facility (when arrived)
 * - Space: dismiss notification
 */

import { useEffect } from "react";
import { useNavigation } from "@/hooks/useNavigation";

export function useNavigationKeyboard(onRate?: () => void) {
  const { status, stop, isNavigating } = useNavigation();

  useEffect(() => {
    if (!isNavigating) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          stop();
          break;
        case "r":
        case "R":
          if (status === "arrived" && onRate) {
            e.preventDefault();
            onRate();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNavigating, status, stop, onRate]);
}
