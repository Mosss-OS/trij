import type { Patient, Assessment, VitalSigns } from "@/types/trij";

export function dbRowToAssessment(row: Record<string, unknown>): Assessment {
  const vitals = row.vitals as VitalSigns | null | undefined;
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    chwUserId: row.chw_user_id as string,
    images: (row.images as string[]) ?? [],
    presentationType: row.presentation_type as Assessment["presentationType"],
    description: row.description as string | undefined,
    vitalSigns: vitals ?? undefined,
    condition: row.condition as string | undefined,
    icd10Code: row.icd10_code as string | undefined,
    confidence: row.confidence as Assessment["confidence"],
    urgency: row.urgency as Assessment["urgency"],
    possibleConditions: row.possible_conditions as Assessment["possibleConditions"],
    keyVisualFeatures: row.key_visual_features as Assessment["keyVisualFeatures"],
    recommendation: row.recommendation as string | undefined,
    voiceLog: row.voice_log as string | undefined,
    language: (row.language as string) ?? "en",
    referralStatus: (row.referral_status as Assessment["referralStatus"]) ?? "none",
    referralAdvised: row.referral_advised as boolean | undefined,
    referralFeedback: row.referral_feedback as Assessment["referralFeedback"],
    followUpQuestions: row.follow_up_questions as Assessment["followUpQuestions"],
    createdAt: row.created_at as string,
    syncedAt: row.synced_at as string | undefined,
    version: (row.version as number) ?? 1,
  };
}

export function dbRowToPatient(row: Record<string, unknown>): Patient {
  return {
    id: row.id as string,
    chwUserId: row.chw_user_id as string,
    identifier: row.identifier as string,
    ageYears: row.age_years as number | undefined,
    sex: row.sex as "M" | "F" | "other" | undefined,
    notes: row.notes as string | undefined,
    locationLat: row.location_lat as number | undefined,
    locationLng: row.location_lng as number | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    mergedInto: row.merged_into as string | undefined,
    version: (row.version as number) ?? 1,
  };
}

export function operationOutcome(severity: string, code: string, text: string, status: number): Response {
  return new Response(
    JSON.stringify({
      resourceType: "OperationOutcome",
      issue: [{ severity, code, details: { text } }],
    }),
    { status, headers: { "Content-Type": "application/fhir+json" } },
  );
}

export function searchBundle<T>(entries: { fullUrl: string; resource: T }[]): string {
  return JSON.stringify({
    resourceType: "Bundle",
    type: "searchset",
    total: entries.length,
    entry: entries,
  });
}
