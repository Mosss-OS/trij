import { createFileRoute, Navigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/stores/sessionStore";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/promote")({
  component: Promote,
});

function Promote() {
  const user = useSessionStore((s) => s.user);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.auth.updateUser({ data: { role: "supervisor" } }).then(({ error }) => {
      if (error) setError(error.message);
      else setDone(true);
    });
  }, [user]);

  if (!user) return <div className="grid min-h-[60vh] place-items-center p-8 text-sm">Sign in first, then visit this page again.</div>;
  if (error) return <div className="grid min-h-[60vh] place-items-center p-8 text-sm text-red-500">{error}</div>;
  if (done) return <Navigate to="/supervisor" />;
  return <div className="grid min-h-[60vh] place-items-center p-8 text-sm">Promoting to supervisor…</div>;
}
