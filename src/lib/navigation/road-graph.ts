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
/*  Minimal sample graphs for each supported region (for offline use)  */
/*  In production these would be replaced by full OSM extracts.        */
/* ------------------------------------------------------------------ */

const SAMPLE_NODES_LAGOS: RoadNode[] = [
  { id: 1, lat: 6.5244, lng: 3.3792 }, // LUTH
  { id: 2, lat: 6.5300, lng: 3.3850 },
  { id: 3, lat: 6.5350, lng: 3.3900 },
  { id: 4, lat: 6.5400, lng: 3.3950 },
  { id: 5, lat: 6.5450, lng: 3.4000 },
  { id: 6, lat: 6.5100, lng: 3.3700 },
  { id: 7, lat: 6.5150, lng: 3.3650 },
  { id: 8, lat: 6.5200, lng: 3.3600 },
  { id: 9, lat: 6.6018, lng: 3.3515 }, // Eko Hospital
  { id: 10, lat: 6.5086, lng: 3.3718 }, // Mainland Hospital
  { id: 11, lat: 6.5600, lng: 3.4100 },
  { id: 12, lat: 6.5700, lng: 3.4200 },
  { id: 13, lat: 6.5800, lng: 3.4300 },
  { id: 14, lat: 6.5900, lng: 3.4400 },
  { id: 15, lat: 6.6745, lng: 3.3216 }, // Ifako-Ijaiye PHC
];

const SAMPLE_EDGES_LAGOS: RoadEdge[] = [
  { from: 1, to: 2, distance: 850, roadClass: "primary", name: "Idi-Araba Rd", oneway: false },
  { from: 2, to: 3, distance: 780, roadClass: "primary", name: "Idi-Araba Rd", oneway: false },
  { from: 3, to: 4, distance: 720, roadClass: "primary", oneway: false },
  { from: 4, to: 5, distance: 690, roadClass: "secondary", oneway: false },
  { from: 1, to: 6, distance: 1700, roadClass: "tertiary", oneway: false },
  { from: 6, to: 7, distance: 680, roadClass: "tertiary", oneway: false },
  { from: 7, to: 8, distance: 700, roadClass: "tertiary", oneway: false },
  { from: 5, to: 11, distance: 2200, roadClass: "secondary", oneway: false },
  { from: 11, to: 12, distance: 1400, roadClass: "secondary", oneway: false },
  { from: 12, to: 13, distance: 1350, roadClass: "secondary", oneway: false },
  { from: 13, to: 14, distance: 1300, roadClass: "secondary", oneway: false },
  { from: 14, to: 9, distance: 1800, roadClass: "primary", name: "Agege Motor Rd", oneway: false },
  { from: 1, to: 10, distance: 1900, roadClass: "tertiary", name: "Herbert Macaulay Way", oneway: false },
  { from: 8, to: 9, distance: 8500, roadClass: "trunk", name: "Ikorodu Rd", oneway: false },
  { from: 15, to: 3, distance: 6200, roadClass: "residential", oneway: false },
  { from: 10, to: 6, distance: 1100, roadClass: "tertiary", oneway: false },
];

const SAMPLE_NODES_NAIROBI: RoadNode[] = [
  { id: 1, lat: -1.3007, lng: 36.8047 }, // KNH
  { id: 2, lat: -1.2950, lng: 36.8100 },
  { id: 3, lat: -1.2900, lng: 36.8150 },
  { id: 4, lat: -1.2850, lng: 36.8200 },
  { id: 5, lat: -1.2609, lng: 36.8065 }, // Aga Khan
  { id: 6, lat: -1.2893, lng: 36.8996 }, // Mama Lucy
  { id: 7, lat: -1.2750, lng: 36.8300 },
  { id: 8, lat: -1.2700, lng: 36.8400 },
  { id: 9, lat: -1.2650, lng: 36.8500 },
  { id: 10, lat: -1.1784, lng: 36.9261 }, // Kahawa West
];

const SAMPLE_EDGES_NAIROBI: RoadEdge[] = [
  { from: 1, to: 2, distance: 750, roadClass: "primary", name: "Ngong Rd", oneway: false },
  { from: 2, to: 3, distance: 680, roadClass: "primary", oneway: false },
  { from: 3, to: 4, distance: 700, roadClass: "secondary", oneway: false },
  { from: 4, to: 7, distance: 1200, roadClass: "secondary", oneway: false },
  { from: 7, to: 8, distance: 1400, roadClass: "secondary", oneway: false },
  { from: 8, to: 9, distance: 1350, roadClass: "secondary", oneway: false },
  { from: 9, to: 5, distance: 2800, roadClass: "primary", name: "Kenyatta Ave", oneway: false },
  { from: 4, to: 6, distance: 8200, roadClass: "trunk", name: "Outer Ring Rd", oneway: false },
  { from: 9, to: 10, distance: 11000, roadClass: "trunk", name: "Thika Rd", oneway: false },
  { from: 1, to: 5, distance: 4500, roadClass: "primary", oneway: false },
];

const SAMPLE_NODES_DELHI: RoadNode[] = [
  { id: 1, lat: 28.5672, lng: 77.2100 }, // AIIMS
  { id: 2, lat: 28.5752, lng: 77.2008 }, // Safdarjung
  { id: 3, lat: 28.6509, lng: 77.1116 }, // DDU
  { id: 4, lat: 28.5800, lng: 77.2200 },
  { id: 5, lat: 28.5900, lng: 77.2300 },
  { id: 6, lat: 28.6000, lng: 77.2400 },
];

const SAMPLE_EDGES_DELHI: RoadEdge[] = [
  { from: 1, to: 2, distance: 1100, roadClass: "primary", name: "Safdarjung Rd", oneway: false },
  { from: 2, to: 3, distance: 12000, roadClass: "trunk", name: "Outer Ring Rd", oneway: false },
  { from: 1, to: 4, distance: 1400, roadClass: "secondary", oneway: false },
  { from: 4, to: 5, distance: 1500, roadClass: "secondary", oneway: false },
  { from: 5, to: 6, distance: 1450, roadClass: "secondary", oneway: false },
  { from: 6, to: 3, distance: 15000, roadClass: "trunk", oneway: false },
];

function makeGraph(
  id: string,
  region: string,
  bounds: RoadGraph["bounds"],
  nodes: RoadNode[],
  edges: RoadEdge[],
): RoadGraph {
  return {
    id,
    region,
    bounds,
    nodes,
    edges,
    adjacency: buildAdjacency(nodes, edges),
    createdAt: new Date().toISOString(),
  };
}

export const SAMPLE_GRAPHS: RoadGraph[] = [
  makeGraph("lagos-ng", "Lagos, Nigeria", { south: 6.45, north: 6.70, west: 3.30, east: 3.50 }, SAMPLE_NODES_LAGOS, SAMPLE_EDGES_LAGOS),
  makeGraph("nairobi-ke", "Nairobi, Kenya", { south: -1.35, north: -1.15, west: 36.75, east: 36.95 }, SAMPLE_NODES_NAIROBI, SAMPLE_EDGES_NAIROBI),
  makeGraph("delhi-in", "Delhi, India", { south: 28.50, north: 28.70, west: 77.05, east: 77.30 }, SAMPLE_NODES_DELHI, SAMPLE_EDGES_DELHI),
];
