export interface QuasiIdentifiers {
  age: number;
  sex: string;
  district: string;
}

export interface AnonymizedRecord {
  ageRange: string;
  sex: string;
  district: string;
}

const AGE_BANDS = [
  { label: "0-4", min: 0, max: 4 },
  { label: "5-14", min: 5, max: 14 },
  { label: "15-24", min: 15, max: 24 },
  { label: "25-34", min: 25, max: 34 },
  { label: "35-44", min: 35, max: 44 },
  { label: "45-54", min: 45, max: 54 },
  { label: "55-64", min: 55, max: 64 },
  { label: "65+", min: 65, max: 999 },
];

export function ageToBand(age: number): string {
  const band = AGE_BANDS.find((b) => age >= b.min && age <= b.max);
  return band?.label ?? "unknown";
}

export function anonymize(qi: QuasiIdentifiers): AnonymizedRecord {
  return {
    ageRange: ageToBand(qi.age),
    sex: qi.sex === "other" ? "other" : qi.sex,
    district: qi.district || "unknown",
  };
}

export function generalizeLocation(district: string): string {
  if (!district) return "unknown";
  return district;
}

export interface KMapEntry {
  key: string;
  count: number;
}

export function buildKMap(records: AnonymizedRecord[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of records) {
    const key = `${r.ageRange}|${r.sex}|${r.district}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

export function satisfiesKAnonymity(
  records: AnonymizedRecord[],
  k: number,
): { valid: boolean; violations: string[] } {
  const kmap = buildKMap(records);
  const violations: string[] = [];
  for (const [key, count] of kmap) {
    if (count < k) {
      violations.push(`${key} (count=${count}, k=${k})`);
    }
  }
  return { valid: violations.length === 0, violations };
}

export function suppressViolatingRecords(
  records: AnonymizedRecord[],
  k: number,
): AnonymizedRecord[] {
  const kmap = buildKMap(records);
  return records.filter((r) => {
    const key = `${r.ageRange}|${r.sex}|${r.district}`;
    return (kmap.get(key) || 0) >= k;
  });
}
