import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/hooks/useRBAC";
import { getDB } from "@/lib/db";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  Users,
  Activity,
  HardDrive,
  AlertTriangle,
  Download,
  Clock,
  UserCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  ExternalLink,
  Circle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Usage Reports | Trij" },
      {
        name: "description",
        content: "Pilot admin dashboard with usage reports, CHW activity, and system health metrics.",
      },
    ],
  }),
  component: AdminDashboard,
});

interface ServerAssessment {
  id: string;
  condition: string | null;
  urgency: "green" | "yellow" | "red" | null;
  referral_status: string | null;
  chw_user_id: string | null;
  created_at: string;
  patients: { identifier: string } | null;
}

interface ChwProfile {
  user_id: string;
  name: string;
}

interface ChwStats {
  userId: string;
  name: string;
  patientCount: number;
  assessmentCount: number;
  lastActivity: string;
  pendingSync: number;
}

interface DailyCount {
  date: string;
  count: number;
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

function AdminDashboard() {
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
            <Link to="/dashboard">{t("home")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const [totalPatients, setTotalPatients] = useState(0);
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [syncQueueSize, setSyncQueueSize] = useState(0);
  const [deadLetterSize, setDeadLetterSize] = useState(0);
  const [chwStats, setChwStats] = useState<ChwStats[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChw, setExpandedChw] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Server-side data (from Supabase, only when online)
  const [serverAssessments, setServerAssessments] = useState<ServerAssessment[]>([]);
  const [chwProfiles, setChwProfiles] = useState<ChwProfile[]>([]);
  const [serverLoading, setServerLoading] = useState(false);

  const loadData = async () => {
    try {
      const db = getDB();
      const [patients, assessments, syncQueue, deadLetterItems] = await Promise.all([
        db.patients.count(),
        db.assessments.count(),
        db.syncQueue.count(),
        db.deadLetterQueue.count(),
      ]);
      setTotalPatients(patients);
      setTotalAssessments(assessments);
      setSyncQueueSize(syncQueue);
      setDeadLetterSize(deadLetterItems);

      const allAssessments = await db.assessments.toArray();
      const chwMap = new Map<string, { patientCount: Set<string>; assessmentCount: number; lastActivity: string; pendingSync: number }>();
      const dailyMap = new Map<string, number>();

      for (const a of allAssessments) {
        const uid = a.chwUserId;
        if (!chwMap.has(uid)) {
          chwMap.set(uid, { patientCount: new Set(), assessmentCount: 0, lastActivity: "", pendingSync: 0 });
        }
        const entry = chwMap.get(uid)!;
        entry.assessmentCount++;
        if (a.patientId) entry.patientCount.add(a.patientId);
        if (a.createdAt > entry.lastActivity) entry.lastActivity = a.createdAt;

        const day = a.createdAt.slice(0, 10);
        dailyMap.set(day, (dailyMap.get(day) || 0) + 1);

        if (!a.syncedAt) entry.pendingSync++;
      }

      const syncItems = await db.syncQueue.toArray();
      for (const item of syncItems) {
        const payload = item.payload as { chwUserId?: string } | undefined;
        if (payload?.chwUserId && chwMap.has(payload.chwUserId)) {
          chwMap.get(payload.chwUserId)!.pendingSync++;
        }
      }

      setChwStats(
        Array.from(chwMap.entries())
          .map(([userId, s]) => ({
            userId,
            name: userId.slice(0, 16),
            patientCount: s.patientCount.size,
            assessmentCount: s.assessmentCount,
            lastActivity: s.lastActivity,
            pendingSync: s.pendingSync,
          }))
          .sort((a, b) => b.assessmentCount - a.assessmentCount),
      );

      setDailyTrend(
        Array.from(dailyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-30)
          .map(([date, count]) => ({ date, count })),
      );
    } catch {
      /* db not ready */
    } finally {
      setLoading(false);
    }
  };

  // Fetch server-side data when online
  useEffect(() => {
    if (!online) {
      setServerAssessments([]);
      setServerLoading(false);
      return;
    }
    let alive = true;
    setServerLoading(true);
    (async () => {
      const [assessRes, profileRes] = await Promise.all([
        supabase
          .from("assessments")
          .select("id, patient_id, condition, urgency, referral_status, chw_user_id, created_at, patients(identifier)")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("chw_profiles")
          .select("user_id, name"),
      ]);
      if (!alive) return;
      if (assessRes.data) {
        setServerAssessments(assessRes.data as ServerAssessment[]);
      }
      if (profileRes.data) {
        setChwProfiles(profileRes.data as ChwProfile[]);
      }
      setServerLoading(false);
    })();
    return () => { alive = false; };
  }, [online]);

  // Merge CHW names from server profiles into local stats
  const chwData = useMemo(() => {
    const nameMap = new Map(chwProfiles.map((p) => [p.user_id, p.name]));
    return chwStats.map((c) => ({
      ...c,
      name: nameMap.get(c.userId) || c.userId.slice(0, 16),
    }));
  }, [chwStats, chwProfiles]);

  // Server-derived aggregates
  const serverCounts = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0 };
    const conditionFreq: Record<string, number> = {};
    const referralItems: ServerAssessment[] = [];

    for (const a of serverAssessments) {
      if (a.urgency && a.urgency in counts) counts[a.urgency]++;
      if (a.condition) {
        const key = a.condition.length > 26 ? a.condition.slice(0, 26) + "..." : a.condition;
        conditionFreq[key] = (conditionFreq[key] || 0) + 1;
      }
      if (a.referral_status && a.referral_status !== "none") {
        referralItems.push(a);
      }
    }

    const topConditions = Object.entries(conditionFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const serverTotal = serverAssessments.length;

    return { urgencyCounts: counts, topConditions, referralItems, serverTotal };
  }, [serverAssessments]);

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalLastWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return dailyTrend.filter((d) => d.date >= weekAgo.toISOString().slice(0, 10)).reduce((s, d) => s + d.count, 0);
  }, [dailyTrend]);

  const handleExportCsv = () => {
    const headers = [t("chwLabel"), t("patientsLabel"), t("assessmentsLabel"), t("lastActivity"), t("syncLabel")];
    const rows = chwData.map((c) => [
      c.name,
      String(c.patientCount),
      String(c.assessmentCount),
      c.lastActivity ? new Date(c.lastActivity).toISOString() : "never",
      String(c.pendingSync),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trij-usage-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AppHeader title={t("adminDashboard")} subtitle={t("usageReports")} />
      <div className="mx-auto max-w-4xl px-5 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {online ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-amber-600" />}
            {online ? t("online") : t("offline")}
            {online && serverLoading && (
              <>
                <span className="mx-1 text-muted-foreground/40">·</span>
                <RefreshCw className="h-3 w-3 animate-spin" />
              </>
            )}
            <span className="mx-1 text-muted-foreground/40">·</span>
            <span className="text-[11px]">{online ? t("fromServer") : t("fromLocal")}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={chwData.length === 0}>
              <Download className="mr-1.5 h-4 w-4" /> {t("csvExport")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {t("refresh")}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Activity} label={t("assessmentsLabel")} value={serverCounts.serverTotal || totalAssessments} />
          <StatCard icon={Users} label={t("patientsLabel")} value={totalPatients} />
          <StatCard icon={UserCheck} label={t("activeChws")} value={chwData.length} />
          <StatCard
            icon={HardDrive}
            label={t("syncQueue")}
            value={syncQueueSize}
            subtitle={deadLetterSize > 0 ? `${deadLetterSize} ${t("deadLetter")}` : undefined}
            warn={deadLetterSize > 0}
          />
        </div>

        {/* Urgency Breakdown */}
        {online && serverCounts.serverTotal > 0 && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            <StatCard
              icon={() => <Circle className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />}
              label={t("green")}
              value={serverCounts.urgencyCounts.green}
            />
            <StatCard
              icon={() => <Circle className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />}
              label={t("yellow")}
              value={serverCounts.urgencyCounts.yellow}
            />
            <StatCard
              icon={() => <Circle className="h-3.5 w-3.5 fill-red-500 text-red-500" />}
              label={t("red")}
              value={serverCounts.urgencyCounts.red}
            />
          </div>
        )}

        {/* Weekly summary */}
        <div className="mb-8 rounded-2xl border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" />
            Activity ({t("last7Days")})
          </h3>
          <p className="text-2xl font-bold">{totalLastWeek}</p>
          <p className="text-xs text-muted-foreground">{t("assessmentsPastWeek")}</p>
          {dailyTrend.length > 0 && (
            <div className="mt-4 flex items-end gap-1">
              {dailyTrend.slice(-14).map((d) => {
                const max = Math.max(...dailyTrend.map((x) => x.count), 1);
                const h = Math.max(4, (d.count / max) * 60);
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-muted-foreground">{d.count}</span>
                    <div
                      className="w-full rounded-sm bg-primary/20 transition-all hover:bg-primary/40"
                      style={{ height: `${h}px` }}
                      title={`${d.date}: ${d.count}`}
                    />
                    <span className="text-[8px] text-muted-foreground">{d.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Conditions & Referrals (server data) */}
        {online && serverCounts.serverTotal > 0 && (
          <div className="mb-8 grid gap-6 sm:grid-cols-2">
            {/* Top Conditions */}
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
                <Stethoscope className="h-4 w-4 text-primary" />
                {t("topConditionsLabel")}
              </h3>
              {serverCounts.topConditions.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("noActivityData")}</p>
              ) : (
                <div className="space-y-2">
                  {serverCounts.topConditions.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <span className="ml-2 shrink-0 font-medium">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referral Activity */}
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
                <ExternalLink className="h-4 w-4 text-primary" />
                {t("referralActivity")}
              </h3>
              <p className="text-2xl font-bold">{serverCounts.referralItems.length}</p>
              <p className="text-xs text-muted-foreground">{t("referralCount")}</p>
              {serverCounts.referralItems.length > 0 && (
                <div className="mt-4 space-y-2">
                  {serverCounts.referralItems.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-[11px]">
                      <span className="truncate text-muted-foreground">
                        {r.patients?.identifier || "—"} · {r.condition || "—"}
                      </span>
                      <span className="shrink-0 text-xs font-medium">{r.created_at?.slice(0, 10)}</span>
                    </div>
                  ))}
                  {serverCounts.referralItems.length > 5 && (
                    <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs">
                      <Link to="/supervisor" className="gap-1">
                        {t("viewAll")} <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHW Activity Table */}
        <div className="rounded-2xl border bg-card">
          <div className="border-b px-5 py-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" />
              CHW {t("activityLower")} ({chwData.length})
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : chwData.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("noActivityData")}</div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-5 gap-2 px-5 py-2 text-xs font-medium text-muted-foreground">
                <span className="col-span-2">{t("chwLabel")}</span>
                <span className="text-right">{t("patientsLabel")}</span>
                <span className="text-right">{t("assessmentsLabel")}</span>
                <span className="text-right">{t("syncLabel")}</span>
              </div>
              {chwData.map((chw) => (
                <div key={chw.userId}>
                  <button
                    onClick={() => setExpandedChw(expandedChw === chw.userId ? null : chw.userId)}
                    className="grid w-full grid-cols-5 gap-2 px-5 py-3 text-left text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="col-span-2 truncate font-medium">{chw.name}</span>
                    <span className="text-right">{chw.patientCount}</span>
                    <span className="text-right">{chw.assessmentCount}</span>
                    <span className={`flex items-center justify-end gap-1 text-right ${chw.pendingSync > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {chw.pendingSync > 0 ? (
                        <><WifiOff className="h-3 w-3" />{chw.pendingSync}</>
                      ) : (
                        <><Wifi className="h-3 w-3" />0</>
                      )}
                      {expandedChw === chw.userId ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                    </span>
                  </button>
                  {expandedChw === chw.userId && (
                    <div className="border-t bg-muted/30 px-5 py-3 text-xs text-muted-foreground">
                      <p>{t("lastActivity")}: {chw.lastActivity ? formatDistanceToNow(new Date(chw.lastActivity), { addSuffix: true }) : "never"}</p>
                      <p className="mt-1">{t("userIdLabel")}: {chw.userId}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  warn,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  subtitle?: string;
  warn?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${warn ? "border-amber-200 bg-amber-50" : "bg-card"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {warn ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> : <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
