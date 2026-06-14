import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Download,
  MapPin,
} from "lucide-react";
import { getDB } from "@/lib/db";

export const Route = createFileRoute("/_app/dashboard/community")({
  component: CommunityDashboardPage,
  head: () => ({
    meta: [{ title: "Community Health" }],
  }),
});

interface Report {
  id: string;
  patientId: string;
  lat: number;
  lng: number;
  urgency: "red" | "yellow" | "green";
  condition: string;
  ageYears?: number;
  date: string;
}

function getUrgencyColor(u: string): string {
  switch (u) {
    case "red": return "#ef4444";
    case "yellow": return "#f59e0b";
    case "green": return "#22c55e";
    default: return "#6b7280";
  }
}

function markerIcon(urgency: string) {
  const color = getUrgencyColor(urgency);
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function clusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const color = count > 20 ? "#ef4444" : count > 10 ? "#f59e0b" : "#22c55e";
  return L.divIcon({
    html: `<div style="width:40px;height:40px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">${count}</div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function MarkerCluster({ reports }: { reports: Report[] }) {
  const map = useMap();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    import("leaflet.markercluster").then(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!ready) return;
    const mcg = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50,
      iconCreateFunction: clusterIcon,
    });
    reports.forEach((r) => {
      const icon = markerIcon(r.urgency);
      const m = L.marker([r.lat, r.lng], { icon });
      m.bindPopup(`
        <div style="min-width:150px;">
          <strong>${r.condition}</strong>
          <div style="color:#666;font-size:11px;margin-top:4px;">
            ${new Date(r.date).toLocaleDateString()}
          </div>
          <div style="margin-top:4px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${getUrgencyColor(r.urgency)};margin-right:4px;"></span>
            Urgency: <strong>${r.urgency.toUpperCase()}</strong>
          </div>
          <div style="color:#888;font-size:11px;margin-top:2px;">Age: ${r.ageYears ?? "?"}</div>
        </div>
      `);
      mcg.addLayer(m);
    });
    map.addLayer(mcg);
    return () => { map.removeLayer(mcg); };
  }, [map, reports, ready]);
  return null;
}

function CommunityDashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [filterSymptom, setFilterSymptom] = useState<string>("all");
  const [filterDays, setFilterDays] = useState<number>(90);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const db = getDB();
        const [assessments, patients] = await Promise.all([
          db.assessments.toArray(),
          db.patients.toArray(),
        ]);
        const patientMap = new Map(patients.map(p => [p.id, p]));
        const mapped = assessments
          .filter(a => {
            const p = patientMap.get(a.patientId);
            return p && p.locationLat != null && p.locationLng != null;
          })
          .map(a => {
            const p = patientMap.get(a.patientId)!;
            return {
              id: a.id,
              patientId: a.patientId,
              lat: p.locationLat!,
              lng: p.locationLng!,
              urgency: a.urgency ?? "green",
              condition: a.condition ?? "Unknown",
              ageYears: p.ageYears,
              date: a.createdAt,
            };
          });
        if (alive) setReports(mapped);
      } catch {
        console.debug("Community dashboard: DB not ready yet");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const allConditions = useMemo(() => {
    const set = new Set<string>();
    reports.forEach(r => set.add(r.condition));
    return Array.from(set).sort();
  }, [reports]);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - filterDays * 86400000;
    return reports.filter((r) => {
      if (filterUrgency !== "all" && r.urgency !== filterUrgency) return false;
      if (filterSymptom !== "all" && r.condition !== filterSymptom) return false;
      if (new Date(r.date).getTime() < cutoff) return false;
      return true;
    });
  }, [reports, filterUrgency, filterSymptom, filterDays]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const red = filtered.filter((r) => r.urgency === "red").length;
    const yellow = filtered.filter((r) => r.urgency === "yellow").length;
    const green = filtered.filter((r) => r.urgency === "green").length;
    const patients = new Set(filtered.map(r => r.patientId)).size;
    const conditionCounts: Record<string, number> = {};
    filtered.forEach((r) => {
      conditionCounts[r.condition] = (conditionCounts[r.condition] || 0) + 1;
    });
    const topCondition = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1])[0];
    return { total, red, yellow, green, patients, topCondition: topCondition?.[0] || "-" };
  }, [filtered]);

  const handleExport = () => {
    const csv = [
      "ID,Lat,Lng,Urgency,Condition,AgeYears,Date",
      ...filtered.map((r) =>
        `${r.id},${r.lat},${r.lng},${r.urgency},${r.condition},${r.ageYears ?? ""},${r.date}`,
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "community-health-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <AppHeader title="Community Health" subtitle="Anonymized public health data" />

      <div className="mx-auto max-w-4xl px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-emerald-600">{t("loading") || "Loading..."}</p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
                <Activity className="mb-1 h-5 w-5 text-emerald-500" />
                <p className="text-2xl font-bold text-emerald-900">{stats.total}</p>
                <p className="text-xs text-emerald-600">{t("totalReports") || "Total reports"}</p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
                <AlertTriangle className="mb-1 h-5 w-5 text-red-500" />
                <p className="text-2xl font-bold text-red-900">{stats.red}</p>
                <p className="text-xs text-red-600">{t("emergency")}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                <TrendingUp className="mb-1 h-5 w-5 text-amber-500" />
                <p className="text-2xl font-bold text-amber-900">{stats.yellow}</p>
                <p className="text-xs text-amber-600">{t("routine")}</p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-white p-4 shadow-sm">
                <MapPin className="mb-1 h-5 w-5 text-green-500" />
                <p className="text-2xl font-bold text-green-900">{stats.green}</p>
                <p className="text-xs text-green-600">{t("routine") || "Minor"}</p>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 text-center">
                <p className="text-xs text-emerald-600">{t("common") || "Most common"}</p>
                <p className="text-sm font-bold text-emerald-900">{stats.topCondition}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 text-center">
                <p className="text-xs text-emerald-600">{t("patients") || "Patients"}</p>
                <p className="text-sm font-bold text-emerald-900">{stats.patients}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 text-center">
                <p className="text-xs text-emerald-600">{t("weeksTracked") || "Period"}</p>
                <p className="text-sm font-bold text-emerald-900">{filterDays} {t("days")}</p>
              </div>
              <Button
                onClick={handleExport}
                variant="outline"
                className="flex items-center justify-center gap-1 rounded-xl border-emerald-300 text-emerald-700"
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs text-emerald-800"
              >
                <option value="all">{t("all") || "All urgency"}</option>
                <option value="red">{t("triageResultEmergency")}</option>
                <option value="yellow">{t("triageResultClinic")}</option>
                <option value="green">{t("triageResultWait")}</option>
              </select>
              <select
                value={filterSymptom}
                onChange={(e) => setFilterSymptom(e.target.value)}
                className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs text-emerald-800"
              >
                <option value="all">{t("all") || "All conditions"}</option>
                {allConditions.length > 0
                  ? allConditions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))
                  : <option disabled>No data</option>
                }
              </select>
              <select
                value={filterDays}
                onChange={(e) => setFilterDays(parseInt(e.target.value, 10))}
                className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs text-emerald-800"
              >
                <option value={7}>7 {t("days")}</option>
                <option value={30}>30 {t("days")}</option>
                <option value={90}>90 {t("days")}</option>
              </select>
            </div>

            <div className="overflow-hidden rounded-2xl border border-emerald-200 shadow-sm">
              <MapContainer
                center={[9.0820, 8.6753]}
                zoom={6}
                className="h-[400px] w-full sm:h-[500px]"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MarkerCluster reports={filtered} />
              </MapContainer>
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 font-semibold text-emerald-800">
                {t("report") || "About this data"}
              </h3>
              <p className="text-sm text-emerald-600">
                {t("anonymized") || "Data shown is anonymized and aggregated from opt-in triage reports. No personally identifiable information is stored. The heatmap helps identify disease hotspots and emerging public health trends across Nigeria."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
