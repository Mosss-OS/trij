/**
 * Road Graph IndexedDB storage.
 *
 * Stores pre-downloaded road graphs in Dexie so they are available
 * offline.  Graphs are keyed by region name and searched by coordinate
 * bounds at query time.
 */

import { getDB } from "@/lib/db";
import type { RoadGraph } from "./road-graph";
import { serialiseGraph, deserialiseGraph } from "./road-graph";
import type { GeoCoords } from "@/lib/geolocation";

/* ------------------------------------------------------------------ */
/*  Dexie table interface                                              */
/* ------------------------------------------------------------------ */

interface RoadGraphRecord {
  id?: number;
  graphId: string;
  region: string;
  boundsSouth: number;
  boundsNorth: number;
  boundsWest: number;
  boundsEast: number;
  data: string; // serialised RoadGraph JSON
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Ensure table exists (called on module load)                        */
/* ------------------------------------------------------------------ */

let initialised = false;

function ensureTable() {
  if (initialised) return;
  // Schema version 11 with roadGraphs table is defined in db.ts
  initialised = true;
}

/* ------------------------------------------------------------------ */
/*  Store a road graph                                                 */
/* ------------------------------------------------------------------ */

export async function storeRoadGraph(graph: RoadGraph): Promise<void> {
  ensureTable();
  const db = getDB();
  const existing = await (db as any).roadGraphs
    .where("graphId")
    .equals(graph.id)
    .first();
  if (existing) return; // already stored

  await (db as any).roadGraphs.add({
    graphId: graph.id,
    region: graph.region,
    boundsSouth: graph.bounds.south,
    boundsNorth: graph.bounds.north,
    boundsWest: graph.bounds.west,
    boundsEast: graph.bounds.east,
    data: serialiseGraph(graph),
    createdAt: graph.createdAt,
  });
}

/* ------------------------------------------------------------------ */
/*  Retrieve a road graph by coordinates                               */
/* ------------------------------------------------------------------ */

export async function getStoredRoadGraph(coords: GeoCoords): Promise<RoadGraph | null> {
  ensureTable();
  const db = getDB();
  const records: RoadGraphRecord[] = await (db as any).roadGraphs.toArray();

  for (const rec of records) {
    if (
      coords.lat >= rec.boundsSouth &&
      coords.lat <= rec.boundsNorth &&
      coords.lng >= rec.boundsWest &&
      coords.lng <= rec.boundsEast
    ) {
      return deserialiseGraph(rec.data);
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  List all stored graphs                                             */
/* ------------------------------------------------------------------ */

export async function listStoredGraphs(): Promise<
  Array<{ id: string; region: string; bounds: RoadGraph["bounds"] }>
> {
  ensureTable();
  const db = getDB();
  const records: RoadGraphRecord[] = await (db as any).roadGraphs.toArray();
  return records.map((r) => ({
    id: r.graphId,
    region: r.region,
    bounds: {
      south: r.boundsSouth,
      north: r.boundsNorth,
      west: r.boundsWest,
      east: r.boundsEast,
    },
  }));
}

/* ------------------------------------------------------------------ */
/*  Delete a stored graph                                              */
/* ------------------------------------------------------------------ */

export async function deleteStoredGraph(graphId: string): Promise<void> {
  ensureTable();
  const db = getDB();
  await (db as any).roadGraphs.where("graphId").equals(graphId).delete();
}
