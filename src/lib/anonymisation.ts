const AGE_GROUPS = [
  { min: 0, max: 4, label: "0-4" },
  { min: 5, max: 9, label: "5-9" },
  { min: 10, max: 14, label: "10-14" },
  { min: 15, max: 19, label: "15-19" },
  { min: 20, max: 29, label: "20-29" },
  { min: 30, max: 39, label: "30-39" },
  { min: 40, max: 49, label: "40-49" },
  { min: 50, max: 59, label: "50-59" },
  { min: 60, max: Infinity, label: "60+" },
];

export function generaliseAge(age?: number): string {
  if (age === undefined || age === null || age < 0) return "unknown";
  for (const group of AGE_GROUPS) {
    if (age >= group.min && age <= group.max) return group.label;
  }
  return "60+";
}

const LOCALITY_KEYWORDS = ["village", "hamlet", "settlement", "camp", "ward"];

export function generaliseLocation(location?: string): string {
  if (!location) return "unknown";
  const lower = location.toLowerCase();
  for (const kw of LOCALITY_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      return lower.slice(0, idx + kw.length);
    }
  }
  const parts = location.split(/[,;]/);
  if (parts.length >= 2) {
    return parts.slice(1).join(",").trim() || location;
  }
  return "general_region";
}

export function generaliseLatLng(lat?: number, lng?: number, precision: number = 1): { lat: string; lng: string } {
  const fmt = (v: number | undefined) =>
    v !== undefined && v !== null ? v.toFixed(precision) : "unknown";
  return { lat: fmt(lat), lng: fmt(lng) };
}

export function kAnonymityCheck<T>(cohort: T[], k: number = 5): T[] {
  if (cohort.length < k) return [];
  return cohort;
}

export function meetsThreshold(count: number, k: number = 5): boolean {
  return count >= k;
}

export function stripIdentifiers(record: Record<string, unknown>): Record<string, unknown> {
  const IDENTIFIER_KEYS = new Set([
    "identifier", "patient", "patientId", "patient_id",
    "chwUserId", "chw_user_id", "name", "fullName", "full_name",
    "phone", "email", "address", "deviceId", "device_id",
  ]);
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (IDENTIFIER_KEYS.has(key)) {
      cleaned[key] = "[REDACTED]";
    } else if (key === "patients" && typeof value === "object" && value !== null) {
      const pat = value as Record<string, unknown>;
      const redacted: Record<string, unknown> = {};
      for (const [pk, pv] of Object.entries(pat)) {
        redacted[pk] = IDENTIFIER_KEYS.has(pk) ? "[REDACTED]" : pv;
      }
      cleaned[key] = redacted;
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export interface AnonymisedAssessment {
  ageGroup: string;
  location: string;
  urgency: string;
  condition: string;
  conditionGrouped: string;
  date: string;
}

const CONDITION_GROUPS: Record<string, string> = {
  "malaria": "malaria",
  "severe malaria": "malaria",
  "pneumonia": "pneumonia",
  "bronchopneumonia": "pneumonia",
  "bronchitis": "respiratory_infection",
  "upper respiratory tract infection": "respiratory_infection",
  "uti": "uti",
  "urinary tract infection": "uti",
  "diarrhoea": "diarrhoea",
  "diarrhea": "diarrhoea",
  "dysentery": "diarrhoea",
  "cellulitis": "skin_infection",
  "abscess": "skin_infection",
  "wound infection": "skin_infection",
  "impetigo": "skin_infection",
  "scabies": "skin_infection",
  "fungal infection": "skin_infection",
  "dermatitis": "skin_condition",
  "eczema": "skin_condition",
  "psoriasis": "skin_condition",
  "rash": "skin_condition",
  "urticaria": "skin_condition",
  "burn": "injury",
  "fracture": "injury",
  "laceration": "injury",
  "wound": "injury",
  "sprain": "injury",
  "strain": "injury",
  "hypertension": "cardiovascular",
  "heart failure": "cardiovascular",
  "anaemia": "anaemia",
  "anemia": "anaemia",
  "malnutrition": "malnutrition",
  "sam": "malnutrition",
  "mam": "malnutrition",
  "measles": "vaccine_preventable",
  "whooping cough": "vaccine_preventable",
  "pertussis": "vaccine_preventable",
  "tetanus": "vaccine_preventable",
  "diphtheria": "vaccine_preventable",
  "tb": "tuberculosis",
  "tuberculosis": "tuberculosis",
  "hiv": "hiv",
  "aids": "hiv",
  "diabetes": "diabetes",
  "type 2 diabetes": "diabetes",
  "type 1 diabetes": "diabetes",
  "arthritis": "musculoskeletal",
  "osteoarthritis": "musculoskeletal",
  "conjunctivitis": "eye_infection",
  "eye infection": "eye_infection",
  "otitis media": "ear_infection",
  "ear infection": "ear_infection",
  "covid-19": "respiratory_infection",
  "covid": "respiratory_infection",
  "influenza": "respiratory_infection",
  "flu": "respiratory_infection",
  "typhoid": "febrile_illness",
  "typhoid fever": "febrile_illness",
  "dengue": "febrile_illness",
  "dengue fever": "febrile_illness",
  "rickettsia": "febrile_illness",
  "leptospirosis": "febrile_illness",
  "unknown": "other",
};

export function groupCondition(condition: string | null | undefined): string {
  if (!condition) return "other";
  const key = condition.toLowerCase().trim();
  return CONDITION_GROUPS[key] || "other";
}

export function anonymiseAssessments(
  assessments: { condition?: string | null; urgency?: string | null; created_at: string; patients?: { identifier?: string } | null; patient_id?: string }[],
): AnonymisedAssessment[] {
  return assessments.map((a) => ({
    ageGroup: "general",
    location: "general_region",
    urgency: a.urgency || "unknown",
    condition: a.condition || "unknown",
    conditionGrouped: groupCondition(a.condition),
    date: a.created_at?.slice(0, 10) || "unknown",
  }));
}

export function buildAnonymisedCsvRows(
  assessments: AnonymisedAssessment[],
): string[][] {
  const withCounts = aggregateCounts(assessments);
  return withCounts
    .filter((row) => meetsThreshold(row.count))
    .map((row) => [
      row.conditionGrouped,
      row.urgency,
      row.ageGroup,
      row.location,
      String(row.count),
      row.date,
    ]);
}

export function aggregateCounts(assessments: AnonymisedAssessment[]): (AnonymisedAssessment & { count: number })[] {
  const map = new Map<string, AnonymisedAssessment & { count: number }>();
  for (const a of assessments) {
    const key = `${a.date}|${a.conditionGrouped}|${a.urgency}|${a.ageGroup}|${a.location}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { ...a, count: 1 });
    }
  }
  return Array.from(map.values());
}
