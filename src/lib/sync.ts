/**
 * Synchronization Engine
 * 
 * This module manages Trij's offline-first synchronization capabilities, ensuring
 * data persistence and eventual consistency between local IndexedDB storage and
 * the remote Supabase database. It implements a robust queue-based system with
 * retry mechanisms, conflict resolution, and background sync capabilities.
 * 
 * Key Features:
 * - Offline-first queueing of all patient records, assessments, and consultations
 * - Automatic retry with exponential backoff for failed sync operations
 * - Dead letter queue for permanently failed items after MAX_RETRIES attempts
 * - Background synchronization via service workers
 * - Conflict detection and resolution strategies
 * - Manual retry capabilities for failed items
 * 
 * The sync engine ensures that patient data is never lost due to connectivity
 * issues and provides a seamless experience when moving between online and
 * offline states.
 */

import { getDB, type DeadLetterItem } from "./db";
import { supabase } from "@/integrations/supabase/client";
import type {
  Patient,
  Assessment,
  FollowUp,
  ReferralFeedback,
  SyncQueueItem,
  SyncConflict,
  ConsultationRequest,
} from "@/types/trij";
import { registerBackgroundSync } from "./sw-register";

let isSyncing = false;

/**
 * Enhanced error logging for sync operations
 * Provides detailed diagnostic information for troubleshooting sync failures
 */
function logSyncError(context: string, error: unknown, item?: SyncQueueItem) {
  const errorDetails = {
    context,
    timestamp: new Date().toISOString(),
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
    itemDetails: item
      ? {
          table: item.table,
          action: item.action,
          recordId: item.recordId,
          attempts: item.attempts,
          lastError: item.lastError,
          createdAt: item.createdAt,
        }
      : undefined,
  };

  console.error("[Sync Error]", errorDetails);

  // Store error in localStorage for debugging
  try {
    const syncErrors = JSON.parse(localStorage.getItem("trij-sync-errors") || "[]");
    syncErrors.push(errorDetails);
    // Keep only last 50 errors
    if (syncErrors.length > 50) syncErrors.shift();
    localStorage.setItem("trij-sync-errors", JSON.stringify(syncErrors));
  } catch (e) {
    console.warn("Failed to store sync error in localStorage", e);
  }
}

export const MAX_RETRIES = 5;
export const RETRY_BACKOFF_MS = [5_000, 30_000, 120_000, 300_000, 600_000];

function getBackoffMs(attempt: number): number {
  const index = Math.min(attempt, RETRY_BACKOFF_MS.length - 1);
  const base = RETRY_BACKOFF_MS[index];
  const jitter = Math.random() * 1000;
  return base + jitter;
}

async function moveToDeadLetter(item: SyncQueueItem) {
  const db = getDB();
  const now = new Date().toISOString();

  const deadLetterItem: DeadLetterItem = {
    table: item.table,
    action: item.action,
    recordId: item.recordId,
    payload: item.payload,
    createdAt: item.createdAt,
    attempts: item.attempts ?? 0,
    lastError: item.lastError ?? "Max retries exceeded",
    movedAt: now,
  };

  await db.deadLetterQueue.add(deadLetterItem);
  await db.syncQueue.delete(item.id!);
}

export interface SyncProgressItem {
  id: number;
  table: string;
  recordId: string;
  status: "pending" | "syncing" | "ok" | "failed" | "dead_letter";
  error?: string;
}

export type SyncProgressCallback = (item: SyncProgressItem) => void;

function nextVersion(v?: number): number {
  return (v ?? 0) + 1;
}

export async function canSyncNow(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  if (isSyncing) return false;
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) return false;
  }
  return true;
}

export async function tryProcessSyncQueue(
  onProgress?: SyncProgressCallback,
): Promise<{ ok: number; failed: number; deadLetter: number }> {
  if (!(await canSyncNow())) {
    return { ok: 0, failed: 0, deadLetter: 0 };
  }

  isSyncing = true;
  try {
    return await processSyncQueue(onProgress);
  } finally {
    isSyncing = false;
  }
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
  status: "none" | "pending" | "active" | "awaiting_feedback" | "feedback_received" | "resolved",
): Promise<void> {
  const now = new Date().toISOString();
  const db = getDB();
  const existing = await db.assessments.get(assessmentId);
  const version = nextVersion(existing?.version);
  await db.assessments.update(assessmentId, {
    referralStatus: status,
    referralStatusUpdatedAt: now,
    version,
  });
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
  table: "patients" | "assessments" | "consultations",
  recordId: string,
): Promise<{ data: Record<string, unknown> | null; version?: number } | null> {
  const { data, error } = await supabase.from(table).select("*").eq("id", recordId).single();
  if (error || !data) return null;
  return { data, version: (data as { version?: number }).version ?? 0 };
}

function isMedicalField(key: string): boolean {
  return [
    "condition",
    "confidence",
    "urgency",
    "images",
    "possibleConditions",
    "keyVisualFeatures",
    "recommendation",
    "followUpQuestions",
    "referralAdvised",
    "vitalSigns",
  ].includes(key);
}

function threeWayMerge(
  local: Record<string, unknown>,
  server: Record<string, unknown>,
): Record<string, unknown> {
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
): Promise<{ ok: number; failed: number; deadLetter: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    logSyncError("processSyncQueue", new Error("Device is offline"));
    return { ok: 0, failed: 0, deadLetter: 0 };
  }

  let {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      logSyncError("processSyncQueue", refreshError || new Error("No active session and refresh failed"));
      return { ok: 0, failed: 0, deadLetter: 0 };
    }
    session = refreshData.session;
  }

  const db = getDB();
  const allItems = await db.syncQueue.toArray();
  const now = new Date().toISOString();
  const items = allItems.filter((item) => !item.nextRetryAt || item.nextRetryAt <= now);
  let ok = 0,
    failed = 0,
    deadLetter = 0;

  for (const item of items) {
    const progress: SyncProgressItem = {
      id: item.id!,
      table: item.table,
      recordId: item.recordId,
      status: "syncing",
    };
    onProgress?.(progress);

    try {
      // Validate payload before processing
      if (!item.payload || Object.keys(item.payload).length === 0) {
        throw new Error("Empty or invalid payload");
      }

      if (item.table === "patients") {
        const p = item.payload as Patient;
        if (!p.id || !p.chwUserId || !p.identifier) {
          throw new Error("Invalid patient data: missing required fields");
        }

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
          const merged = threeWayMerge(
            p as unknown as Record<string, unknown>,
            serverRec.data as Record<string, unknown>,
          );
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
      } else if (item.table === "follow_ups") {
        const f = item.payload as FollowUp;
        if (!f.id || !f.patientId || !f.chwUserId) {
          throw new Error("Invalid follow-up data: missing required fields");
        }

        const { error } = await supabase.from("follow_ups" as never).upsert({
          id: f.id,
          patient_id: f.patientId,
          assessment_id: f.assessmentId ?? null,
          chw_user_id: f.chwUserId,
          scheduled_for: f.scheduledFor,
          status: f.status,
          notes: f.notes ?? null,
          completed_at: f.completedAt ?? null,
          created_at: f.createdAt,
          version: f.version,
        } as never);
        if (error) throw error;
        await db.followUps.update(f.id, { syncedAt: new Date().toISOString() });
      } else if (item.table === "assessments") {
        const a = item.payload as Assessment;
        if (!a.id || !a.patientId || !a.chwUserId) {
          throw new Error("Invalid assessment data: missing required fields");
        }

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
          const merged = threeWayMerge(
            a as unknown as Record<string, unknown>,
            serverRec.data as Record<string, unknown>,
          );
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
          vitals: (a.vitalSigns ?? null) as never,
          condition: a.condition ?? null,
          presentation_type: a.presentationType ?? null,
          description: a.description ?? null,
          icd10_code: a.icd10Code ?? null,
          confidence: a.confidence ?? null,
          urgency: a.urgency ?? null,
          possible_conditions: (a.possibleConditions ?? null) as never,
          key_visual_features: (a.keyVisualFeatures ?? null) as never,
          recommendation: a.recommendation ?? null,
          voice_log: a.voiceLog ?? null,
          language: a.language,
          referral_status: a.referralStatus,
          referral_advised: a.referralAdvised ?? false,
          referral_feedback: (a.referralFeedback ?? null) as never,
          follow_up_questions: (a.followUpQuestions ?? null) as never,
          created_at: a.createdAt,
          synced_at: new Date().toISOString(),
          version: a.version,
        } as never);
        if (error) throw error;
        await db.assessments.update(a.id, { syncedAt: new Date().toISOString() });
      } else if (item.table === "consultations") {
        const c = item.payload as ConsultationRequest;
        if (!c.id || !c.patientId || !c.chwUserId) {
          throw new Error("Invalid consultation data: missing required fields");
        }

        const serverRec = await fetchServerRecord("consultations", c.id);
        if (serverRec && serverRec.version !== undefined && serverRec.version > c.version) {
          const conflict: SyncConflict = {
            table: "consultations",
            recordId: c.id,
            localVersion: c.version,
            serverVersion: serverRec.version,
            localData: c,
            serverData: serverRec.data,
            createdAt: new Date().toISOString(),
          };
          await db.syncConflicts.add(conflict);
          await db.consultations.put({
            ...c,
            ...(serverRec.data as Partial<ConsultationRequest>),
            version: serverRec.version,
          } as ConsultationRequest);
          await db.syncQueue.delete(item.id!);
          ok++;
          onProgress?.({ ...progress, status: "ok" });
          continue;
        }

        const { error } = await supabase.from("consultations").upsert({
          id: c.id,
          patient_id: c.patientId,
          assessment_id: c.assessmentId ?? null,
          chw_user_id: c.chwUserId,
          chw_name: c.chwName,
          status: c.status,
          priority: c.priority,
          images: c.images,
          voice_transcript: c.voiceTranscript ?? null,
          chw_notes: c.chwNotes,
          clinical_context: c.clinicalContext as never,
          response: (c.response ?? null) as never,
          created_at: c.createdAt,
          responded_at: c.respondedAt ?? null,
          version: c.version,
        } as never);
        if (error) throw error;
        await db.consultations.update(c.id, { syncedAt: new Date().toISOString() });
      } else {
        throw new Error(`Unknown table type: ${item.table}`);
      }

      await db.syncQueue.delete(item.id!);
      ok++;
      onProgress?.({ ...progress, status: "ok" });
    } catch (err) {
      logSyncError(`processSyncQueue-${item.table}`, err, item);

      const attempts = (item.attempts ?? 0) + 1;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const nextRetryAt = new Date(Date.now() + getBackoffMs(attempts)).toISOString();

      // If we've exceeded max retries, move to dead letter queue
      if (attempts >= MAX_RETRIES) {
        await moveToDeadLetter(item);
        deadLetter++;
        onProgress?.({ ...progress, status: "dead_letter", error: errorMessage });
      } else {
        failed++;
        await db.syncQueue.update(item.id!, {
          attempts,
          lastError: errorMessage,
          nextRetryAt,
        });
        onProgress?.({ ...progress, status: "failed", error: errorMessage });
      }
    }
  }

  // Pull consultation responses from clinician (sync from server to local)
  await pollConsultationResponses();

  return { ok, failed, deadLetter };
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
      await db.assessments.put({
        ...manualData,
        version: conflict.serverVersion + 1,
      } as Assessment);
    }
  }

  await db.syncConflicts.update(conflictId, {
    resolution,
    resolvedAt: now,
  });
  registerBackgroundSync().catch(() => {});
}

export async function retryFailedSyncItems(): Promise<number> {
  const db = getDB();
  const failed = await db.syncQueue.where("attempts").between(1, MAX_RETRIES).toArray();

  let retried = 0;

  for (const item of failed) {
    await db.syncQueue.update(item.id!, { attempts: 0, lastError: undefined, nextRetryAt: undefined });
    retried++;
  }

  if (retried > 0) registerBackgroundSync().catch(() => {});
  return retried;
}

export async function triggerManualSync(): Promise<{ ok: number; failed: number; deadLetter: number }> {
  const db = getDB();
  const items = await db.syncQueue.where("nextRetryAt").notEqual("").toArray();
  for (const item of items) {
    if (item.nextRetryAt) {
      await db.syncQueue.update(item.id!, { nextRetryAt: undefined });
    }
  }
  return tryProcessSyncQueue();
}

export async function getDeadLetterItems(): Promise<DeadLetterItem[]> {
  return getDB().deadLetterQueue.toArray();
}

export async function retryDeadLetterItem(id: number): Promise<void> {
  const db = getDB();
  const item = await db.deadLetterQueue.get(id);
  if (!item) return;

  await db.deadLetterQueue.delete(id);
  await db.syncQueue.add({
    table: item.table as SyncQueueItem["table"],
    action: item.action as SyncQueueItem["action"],
    recordId: item.recordId,
    payload: item.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}

export async function deleteDeadLetterItem(id: number): Promise<void> {
  await getDB().deadLetterQueue.delete(id);
}

/**
 * Get sync error logs for debugging
 * Returns the last 50 sync errors stored in localStorage
 */
export function getSyncErrorLogs(): Array<{
  context: string;
  timestamp: string;
  errorMessage: string;
  errorStack?: string;
  itemDetails?: {
    table: string;
    action: string;
    recordId: string;
    attempts: number;
    lastError: string;
    createdAt: string;
  };
}> {
  try {
    const syncErrors = JSON.parse(localStorage.getItem("trij-sync-errors") || "[]");
    return syncErrors;
  } catch (e) {
    console.warn("Failed to retrieve sync error logs", e);
    return [];
  }
}

/**
 * Clear sync error logs
 */
export function clearSyncErrorLogs(): void {
  try {
    localStorage.removeItem("trij-sync-errors");
  } catch (e) {
    console.warn("Failed to clear sync error logs", e);
  }
}

export async function queueFollowUp(followUp: FollowUp) {
  const db = getDB();
  const existing = await db.followUps.get(followUp.id);
  const updated = { ...followUp, version: nextVersion(existing?.version) };
  await db.followUps.put(updated);
  await db.syncQueue.add({
    table: "follow_ups",
    action: "insert",
    recordId: followUp.id,
    payload: updated,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}

export async function updateFollowUpStatus(
  id: string,
  status: FollowUp["status"],
  completedAt?: string,
) {
  const db = getDB();
  const existing = await db.followUps.get(id);
  if (!existing) return;
  const updated = {
    ...existing,
    status,
    completedAt: completedAt ?? existing.completedAt,
    version: nextVersion(existing.version),
  };
  await db.followUps.put(updated);
  await db.syncQueue.add({
    table: "follow_ups",
    action: "update",
    recordId: id,
    payload: updated,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}

export async function queueConsultation(c: ConsultationRequest) {
  const db = getDB();
  const existing = await db.consultations.get(c.id);
  const updated = { ...c, version: nextVersion(existing?.version) };
  await db.consultations.put(updated);
  await db.syncQueue.add({
    table: "consultations",
    action: "insert",
    recordId: c.id,
    payload: updated,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}

export async function pollConsultationResponses(): Promise<number> {
  const db = getDB();
  const pending = await db.consultations
    .where("status")
    .anyOf("pending", "assigned", "in_progress")
    .toArray();
  let updates = 0;
  for (const c of pending) {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("id", c.id)
      .single();
    if (error || !data) continue;
    const serverVersion = (data as { version?: number }).version ?? 0;
    if (serverVersion > c.version) {
      const server = data as Record<string, unknown>;
      const update: Partial<ConsultationRequest> & { version: number } = {
        status: (server.status as ConsultationRequest["status"]) ?? c.status,
        version: serverVersion,
      };
      if (server.response) {
        update.response = server.response as ConsultationRequest["response"];
      }
      if (server.responded_at) {
        update.respondedAt = server.responded_at as string;
      }
      await db.consultations.update(c.id, update);
      updates++;
    }
  }
  return updates;
}

export async function saveReferralFeedback(
  assessmentId: string,
  feedback: ReferralFeedback,
): Promise<void> {
  const now = new Date().toISOString();
  const db = getDB();
  const existing = await db.assessments.get(assessmentId);
  const version = nextVersion(existing?.version);
  await db.assessments.update(assessmentId, {
    referralFeedback: feedback,
    referralStatus: "feedback_received",
    referralStatusUpdatedAt: now,
    version,
  });
  const a = await db.assessments.get(assessmentId);
  if (!a) return;
  await db.syncQueue.add({
    table: "assessments",
    action: "update",
    recordId: assessmentId,
    payload: { ...a, referralFeedback: feedback, referralStatus: "feedback_received", version },
    createdAt: now,
    attempts: 0,
  });
  registerBackgroundSync().catch(() => {});
}
