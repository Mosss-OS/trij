import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { BottomNav } from "@/components/BottomNav";
import { DisclaimerDialog } from "@/components/DisclaimerDialog";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  useAuthSession();
  const { session, offlineUser, loading } = useSessionStore();
  const disclaimerAccepted = useSettingsStore((s) => s.disclaimerAccepted);
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
  return (
    <div className="min-h-screen pb-24">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <main id="main-content" role="main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
