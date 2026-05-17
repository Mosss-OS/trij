import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { UrgencyPill } from "@/components/UrgencyPill";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MapPin,
  BarChart3,
  Download,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHWMap = lazy(() => import("@/components/CHWMap"));

type DateRange = 7 | 30 | 90;

interface RemoteAssessment {
  id: string;
  condition: string | null;
  urgency: "green" | "yellow" | "red" | null;
  referral_status: string | null;
  referral_advised: boolean;
  chw_user_id: string | null;
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

const PIE_COLORS = [
  "var(--color-primary)",
  "#60a5fa",
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#22d3ee",
  "#fb923c",
  "#818cf8",
  "#86efac",
];

export const Route = createFileRoute("/_app/supervisor")({
  head: () => ({ meta: [{ title: "Supervisor — Trij" }] }),
  component: Supervisor,
});

function csvDownload(filename: string, headers: string[], rows: string[][]) {
  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Supervisor() {
  const { t } = useI18n();
  const online = useOnlineStatus();
  const [items, setItems] = useState<RemoteAssessment[]>([]);
  const [chwLocations, setChwLocations] = useState<ChwLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "analytics" | "map">("queue");
  const [referralFilter, setReferralFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(30);
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
            "id, condition, urgency, referral_status, referral_advised, chw_user_id, created_at, patients(identifier)",
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

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dateRange);
    return d.toISOString();
  }, [dateRange]);

  const rangeFiltered = useMemo(
    () => items.filter((a) => a.created_at >= cutoff),
    [items, cutoff],
  );

  const counts = rangeFiltered.reduce(
    (acc, a) => {
      if (a.urgency) acc[a.urgency]++;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 },
  );

  const referralCounts = rangeFiltered.filter(
    (a) => a.referral_status && a.referral_status !== "none",
  ).length;

  const filteredItems = useMemo(() => {
    const base = rangeFiltered;
    if (referralFilter === "all") return base;
    return base.filter((a) => a.referral_status === referralFilter);
  }, [rangeFiltered, referralFilter]);

  const conditionData = useMemo(() => {
    const freq: Record<string, number> = {};
    for (const a of rangeFiltered) {
      if (a.condition) freq[a.condition] = (freq[a.condition] || 0) + 1;
    }
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({
        name: name.length > 22 ? name.slice(0, 22) + "..." : name,
        count,
      }));
  }, [rangeFiltered]);

  const dailyTrend = useMemo(() => {
    const trend: Record<string, number> = {};
    for (const a of rangeFiltered) {
      if (!a.created_at) continue;
      const day = a.created_at.slice(0, 10);
      trend[day] = (trend[day] || 0) + 1;
    }
    return Object.entries(trend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [rangeFiltered]);

  const chwPerformance = useMemo(() => {
    const perf: Record<string, { count: number; unsynced: number }> = {};
    for (const a of items) {
      const chwId = a.chw_user_id || "unknown";
      if (!perf[chwId]) perf[chwId] = { count: 0, unsynced: 0 };
      perf[chwId].count++;
    }
    return Object.entries(perf)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([id, data]) => ({
        name: id.slice(0, 8),
        count: data.count,
        unsynced: data.unsynced,
      }));
  }, [items]);

  const unsyncedChws = useMemo(() => {
    return chwPerformance.filter((c) => c.unsynced > 5);
  }, [chwPerformance]);

  const exportAllCsv = () => {
    const headers = ["Patient", "Condition", "Urgency", "Referral Status", "Created"];
    const rows = items.map((a) => [
      a.patients?.identifier ?? "",
      a.condition ?? "",
      a.urgency ?? "",
      a.referral_status ?? "",
      format(new Date(a.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    csvDownload(`trij-assessments-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  const exportConditionsCsv = () => {
    const headers = ["Condition", "Count"];
    const rows = conditionData.map((c) => [c.name, String(c.count)]);
    csvDownload(`trij-conditions-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  const exportTrendCsv = () => {
    const headers = ["Date", "Assessments"];
    const rows = dailyTrend.map((d) => [d.date, String(d.count)]);
    csvDownload(`trij-trend-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  const exportChwCsv = () => {
    const headers = ["CHW ID", "Assessments", "Unsynced"];
    const rows = chwPerformance.map((c) => [c.name, String(c.count), String(c.unsynced)]);
    csvDownload(`trij-chw-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  return (
    <>
      <AppHeader title={t("supervisor")} subtitle={t("regionOverview")} />
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-6">
        {!online && (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            {t("connectivityRequired")}
          </div>
        )}

        {online && unsyncedChws.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-urgency-yellow/30 bg-urgency-yellow/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-urgency-yellow" />
            <div>
              <p className="text-sm font-medium text-urgency-yellow">
                {unsyncedChws.length} CHW(s) with &gt;5 unsynced assessments
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {unsyncedChws.map((c) => (
                  <li key={c.name}>
                    {c.name} — {c.unsynced} unsynced
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3">
          <Stat label={t("routine")} value={counts.green} tone="green" />
          <Stat label={t("soon")} value={counts.yellow} tone="yellow" />
          <Stat label={t("urgent")} value={counts.red} tone="red" />
          <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
              {t("referrals")}
            </p>
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
              {tab === "queue" && t("queue")}
              {tab === "analytics" && t("analytics")}
              {tab === "map" && t("map")}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d as DateRange)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  dateRange === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {d}d
              </button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={exportAllCsv}
              disabled={items.length === 0}
            >
              <Download className="h-3.5 w-3.5" /> {t("csvExport")}
            </Button>
          </div>
        </div>

        {activeTab === "queue" && (
          <div className="rounded-3xl border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="font-display text-base font-semibold">{t("recentTriageQueue")}</h2>
              <select
                value={referralFilter}
                onChange={(e) => setReferralFilter(e.target.value)}
                className="ml-auto rounded-lg border bg-background px-2 py-1 text-xs"
              >
                <option value="all">{t("all")}</option>
                <option value="pending">{t("pending_status")}</option>
                <option value="active">{t("inTransit")}</option>
                <option value="resolved">{t("resolved")}</option>
              </select>
            </div>
            {loading ? (
              <div className="grid h-32 place-items-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noDataYet")}</p>
            ) : (
              <ul className="divide-y" role="list">
                {filteredItems.slice(0, 30).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3" tabIndex={0}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {a.patients?.identifier ?? "—"} · {a.condition ?? t("pending_status")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.created_at), "MMM d, p")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.referral_status && a.referral_status !== "none" && (
                        <span className="inline-flex items-center rounded-full border bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          {a.referral_status === "active" ? t("inTransit") : a.referral_status}
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
                <h3 className="font-display text-sm font-semibold">{t("topConditions")}</h3>
                <span className="text-xs text-muted-foreground">({dateRange}d)</span>
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={exportConditionsCsv}
                    disabled={conditionData.length === 0}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {conditionData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noDataYet")}</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={conditionData} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={conditionData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine
                      >
                        {conditionData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-3xl border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-semibold">{t("dailyAssessmentVolume")}</h3>
                <span className="text-xs text-muted-foreground">({dateRange}d)</span>
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={exportTrendCsv}
                    disabled={dailyTrend.length === 0}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {dailyTrend.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noDataYet")}</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
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

            <div className="rounded-3xl border bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-semibold">{t("chwPerformance")}</h3>
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={exportChwCsv}
                    disabled={chwPerformance.length === 0}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {chwPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noDataYet")}</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chwPerformance} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="rounded-3xl border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="font-display text-base font-semibold">{t("chwLocations")}</h2>
              <span className="text-xs text-muted-foreground">
                {chwLocations.length} {t("gpsDataDesc")}
              </span>
            </div>
            {chwLocations.length === 0 ? (
              <div className="grid h-48 place-items-center rounded-2xl border border-dashed bg-muted/30 text-xs text-muted-foreground">
                {t("noGpsData")}
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
