export type Urgency = "green" | "yellow" | "red";
export type Sex = "M" | "F" | "other";

export interface Patient {
  id: string;
  chwUserId: string;
  identifier: string;
  ageYears?: number;
  sex?: Sex;
  notes?: string;
  locationLat?: number;
  locationLng?: number;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  mergedInto?: string;
  version: number;
}

export interface PossibleCondition {
  name: string;
  probability: number;
}

export interface Assessment {
  id: string;
  patientId: string;
  chwUserId: string;
  images: string[]; // data URLs (offline-first)
  imageSource?: "camera" | "gallery";
  condition?: string;
  confidence?: number;
  urgency?: Urgency;
  possibleConditions?: PossibleCondition[];
  keyVisualFeatures?: string[];
  recommendation?: string;
  voiceLog?: string;
  language: string;
  referralStatus: "none" | "pending" | "active" | "resolved";
  referralStatusUpdatedAt?: string;
  referralAdvised?: boolean;
  followUpQuestions?: string[];
  patientConsent?: boolean;
  consentTimestamp?: string;
  createdAt: string;
  syncedAt?: string;
  version: number;
}

export interface SyncQueueItem {
  id?: number;
  table: "patients" | "assessments";
  action: "insert" | "update" | "delete";
  recordId: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface SyncConflict {
  id?: number;
  table: "patients" | "assessments";
  recordId: string;
  localVersion: number;
  serverVersion: number;
  localData: unknown;
  serverData: unknown;
  resolution?: "local" | "server" | "manual";
  resolvedAt?: string;
  createdAt: string;
}

export interface TriageResult {
  condition: string;
  confidence: number;
  urgency: Urgency;
  possible_conditions: PossibleCondition[];
  key_visual_features: string[];
  recommendation: string;
  referral_advised: boolean;
  follow_up_questions: string[];
}

export interface DocumentResult {
  document_type: "lab_report" | "prescription" | "referral" | "other";
  key_findings: { parameter: string; value: string; is_abnormal: boolean }[];
  summary: string;
  plain_language_explanation: string;
  abnormal_flags: string[];
  recommendation: string;
}
