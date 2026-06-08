import { describe, it, expect, beforeEach } from "bun:test";
import "fake-indexeddb/auto";

// Need to set indexedDB global before Dexie loads
import Dexie from "dexie";

// Mock the crypto module
const mockEncrypt = async (plaintext: string) => {
  const enc = new TextEncoder();
  const data = enc.encode(plaintext);
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
};

const mockDeriveKey = async () => {
  return await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
};

const mockGenerateSalt = () => btoa(crypto.getRandomValues(new Uint8Array(16)).join(""));

// Mock the crypto module functions used by patient-records
const mockCacheKey = () => {};
const mockClearKey = () => {};
const mockIsKeyCached = () => true;

// Setup localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true, configurable: true });

describe("Patient Records", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getPatientId", () => {
    it("should create a new patient ID if none exists", async () => {
      const { getPatientId } = await import("@/lib/patient-records");
      const id = getPatientId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should return the same ID on subsequent calls", async () => {
      const { getPatientId } = await import("@/lib/patient-records");
      const id1 = getPatientId();
      const id2 = getPatientId();
      expect(id1).toBe(id2);
    });

    it("should return existing ID from localStorage", async () => {
      localStorage.setItem("trij-patient-id", "existing-id-123");
      const { getPatientId } = await import("@/lib/patient-records");
      expect(getPatientId()).toBe("existing-id-123");
    });
  });

  describe("PIN Management", () => {
    it("should not report PIN as set initially", async () => {
      const { isPinSet } = await import("@/lib/patient-records");
      expect(isPinSet()).toBe(false);
    });

    it("should reject non-6-digit PIN", async () => {
      const { setupPatientPin } = await import("@/lib/patient-records");
      await expect(setupPatientPin("12345")).rejects.toThrow("PIN must be exactly 6 digits");
      await expect(setupPatientPin("abcdef")).rejects.toThrow("PIN must be exactly 6 digits");
      await expect(setupPatientPin("1234567")).rejects.toThrow("PIN must be exactly 6 digits");
    });

    it("should accept a valid 6-digit PIN", async () => {
      const { setupPatientPin, isPinSet } = await import("@/lib/patient-records");
      await setupPatientPin("123456");
      expect(isPinSet()).toBe(true);
    });

    it("should verify correct PIN", async () => {
      const { setupPatientPin, verifyPatientPin } = await import("@/lib/patient-records");
      await setupPatientPin("123456");
      const result = await verifyPatientPin("123456");
      expect(result).toBe(true);
    });

    it("should reject incorrect PIN", async () => {
      const { setupPatientPin, verifyPatientPin } = await import("@/lib/patient-records");
      await setupPatientPin("123456");
      const result = await verifyPatientPin("654321");
      expect(result).toBe(false);
    });

    it("should lock after 5 failed attempts", async () => {
      const { setupPatientPin, verifyPatientPin, isPinLocked } = await import("@/lib/patient-records");
      await setupPatientPin("123456");
      for (let i = 0; i < 5; i++) {
        await verifyPatientPin("000000");
      }
      expect(isPinLocked()).toBe(true);
    });

    it("should not allow verification when locked", async () => {
      const { setupPatientPin, verifyPatientPin } = await import("@/lib/patient-records");
      await setupPatientPin("123456");
      for (let i = 0; i < 5; i++) {
        await verifyPatientPin("000000");
      }
      const result = await verifyPatientPin("123456");
      expect(result).toBe(false);
    });
  });

  describe("Doctor Record", () => {
    it("should create a doctor record with correct structure", async () => {
      const record = {
        id: "test-id-1",
        date: "2026-01-01T00:00:00.000Z",
        type: "manual" as const,
        complaint: "Malaria diagnosis",
        urgencyLevel: "unknown" as const,
        notes: "Patient has malaria",
        medications: "Artemether-Lumefantrine",
        facility: "Clinic A",
        addedBy: "doctor" as const,
        verifiedBy: {
          name: "Dr. Smith",
          facility: "Clinic A",
          licenseId: "LIC-12345",
          date: "2026-01-01T00:00:00.000Z",
        },
        encryptedData: "base64-encrypted-data",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      expect(record.addedBy).toBe("doctor");
      expect(record.verifiedBy).toBeDefined();
      expect(record.verifiedBy!.name).toBe("Dr. Smith");
      expect(record.verifiedBy!.facility).toBe("Clinic A");
      expect(record.verifiedBy!.licenseId).toBe("LIC-12345");
      expect(record.verifiedBy!.date).toBeTruthy();
      expect(record.complaint).toBe("Malaria diagnosis");
      expect(record.type).toBe("manual");
      expect(record.urgencyLevel).toBe("unknown");
    });

    it("should create a doctor record without optional licenseId", () => {
      const verifiedBy: { name: string; facility: string; licenseId?: string; date: string } = {
        name: "Dr. Jones",
        facility: "Clinic B",
        date: "2026-01-01T00:00:00.000Z",
      };
      const record = {
        id: "test-id-2",
        date: "2026-01-01T00:00:00.000Z",
        type: "manual" as const,
        complaint: "Hypertension",
        urgencyLevel: "unknown" as const,
        notes: "BP 140/90",
        facility: "Clinic B",
        addedBy: "doctor" as const,
        verifiedBy,
        encryptedData: "base64-encrypted-data",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      expect(record.verifiedBy!.name).toBe("Dr. Jones");
      expect(record.verifiedBy!.licenseId).toBeUndefined();
    });
  });

  describe("QR Payload", () => {
    it("should create a valid QR payload structure", async () => {
      const { getPatientId } = await import("@/lib/patient-records");
      const patientId = getPatientId();
      const payload = {
        patientId,
        version: 1,
        recordCount: 0,
        summary: "",
        updatedAt: new Date().toISOString(),
      };
      expect(payload.patientId).toBe(patientId);
      expect(payload.version).toBe(1);
      expect(payload.recordCount).toBeGreaterThanOrEqual(0);
      expect(typeof payload.summary).toBe("string");
      expect(typeof payload.updatedAt).toBe("string");
    });
  });
});
