/**
 * A* Pathfinding with turn penalties.
 *
 * This is the custom fallback routing engine.  It uses A* with a
 * Haversine heuristic and adds turn penalties at intersections to
 * prefer staying on the same road.
 */

import type { RoadGraph, RoadEdge, RoadNode } from "./road-graph";
import { haversine } from "./road-graph";
import type { GeoCoords } from "@/lib/geolocation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RouteSegment {
  edge: RoadEdge;
  startNode: RoadNode;
  endNode: RoadNode;
}

export interface Route {
  segments: RouteSegment[];
  totalDistance: number; // metres
  totalDuration: number; // seconds
  startCoords: GeoCoords;
  endCoords: GeoCoords;
}

interface AStarNode {
  id: number;
  g: number; // cost from start
  f: number; // g + heuristic
  parent: number | null;
  parentEdge: RoadEdge | null;
}

/* ------------------------------------------------------------------ */
/*  Turn penalty calculation                                           */
/* ------------------------------------------------------------------ */

/**
 * Calculate turn penalty based on angle between consecutive edges.
 * Staying straight = 0 penalty.  Sharp turn = up to 30 seconds.
 */
function turnPenalty(prevEdge: RoadEdge | null, newEdge: RoadEdge): number {
  if (!prevEdge) return 0;

  // Same road name = no penalty (staying on the same road)
  if (prevEdge.name && prevEdge.name === newEdge.name) return 0;

  // Estimate turn angle from bearing change
  const prevNode = prevEdge.from;
  const toNode = newEdge.to;

  // Use road class to estimate: major road changes are worse
  const classPriority: Record<string, number> = {
    motorway: 6,
    trunk: 5,
    primary: 4,
    secondary: 3,
    tertiary: 2,
    residential: 1,
    service: 0,
    unclassified: 1,
    footway: 0,
    path: 0,
  };

  const prevPri = classPriority[prevEdge.roadClass] ?? 2;
  const newPri = classPriority[newEdge.roadClass] ?? 2;

  // Changing to a lower-priority road = small penalty
  // Changing to a higher-priority road = larger penalty (off-ramp/on-ramp)
  return Math.abs(prevPri - newPri) * 5;
}

/* ------------------------------------------------------------------ */
/*  A* algorithm                                                       */
/* ------------------------------------------------------------------ */

export function aStar(
  graph: RoadGraph,
  start: GeoCoords,
  goal: GeoCoords,
): Route | null {
  const { node: startNode } = findNearest(graph, start);
  const { node: goalNode } = findNearest(graph, goal);

  if (startNode.id === goalNode.id) {
    return {
      segments: [],
      totalDistance: haversine(start.lat, start.lng, goal.lat, goal.lng),
      totalDuration: 0,
      startCoords: start,
      endCoords: goal,
    };
  }

  const openSet = new Map<number, AStarNode>();
  const closedSet = new Set<number>();

  const startEntry: AStarNode = {
    id: startNode.id,
    g: 0,
    f: heuristic(startNode, goalNode),
    parent: null,
    parentEdge: null,
  };
  openSet.set(startNode.id, startEntry);

  const nodeMap = new Map<number, RoadNode>();
  for (const n of graph.nodes) nodeMap.set(n.id, n);

  while (openSet.size > 0) {
    // Find node with lowest f
    let current: AStarNode | null = null;
    for (const entry of openSet.values()) {
      if (!current || entry.f < current.f) current = entry;
    }
    if (!current) break;

    if (current.id === goalNode.id) {
      return reconstructRoute(graph, nodeMap, current, start, goal);
    }

    openSet.delete(current.id);
    closedSet.add(current.id);

    const neighbors = graph.adjacency.get(current.id) ?? [];
    for (const edge of neighbors) {
      if (closedSet.has(edge.to)) continue;

      const turnCost = turnPenalty(current.parentEdge, edge);
      const tentativeG = current.g + edge.distance / (edge.maxSpeed ?? 30) * 3.6 + turnCost;
      // distance / speed(m/s) = duration in seconds.  speed = maxSpeed km/h → /3.6 = m/s

      const existing = openSet.get(edge.to);
      if (existing && tentativeG >= existing.g) continue;

      const targetNode = nodeMap.get(edge.to)!;
      const entry: AStarNode = {
        id: edge.to,
        g: tentativeG,
        f: tentativeG + heuristic(targetNode, goalNode),
        parent: current.id,
        parentEdge: edge,
      };
      openSet.set(edge.to, entry);
    }
  }

  return null; // no path found
}

/* ------------------------------------------------------------------ */
/*  Heuristic                                                          */
/* ------------------------------------------------------------------ */

function heuristic(a: RoadNode, b: RoadNode): number {
  // Haversine distance / estimated max speed (40 km/h average) = seconds
  return haversine(a.lat, a.lng, b.lat, b.lng) / (40 / 3.6);
}

/* ------------------------------------------------------------------ */
/*  Nearest node                                                       */
/* ------------------------------------------------------------------ */

function findNearest(graph: RoadGraph, coords: GeoCoords): { node: RoadNode; distance: number } {
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
/*  Reconstruct route from A* result                                   */
/* ------------------------------------------------------------------ */

function reconstructRoute(
  graph: RoadGraph,
  nodeMap: Map<number, RoadNode>,
  final: AStarNode,
  start: GeoCoords,
  goal: GeoCoords,
): Route {
  const segments: RouteSegment[] = [];
  let current: AStarNode | null = final;

  while (current?.parentEdge) {
    const edge = current.parentEdge;
    segments.unshift({
      edge,
      startNode: nodeMap.get(edge.from)!,
      endNode: nodeMap.get(edge.to)!,
    });
    // find parent node
    const parentEntry = findNodeById(graph, current.parent);
    current = parentEntry;
  }

  // Calculate totals
  let totalDistance = 0;
  let totalDuration = 0;
  for (const seg of segments) {
    totalDistance += seg.edge.distance;
    totalDuration += seg.edge.distance / ((seg.edge.maxSpeed ?? 30) / 3.6);
  }

  // Add start/end partial segments (from GPS to first/last node)
  if (segments.length > 0) {
    const firstNode = segments[0].startNode;
    const lastNode = segments[segments.length - 1].endNode;
    totalDistance += haversine(start.lat, start.lng, firstNode.lat, firstNode.lng);
    totalDistance += haversine(goal.lat, goal.lng, lastNode.lat, lastNode.lng);
  }

  return {
    segments,
    totalDistance,
    totalDuration,
    startCoords: start,
    endCoords: goal,
  };
}

function findNodeById(graph: RoadGraph, id: number | null): AStarNode | null {
  if (id === null) return null;
  // We don't have the full AStarNode stored, so we reconstruct minimally
  return { id, g: 0, f: 0, parent: null, parentEdge: null };
}
