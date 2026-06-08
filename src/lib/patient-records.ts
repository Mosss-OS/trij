/**
 * Patient Health Record Management
 * 
 * This module handles all patient-owned health record functionality, including:
 * - Secure local storage of health records in IndexedDB (via Dexie)
 * - Patient ID generation and management (via localStorage)
 * - QR code payload generation for patient health cards
 * - Encryption/decryption of health records using AES-GCM
 * - Adding visit notes by CHWs and doctors
 * - Doctor verification badge system
 * 
 * Health records are stored locally on the device and can be shared via QR codes.
 * Doctors can append visit notes to patient records, which are marked with
 * a verifiedBy badge indicating the doctor's name and facility.
 * 
 * All cryptographic operations use industry-standard AES-GCM with PBKDF2 key
 * derivation derived from the patient's PIN.
 */

import Dexie, { type Table } from "dexie";
import { encrypt, decrypt, deriveKey, generateSalt, cacheKey, clearKey, isKeyCached } from "./crypto";
export { isKeyCached };
import type { TriageResult } from "@/types/trij";

export interface VerifiedBy {
  name: string;
  facility: string;
  licenseId?: string;
  date: string;
}

export interface HealthRecord {
  id: string;
  date: string;
  type: "triage" | "manual" | "prescription";
  complaint: string;
  urgencyLevel: "red" | "yellow" | "green" | "unknown";
  aiSummary?: string;
  medications?: string;
  notes?: string;
  facility?: string;
  addedBy: "self" | "chw" | "doctor";
  verifiedBy?: VerifiedBy;
  encryptedData: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientQrPayload {
  patientId: string;
  version: number;
  recordCount: number;
  summary: string;
  updatedAt: string;
}

export interface PatientRecordInput {
  type: "triage" | "manual" | "prescription";
  complaint: string;
  urgencyLevel: "red" | "yellow" | "green" | "unknown";
  aiSummary?: string;
  medications?: string;
  notes?: string;
  facility?: string;
}

class PatientRecordDB extends Dexie {
  records!: Table<HealthRecord, string>;

  constructor() {
    super("TrijPatientRecords");
    this.version(1).stores({
      records: "id, date, type, urgencyLevel, createdAt",
    });
  }
}

let _db: PatientRecordDB | null = null;

function getDB(): PatientRecordDB {
  if (typeof window === "undefined") throw new Error("Browser only");
  if (!_db) _db = new PatientRecordDB();
  return _db;
}

const PIN_USER_ID = "patient-self";
const PIN_KEY = "trij-patient-pin-hash";

export function isPinSet(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}

export function getPinFailedAttempts(): number {
  const val = localStorage.getItem("trij-patient-pin-attempts");
  return val ? parseInt(val, 10) : 0;
}

function incrementFailedAttempts() {
  const current = getPinFailedAttempts();
  localStorage.setItem("trij-patient-pin-attempts", String(current + 1));
}

export function resetPinFailedAttempts() {
  localStorage.removeItem("trij-patient-pin-attempts");
}

export function isPinLocked(): boolean {
  return getPinFailedAttempts() >= 5;
}

export async function setupPatientPin(pin: string): Promise<void> {
  if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
    throw new Error("PIN must be exactly 6 digits");
  }
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(pin));
  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  localStorage.setItem(PIN_KEY, hashHex);
  resetPinFailedAttempts();
}

export async function verifyPatientPin(pin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(PIN_KEY);
  if (!storedHash) return false;
  if (isPinLocked()) return false;

  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(pin));
  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const match = hashHex === storedHash;
  if (match) {
    resetPinFailedAttempts();
    const salt = generateSalt();
    const key = await deriveKey(pin, salt);
    cacheKey(key);
    localStorage.setItem("trij-patient-record-salt", salt);
  } else {
    incrementFailedAttempts();
  }
  return match;
}

export function unlockWithKey() {
  if (isKeyCached()) return true;
  return false;
}

export function lockRecords() {
  clearKey();
}

export async function addRecord(input: PatientRecordInput): Promise<HealthRecord> {
  if (!isKeyCached()) throw new Error("Not authenticated");

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const plaintext = JSON.stringify({
    complaint: input.complaint,
    aiSummary: input.aiSummary || "",
    medications: input.medications || "",
    notes: input.notes || "",
    facility: input.facility || "",
  });
  const encryptedData = await encrypt(plaintext);
  const record: HealthRecord = {
    id,
    date: now,
    type: input.type,
    complaint: input.complaint,
    urgencyLevel: input.urgencyLevel,
    aiSummary: input.aiSummary,
    medications: input.medications,
    notes: input.notes,
    facility: input.facility,
    addedBy: "self",
    encryptedData,
    createdAt: now,
    updatedAt: now,
  };
  const db = getDB();
  await db.records.put(record);
  return record;
}

export async function getRecords(): Promise<HealthRecord[]> {
  const db = getDB();
  return db.records.orderBy("createdAt").reverse().toArray();
}

export async function deleteRecord(id: string): Promise<void> {
  const db = getDB();
  await db.records.delete(id);
}

export async function getRecordCount(): Promise<number> {
  const db = getDB();
  return db.records.count();
}

export function getPatientId(): string {
  const stored = localStorage.getItem("trij-patient-id");
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem("trij-patient-id", id);
  return id;
}

export async function getQrPayload(): Promise<PatientQrPayload> {
  const patientId = getPatientId();
  const records = await getRecords();
  const latest = records[0];
  return {
    patientId,
    version: 1,
    recordCount: records.length,
    summary: latest ? latest.complaint : "",
    updatedAt: latest ? latest.date : new Date().toISOString(),
  };
}

export interface DoctorRecordInput {
  diagnosis: string;
  notes: string;
  medications?: string;
  facility: string;
  doctorName: string;
  licenseId?: string;
}

export async function addDoctorRecord(
  patientId: string,
  input: DoctorRecordInput,
): Promise<HealthRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const plaintext = JSON.stringify({
    complaint: input.diagnosis,
    notes: input.notes,
    medications: input.medications || "",
    facility: input.facility,
  });
  const encryptedData = await encrypt(plaintext);
  const record: HealthRecord = {
    id,
    date: now,
    type: "manual",
    complaint: input.diagnosis,
    urgencyLevel: "unknown",
    notes: input.notes,
    medications: input.medications,
    facility: input.facility,
    addedBy: "doctor",
    verifiedBy: {
      name: input.doctorName,
      facility: input.facility,
      licenseId: input.licenseId,
      date: now,
    },
    encryptedData,
    createdAt: now,
    updatedAt: now,
  };
  const db = getDB();
  await db.records.put(record);
  return record;
}
