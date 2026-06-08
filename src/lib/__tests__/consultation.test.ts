import { describe, it, expect, beforeEach, beforeAll, mock } from "bun:test";

// Fake browser globals needed by Dexie and db.ts
if (typeof globalThis.window === "undefined") {
  (globalThis as any).window = globalThis;
}

import "fake-indexeddb/auto";

import type { ConsultationRequest } from "@/types/trij";

describe("Consultation", () => {
  describe("ConsultationRequest type structure", () => {
    it("should create a valid pending consultation request", () => {
      const consultation: ConsultationRequest = {
        id: "cons-1",
        patientId: "patient-1",
        chwUserId: "chw-1",
        chwName: "CHW Alice",
        status: "pending",
        priority: "routine",
        images: [],
        chwNotes: "Patient has fever and rash for 3 days",
        clinicalContext: {
          condition: "Fever with rash",
          urgency: "yellow",
          vitals: { temperature: 38.5, heartRate: 90 },
        },
        createdAt: "2026-01-01T00:00:00.000Z",
        version: 1,
      };
      expect(consultation.id).toBe("cons-1");
      expect(consultation.status).toBe("pending");
      expect(consultation.priority).toBe("routine");
      expect(consultation.chwName).toBe("CHW Alice");
      expect(consultation.clinicalContext.condition).toBe("Fever with rash");
    });

    it("should create an urgent consultation with images and voice", () => {
      const consultation: ConsultationRequest = {
        id: "cons-2",
        patientId: "patient-2",
        assessmentId: "assessment-1",
        chwUserId: "chw-1",
        chwName: "CHW Bob",
        status: "pending",
        priority: "urgent",
        images: ["data:image/png;base64,abc123"],
        voiceTranscript: "Patient reports severe headache",
        chwNotes: "Suspected meningitis",
        clinicalContext: {
          condition: "Severe headache with neck stiffness",
          urgency: "red",
          vitals: { temperature: 39.2, heartRate: 110, respiratoryRate: 24 },
          possibleConditions: [
            { name: "Meningitis", probability: 0.75 },
            { name: "Severe Malaria", probability: 0.2 },
          ],
        },
        createdAt: "2026-01-01T00:00:00.000Z",
        version: 1,
      };
      expect(consultation.priority).toBe("urgent");
      expect(consultation.images).toHaveLength(1);
      expect(consultation.voiceTranscript).toBeDefined();
      expect(consultation.assessmentId).toBe("assessment-1");
      expect(consultation.clinicalContext.possibleConditions).toHaveLength(2);
    });

    it("should handle completed consultation with response", () => {
      const consultation: ConsultationRequest = {
        id: "cons-3",
        patientId: "patient-1",
        chwUserId: "chw-1",
        chwName: "CHW Alice",
        status: "completed",
        priority: "routine",
        images: [],
        chwNotes: "Skin rash assessment",
        clinicalContext: { condition: "Contact dermatitis" },
        response: {
          advice: "Apply topical corticosteroid cream twice daily for 7 days",
          diagnosis: "Allergic contact dermatitis",
          additionalTests: "Patch testing if recurrent",
          prescription: "Hydrocortisone 1% cream",
          clinicianName: "Dr. Smith",
          clinicianId: "dr-1",
          respondedAt: "2026-01-02T00:00:00.000Z",
        },
        createdAt: "2026-01-01T00:00:00.000Z",
        respondedAt: "2026-01-02T00:00:00.000Z",
        version: 2,
      };
      expect(consultation.status).toBe("completed");
      expect(consultation.response).toBeDefined();
      expect(consultation.response!.clinicianName).toBe("Dr. Smith");
      expect(consultation.response!.advice).toContain("corticosteroid");
      expect(consultation.response!.diagnosis).toBe("Allergic contact dermatitis");
      expect(consultation.version).toBe(2);
    });
  });

  describe("Status transitions", () => {
    it("should transition from pending to assigned", () => {
      const c: ConsultationRequest = {
        id: "cons-1", patientId: "p1", chwUserId: "c1", chwName: "CHW",
        status: "pending", priority: "routine", images: [], chwNotes: "",
        clinicalContext: {}, createdAt: "2026-01-01T00:00:00.000Z", version: 1,
      };
      const updated = { ...c, status: "assigned" as const };
      expect(updated.status).toBe("assigned");
    });

    it("should transition from assigned to in_progress", () => {
      const c: ConsultationRequest = {
        id: "cons-1", patientId: "p1", chwUserId: "c1", chwName: "CHW",
        status: "assigned", priority: "routine", images: [], chwNotes: "",
        clinicalContext: {}, createdAt: "2026-01-01T00:00:00.000Z", version: 1,
      };
      const updated = { ...c, status: "in_progress" as const };
      expect(updated.status).toBe("in_progress");
    });

    it("should transition from in_progress to completed", () => {
      const c: ConsultationRequest = {
        id: "cons-1", patientId: "p1", chwUserId: "c1", chwName: "CHW",
        status: "in_progress", priority: "routine", images: [], chwNotes: "",
        clinicalContext: {}, createdAt: "2026-01-01T00:00:00.000Z", version: 1,
      };
      const updated = {
        ...c,
        status: "completed" as const,
        response: {
          advice: "Rest and hydrate",
          clinicianName: "Dr. Smith",
          clinicianId: "dr-1",
          respondedAt: "2026-01-02T00:00:00.000Z",
        },
      };
      expect(updated.status).toBe("completed");
      expect(updated.response).toBeDefined();
    });

    it("should handle cancellation", () => {
      const c: ConsultationRequest = {
        id: "cons-1", patientId: "p1", chwUserId: "c1", chwName: "CHW",
        status: "pending", priority: "routine", images: [], chwNotes: "",
        clinicalContext: {}, createdAt: "2026-01-01T00:00:00.000Z", version: 1,
      };
      const updated = { ...c, status: "cancelled" as const };
      expect(updated.status).toBe("cancelled");
    });
  });

  describe("queueConsultation", () => {
    beforeEach(() => {
      // Reset IndexedDB between tests
    });

    it("should store consultation in Dexie and add to sync queue", async () => {
      const { queueConsultation, getDeadLetterItems } = await import("@/lib/sync");
      const { getDB } = await import("@/lib/db");

      const db = getDB();

      const consultation: ConsultationRequest = {
        id: "cons-test-queue-1",
        patientId: "patient-queue-1",
        chwUserId: "chw-queue-1",
        chwName: "CHW Test",
        status: "pending",
        priority: "routine",
        images: [],
        chwNotes: "Queue test",
        clinicalContext: {},
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await queueConsultation(consultation);

      const stored = await db.consultations.get(consultation.id);
      expect(stored).toBeDefined();
      expect(stored!.id).toBe(consultation.id);
      expect(stored!.chwName).toBe("CHW Test");
      expect(stored!.status).toBe("pending");

      const queueItems = await db.syncQueue.toArray();
      const consQueueItems = queueItems.filter((i) => i.table === "consultations");
      expect(consQueueItems.length).toBeGreaterThanOrEqual(1);
      expect(consQueueItems[0].recordId).toBe(consultation.id);

      const deadLetter = await getDeadLetterItems();
      expect(deadLetter.length).toBe(0);
    });

    it("should update existing consultation on re-queue", async () => {
      const { queueConsultation } = await import("@/lib/sync");
      const { getDB } = await import("@/lib/db");

      const db = getDB();

      const consultation: ConsultationRequest = {
        id: "cons-test-requeue",
        patientId: "patient-requeue",
        chwUserId: "chw-requeue",
        chwName: "CHW Requeue",
        status: "pending",
        priority: "routine",
        images: [],
        chwNotes: "Initial",
        clinicalContext: {},
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await queueConsultation(consultation);

      const updated: ConsultationRequest = {
        ...consultation,
        chwNotes: "Updated notes",
        priority: "urgent",
        version: 1,
      };

      await queueConsultation(updated);

      const stored = await db.consultations.get(consultation.id);
      expect(stored).toBeDefined();
      expect(stored!.chwNotes).toBe("Updated notes");
      expect(stored!.priority).toBe("urgent");
      expect(stored!.version).toBe(2);
    });

    it("should add to sync queue when queued", async () => {
      const { queueConsultation } = await import("@/lib/sync");
      const { getDB } = await import("@/lib/db");

      const db = getDB();
      const before = await db.syncQueue.count();

      const consultation: ConsultationRequest = {
        id: "cons-test-sync-queue",
        patientId: "patient-sync-queue",
        chwUserId: "chw-sync-queue",
        chwName: "CHW Sync",
        status: "pending",
        priority: "routine",
        images: [],
        chwNotes: "Sync queue test",
        clinicalContext: {},
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await queueConsultation(consultation);

      const after = await db.syncQueue.count();
      expect(after).toBeGreaterThan(before);
    });
  });

  describe("getDeadLetterItems / retryDeadLetterItem", () => {
    it("should manage dead letter items", async () => {
      const { getDeadLetterItems, retryDeadLetterItem, deleteDeadLetterItem } = await import("@/lib/sync");
      const { getDB } = await import("@/lib/db");

      const db = getDB();

      // Add a dead letter item directly
      const deadLetterId = await db.deadLetterQueue.add({
        table: "consultations",
        action: "insert",
        recordId: "dl-test-1",
        payload: {},
        createdAt: new Date().toISOString(),
        attempts: 3,
        lastError: "Test error",
        movedAt: new Date().toISOString(),
      });

      const items = await getDeadLetterItems();
      expect(items.length).toBeGreaterThanOrEqual(1);
      const dlItem = items.find((i) => i.recordId === "dl-test-1");
      expect(dlItem).toBeDefined();
      expect(dlItem!.lastError).toBe("Test error");
      expect(dlItem!.attempts).toBe(3);

      // Test retry from dead letter
      await retryDeadLetterItem(deadLetterId);
      const afterRetry = await getDeadLetterItems();
      expect(afterRetry.find((i) => i.recordId === "dl-test-1")).toBeUndefined();

      const queueItems = await db.syncQueue.toArray();
      const requeued = queueItems.find((i) => i.recordId === "dl-test-1");
      expect(requeued).toBeDefined();
      expect(requeued!.attempts).toBe(0);
    });
  });
});
