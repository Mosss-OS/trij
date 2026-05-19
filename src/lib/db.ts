import Dexie, { type Table } from "dexie";
import type { Patient, Assessment, FollowUp, SyncQueueItem, SyncConflict, TriageResult } from "@/types/trij";
import type { ConvMessage } from "@/lib/gemma";

export interface VoiceDraft {
  patientId: string;
  chwUserId: string;
  patient: Patient;
  triageResult: TriageResult;
  image: string;
  messages: ConvMessage[];
  qaHistory: { question: string; answer: string }[];
  currentQuestion: string;
  consent: boolean;
  updatedAt: string;
}

export interface ErrorLog {
  id?: number;
  message: string;
  stack?: string;
  route?: string;
  timestamp: number;
}

export interface PinAuthRecord {
  userId: string;
  email: string;
  pinHash: string;
  salt: string;
  failedAttempts: number;
  lastFailedAttempt: string | null;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export class TrijDB extends Dexie {
  patients!: Table<Patient, string>;
  assessments!: Table<Assessment, string>;
  followUps!: Table<FollowUp, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  errorLogs!: Table<ErrorLog, number>;
  pinAuth!: Table<PinAuthRecord, string>;
  voiceDrafts!: Table<VoiceDraft, string>;
  syncConflicts!: Table<SyncConflict, number>;

  constructor() {
    super("TrijDB");
    this.version(3).stores({
      patients: "id, chwUserId, identifier, createdAt, syncedAt",
      assessments: "id, patientId, chwUserId, urgency, createdAt, syncedAt",
      syncQueue: "++id, table, action, recordId, createdAt",
      errorLogs: "++id, timestamp",
      pinAuth: "userId, email",
    });
    this.version(4).stores({
      patients: "id, chwUserId, identifier, createdAt, syncedAt",
      assessments: "id, patientId, chwUserId, urgency, createdAt, syncedAt",
      syncQueue: "++id, table, action, recordId, createdAt",
      errorLogs: "++id, timestamp",
      pinAuth: "userId, email",
      voiceDrafts: "patientId, chwUserId, updatedAt",
    });
    this.version(5).stores({
      patients: "id, chwUserId, identifier, createdAt, syncedAt",
      assessments: "id, patientId, chwUserId, urgency, createdAt, syncedAt",
      syncQueue: "++id, table, action, recordId, createdAt",
      errorLogs: "++id, timestamp",
      pinAuth: "userId, email",
      voiceDrafts: "patientId, chwUserId, updatedAt",
      syncConflicts: "++id, table, recordId, createdAt",
    });
    this.version(6).stores({
      patients: "id, chwUserId, identifier, createdAt, syncedAt",
      assessments: "id, patientId, chwUserId, urgency, createdAt, syncedAt",
      followUps: "id, patientId, chwUserId, status, scheduledFor, createdAt, syncedAt",
      syncQueue: "++id, table, action, recordId, createdAt",
      errorLogs: "++id, timestamp",
      pinAuth: "userId, email",
      voiceDrafts: "patientId, chwUserId, updatedAt",
      syncConflicts: "++id, table, recordId, createdAt",
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
