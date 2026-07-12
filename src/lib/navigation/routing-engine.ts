/**
 * Routing Engine — unified interface with GraphHopper → OSRM → Custom A* fallback.
 *
 * The engine tries each backend in order and falls through to the next
 * on failure.  All backends produce the same Route type so callers
 * don't need to know which engine was used.
 */

import type { GeoCoords } from "@/lib/geolocation";
import type { RoadGraph } from "./road-graph";
import { loadGraphFromNetwork, findRegionForCoords } from "./road-graph";
import { aStar, type Route } from "./pathfinding";
import { generateDirections, type Directions } from "./directions";
import { getStoredRoadGraph, storeRoadGraph } from "./road-graph-store";

/* ------------------------------------------------------------------ */
/*  Engine kind                                                        */
/* ------------------------------------------------------------------ */

export type EngineKind = "graphhopper" | "osrm" | "custom-astar";

export interface RoutingResult {
  route: Route;
  directions: Directions;
  engine: EngineKind;
}

/* ------------------------------------------------------------------ */
/*  GraphHopper JS wrapper (dynamic import)                            */
/* ------------------------------------------------------------------ */

async function tryGraphHopper(
  _start: GeoCoords,
  _goal: GeoCoords,
  _graph: RoadGraph,
): Promise<Route | null> {
  try {
    // GraphHopper JS API: dynamically import to avoid bundle bloat
    // Requires @graphhopper/routing-api-client or self-hosted instance
    const mod = await import(/* @viteIgnore */ "graphhopper-js-api-client").catch(() => null);
    if (!mod) return null;

    // If the library loaded, try to use it
    // In practice, GraphHopper needs a pre-built .ghz file per region
    // This is a placeholder for when the library is available
    const gh = new (mod as any).Graphhopper({
      key: "", // offline mode — no API key needed for local .ghz files
      vehicle: "foot",
      elevation: false,
    });

    const result = await gh
      .route({
        points: [
          [_start.lng, _start.lat],
          [_goal.lng, _goal.lat],
        ],
      })
      .catch(() => null);

    if (!result?.paths?.[0]) return null;

    const path = result.paths[0];
    const coords: [number, number][] = path.points?.coordinates ?? [];
    if (coords.length < 2) return null;

    // Convert GraphHopper response to our Route format
    const segments = [];
    for (let i = 0; i < coords.length - 1; i++) {
      segments.push({
        edge: {
          from: i,
          to: i + 1,
          distance: path.distance / coords.length,
          roadClass: "primary" as const,
          oneway: false,
        },
        startNode: { id: i, lat: coords[i][1], lng: coords[i][0] },
        endNode: { id: i + 1, lat: coords[i + 1][1], lng: coords[i + 1][0] },
      });
    }

    return {
      segments,
      totalDistance: path.distance,
      totalDuration: path.time / 1000,
      startCoords: _start,
      endCoords: _goal,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  OSRM.js wrapper (dynamic import)                                   */
/* ------------------------------------------------------------------ */

async function tryOSRM(
  _start: GeoCoords,
  _goal: GeoCoords,
  _graph: RoadGraph,
): Promise<Route | null> {
  try {
    // OSRM JS bindings compile the C++ OSRM backend to WASM
    // Requires osrm module (npm install osrm)
    const OSRM = await import(/* @viteIgnore */ "osrm").catch(() => null);
    if (!OSRM) return null;

    const osrm = new (OSRM as any).default({
      // In a real setup, you'd load a pre-extracted .osrm file
      // stored in IndexedDB or bundled as a static asset
      paths: [], // placeholder
    });

    const result = await new Promise<any>((resolve, reject) => {
      osrm.route(
        {
          coordinates: [
            [_start.lng, _start.lat],
            [_goal.lng, _goal.lat],
          ],
          overview: "full",
          geometries: "geojson",
        },
        (err: any, res: any) => (err ? reject(err) : resolve(res)),
      );
    }).catch(() => null);

    if (!result?.routes?.[0]) return null;

    const route = result.routes[0];
    const coords: [number, number][] = route.geometry?.coordinates ?? [];
    if (coords.length < 2) return null;

    const segments = [];
    for (let i = 0; i < coords.length - 1; i++) {
      segments.push({
        edge: {
          from: i,
          to: i + 1,
          distance: route.distance / coords.length,
          roadClass: "primary" as const,
          oneway: false,
        },
        startNode: { id: i, lat: coords[i][1], lng: coords[i][0] },
        endNode: { id: i + 1, lat: coords[i + 1][1], lng: coords[i + 1][0] },
      });
    }

    return {
      segments,
      totalDistance: route.distance,
      totalDuration: route.duration,
      startCoords: _start,
      endCoords: _goal,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Custom A* (always available — built-in)                            */
/* ------------------------------------------------------------------ */

function tryCustomAStar(
  start: GeoCoords,
  goal: GeoCoords,
  graph: RoadGraph,
): Route | null {
  return aStar(graph, start, goal);
}

/* ------------------------------------------------------------------ */
/*  Public API: route with fallback                                    */
/* ------------------------------------------------------------------ */

export async function getRoute(
  start: GeoCoords,
  goal: GeoCoords,
  preferredEngine: EngineKind = "custom-astar",
): Promise<RoutingResult | null> {
  // Load or build the road graph
  let graph = await loadGraphForLocation(start);
  if (!graph) {
    // Try loading by goal location
    graph = await loadGraphForLocation(goal);
  }
  if (!graph) return null;

  // Engine fallback order
  const engines: Array<{ kind: EngineKind; fn: () => Promise<Route | null> }> = [
    { kind: preferredEngine, fn: () => callEngine(preferredEngine, start, goal, graph!) },
    ...(["graphhopper", "osrm", "custom-astar"] as EngineKind[])
      .filter((e) => e !== preferredEngine)
      .map((e) => ({ kind: e, fn: () => callEngine(e, start, goal, graph!) })),
  ];

  for (const { kind, fn } of engines) {
    const route = await fn();
    if (route) {
      const directions = generateDirections(route);
      return { route, directions, engine: kind };
    }
  }

  return null;
}

async function callEngine(
  kind: EngineKind,
  start: GeoCoords,
  goal: GeoCoords,
  graph: RoadGraph,
): Promise<Route | null> {
  switch (kind) {
    case "graphhopper":
      return tryGraphHopper(start, goal, graph);
    case "osrm":
      return tryOSRM(start, goal, graph);
    case "custom-astar":
      return tryCustomAStar(start, goal, graph);
  }
}

/* ------------------------------------------------------------------ */
/*  Graph loading                                                      */
/* ------------------------------------------------------------------ */

async function loadGraphForLocation(coords: GeoCoords): Promise<RoadGraph | null> {
  // 1. Try loading from IndexedDB (cached from previous load)
  const stored = await getStoredRoadGraph(coords);
  if (stored) return stored;

  // 2. Check if coords fall within a known region
  const region = findRegionForCoords(coords);
  if (!region) return null;

  // 3. Fetch from public/road-graphs/ (network or service-worker cache)
  const graph = await loadGraphFromNetwork(region.id);
  if (graph) {
    // Cache in IndexedDB for offline use next time
    await storeRoadGraph(graph);
    return graph;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Pre-cache graphs (call on app init or when online)                 */
/* ------------------------------------------------------------------ */

export async function precacheGraphs(): Promise<void> {
  // Only pre-cache if online (graphs are fetched from public/)
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const { REGIONS } = await import("./road-graph");
  for (const region of REGIONS) {
    const existing = await getStoredRoadGraph({
      lat: (region.bounds.south + region.bounds.north) / 2,
      lng: (region.bounds.west + region.bounds.east) / 2,
    });
    if (!existing) {
      const graph = await loadGraphFromNetwork(region.id);
      if (graph) await storeRoadGraph(graph);
    }
  }
}
