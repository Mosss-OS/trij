import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
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

export const Route = createFileRoute("/_app/dashboard/community")({
  component: CommunityDashboardPage,
  head: () => ({
    meta: [{ title: "Community Health" }],
  }),
});

interface Report {
  id: string;
  lat: number;
  lng: number;
  urgency: "red" | "yellow" | "green";
  symptom: string;
  ageRange: string;
  date: string;
  city: string;
}

const NIGERIAN_CITIES = [
  { name: "Lagos", lat: 6.5244, lng: 3.3792 },
  { name: "Abuja", lat: 9.0765, lng: 7.3986 },
  { name: "Kano", lat: 12.0022, lng: 8.5920 },
  { name: "Ibadan", lat: 7.3775, lng: 3.9470 },
  { name: "Port Harcourt", lat: 4.8156, lng: 7.0498 },
  { name: "Benin City", lat: 6.3350, lng: 5.6037 },
  { name: "Maiduguri", lat: 11.8311, lng: 13.1510 },
  { name: "Zaria", lat: 11.0664, lng: 7.6891 },
  { name: "Enugu", lat: 6.4483, lng: 7.5132 },
  { name: "Jos", lat: 9.8965, lng: 8.8583 },
  { name: "Warri", lat: 5.5173, lng: 5.7506 },
  { name: "Kaduna", lat: 10.5264, lng: 7.4388 },
  { name: "Abeokuta", lat: 7.1501, lng: 3.3453 },
  { name: "Sokoto", lat: 13.0603, lng: 5.2409 },
  { name: "Ilorin", lat: 8.4966, lng: 4.5421 },
];

const SYMPTOMS = [
  "Malaria", "Respiratory infection", "Diarrhoea", "Skin infection",
  "Fever (unknown cause)", "Hypertension", "Diabetes", "Malnutrition",
  "Eye infection", "Typhoid", "Pneumonia", "Urinary tract infection",
];

function generateMockData(): Report[] {
  const reports: Report[] = [];
  const now = Date.now();
  for (let i = 0; i < 200; i++) {
    const city = NIGERIAN_CITIES[Math.floor(Math.random() * NIGERIAN_CITIES.length)];
    const urgencies: ("red" | "yellow" | "green")[] = ["red", "yellow", "green"];
    const weights = [0.15, 0.35, 0.5];
    const r = Math.random();
    let urgency: "red" | "yellow" | "green" = "green";
    let cum = 0;
    for (let j = 0; j < urgencies.length; j++) {
      cum += weights[j];
      if (r < cum) { urgency = urgencies[j]; break; }
    }
    const daysAgo = Math.floor(Math.random() * 90);
    reports.push({
      id: `r-${i}`,
      lat: city.lat + (Math.random() - 0.5) * 0.2,
      lng: city.lng + (Math.random() - 0.5) * 0.2,
      urgency,
      symptom: SYMPTOMS[Math.floor(Math.random() * SYMPTOMS.length)],
      ageRange: ["0-2", "3-12", "13-17", "18-60", "60+"][Math.floor(Math.random() * 5)],
      date: new Date(now - daysAgo * 86400000).toISOString(),
      city: city.name,
    });
  }
  return reports;
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
  useEffect(() => {
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
          <strong>${r.symptom}</strong>
          <div style="color:#666;font-size:11px;margin-top:4px;">
            ${r.city} &middot; ${new Date(r.date).toLocaleDateString()}
          </div>
          <div style="margin-top:4px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${getUrgencyColor(r.urgency)};margin-right:4px;"></span>
            Urgency: <strong>${r.urgency.toUpperCase()}</strong>
          </div>
          <div style="color:#888;font-size:11px;margin-top:2px;">Age: ${r.ageRange}</div>
        </div>
      `);
      mcg.addLayer(m);
    });
    map.addLayer(mcg);
    return () => { map.removeLayer(mcg); };
  }, [map, reports]);
  return null;
}

function CommunityDashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [filterSymptom, setFilterSymptom] = useState<string>("all");
  const [filterDays, setFilterDays] = useState<number>(90);

  useEffect(() => { setMounted(true); }, []);

  const allReports = useMemo(() => generateMockData(), []);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - filterDays * 86400000;
    return allReports.filter((r) => {
      if (filterUrgency !== "all" && r.urgency !== filterUrgency) return false;
      if (filterSymptom !== "all" && r.symptom !== filterSymptom) return false;
      if (new Date(r.date).getTime() < cutoff) return false;
      return true;
    });
  }, [allReports, filterUrgency, filterSymptom, filterDays]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const red = filtered.filter((r) => r.urgency === "red").length;
    const yellow = filtered.filter((r) => r.urgency === "yellow").length;
    const green = filtered.filter((r) => r.urgency === "green").length;
    const symptomCounts: Record<string, number> = {};
    filtered.forEach((r) => {
      symptomCounts[r.symptom] = (symptomCounts[r.symptom] || 0) + 1;
    });
    const topSymptom = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1])[0];
    const cityCounts: Record<string, number> = {};
    filtered.forEach((r) => {
      cityCounts[r.city] = (cityCounts[r.city] || 0) + 1;
    });
    const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];
    return { total, red, yellow, green, topSymptom: topSymptom?.[0] || "-", topCity: topCity?.[0] || "-" };
  }, [filtered]);

  const handleExport = () => {
    const csv = [
      "ID,City,Lat,Lng,Urgency,Symptom,AgeRange,Date",
      ...filtered.map((r) =>
        `${r.id},${r.city},${r.lat},${r.lng},${r.urgency},${r.symptom},${r.ageRange},${r.date}`,
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
            <p className="text-sm font-bold text-emerald-900">{stats.topSymptom}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 text-center">
            <p className="text-xs text-emerald-600">{t("hotspot") || "Hotspot"}</p>
            <p className="text-sm font-bold text-emerald-900">{stats.topCity}</p>
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
            <option value="all">{t("all") || "All symptoms"}</option>
            {SYMPTOMS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
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
      </div>
    </div>
  );
}
