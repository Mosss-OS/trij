/**
 * Facility Ratings — let CHWs rate facilities after visiting.
 */

import { getDB } from "@/lib/db";

export interface FacilityRating {
  id?: number;
  facilityId: string;
  facilityName: string;
  tripId?: number;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  waitTimeMinutes?: number;
  staffHelpful?: boolean;
  wouldRecommend?: boolean;
  completedAt: string;
}

export async function rateFacility(rating: Omit<FacilityRating, "id">): Promise<void> {
  const db = getDB();
  await (db as any).facilityRatings.add(rating);
}

export async function getRatingsForFacility(facilityId: string): Promise<FacilityRating[]> {
  const db = getDB();
  return (db as any).facilityRatings
    .where("facilityId")
    .equals(facilityId)
    .reverse()
    .toArray();
}

export async function getAllRatings(): Promise<FacilityRating[]> {
  const db = getDB();
  return (db as any).facilityRatings
    .orderBy("completedAt")
    .reverse()
    .toArray();
}

export async function getFacilityAvgRating(facilityId: string): Promise<{
  avg: number;
  count: number;
} | null> {
  const ratings = await getRatingsForFacility(facilityId);
  if (ratings.length === 0) return null;
  const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
  return { avg: Math.round(avg * 10) / 10, count: ratings.length };
}
