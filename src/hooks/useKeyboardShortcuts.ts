import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: "n",
      action: () => navigate({ to: "/triage" }),
      description: "New triage",
    },
    {
      key: "p",
      action: () => navigate({ to: "/patients" }),
      description: "Patient search",
    },
    {
      key: "r",
      action: () => navigate({ to: "/referrals" }),
      description: "Referrals list",
    },
    {
      key: "d",
      action: () => navigate({ to: "/dashboard" }),
      description: "Dashboard",
    },
    {
      key: "s",
      action: () => navigate({ to: "/settings" }),
      description: "Settings",
    },
    {
      key: "?",
      action: () => {
        // Toggle shortcut help overlay
        const event = new CustomEvent("toggle-shortcuts");
        window.dispatchEvent(event);
      },
      description: "Show shortcuts",
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      // Check for Ctrl+Enter (submit form)
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        const submitButton = document.querySelector(
          'button[type="submit"], button:has([role="submit"])'
        ) as HTMLButtonElement;
        if (submitButton) {
          submitButton.click();
        }
        return;
      }

      // Check for Escape (cancel/go back)
      if (e.key === "Escape") {
        e.preventDefault();
        const cancelButton = document.querySelector(
          'button[aria-label*="cancel"], button:has([aria-label*="cancel"]), button:contains("Cancel"), button:contains("cancel")'
        ) as HTMLButtonElement;
        
        if (cancelButton) {
          cancelButton.click();
        } else {
          // Try to go back in history
          if (window.history.length > 1) {
            window.history.back();
          }
        }
        return;
      }

      // Check for single-key shortcuts
      const shortcut = shortcuts.find((s) => s.key === e.key.toLowerCase());
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, shortcuts]);

  return shortcuts;
}
