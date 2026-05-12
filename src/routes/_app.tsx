import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSessionStore } from "@/stores/sessionStore";
import { BottomNav } from "@/components/BottomNav";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  useAuthSession();
  const { session, loading } = useSessionStore();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return <Navigate to="/" />;
  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      <BottomNav />
    </div>
  );
}
