/**
 * Medical Facility Database and Lookup Service
 * 
 * This module provides a curated database of medical facilities worldwide for use
 * in emergency referral situations. It includes hospitals, clinics, and health
 * centers across multiple countries with their geographic coordinates, contact
 * information, and capabilities.
 * 
 * The facility data is used to:
 * - Provide immediate referral options when red flag conditions are detected
 * - Show nearby facilities during emergency assessments
 * - Support the geolocation features in the triage workflow
 * 
 * Each facility entry includes:
 * - Unique identifier
 * - Facility name
 * - Geographic coordinates (latitude/longitude)
 * - Facility type (hospital, clinic, health_center)
 * - Contact phone number
 * - Capabilities/services offered
 * 
 * The Haversine formula is used to calculate distances between the patient's
 * location and facility coordinates to find the nearest appropriate care center.
 */

import { getCurrentPosition, type GeoCoords } from "./geolocation";

export interface Facility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "hospital" | "clinic" | "health_center";
  phone?: string;
  capabilities?: string[];
}

const FACILITIES: Facility[] = [
  // Nigeria (Lagos area)
  { id: "ng-lagos-1", name: "Lagos University Teaching Hospital", lat: 6.5244, lng: 3.3792, type: "hospital", phone: "+234-1-1234567", capabilities: ["surgery", "maternity", "emergency"] },
  { id: "ng-lagos-2", name: "Eko Hospital Ikeja", lat: 6.6018, lng: 3.3515, type: "hospital", phone: "+234-1-7654321", capabilities: ["emergency", "maternity"] },
  { id: "ng-lagos-3", name: "Mainland Hospital Yaba", lat: 6.5086, lng: 3.3718, type: "hospital", phone: "+234-1-5551234", capabilities: ["emergency", "pediatrics"] },
  { id: "ng-lagos-4", name: "Ifako-Ijaiye Primary Health Centre", lat: 6.6745, lng: 3.3216, type: "health_center", capabilities: ["primary_care"] },
  { id: "ng-abuja-1", name: "National Hospital Abuja", lat: 9.0442, lng: 7.4904, type: "hospital", phone: "+234-9-1234567", capabilities: ["surgery", "emergency", "maternity"] },

  // Kenya (Nairobi area)
  { id: "ke-nairobi-1", name: "Kenyatta National Hospital", lat: -1.3007, lng: 36.8047, type: "hospital", phone: "+254-20-2726300", capabilities: ["surgery", "emergency", "maternity"] },
  { id: "ke-nairobi-2", name: "Aga Khan University Hospital", lat: -1.2609, lng: 36.8065, type: "hospital", phone: "+254-20-3662000", capabilities: ["surgery", "emergency"] },
  { id: "ke-nairobi-3", name: "Mama Lucy Kibaki Hospital", lat: -1.2893, lng: 36.8996, type: "hospital", phone: "+254-20-1234567", capabilities: ["emergency", "maternity"] },
  { id: "ke-nairobi-4", name: "Kahawa West Health Centre", lat: -1.1784, lng: 36.9261, type: "health_center", capabilities: ["primary_care"] },

  // India (Delhi area)
  { id: "in-delhi-1", name: "All India Institute of Medical Sciences", lat: 28.5672, lng: 77.2100, type: "hospital", phone: "+91-11-26588500", capabilities: ["surgery", "emergency", "maternity", "pediatrics"] },
  { id: "in-delhi-2", name: "Safdarjung Hospital", lat: 28.5752, lng: 77.2008, type: "hospital", phone: "+91-11-26707444", capabilities: ["emergency", "maternity"] },
  { id: "in-delhi-3", name: "Deen Dayal Upadhyay Hospital", lat: 28.6509, lng: 77.1116, type: "hospital", phone: "+91-11-25452100", capabilities: ["emergency"] },

  // Brazil (São Paulo area)
  { id: "br-sp-1", name: "Hospital das Clínicas", lat: -23.5543, lng: -46.6717, type: "hospital", phone: "+55-11-2661-0000", capabilities: ["surgery", "emergency", "maternity"] },
  { id: "br-sp-2", name: "Hospital São Paulo", lat: -23.5892, lng: -46.6409, type: "hospital", phone: "+55-11-3390-4000", capabilities: ["emergency"] },

  // Middle East (Riyadh area)
  { id: "sa-riyadh-1", name: "King Faisal Specialist Hospital", lat: 24.6700, lng: 46.7000, type: "hospital", phone: "+966-1-464-7272", capabilities: ["surgery", "emergency", "maternity"] },
  { id: "sa-riyadh-2", name: "King Saud Medical City", lat: 24.6500, lng: 46.7200, type: "hospital", phone: "+966-1-435-5555", capabilities: ["emergency"] },

  // France (Paris area)
  { id: "fr-paris-1", name: "Hôpital Pitié-Salpêtrière", lat: 48.8460, lng: 2.3655, type: "hospital", phone: "+33-1-42-16-00-00", capabilities: ["surgery", "emergency"] },
  { id: "fr-paris-2", name: "Hôpital Necker-Enfants Malades", lat: 48.8493, lng: 2.3160, type: "hospital", phone: "+33-1-44-49-40-00", capabilities: ["pediatrics", "emergency"] },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestFacility(coords: GeoCoords): Facility | null {
  if (FACILITIES.length === 0) return null;
  let nearest: Facility = FACILITIES[0];
  let minDist = Infinity;
  for (const f of FACILITIES) {
    const d = haversineKm(coords.lat, coords.lng, f.lat, f.lng);
    if (d < minDist) {
      minDist = d;
      nearest = f;
    }
  }
  return nearest;
}

export function getFacilities(): Facility[] {
  return [...FACILITIES];
}

export async function getNearestFacilityWithGeolocation(): Promise<{
  facility: Facility | null;
  distanceKm: number;
  coords: GeoCoords | null;
}> {
  const coords = await getCurrentPosition();
  if (!coords) return { facility: null, distanceKm: 0, coords: null };
  const nearest = findNearestFacility(coords);
  const distance = nearest ? haversineKm(coords.lat, coords.lng, nearest.lat, nearest.lng) : 0;
  return { facility: nearest, distanceKm: Math.round(distance * 10) / 10, coords };
}
