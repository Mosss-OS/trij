export type Urgency = "green" | "yellow" | "red";

export type PresentationType =
  | "dermatology"
  | "respiratory"
  | "fever"
  | "gastrointestinal"
  | "neurological"
  | "malnutrition"
  | "eye_ear"
  | "musculoskeletal";
export type Sex = "M" | "F" | "other";

export interface VitalSigns {
  systolicBP?: number;       /* mmHg */
  diastolicBP?: number;      /* mmHg */
  heartRate?: number;        /* bpm */
  respiratoryRate?: number;  /* breaths/min */
  temperature?: number;      /* °C */
  oxygenSaturation?: number; /* SpO2 % */
  muac?: number;             /* mid-upper arm circumference cm */
  weight?: number;           /* kg */
  painScale?: number;        /* 0-10 */
}

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

export interface ReferralFeedback {
  diagnosis?: string;
  treatment?: string;
  outcome?: "treated" | "referred_elsewhere" | "admitted" | "discharged" | "unknown";
  notes?: string;
  facilityName?: string;
  facilityContact?: string;
  providedAt: string;
}

export interface Assessment {
  id: string;
  patientId: string;
  chwUserId: string;
  images: string[]; /* data URLs (offline-first); empty array for text-only assessments */
  imageSource?: "camera" | "gallery";
  presentationType?: PresentationType; /* body system assessed; undefined = dermatology (backwards-compat) */
  description?: string; /* free-text symptom description for non-dermatology presentations */
  vitalSigns?: VitalSigns;
  condition?: string;
  icd10Code?: string;
  confidence?: number;
  urgency?: Urgency;
  possibleConditions?: PossibleCondition[];
  keyVisualFeatures?: string[];
  recommendation?: string;
  voiceLog?: string;
  language: string;
  referralStatus: "none" | "pending" | "active" | "awaiting_feedback" | "feedback_received" | "resolved";
  referralStatusUpdatedAt?: string;
  referralAdvised?: boolean;
  referralFeedback?: ReferralFeedback;
  followUpQuestions?: string[];
  patientConsent?: boolean;
  consentTimestamp?: string;
  aiFeedback?: AiFeedback;
  createdAt: string;
  syncedAt?: string;
  version: number;
}

export interface FollowUp {
  id: string;
  patientId: string;
  assessmentId?: string;
  chwUserId: string;
  scheduledFor: string;     /* ISO date string */
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  completedAt?: string;
  createdAt: string;
  syncedAt?: string;
  version: number;
}

export interface SyncQueueItem {
  id?: number;
  table: "patients" | "assessments" | "follow_ups";
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
  icd10_code?: string;
  presentation_type?: PresentationType;
  description?: string; /* free-text symptom description for non-dermatology presentations */
  confidence: number;
  urgency: Urgency;
  possible_conditions: PossibleCondition[];
  key_visual_features: string[];
  recommendation: string;
}

export type AiFeedbackRating = "correct" | "partial" | "incorrect";

export interface AiFeedback {
  rating: AiFeedbackRating;
  actualCondition?: string;
  ratedBy: string;
  ratedAt: string;
}

export interface DocumentResult {
  document_type: "lab_report" | "prescription" | "referral" | "other";
  key_findings: { parameter: string; value: string; is_abnormal: boolean }[];
  summary: string;
  plain_language_explanation: string;
  abnormal_flags: string[];
  recommendation: string;
}
