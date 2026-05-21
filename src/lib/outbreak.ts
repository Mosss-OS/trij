export interface OutbreakAssessment {
  id: string;
  condition: string;
  urgency: "green" | "yellow" | "red" | null;
  created_at: string;
  location_lat: number | null;
  location_lng: number | null;
  patient_id: string;
}

/**
 * Haversine distance calculation in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Simple outbreak detection using time + location + condition clustering
 * Returns outbreaks with 3+ same-condition cases within 5km radius within 7 days
 */
export function detectOutbreaks(
  assessments: OutbreakAssessment[],
  options: {
    epsKm?: number;
    minPts?: number;
    daysWindow?: number;
  } = {}
): Outbreak[] {
  const {
    epsKm = 5, // 5km radius
    minPts = 3, // minimum 3 cases
    daysWindow = 7, // 7-day window
  } = options;

  const outbreaks: Outbreak[] = [];
  const visited = new Set<string>();
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysWindow * 24 * 60 * 60 * 1000);

  // Filter assessments within time window and with location
  const recentWithLoc = assessments
    .filter(
      (a) =>
        a.location_lat !== null &&
        a.location_lng !== null &&
        a.condition !== null &&
        new Date(a.created_at) >= cutoffDate
    )
    .map((a, index) => ({ ...a, index })); // Keep original index for tracking

  // For each unvisited point, expand cluster if density-reachable
  for (const point of recentWithLoc) {
    if (visited.has(point.id)) continue;

    // Find all points within eps distance (neighbors) with same condition
    const neighbors = recentWithLoc.filter(
      (neighbor) =>
        neighbor.condition === point.condition && // Same condition
        haversineDistance(
          point.location_lat!,
          point.location_lng!,
          neighbor.location_lat!,
          neighbor.location_lng!
        ) <= epsKm
    );

    if (neighbors.length >= minPts) {
      // Found a cluster - create outbreak
      const outbreakId = `outbreak-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Calculate centroid
      const sumLat = neighbors.reduce((sum, n) => sum + n.location_lat!, 0);
      const sumLng = neighbors.reduce((sum, n) => sum + n.location_lng!, 0);
      const centroidLat = sumLat / neighbors.length;
      const centroidLng = sumLng / neighbors.length;

      // Find max radius from centroid (for visualization)
      let maxRadius = 0;
      for (const n of neighbors) {
        const dist = haversineDistance(
          centroidLat,
          centroidLng,
          n.location_lat!,
          n.location_lng!
        );
        if (dist > maxRadius) maxRadius = dist;
      }

      const outbreak: Outbreak = {
        id: outbreakId,
        condition: point.condition!,
        cases: neighbors.length,
        startDate: new Date(
          Math.min(
            ...neighbors.map((n) => new Date(n.created_at).getTime())
          )
        ).toISOString(),
        endDate: new Date(
          Math.max(
            ...neighbors.map((n) => new Date(n.created_at).getTime())
          )
        ).toISOString(),
        centroid_lat: centroidLat,
        centroid_lng: centroidLng,
        radius_km: Math.max(maxRadius, 1), // At least 1km radius for visibility
        affected_chw_ids: [
          ...new Set(
            neighbors
              .map((n) => n.patient_id) // Actually CHW ID would come from assessment
              .filter((id): id is string => id !== null)
          ),
        ],
        patient_ids: [...new Set(neighbors.map((n) => n.id))],
      };

      outbreaks.push(outbreak);
      // Mark all points in this cluster as visited
      for (const n of neighbors) visited.add(n.id);
    } else {
      visited.add(point.id); // Mark as noise/visited
    }
  }

  return outbreaks;
}

export interface Outbreak {
  id: string;
  condition: string;
  cases: number;
  startDate: string;
  endDate: string;
  centroid_lat: number;
  centroid_lng: number;
  radius_km: number;
  affected_chw_ids: string[];
  patient_ids: string[];
}

export interface OutbreakAlert {
  id: string;
  outbreakId: string;
  triggeredAt: string;
  acknowledged: boolean;
}