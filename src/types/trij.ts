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

export interface PrimaryDiagnosis {
  name: string;
  confidence: number;
  supportingFeatures: string[];
  againstFeatures: string[];
}

export interface DifferentialOption {
  rank: number;
  name: string;
  confidence: number;
  distinguishingQuestions: string[];
}

export interface DifferentialDiagnosis {
  primaryDiagnosis: PrimaryDiagnosis;
  differentials: DifferentialOption[];
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
  differentialDiagnosis?: {
    primaryDiagnosis: {
      name: string;
      confidence: number;
      supportingFeatures: string[];
      againstFeatures: string[];
    };
    differentials: Array<{
      rank: number;
      name: string;
      confidence: number;
      distinguishingQuestions: string[];
    }>;
  };
  clinicalScale?: {
    scaleName: string;
    scaleId: string;
    score: number;
    maxScore: number;
    grade: string;
    interpretation: string;
    managementGuidance: string;
    source: string;
    sourceUrl?: string;
  };
  nutrition?: NutritionRecord;
  symptoms?: string[];
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
  consentRecord?: ConsentRecord;
  aiFeedback?: AiFeedback;
  createdAt: string;
  syncedAt?: string;
  version: number;
}

export interface ConsentRecord {
  version: number;
  method: "verbal" | "thumbprint" | "signature" | "voice";
  capturedAt: string;
  capturedBy: string;
  items: Array<{
    id: string;
    agreed: boolean;
  }>;
  policyVersion: number;
}

export type NutritionClassification = "sam" | "mam" | "normal" | "overweight" | "obese";

export interface NutritionRecord {
  muacCm: number;
  classification: NutritionClassification;
  oedema: "none" | "bilateral_mild" | "bilateral_moderate" | "bilateral_severe";
  visibleWasting: boolean;
  hairChanges: boolean;
  skinChanges: boolean;
  samTriggered: boolean;
  urgency: "green" | "yellow" | "red";
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
  referral_advised?: boolean;
  rag_sources?: { condition: string; treatment: string; who_guideline: string }[];
  follow_up_questions?: string[];
  differential_diagnosis?: {
    primary_diagnosis: {
      name: string;
      confidence: number;
      supporting_features: string[];
      against_features: string[];
    };
    differentials: Array<{
      rank: number;
      name: string;
      confidence: number;
      distinguishing_questions: string[];
    }>;
  };
  clinical_scale?: {
    scaleName: string;
    scaleId: string;
    score: number;
    maxScore: number;
    grade: string;
    interpretation: string;
    managementGuidance: string;
    source: string;
    sourceUrl?: string;
  };
}

export type AiFeedbackRating = "correct" | "partial" | "incorrect";

export interface AiFeedback {
  rating: AiFeedbackRating;
  actualCondition?: string;
  ratedBy: string;
  ratedAt: string;
}

export type NotificationKind =
  | "referral_status"
  | "follow_up_reminder"
  | "sync_complete"
  | "supervisor_message"
  | "protocol_update"
  | "app_update";

export interface InAppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  linkTo?: string;
  read: boolean;
  createdAt: string;
}

export interface DocumentResult {
  document_type: "lab_report" | "prescription" | "referral" | "other";
  key_findings: { parameter: string; value: string; is_abnormal: boolean }[];
  summary: string;
  plain_language_explanation: string;
  abnormal_flags: string[];
  recommendation: string;
}

export type AuditAction =
  | "patient:read"
  | "patient:list"
  | "patient:create"
  | "patient:update"
  | "assessment:read"
  | "assessment:create"
  | "assessment:list"
  | "followup:read"
  | "referral:read"
  | "supervisor:read"
  | "red_flag:triggered";

export interface AuditEvent {
  id?: number;
  action: AuditAction;
  userId: string;
  patientId?: string;
  resourceType: "patient" | "assessment" | "followup" | "referral";
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
  synced: boolean;
}
