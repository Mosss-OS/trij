import { getDB } from "./db";
import { supabase } from "@/integrations/supabase/client";
import type { Patient, Assessment, SyncQueueItem } from "@/types/trij";
import { registerBackgroundSync } from "./sw-register";

export interface SyncProgressItem {
  id: number;
  table: string;
  recordId: string;
  status: "pending" | "syncing" | "ok" | "failed";
  error?: string;
}

export type SyncProgressCallback = (item: SyncProgressItem) => void;

export async function queuePatient(patient: Patient) {
  const db = getDB();
  await db.patients.put(patient);
  await db.syncQueue.add({
    table: "patients",
    action: "insert",
    recordId: patient.id,
    payload: patient,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}

export async function queueAssessment(a: Assessment) {
  const db = getDB();
  await db.assessments.put(a);
  await db.syncQueue.add({
    table: "assessments",
    action: "insert",
    recordId: a.id,
    payload: a,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}

export async function pendingCount(): Promise<number> {
  return getDB().syncQueue.count();
}

export async function processSyncQueue(
  onProgress?: SyncProgressCallback,
): Promise<{ ok: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: 0, failed: 0 };
  const db = getDB();
  const items = await db.syncQueue.toArray();
  let ok = 0,
    failed = 0;
  for (const item of items) {
    const progress: SyncProgressItem = {
      id: item.id!,
      table: item.table,
      recordId: item.recordId,
      status: "syncing",
    };
    onProgress?.(progress);
    try {
      if (item.table === "patients") {
        const p = item.payload as Patient;
        const { error } = await supabase.from("patients").upsert({
          id: p.id,
          chw_user_id: p.chwUserId,
          identifier: p.identifier,
          age_years: p.ageYears ?? null,
          sex: p.sex ?? null,
          location_lat: p.locationLat ?? null,
          location_lng: p.locationLng ?? null,
          notes: p.notes ?? null,
          created_at: p.createdAt,
        });
        if (error) throw error;
        await db.patients.update(p.id, { syncedAt: new Date().toISOString() });
      } else if (item.table === "assessments") {
        const a = item.payload as Assessment;
        const { error } = await supabase.from("assessments").upsert({
          id: a.id,
          patient_id: a.patientId,
          chw_user_id: a.chwUserId,
          images: a.images,
          condition: a.condition ?? null,
          confidence: a.confidence ?? null,
          urgency: a.urgency ?? null,
          possible_conditions: (a.possibleConditions ?? null) as never,
          key_visual_features: (a.keyVisualFeatures ?? null) as never,
          recommendation: a.recommendation ?? null,
          voice_log: a.voiceLog ?? null,
          language: a.language,
          referral_status: a.referralStatus,
          referral_advised: a.referralAdvised ?? false,
          follow_up_questions: (a.followUpQuestions ?? null) as never,
          created_at: a.createdAt,
          synced_at: new Date().toISOString(),
        });
        if (error) throw error;
        await db.assessments.update(a.id, { syncedAt: new Date().toISOString() });
      }
      await db.syncQueue.delete(item.id!);
      ok++;
      onProgress?.({ ...progress, status: "ok" });
    } catch (err) {
      failed++;
      await db.syncQueue.update(item.id!, {
        attempts: (item.attempts ?? 0) + 1,
        lastError: (err as Error).message,
      });
      onProgress?.({ ...progress, status: "failed", error: (err as Error).message });
    }
  }
  return { ok, failed };
}
