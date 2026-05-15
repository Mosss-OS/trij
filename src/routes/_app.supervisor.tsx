import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { UrgencyPill } from "@/components/UrgencyPill";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, BarChart3, Download, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const CHWMap = lazy(() => import("@/components/CHWMap"));

interface RemoteAssessment {
  id: string;
  condition: string | null;
  urgency: "green" | "yellow" | "red" | null;
  referral_status: string | null;
  referral_advised: boolean;
  created_at: string;
  patients: { identifier: string } | null;
}

interface ChwLocation {
  id: string;
  name: string;
  location_lat: number | null;
  location_lng: number | null;
  last_sync: string | null;
}

export const Route = createFileRoute("/_app/supervisor")({
  head: () => ({ meta: [{ title: "Supervisor — Trij" }] }),
  component: Supervisor,
});

function Supervisor() {
  const online = useOnlineStatus();
  const [items, setItems] = useState<RemoteAssessment[]>([]);
  const [chwLocations, setChwLocations] = useState<ChwLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "analytics" | "map">("queue");
  const [referralFilter, setReferralFilter] = useState<string>("all");
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!online) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      const [assessRes, chwRes] = await Promise.all([
        supabase
          .from("assessments")
          .select(
            "id, condition, urgency, referral_status, referral_advised, created_at, patients(identifier)",
          )
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("chw_profiles")
          .select("id, name, location_lat, location_lng, last_sync")
          .not("location_lat", "is", null)
          .not("location_lng", "is", null),
      ]);
      if (!alive) return;
      setItems((assessRes.data ?? []) as unknown as RemoteAssessment[]);
      setChwLocations((chwRes.data ?? []) as ChwLocation[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [online]);

  useEffect(() => {
    if (activeTab === "map") setShowMap(true);
  }, [activeTab]);

  const counts = items.reduce(
    (acc, a) => {
      if (a.urgency) acc[a.urgency]++;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 },
  );

  const referralCounts = items.filter(
    (a) => a.referral_status && a.referral_status !== "none",
  ).length;

  const filteredItems = useMemo(() => {
    if (referralFilter === "all") return items;
    return items.filter((a) => a.referral_status === referralFilter);
  }, [items, referralFilter]);

  const conditionData = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const a of items) {
      if (a.condition) freq[a.condition] = (freq[a.condition] || 0) + 1;
    }
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({
        name: name.length > 20 ? name.slice(0, 20) + "..." : name,
        count,
      }));
  }, [items]);

  const dailyTrend = useMemo(() => {
    const trend: Record<string, number> = {};
    for (const a of items) {
      if (!a.created_at) continue;
      const day = a.created_at.slice(0, 10);
      trend[day] = (trend[day] || 0) + 1;
    }
    return Object.entries(trend)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [items]);

  const exportCsv = () => {
    const headers = ["Patient", "Condition", "Urgency", "Referral Status", "Created"];
    const rows = items.map((a) => [
      a.patients?.identifier ?? "",
      a.condition ?? "",
      a.urgency ?? "",
      a.referral_status ?? "",
      format(new Date(a.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join(
      "\n",
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trij-assessments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AppHeader title="Supervisor" subtitle="Region overview" />
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-6">
        {!online && (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            Supervisor view requires connectivity.
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <Stat label="Routine" value={counts.green} tone="green" />
          <Stat label="Soon" value={counts.yellow} tone="yellow" />
          <Stat label="Urgent" value={counts.red} tone="red" />
          <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Referrals</p>
            <p className="mt-1 font-display text-2xl font-bold">{referralCounts}</p>
          </div>
        </div>

        <div className="flex gap-2 border-b">
          {(["queue", "analytics", "map"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "queue" && "Queue"}
              {tab === "analytics" && "Analytics"}
              {tab === "map" && "Map"}
            </button>
          ))}
          <div className="ml-auto flex items-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={exportCsv}
              disabled={items.length === 0}
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </div>

        {activeTab === "queue" && (
          <div className="rounded-3xl border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-display text-base font-semibold">Recent triage queue</h2>
              <select
                value={referralFilter}
                onChange={(e) => setReferralFilter(e.target.value)}
                className="ml-auto rounded-lg border bg-background px-2 py-1 text-xs"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="active">In transit</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            {loading ? (
              <div className="grid h-32 place-items-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="divide-y">
                {filteredItems.slice(0, 30).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {a.patients?.identifier ?? "—"} · {a.condition ?? "Pending"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.created_at), "MMM d, p")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.referral_status && a.referral_status !== "none" && (
                        <span className="inline-flex items-center rounded-full border bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          {a.referral_status}
                        </span>
                      )}
                      {a.urgency && <UrgencyPill urgency={a.urgency} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="rounded-3xl border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-semibold">Top conditions</h3>
              </div>
              {conditionData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No condition data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={conditionData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-3xl border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-semibold">
                  Daily assessment volume (14 days)
                </h3>
              </div>
              {dailyTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trend data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="rounded-3xl border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="font-display text-base font-semibold">CHW locations</h2>
              <span className="text-xs text-muted-foreground">
                {chwLocations.length} CHW(s) with GPS data
              </span>
            </div>
            {chwLocations.length === 0 ? (
              <div className="grid h-48 place-items-center rounded-2xl border border-dashed bg-muted/30 text-xs text-muted-foreground">
                No CHW location data yet. Configure GPS in your profile to appear on the map.
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="grid h-80 place-items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                }
              >
                {showMap && <CHWMap locations={chwLocations} />}
              </Suspense>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "yellow" | "red";
}) {
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
