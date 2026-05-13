import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Loader2, MapPin } from "lucide-react";
import { UrgencyPill } from "@/components/UrgencyPill";
import { format } from "date-fns";

interface RemoteAssessment {
  id: string;
  condition: string | null;
  urgency: "green" | "yellow" | "red" | null;
  created_at: string;
  patients: { identifier: string } | null;
}

export const Route = createFileRoute("/_app/supervisor")({
  head: () => ({ meta: [{ title: "Supervisor — Trij" }] }),
  component: Supervisor,
});

function Supervisor() {
  const online = useOnlineStatus();
  const [items, setItems] = useState<RemoteAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!online) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("assessments")
        .select("id, condition, urgency, created_at, patients(identifier)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!alive) return;
      setItems((data ?? []) as unknown as RemoteAssessment[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [online]);

  const counts = items.reduce(
    (acc, a) => {
      if (a.urgency) acc[a.urgency]++;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 }
  );

  return (
    <>
      <AppHeader title="Supervisor" subtitle="Region overview" />
      <div className="mx-auto max-w-2xl space-y-6 px-5 py-6">
        {!online && (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            Supervisor view requires connectivity.
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Routine" value={counts.green} tone="green" />
          <Stat label="Soon" value={counts.yellow} tone="yellow" />
          <Stat label="Urgent" value={counts.red} tone="red" />
        </div>

        <div className="rounded-3xl border bg-card p-6">
          <h2 className="font-display text-base font-semibold">Recent triage queue</h2>
          {loading ? (
            <div className="grid h-32 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {items.slice(0, 20).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {a.patients?.identifier ?? "—"} · {a.condition ?? "Pending"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.created_at), "MMM d, p")}
                    </p>
                  </div>
                  {a.urgency && <UrgencyPill urgency={a.urgency} />}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border bg-card p-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-display text-base font-semibold">CHW map</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Map view (Leaflet) loads when CHW location data is available.
            Configure GPS in your profile to appear on the map.
          </p>
          <div className="mt-4 grid h-48 place-items-center rounded-2xl border border-dashed bg-muted/30 text-xs text-muted-foreground">
            Map placeholder — no CHW coordinates yet.
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "green" | "yellow" | "red" }) {
  const toneCls =
    tone === "green"
      ? "bg-urgency-green-bg text-urgency-green"
      : tone === "yellow"
      ? "bg-urgency-yellow-bg text-urgency-yellow"
      : "bg-urgency-red-bg text-urgency-red";
  return (
    <div className={`rounded-2xl p-4 ${toneCls}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
