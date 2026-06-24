import { createFileRoute, Navigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/stores/sessionStore";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/clear-users")({
  component: ClearUsers,
});

function ClearUsers() {
  const user = useSessionStore((s) => s.user);
  const session = useSessionStore((s) => s.session);
  const [state, setState] = useState<"idle" | "deleting" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!session?.access_token) return;
    setState("deleting");
    fetch("/api/clear-users", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setMsg(d.error); setState("error"); }
        else { setMsg(`Deleted ${d.deleted} user(s)`); setState("done"); }
      })
      .catch((e) => { setMsg(e.message); setState("error"); });
  }, [session]);

  if (!user) return <div className="grid min-h-[60vh] place-items-center p-8 text-sm">Sign in first</div>;
  if (state === "deleting") return <div className="grid min-h-[60vh] place-items-center p-8 text-sm">Deleting all users…</div>;
  if (state === "done") return <Navigate to="/login" />;
  return <div className="grid min-h-[60vh] place-items-center p-8 text-sm text-red-500">{msg}</div>;
}
