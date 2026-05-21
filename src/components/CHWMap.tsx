import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useState } from "react";
import { Outbreak } from "@/lib/outbreak";

function syncColor(lastSync: string | null): string {
  if (!lastSync) return "#ef4444";
  const days = (Date.now() - new Date(lastSync).getTime()) / 86400000;
  if (days < 1) return "#22c55e";
  if (days < 3) return "#eab308";
  return "#ef4444";
}

function syncLabel(color: string): string {
  if (color === "#22c55e") return "Recent (< 1d)";
  if (color === "#eab308") return "Aging (1-3d)";
  return "Stale (> 3d)";
}

function markerIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

function clusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const color = count > 20 ? "#ef4444" : count > 10 ? "#eab308" : "#22c55e";
  return L.divIcon({
    html: `<div style="width:40px;height:40px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;">${count}</div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const CACHE_NAME = "trij-tiles";

function TileCacheHook() {
  const map = useMap();
  useEffect(() => {
    let cancelled = false;

    async function precacheVisible() {
      const cache = await caches.open(CACHE_NAME);
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      if (zoom < 8 || zoom > 18) return;
      const sw = map.project(bounds.getSouthWest(), zoom);
      const ne = map.project(bounds.getNorthEast(), zoom);
      for (let x = Math.floor(sw.x / 256); x <= Math.ceil(ne.x / 256); x++) {
        for (let y = Math.floor(sw.y / 256); y <= Math.ceil(ne.y / 256); y++) {
          if (cancelled) return;
          const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
          try {
            const cached = await cache.match(url);
            if (!cached) {
              const res = await fetch(url);
              if (res.ok) cache.put(url, res);
            }
          } catch {
            /* offline */
          }
        }
      }
    }

    map.on("moveend", precacheVisible);
    precacheVisible();
    return () => {
      cancelled = true;
      map.off("moveend", precacheVisible);
    };
  }, [map]);
  return null;
}

interface LocationData {
  id: string;
  name: string;
  location_lat: number;
  location_lng: number;
  last_sync: string | null;
}

interface Props {
  locations: LocationData[];
  assessmentCounts?: Record<string, number>;
  outbreaks?: Outbreak[];
}

function ClusterGroup({
  locations,
  counts,
}: {
  locations: LocationData[];
  counts: Record<string, number>;
}) {
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

    locations.forEach((loc) => {
      const color = syncColor(loc.last_sync);
      const icon = markerIcon(color);
      const count = counts[loc.id] ?? 0;
      const m = L.marker([loc.location_lat, loc.location_lng], { icon });
      m.bindPopup(`
        <div style="min-width:170px;">
          <strong>${loc.name}</strong>
          <hr style="margin:6px 0;border-color:#eee;" />
          <div style="font-size:12px;color:#666;">Last sync: ${loc.last_sync ? new Date(loc.last_sync).toLocaleString() : "never"}</div>
          <div style="font-size:12px;color:#666;margin-top:2px;">Assessments today: <strong>${count}</strong></div>
          <div style="margin-top:6px;font-size:11px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:3px;"></span> Sync: ${syncLabel(color)}</div>
        </div>
      `);
      mcg.addLayer(m);
    });

    map.addLayer(mcg);
    return () => {
      map.removeLayer(mcg);
    };
  }, [map, locations, counts]);

  return null;
}

export default function CHWMap({ 
  locations, 
  assessmentCounts = {}, 
  outbreaks = [] 
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const valid = locations.filter(
    (l): l is LocationData => l.location_lat != null && l.location_lng != null,
  );

  if (valid.length === 0) {
    return (
      <div className="grid h-80 place-items-center rounded-2xl border border-dashed bg-muted/30 text-xs text-muted-foreground">
        No CHW location data
      </div>
    );
  }

  const center: [number, number] = [
    valid.reduce((s, l) => s + l.location_lat, 0) / valid.length,
    valid.reduce((s, l) => s + l.location_lng, 0) / valid.length,
  ];

  return (
    <MapContainer center={center} zoom={10} className="h-80 w-full rounded-2xl sm:h-96 lg:h-[500px]" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
       <TileCacheHook />
       <ClusterGroup locations={valid} counts={assessmentCounts} />
        {outbreaks.map((outbreak) => (
          <Circle
            key={outbreak.id}
            center={[outbreak.centroid_lat, outbreak.centroid_lng]}
            radius={outbreak.radius_km * 1000}
            pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.2, weight: 3 }}
          />
        ))}
     </MapContainer>
  );
}
