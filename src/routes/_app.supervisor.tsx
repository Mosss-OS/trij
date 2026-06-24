import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useReferralAlerts } from "@/hooks/useReferralAlerts";
import { useRole } from "@/hooks/useRBAC";
import { useSettingsStore } from "@/stores/settingsStore";
import { UrgencyPill } from "@/components/UrgencyPill";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { detectOutbreaks, type Outbreak, type OutbreakAssessment, type OutbreakAlert } from "@/lib/outbreak";
import { checkForNotifiableConditions } from "@/lib/outbreak-flags";
import {
  aggregateAssessments,
  buildDhis2Payload,
  pushToDhis2,
  validateCounts,
  getCurrentDhis2Period,
  type Dhis2Config,
} from "@/lib/dhis2-export";
import {
  Loader2,
  MapPin,
  BarChart3,
  Download,
  TrendingUp,
  AlertTriangle,
  BellRing,
  X,
  ExternalLink,
  ShieldAlert,
  Database,
} from "lucide-react";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import {
  anonymiseAssessments,
  buildAnonymisedCsvRows,
  stripIdentifiers,
  meetsThreshold,
  groupCondition,
  kAnonymityCheck,
} from "@/lib/anonymisation";
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
  patient_id: string;
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
  head: () => ({
    meta: [
      {
        title: "Supervisor Dashboard — Analytics & Map | Trij Free Medical Triage",
      },
      {
        name: "description",
        content:
          "Supervisor dashboard for community health programs. View geolocated assessment map, referral queue, condition analytics, CHW performance metrics, and CSV exports. Free open-source healthcare management.",
      },
      {
        name: "keywords",
        content:
          "health supervisor dashboard, CHW management, healthcare analytics, medical assessment map, community health monitoring, referral queue management, healthcare CSV export",
      },
      {
        property: "og:title",
        content: "Supervisor Dashboard — Healthcare Analytics | Trij",
      },
      {
        property: "og:description",
        content:
          "Free supervisor dashboard for community health programs. Analytics, maps, and CHW management tools.",
      },
      {
        name: "twitter:title",
        content: "Supervisor Dashboard — Healthcare Analytics | Trij",
      },
      {
        name: "twitter:description",
        content:
          "Free supervisor dashboard for community health programs. Analytics, maps, and CHW management tools.",
      },
    ],
  }),
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
  const role = useRole();
  const { t } = useI18n();
  const online = useOnlineStatus();

  if (role === "chw") {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="text-center">
          <h2 className="font-display text-xl font-bold">{t("accessDenied")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("supervisorOnly")}</p>
          <Button asChild className="mt-6">
            <Link to="/patients">{t("backToPatients")}</Link>
          </Button>
        </div>
      </div>
    );
  }
  const [items, setItems] = useState<RemoteAssessment[]>([]);
  const [chwLocations, setChwLocations] = useState<ChwLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"queue" | "analytics" | "map">("queue");
  const [referralFilter, setReferralFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>(30);
  const [showMap, setShowMap] = useState(false);
  const [outbreaks, setOutbreaks] = useState<Outbreak[]>([]);
  const [outbreakAlerts, setOutbreakAlerts] = useState<OutbreakAlert[]>([]);
  const { unseen, count: alertCount, markAllAsSeen, markAsSeen } = useReferralAlerts();

  const notifiableMatches = useMemo(() => {
    const matches: Set<string> = new Set();
    for (const a of items) {
      if (!a.condition) continue;
      const result = checkForNotifiableConditions(a.condition);
      for (const m of result) matches.add(m.condition.name);
    }
    return Array.from(matches);
  }, [items]);

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
            "id, patient_id, condition, urgency, referral_status, referral_advised, chw_user_id, created_at, patients(identifier)",
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
       const assessmentsWithLoc = (assessRes.data ?? []).map((a: any) => ({
         ...a,
         location_lat: a.patients?.location_lat ?? null,
         location_lng: a.patients?.location_lng ?? null,
         patient_id: a.patient_id ?? a.id,
       }));
       setItems(assessmentsWithLoc as unknown as RemoteAssessment[]);
       setChwLocations((chwRes.data ?? []) as ChwLocation[]);
       
       // Detect outbreaks
        const detected = detectOutbreaks(assessmentsWithLoc as OutbreakAssessment[], { epsKm: 5, minPts: 3, daysWindow: 7 });
       setOutbreaks(detected);
       
       // Generate new alerts for outbreaks not already alerted
       const newOutbreaks = detected.filter(
         (outbreak) => !outbreakAlerts.some((alert) => alert.outbreakId === outbreak.id)
       );
       if (newOutbreaks.length > 0) {
         const newAlerts = newOutbreaks.map((outbreak) => ({
           id: `alert-${outbreak.id}`,
           outbreakId: outbreak.id,
           triggeredAt: new Date().toISOString(),
           acknowledged: false,
         }));
         setOutbreakAlerts((prev) => [...prev, ...newAlerts]);
         // Trigger immediate supervisor notification (toast)
         newOutbreaks.forEach((outbreak) => {
           toast.warning(`${t("outbreakDetected")}: ${outbreak.condition} (${outbreak.cases} cases)`, {
             duration: 10000,
             action: {
               label: t("viewDetails"),
               onClick: () => setActiveTab("map"),
             },
           });
         });
       }
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

  const rangeFiltered = useMemo(() => items.filter((a) => a.created_at >= cutoff), [items, cutoff]);

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
    const k = 5;
    for (const a of rangeFiltered) {
      const grouped = groupCondition(a.condition);
      if (grouped !== "other" || a.condition) {
        freq[grouped] = (freq[grouped] || 0) + 1;
      }
    }
    return Object.entries(freq)
      .filter(([, count]) => meetsThreshold(count, k))
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

  const chwAssessmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const today = new Date().toISOString().slice(0, 10);
    for (const a of items) {
      if (!a.chw_user_id) continue;
      if (a.created_at?.startsWith(today)) {
        counts[a.chw_user_id] = (counts[a.chw_user_id] || 0) + 1;
      }
    }
    return counts;
  }, [items]);

  const exportAllCsv = () => {
    const k = 5;
    const cohort = kAnonymityCheck(items, k);
    if (cohort.length === 0) {
      toast.error(t("insufficientDataForExport"));
      return;
    }
    const anonymised = anonymiseAssessments(cohort);
    const aggregated = buildAnonymisedCsvRows(anonymised);
    const headers: string[] = [
      "Condition Group", "Urgency", "Age Group", "Region",
      "Count", "Date",
    ];
    const rows: string[][] = aggregated.map((r) => [
      r[0], r[1], r[2], r[3], r[4], r[5],
    ]);
    csvDownload(`trij-assessments-anonymised-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  const exportConditionsCsv = () => {
    const k = 5;
    const headers = ["Condition Group", "Count"];
    const rows = conditionData
      .filter((c) => meetsThreshold(c.count, k))
      .map((c) => [groupCondition(c.name), String(c.count)]);
    csvDownload(`trij-conditions-anonymised-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  const exportTrendCsv = () => {
    const headers = ["Date", "Assessments"];
    const rows = dailyTrend.map((d) => [d.date, String(d.count)]);
    csvDownload(`trij-trend-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  const exportChwCsv = () => {
    const k = 5;
    const rows = chwPerformance
      .filter((c) => meetsThreshold(c.count, k))
      .map((c) => ["[REDACTED]", String(c.count), String(c.unsynced)]);
    const headers = ["CHW", "Assessments", "Unsynced"];
    csvDownload(`trij-chw-anonymised-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
  };

  const exportDhis2 = async () => {
    if (items.length === 0) {
      toast.error(t("noDataYet"));
      return;
    }

    const settings = useSettingsStore.getState();
    if (!settings.dhis2BaseUrl || !settings.dhis2Username || !settings.dhis2Password) {
      toast.error("Configure DHIS2 credentials in Settings first");
      return;
    }

    const config: Dhis2Config = {
      baseUrl: settings.dhis2BaseUrl,
      username: settings.dhis2Username,
      password: settings.dhis2Password,
      orgUnit: settings.dhis2OrgUnit,
      dataSet: settings.dhis2DataSet,
      period: getCurrentDhis2Period(),
    };

    const mapped: Array<{
      urgency: "green" | "yellow" | "red";
      referralAdvised?: boolean;
      referralStatus?: string;
      presentationType?: string;
    }> = items.map((a) => ({
      urgency: a.urgency ?? "green",
      referralAdvised: a.referral_advised ?? false,
      referralStatus: a.referral_status ?? "none",
    }));

    const counts = aggregateAssessments(mapped as any);
    const validation = validateCounts(counts);

    if (validation.warnings.length > 0 && validation.totalAssessments > 0) {
      const proceed = window.confirm(
        `Validation warnings:\n${validation.warnings.join("\n")}\n\nProceed anyway?`,
      );
      if (!proceed) return;
    }

    const payload = buildDhis2Payload(config, counts);

    try {
      const result = await pushToDhis2(config, payload);
      if (result.ok) {
        toast.success(
          `DHIS2 export successful (${validation.totalAssessments} assessments, ${validation.dataElementCount} elements)`,
        );
      } else {
        toast.error(`DHIS2 export failed: HTTP ${result.httpStatus}`);
      }
    } catch (err) {
      toast.error(`DHIS2 export error: ${(err as Error).message}`);
    }
  };

  return (
    <>
      <AppHeader title={t("supervisor")} subtitle={t("regionOverview")} />
      <div className="flex items-center gap-2 px-5 pt-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/audit">
            <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
            {t("auditLog")}
          </Link>
        </Button>
      </div>
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-6">
        {!online && (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            {t("connectivityRequired")}
          </div>
        )}

        {alertCount > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <BellRing className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-blue-800">
                    {alertCount} new referral{alertCount > 1 ? "s" : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={markAllAsSeen}
                      className="whitespace-nowrap rounded-lg bg-blue-100 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-200 touch-manipulation"
                    >
                      Dismiss all
                    </button>
                  </div>
                </div>
                <ul className="mt-2 space-y-2">
                  {unseen.slice(0, 5).map((a) => (
                    <li key={a.assessment.id} className="flex items-center gap-2">
                      <Link
                        to="/patients/$patientId"
                        params={{ patientId: a.assessment.patientId }}
                        className="flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline min-h-[44px] py-1"
                      >
                        {a.patient?.identifier ?? "Unknown"}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <span className="text-xs text-blue-600/70">
                        {a.assessment.condition ?? "Assessment"}
                      </span>
                      <button
                        onClick={() => markAsSeen(a.assessment.id)}
                        className="ml-auto rounded-lg bg-blue-100 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-200 touch-manipulation"
                        aria-label="Acknowledge"
                      >
                        Acknowledge
                      </button>
                    </li>
                  ))}
                  {unseen.length > 5 && (
                    <li className="text-xs text-blue-500/70">+{unseen.length - 5} more</li>
                  )}
                </ul>
              </div>
            </div>
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

        {notifiableMatches.length > 0 && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">{t("outbreakBanner")}</p>
                <p className="mt-1 text-xs text-red-700/80">{t("outbreakBannerDesc")}</p>
                <ul className="mt-2 space-y-1">
                  {notifiableMatches.map((name) => (
                    <li key={name} className="flex items-center gap-2 text-xs font-medium text-red-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      {name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        <div className="flex flex-wrap gap-2 border-b pb-2 sm:pb-0 sm:gap-2">
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
          <div className="ml-auto flex flex-wrap items-center gap-1">
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={exportDhis2}
              disabled={items.length === 0}
            >
              <Database className="h-3.5 w-3.5" /> DHIS2
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
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-3 px-2 active:bg-muted/50 rounded-xl cursor-pointer touch-manipulation"
                    tabIndex={0}
                    onClick={() => window.open(`/patients/${a.patient_id}`, "_self")}
                    onKeyDown={(e) => { if (e.key === "Enter") window.open(`/patients/${a.patient_id}`, "_self"); }}
                  >
                    <div className="min-w-0 flex-1 min-h-[44px] flex flex-col justify-center">
                      <p className="truncate text-sm font-medium">
                        {a.patients?.identifier ?? "—"} · {a.condition ?? t("pending_status")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.created_at), "MMM d, p")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                    <BarChart
                      data={conditionData}
                      layout="vertical"
                      margin={{ left: 0, right: 20 }}
                    >
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
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                  <BarChart
                    data={chwPerformance}
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  >
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
                 {showMap && (
                   <CHWMap
                     locations={chwLocations.filter(
                       (l): l is ChwLocation & { location_lat: number; location_lng: number } =>
                         l.location_lat != null && l.location_lng != null,
                     )}
                     assessmentCounts={chwAssessmentCounts}
                     outbreaks={outbreaks}
                   />
                 )}
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
