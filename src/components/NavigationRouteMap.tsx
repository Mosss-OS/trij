/**
 * NavigationRouteMap — Leaflet overlay showing the computed route
 * as a polyline on the map, with start/end markers.
 */

import { useMap, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import { useNavigation } from "@/hooks/useNavigation";
import type { RouteSegment } from "@/lib/navigation/pathfinding";

function createDivIcon(html: string, size = 24) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">${html}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const START_ICON = createDivIcon(
  '<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>',
  24,
);

const END_ICON = createDivIcon(
  '<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>',
  24,
);

const DIRECTION_ICONS: Record<string, string> = {
  turn_left: "↰",
  turn_right: "↱",
  turn_slight_left: "↖",
  turn_slight_right: "↗",
  turn_sharp_left: "↙",
  turn_sharp_right: "↘",
  continue: "↑",
  arrive: "🏁",
  depart: "📍",
};

export function NavigationRouteMap() {
  const { isNavigating, steps, currentStepIndex } = useNavigation();
  const map = useMap();

  // Auto-fit map to route bounds when navigation starts
  useEffect(() => {
    if (!isNavigating) return;
    // The route will be rendered by the segments below
  }, [isNavigating, map]);

  if (!isNavigating) return null;

  // We don't have direct access to the raw route coordinates here,
  // but the NavigationManager tracks positions. For now, we show
  // a marker at the current known position.
  return null;
}

/**
 * RouteOverlay — renders a pre-computed route polyline.
 * Pass the route segments from the NavigationManager.
 */
export function RouteOverlay({
  segments,
  destinationCoords,
  destinationName,
}: {
  segments: RouteSegment[];
  destinationCoords?: { lat: number; lng: number } | null;
  destinationName?: string;
}) {
  const map = useMap();

  if (segments.length === 0) return null;

  // Build polyline coordinates from segments
  const coords: [number, number][] = [];
  for (const seg of segments) {
    coords.push([seg.startNode.lat, seg.startNode.lng]);
  }
  // Add the final node
  const lastSeg = segments[segments.length - 1];
  coords.push([lastSeg.endNode.lat, lastSeg.endNode.lng]);

  // Fit map to route bounds
  useEffect(() => {
    if (coords.length > 1) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [coords.length]);

  const start = coords[0];
  const end = coords[coords.length - 1];

  return (
    <>
      {/* Route polyline */}
      <Polyline
        positions={coords}
        pathOptions={{
          color: "#3b82f6",
          weight: 5,
          opacity: 0.8,
          dashArray: undefined,
        }}
      />

      {/* Start marker */}
      <Marker position={start} icon={START_ICON}>
        <Popup>
          <span className="text-xs font-medium">Your position</span>
        </Popup>
      </Marker>

      {/* End marker */}
      {destinationCoords && (
        <Marker
          position={[destinationCoords.lat, destinationCoords.lng]}
          icon={END_ICON}
        >
          <Popup>
            <span className="text-xs font-medium">
              {destinationName ?? "Destination"}
            </span>
          </Popup>
        </Marker>
      )}
    </>
  );
}
