/**
 * Road Graph — lightweight OSM road network for offline routing.
 *
 * The graph stores road segments as a compact adjacency list.  Each node
 * is a GPS coordinate pair; each edge is a road segment with distance,
 * road class, and turn-restriction metadata.
 *
 * Data can be loaded from:
 *  1. A pre-bundled OSM extract (recommended for production)
 *  2. A GeoJSON / CSV road-network file
 *  3. Runtime OSM Overpass API fetch (online only, for dev)
 *
 * The graph is stored in IndexedDB via the Dexie `roadGraphs` table
 * and loaded into memory on first navigation request.
 */

import type { GeoCoords } from "@/lib/geolocation";

/* ------------------------------------------------------------------ */
/*  Data model                                                        */
/* ------------------------------------------------------------------ */

export type RoadClass =
  | "motorway"
  | "trunk"
  | "primary"
  | "secondary"
  | "tertiary"
  | "residential"
  | "service"
  | "unclassified"
  | "footway"
  | "path";

export interface RoadNode {
  id: number;
  lat: number;
  lng: number;
}

export interface RoadEdge {
  from: number;
  to: number;
  distance: number; // metres
  roadClass: RoadClass;
  name?: string;
  maxSpeed?: number; // km/h
  oneway: boolean;
}

export interface RoadGraph {
  id: string;
  region: string;
  bounds: { south: number; north: number; west: number; east: number };
  nodes: RoadNode[];
  edges: RoadEdge[];
  adjacency: Map<number, RoadEdge[]>;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Speed estimates per road class (km/h)                              */
/* ------------------------------------------------------------------ */

const DEFAULT_SPEED: Record<RoadClass, number> = {
  motorway: 100,
  trunk: 80,
  primary: 60,
  secondary: 50,
  tertiary: 40,
  residential: 30,
  service: 20,
  unclassified: 30,
  footway: 5,
  path: 4,
};

/* ------------------------------------------------------------------ */
/*  Haversine                                                         */
/* ------------------------------------------------------------------ */

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ------------------------------------------------------------------ */
/*  Build adjacency list from flat arrays                              */
/* ------------------------------------------------------------------ */

export function buildAdjacency(nodes: RoadNode[], edges: RoadEdge[]): Map<number, RoadEdge[]> {
  const adj = new Map<number, RoadEdge[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    adj.get(e.from)?.push(e);
    if (!e.oneway) {
      adj.get(e.to)?.push({ ...e, from: e.to, to: e.from });
    }
  }
  return adj;
}

/* ------------------------------------------------------------------ */
/*  Find nearest node to a GPS coordinate (brute-force, fast enough   */
/*  for < 100k nodes)                                                 */
/* ------------------------------------------------------------------ */

export function findNearestNode(
  graph: RoadGraph,
  coords: GeoCoords,
): { node: RoadNode; distance: number } {
  let best = graph.nodes[0];
  let bestDist = Infinity;
  for (const n of graph.nodes) {
    const d = haversine(coords.lat, coords.lng, n.lat, n.lng);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return { node: best, distance: bestDist };
}

/* ------------------------------------------------------------------ */
/*  Serialise / deserialise (for IndexedDB storage)                    */
/* ------------------------------------------------------------------ */

export function serialiseGraph(graph: RoadGraph): string {
  const obj = {
    ...graph,
    adjacency: undefined, // rebuilt on load
    nodeArr: graph.nodes,
    edgeArr: graph.edges,
  };
  return JSON.stringify(obj);
}

export function deserialiseGraph(json: string): RoadGraph {
  const raw = JSON.parse(json);
  const nodes: RoadNode[] = raw.nodeArr ?? raw.nodes;
  const edges: RoadEdge[] = raw.edgeArr ?? raw.edges;
  return {
    id: raw.id,
    region: raw.region,
    bounds: raw.bounds,
    nodes,
    edges,
    adjacency: buildAdjacency(nodes, edges),
    createdAt: raw.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/*  Region manifest — maps region IDs to their graph file URLs          */
/* ------------------------------------------------------------------ */

export interface RegionInfo {
  id: string;
  region: string;
  bounds: RoadGraph["bounds"];
  file: string; // path relative to public/
}

export const REGIONS: RegionInfo[] = [
  { id: "lagos-ng", region: "Lagos, Nigeria", bounds: { south: 6.45, north: 6.70, west: 3.30, east: 3.50 }, file: "/road-graphs/lagos-ng.json" },
  { id: "nairobi-ke", region: "Nairobi, Kenya", bounds: { south: -1.35, north: -1.15, west: 36.75, east: 36.95 }, file: "/road-graphs/nairobi-ke.json" },
  { id: "delhi-in", region: "Delhi, India", bounds: { south: 28.50, north: 28.70, west: 77.05, east: 77.30 }, file: "/road-graphs/delhi-in.json" },
  { id: "accra-gh", region: "Accra, Ghana", bounds: { south: 5.50, north: 5.70, west: -0.35, east: 0.10 }, file: "/road-graphs/accra-gh.json" },
  { id: "dar-es-salaam-tz", region: "Dar es Salaam, Tanzania", bounds: { south: -6.90, north: -6.70, west: 39.15, east: 39.35 }, file: "/road-graphs/dar-es-salaam-tz.json" },
  { id: "johannesburg-za", region: "Johannesburg, South Africa", bounds: { south: -26.35, north: -26.15, west: 27.85, east: 28.15 }, file: "/road-graphs/johannesburg-za.json" },
  { id: "sao-paulo-br", region: "São Paulo, Brazil", bounds: { south: -23.70, north: -23.40, west: -46.80, east: -46.50 }, file: "/road-graphs/sao-paulo-br.json" },
];

/**
 * Load a road graph from the public directory (fetched, then cached in IndexedDB).
 * Returns null if the fetch fails (offline + not yet cached).
 */
export async function loadGraphFromNetwork(regionId: string): Promise<RoadGraph | null> {
  const info = REGIONS.find((r) => r.id === regionId);
  if (!info) return null;
  try {
    const res = await fetch(info.file);
    if (!res.ok) return null;
    const json = await res.text();
    return deserialiseGraph(json);
  } catch {
    return null;
  }
}

/**
 * Find which region graph covers a given coordinate.
 */
export function findRegionForCoords(coords: GeoCoords): RegionInfo | null {
  for (const r of REGIONS) {
    if (
      coords.lat >= r.bounds.south &&
      coords.lat <= r.bounds.north &&
      coords.lng >= r.bounds.west &&
      coords.lng <= r.bounds.east
    ) {
      return r;
    }
  }
  return null;
}
