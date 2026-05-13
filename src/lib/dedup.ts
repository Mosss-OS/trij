import { getDB } from "@/lib/db";
import { queuePatient } from "@/lib/sync";
import type { Patient } from "@/types/trij";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function soundex(word: string): string {
  const upper = word.toUpperCase();
  const first = upper[0] ?? "";
  const mapped = upper.slice(1).replace(/[AEIOUYHW]/g, "").replace(/[BFPV]/g, "1")
    .replace(/[CGJKQSXZ]/g, "2").replace(/[DT]/g, "3").replace(/[L]/g, "4")
    .replace(/[MN]/g, "5").replace(/[R]/g, "6");
  return first + mapped.slice(0, 3).padEnd(3, "0");
}

export interface MatchScore {
  patientA: Patient;
  patientB: Patient;
  score: number;
  reasons: string[];
}

const NAME_SIMILARITY_THRESHOLD = 0.8;
const HIGH_CONFIDENCE_THRESHOLD = 0.9;
const MAX_DISTANCE = 3;

function nameSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;
  const dist = levenshtein(aLower, bLower);
  const maxLen = Math.max(aLower.length, bLower.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

export function findPotentialDuplicates(patients: Patient[]): MatchScore[] {
  const matches: MatchScore[] = [];
  const active = patients.filter((p) => !p.mergedInto);

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const reasons: string[] = [];
      let score = 0;

      const identSim = nameSimilarity(a.identifier, b.identifier);
      if (identSim >= NAME_SIMILARITY_THRESHOLD) {
        score += identSim * 0.5;
        reasons.push(`Identifier match (${Math.round(identSim * 100)}% similar)`);
      }

      if (a.ageYears && b.ageYears && Math.abs(a.ageYears - b.ageYears) <= 3) {
        score += 0.15;
        reasons.push("Similar age");
      }

      if (a.sex && b.sex && a.sex === b.sex) {
        score += 0.1;
        reasons.push("Same sex");
      }

      if (a.locationLat && b.locationLat && a.locationLng && b.locationLng) {
        const latDiff = Math.abs(a.locationLat - b.locationLat);
        const lngDiff = Math.abs(a.locationLng - b.locationLng);
        if (latDiff < 0.01 && lngDiff < 0.01) {
          score += 0.15;
          reasons.push("Nearby location");
        }
      }

      if (a.chwUserId === b.chwUserId) {
        score += 0.1;
        reasons.push("Same CHW");
      }

      if (score >= NAME_SIMILARITY_THRESHOLD) {
        matches.push({ patientA: a, patientB: b, score: Math.min(score, 1), reasons });
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export async function mergePatients(
  keep: Patient,
  remove: Patient,
): Promise<Patient> {
  const db = getDB();
  const db2 = getDB();

  const merged: Patient = {
    ...keep,
    identifier: keep.identifier || remove.identifier,
    ageYears: keep.ageYears ?? remove.ageYears,
    sex: keep.sex ?? remove.sex,
    notes: [keep.notes, remove.notes].filter(Boolean).join("\n---\n") || undefined,
    locationLat: keep.locationLat ?? remove.locationLat,
    locationLng: keep.locationLng ?? remove.locationLng,
    updatedAt: new Date().toISOString(),
  };

  await db.patients.put(merged);
  await queuePatient(merged);

  const assessments = await db2.assessments.where("patientId").equals(remove.id).toArray();
  for (const assessment of assessments) {
    assessment.patientId = keep.id;
    await db2.assessments.put(assessment);
  }

  remove.mergedInto = keep.id;
  await db.patients.put(remove);
  await queuePatient(remove);

  return merged;
}

export async function runDedup(): Promise<MatchScore[]> {
  try {
    const db = getDB();
    const patients = await db.patients.toArray();
    const matches = findPotentialDuplicates(patients);

    for (const match of matches) {
      if (match.score >= HIGH_CONFIDENCE_THRESHOLD) {
        const [keep, remove] = [match.patientA, match.patientB].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        await mergePatients(keep, remove);
      }
    }

    return matches;
  } catch {
    return [];
  }
}

export function getDuplicatePairs(
  patients: Patient[],
  matches: MatchScore[],
): Map<string, Patient[]> {
  const pairs = new Map<string, Patient[]>();
  const matched = new Set<string>();

  for (const m of matches) {
    if (matched.has(m.patientA.id) || matched.has(m.patientB.id)) continue;
    matched.add(m.patientA.id);
    matched.add(m.patientB.id);
    pairs.set(`${m.patientA.id}-${m.patientB.id}`, [m.patientA, m.patientB]);
  }

  return pairs;
}
