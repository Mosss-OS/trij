/**
 * Navigation History — tracks completed navigation trips for CHW analytics.
 */

import { getDB } from "@/lib/db";
import type { Facility } from "@/lib/facilities";

export interface NavigationTrip {
  id?: number;
  facilityId: string;
  facilityName: string;
  patientId?: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  distanceMetres: number;
  durationSeconds: number;
  engine: string;
  region: string;
  completedAt: string;
}

export async function logNavigationTrip(trip: Omit<NavigationTrip, "id">): Promise<void> {
  const db = getDB();
  await (db as any).navigationHistory.add(trip);
}

export async function getNavigationHistory(limit = 50): Promise<NavigationTrip[]> {
  const db = getDB();
  return (db as any).navigationHistory
    .orderBy("completedAt")
    .reverse()
    .limit(limit)
    .toArray();
}

export async function getTripsForFacility(facilityId: string): Promise<NavigationTrip[]> {
  const db = getDB();
  return (db as any).navigationHistory
    .where("facilityId")
    .equals(facilityId)
    .reverse()
    .toArray();
}

export async function getTripStats(): Promise<{
  totalTrips: number;
  totalDistanceKm: number;
  totalDurationHours: number;
  avgDistanceKm: number;
  facilityCounts: Record<string, number>;
}> {
  const db = getDB();
  const trips = await (db as any).navigationHistory.toArray();
  const totalDistance = trips.reduce((s: number, t: NavigationTrip) => s + t.distanceMetres, 0);
  const totalDuration = trips.reduce((s: number, t: NavigationTrip) => s + t.durationSeconds, 0);
  const facilityCounts: Record<string, number> = {};
  for (const t of trips) {
    facilityCounts[t.facilityName] = (facilityCounts[t.facilityName] || 0) + 1;
  }
  return {
    totalTrips: trips.length,
    totalDistanceKm: Math.round(totalDistance / 1000 * 10) / 10,
    totalDurationHours: Math.round(totalDuration / 3600 * 10) / 10,
    avgDistanceKm: trips.length > 0 ? Math.round(totalDistance / trips.length / 1000 * 10) / 10 : 0,
    facilityCounts,
  };
}

export async function deleteTrip(id: number): Promise<void> {
  const db = getDB();
  await (db as any).navigationHistory.delete(id);
}
