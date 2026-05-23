import { useState, useEffect } from "react";
import { createFileRoute, Outlet, Navigate, Link } from "@tanstack/react-router";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { BottomNav } from "@/components/BottomNav";
import { DisclaimerDialog } from "@/components/DisclaimerDialog";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { NetworkStatusBar } from "@/components/NetworkStatusBar";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { LockScreen } from "@/components/LockScreen";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { useInactivityLock } from "@/hooks/useInactivityLock";
import { useTheme } from "@/hooks/useTheme";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Loader2, ShieldAlert, X, Beaker } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
  errorComponent: ({ error, reset }) => {
    console.error("[Trij App Error]", error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[oklch(0.98_0.008_85)] to-[oklch(0.95_0.015_200)] px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#dc2626"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-medium tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="mt-3 font-sans text-sm leading-relaxed text-foreground/60">
            An unexpected error occurred. Please try again. If the problem persists, try refreshing
            the page or contact your supervisor.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-sans text-sm font-medium text-background shadow-lg shadow-black/10 transition-all hover:shadow-xl hover:shadow-black/20"
            >
              Try again
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-white/40 px-6 py-3 font-sans text-sm font-medium text-foreground/80 backdrop-blur-xl transition-colors hover:bg-white/60"
            >
              Go home
            </Link>
          </div>
        </div>
      </div>
    );
  },
});

function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-2 border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-urgency-yellow" />
      <p className="flex-1">
        AI-assisted triage — always consult a qualified clinician before making treatment decisions.
        {" "}<a href="/CLINICAL_VALIDATION.md" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Validation status</a>
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-muted-foreground/10"
        aria-label="Dismiss disclaimer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AppLayout() {
  useAuthSession();
  useTheme();
  useKeyboardShortcuts();
  const { session, offlineUser, loading, screenLocked } = useSessionStore();
  const disclaimerAccepted = useSettingsStore((s) => s.disclaimerAccepted);
  const engineKind = useSettingsStore((s) => s.engineKind);
  const kioskMode = useSettingsStore((s) => s.kioskMode);
  const fieldMode = useSettingsStore((s) => s.fieldMode);
  const tutorialCompleted = useSettingsStore((s) => s.tutorialCompleted);
  const tutorialSkipped = useSettingsStore((s) => s.tutorialSkipped);
  const sunlightMode = useSettingsStore((s) => s.sunlightMode);
  const setSunlightMode = useSettingsStore((s) => s.setSunlightMode);
  const [showTutorial, setShowTutorial] = useState(false);
  const isNewUser = !tutorialCompleted && !tutorialSkipped;
  useInactivityLock();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  const authed = !!(session || offlineUser);
  if (!authed) return <Navigate to="/login" />;
  if (!disclaimerAccepted) return <DisclaimerDialog />;
  useEffect(() => {
    if (isNewUser) setShowTutorial(true);
  }, [isNewUser]);

  useEffect(() => {
    document.documentElement.classList.toggle("sunlight-mode", sunlightMode);
  }, [sunlightMode]);

  useEffect(() => {
    if (!("AmbientLightSensor" in window)) return;
    try {
      const sensor = new (window as any).AmbientLightSensor();
      sensor.addEventListener("reading", () => {
        if (sensor.illuminance > 10000) setSunlightMode(true);
      });
      sensor.start();
    } catch {}
  }, [setSunlightMode]);
  return (
    <>
      {screenLocked && <LockScreen />}
      {showTutorial && !screenLocked && <TutorialOverlay onComplete={() => setShowTutorial(false)} />}
      <KeyboardShortcutsHelp />
      <div className={`min-h-screen ${kioskMode ? "text-lg" : ""} ${fieldMode ? "text-lg [&_button]:min-h-[48px] [&_a]:min-h-[48px] [&_input]:text-base" : ""}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <NetworkStatusBar />
      <DisclaimerBanner />
      {engineKind === "demo" && (
        <div className="flex items-center gap-2 bg-urgency-red/15 px-4 py-2 text-xs font-medium text-urgency-red">
          <Beaker className="h-3.5 w-3.5 flex-shrink-0" />
          <span>🔴 DEMO MODE — Results are simulated, not for patient care</span>
        </div>
      )}
      <main id="main-content" role="main" className="pb-20 pt-16 md:pb-24 md:pt-20 lg:pb-32 lg:pt-24">
        <Outlet />
      </main>
      <SyncStatusIndicator />
      <BottomNav />
    </div>
    </>
  );
}
