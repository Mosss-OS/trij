import { getDB } from "./db";
import { supabase } from "@/integrations/supabase/client";
import type { Patient, Assessment, SyncQueueItem, SyncConflict } from "@/types/trij";
import { registerBackgroundSync } from "./sw-register";

export interface SyncProgressItem {
  id: number;
  table: string;
  recordId: string;
  status: "pending" | "syncing" | "ok" | "failed";
  error?: string;
}

export type SyncProgressCallback = (item: SyncProgressItem) => void;

function nextVersion(v?: number): number {
  return (v ?? 0) + 1;
}

export async function queuePatient(patient: Patient) {
  const db = getDB();
  const existing = await db.patients.get(patient.id);
  const updated = { ...patient, version: nextVersion(existing?.version) };
  await db.patients.put(updated);
  await db.syncQueue.add({
    table: "patients",
    action: "insert",
    recordId: patient.id,
    payload: updated,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}

export async function queueAssessment(a: Assessment) {
  const db = getDB();
  const existing = await db.assessments.get(a.id);
  const updated = { ...a, version: nextVersion(existing?.version) };
  await db.assessments.put(updated);
  await db.syncQueue.add({
    table: "assessments",
    action: "insert",
    recordId: a.id,
    payload: updated,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}

export async function updateReferralStatus(
  assessmentId: string,
  status: "none" | "pending" | "active" | "resolved",
): Promise<void> {
  const now = new Date().toISOString();
  const db = getDB();
  const existing = await db.assessments.get(assessmentId);
  const version = nextVersion(existing?.version);
  await db.assessments.update(assessmentId, { referralStatus: status, referralStatusUpdatedAt: now, version });
  const a = await db.assessments.get(assessmentId);
  if (!a) return;
  await db.syncQueue.add({
    table: "assessments",
    action: "update",
    recordId: assessmentId,
    payload: { ...a, referralStatus: status, referralStatusUpdatedAt: now, version },
    createdAt: now,
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}

export async function pendingCount(): Promise<number> {
  return getDB().syncQueue.count();
}

async function fetchServerRecord(
  table: "patients" | "assessments",
  recordId: string,
): Promise<{ data: Record<string, unknown> | null; version?: number } | null> {
  const { data, error } = await supabase.from(table).select("*").eq("id", recordId).single();
  if (error || !data) return null;
  return { data, version: (data as { version?: number }).version ?? 0 };
}

function isMedicalField(key: string): boolean {
  return ["condition", "confidence", "urgency", "images", "possibleConditions",
    "keyVisualFeatures", "recommendation", "followUpQuestions", "referralAdvised"].includes(key);
}

function threeWayMerge(local: Record<string, unknown>, server: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...server };
  for (const key of Object.keys(local)) {
    if (isMedicalField(key)) continue;
    if (key === "version" || key === "syncedAt" || key === "updatedAt") continue;
    if (JSON.stringify(local[key]) !== JSON.stringify(server[key])) {
      merged[key] = local[key];
    }
  }
  return merged;
}

export async function processSyncQueue(
  onProgress?: SyncProgressCallback,
): Promise<{ ok: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: 0, failed: 0 };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: 0, failed: 0 };

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
        const serverRec = await fetchServerRecord("patients", p.id);
        if (serverRec && serverRec.version !== undefined && serverRec.version > p.version) {
          const conflict: SyncConflict = {
            table: "patients",
            recordId: p.id,
            localVersion: p.version,
            serverVersion: serverRec.version,
            localData: p,
            serverData: serverRec.data,
            createdAt: new Date().toISOString(),
          };
          await db.syncConflicts.add(conflict);
          const merged = threeWayMerge(p as unknown as Record<string, unknown>, serverRec.data as Record<string, unknown>);
          await db.patients.put({ ...p, ...merged, version: serverRec.version } as Patient);
          await db.syncQueue.delete(item.id!);
          ok++;
          onProgress?.({ ...progress, status: "ok" });
          continue;
        }
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
          version: p.version,
        } as never);
        if (error) throw error;
        await db.patients.update(p.id, { syncedAt: new Date().toISOString() });
      } else if (item.table === "assessments") {
        const a = item.payload as Assessment;
        const serverRec = await fetchServerRecord("assessments", a.id);
        if (serverRec && serverRec.version !== undefined && serverRec.version > a.version) {
          const conflict: SyncConflict = {
            table: "assessments",
            recordId: a.id,
            localVersion: a.version,
            serverVersion: serverRec.version,
            localData: a,
            serverData: serverRec.data,
            createdAt: new Date().toISOString(),
          };
          await db.syncConflicts.add(conflict);
          const merged = threeWayMerge(a as unknown as Record<string, unknown>, serverRec.data as Record<string, unknown>);
          await db.assessments.put({ ...a, ...merged, version: serverRec.version } as Assessment);
          await db.syncQueue.delete(item.id!);
          ok++;
          onProgress?.({ ...progress, status: "ok" });
          continue;
        }
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
          version: a.version,
        } as never);
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

export async function getConflicts(): Promise<SyncConflict[]> {
  return getDB().syncConflicts.toArray();
}

export async function resolveConflict(
  conflictId: number,
  resolution: "local" | "server" | "manual",
  manualData?: unknown,
) {
  const db = getDB();
  const conflict = await db.syncConflicts.get(conflictId);
  if (!conflict) return;

  const now = new Date().toISOString();
  if (resolution === "local") {
    const payload = conflict.localData as Patient | Assessment;
    if (conflict.table === "patients") {
      await db.patients.put({ ...payload, version: conflict.serverVersion + 1 } as Patient);
    } else {
      await db.assessments.put({ ...payload, version: conflict.serverVersion + 1 } as Assessment);
    }
    await db.syncQueue.add({
      table: conflict.table,
      action: "update",
      recordId: conflict.recordId,
      payload,
      createdAt: now,
      attempts: 0,
    });
  } else if (resolution === "server") {
    const payload = conflict.serverData as Patient | Assessment;
    if (conflict.table === "patients") {
      await db.patients.put({ ...payload, version: conflict.serverVersion } as Patient);
    } else {
      await db.assessments.put({ ...payload, version: conflict.serverVersion } as Assessment);
    }
  } else if (resolution === "manual" && manualData) {
    if (conflict.table === "patients") {
      await db.patients.put({ ...manualData, version: conflict.serverVersion + 1 } as Patient);
    } else {
      await db.assessments.put({ ...manualData, version: conflict.serverVersion + 1 } as Assessment);
    }
  }

  await db.syncConflicts.update(conflictId, {
    resolution,
    resolvedAt: now,
  });
  registerBackgroundSync().catch(() => {});
}
