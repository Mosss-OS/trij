import Dexie, { type Table } from "dexie";
import type { Patient, Assessment, SyncQueueItem } from "@/types/trij";

export class TrijDB extends Dexie {
  patients!: Table<Patient, string>;
  assessments!: Table<Assessment, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super("TrijDB");
    this.version(1).stores({
      patients: "id, chwUserId, identifier, createdAt, syncedAt",
      assessments: "id, patientId, chwUserId, urgency, createdAt, syncedAt",
      syncQueue: "++id, table, action, recordId, createdAt",
    });
  }
}

let _db: TrijDB | null = null;
export function getDB(): TrijDB {
  if (typeof window === "undefined") {
    // SSR safety — return a stub-shaped object that throws on use
    throw new Error("IndexedDB only available in browser");
  }
  if (!_db) _db = new TrijDB();
  return _db;
}
