import Dexie, { type Table } from "dexie";

export interface DoseLog {
  id: string;
  medicationId: string;
  time: string;
  date: string;
  taken: boolean;
  scheduledSlot: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: "once" | "twice" | "thrice" | "every-x-hours" | "as-needed";
  everyXHours?: number;
  timeSlots: string[];
  durationDays: number;
  isOngoing: boolean;
  startDate: string;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

class MedicationDB extends Dexie {
  medications!: Table<Medication, string>;
  doseLogs!: Table<DoseLog, string>;

  constructor() {
    super("TrijMedications");
    this.version(1).stores({
      medications: "id, active, startDate, createdAt",
      doseLogs: "id, medicationId, date, time",
    });
  }
}

let _db: MedicationDB | null = null;

function getDB(): MedicationDB {
  if (typeof window === "undefined") throw new Error("Browser only");
  if (!_db) _db = new MedicationDB();
  return _db;
}

export async function addMedication(
  input: Omit<Medication, "id" | "active" | "createdAt" | "updatedAt">,
): Promise<Medication> {
  const med: Medication = {
    ...input,
    id: crypto.randomUUID(),
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const db = getDB();
  await db.medications.put(med);
  return med;
}

export async function getActiveMedications(): Promise<Medication[]> {
  const db = getDB();
  return db.medications.where("active").equals(1).toArray();
}

export async function getAllMedications(): Promise<Medication[]> {
  const db = getDB();
  return db.medications.orderBy("startDate").reverse().toArray();
}

export async function getPastMedications(): Promise<Medication[]> {
  const db = getDB();
  const all = await db.medications.where("active").equals(0).toArray();
  return all.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

export async function stopMedication(id: string): Promise<void> {
  const db = getDB();
  await db.medications.update(id, { active: false, updatedAt: new Date().toISOString() });
}

export async function deleteMedication(id: string): Promise<void> {
  const db = getDB();
  await db.medications.delete(id);
  await db.doseLogs.where("medicationId").equals(id).delete();
}

export async function logDose(
  medicationId: string,
  scheduledSlot: string,
  taken: boolean,
): Promise<DoseLog> {
  const now = new Date();
  const log: DoseLog = {
    id: crypto.randomUUID(),
    medicationId,
    time: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    taken,
    scheduledSlot,
  };
  const db = getDB();
  await db.doseLogs.put(log);
  return log;
}

export async function getTodayLogs(medicationId: string): Promise<DoseLog[]> {
  const today = new Date().toISOString().slice(0, 10);
  const db = getDB();
  return db.doseLogs
    .where({ medicationId, date: today })
    .toArray();
}

export async function getDoseHistory(medicationId: string): Promise<DoseLog[]> {
  const db = getDB();
  return db.doseLogs
    .where("medicationId")
    .equals(medicationId)
    .reverse()
    .toArray();
}

export function getDaysRemaining(med: Medication): number {
  if (med.isOngoing) return 999;
  const start = new Date(med.startDate);
  const end = new Date(start.getTime() + med.durationDays * 86400000);
  const now = new Date();
  const remaining = Math.ceil((end.getTime() - now.getTime()) / 86400000);
  return Math.max(0, remaining);
}

export function needsRefill(med: Medication): boolean {
  if (med.isOngoing) return false;
  return getDaysRemaining(med) <= 3;
}

export function getNextDoseIndex(med: Medication, logs: DoseLog[]): number {
  const takenSlots = new Set(logs.map((l) => l.scheduledSlot));
  for (let i = 0; i < med.timeSlots.length; i++) {
    if (!takenSlots.has(med.timeSlots[i])) {
      return i;
    }
  }
  return med.timeSlots.length;
}

const FREQUENCY_MAP: Record<string, string[]> = {
  once: ["morning"],
  twice: ["morning", "evening"],
  thrice: ["morning", "afternoon", "evening"],
};

const SLOT_LABELS: Record<string, string> = {
  morning: "Morning (7am)",
  afternoon: "Afternoon (1pm)",
  evening: "Evening (7pm)",
  night: "Night (10pm)",
};

export function getDefaultTimeSlots(frequency: string): string[] {
  return FREQUENCY_MAP[frequency] || ["morning"];
}

export function getSlotLabel(slot: string): string {
  return SLOT_LABELS[slot] || slot;
}
