import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { Assessment, Urgency, PresentationType } from "@/types/trij";

// ─── DHIS2 Configuration ───────────────────────────────────────────────────

export interface Dhis2Config {
  baseUrl: string;
  username: string;
  password: string;
  orgUnit: string;          // DHIS2 organisation unit ID
  dataSet: string;          // DHIS2 data set ID
  period: string;           // e.g. "202601" for January 2026
}

export interface Dhis2OrgUnitMapping {
  trijRegion: string;       // Trij region/location name
  dhis2OrgUnit: string;     // DHIS2 org unit ID
}

export interface Dhis2DataValue {
  dataElement: string;
  period: string;
  orgUnit: string;
  value: string | number;
}

export interface Dhis2DataSetPayload {
  dataSet: string;
  completeDate: string;
  period: string;
  orgUnit: string;
  dataValues: Dhis2DataValue[];
}

// ─── DHIS2 Data Element IDs (configurable per deployment) ──────────────────

export const DHIS2_DATA_ELEMENTS = {
  // Triage volume
  totalAssessments: "DE_TOTAL_ASSESSMENTS",
  assessmentsByUrgencyRed: "DE_ASSESSMENTS_RED",
  assessmentsByUrgencyYellow: "DE_ASSESSMENTS_YELLOW",
  assessmentsByUrgencyGreen: "DE_ASSESSMENTS_GREEN",

  // Condition categories (per WHO SMART Guidelines / ICD-10 blocks)
  conditionsDermatology: "DE_COND_DERMATOLOGY",
  conditionsRespiratory: "DE_COND_RESPIRATORY",
  conditionsFever: "DE_COND_FEVER",
  conditionsGastrointestinal: "DE_COND_GI",
  conditionsNeurological: "DE_COND_NEURO",
  conditionsMalnutrition: "DE_COND_MALNUTRITION",
  conditionsEyeEar: "DE_COND_EYE_EAR",
  conditionsMusculoskeletal: "DE_COND_MSK",

  // Demographics
  patientsFemale: "DE_PATIENTS_FEMALE",
  patientsMale: "DE_PATIENTS_MALE",
  patientsUnder5: "DE_PATIENTS_UNDER5",
  patients5to17: "DE_PATIENTS_5_17",
  patients18to59: "DE_PATIENTS_18_59",
  patients60plus: "DE_PATIENTS_60_PLUS",

  // Referrals
  referralsAdvised: "DE_REFERRALS_ADVISED",
  referralsCompleted: "DE_REFERRALS_COMPLETED",

  // Vital signs anomalies
  redFlagTriggers: "DE_RED_FLAG_TRIGGERS",
  abnormalVitals: "DE_ABNORMAL_VITALS",

  // Follow-ups
  followUpsScheduled: "DE_FOLLOWUPS_SCHEDULED",
  followUpsCompleted: "DE_FOLLOWUPS_COMPLETED",

  // Well-being
  chwWellBeingScore: "DE_CHW_WELLBEING",
} as const;

// ─── Data Mapping ───────────────────────────────────────────────────────────

function mapUrgency(urgency: Urgency | undefined): keyof typeof DHIS2_DATA_ELEMENTS | null {
  if (!urgency) return null;
  const map: Record<Urgency, keyof typeof DHIS2_DATA_ELEMENTS> = {
    red: "assessmentsByUrgencyRed",
    yellow: "assessmentsByUrgencyYellow",
    green: "assessmentsByUrgencyGreen",
  };
  return map[urgency] ?? null;
}

function mapPresentationType(
  pt: PresentationType | undefined,
): keyof typeof DHIS2_DATA_ELEMENTS | null {
  if (!pt) return null;
  const map: Record<PresentationType, keyof typeof DHIS2_DATA_ELEMENTS> = {
    dermatology: "conditionsDermatology",
    respiratory: "conditionsRespiratory",
    fever: "conditionsFever",
    gastrointestinal: "conditionsGastrointestinal",
    neurological: "conditionsNeurological",
    malnutrition: "conditionsMalnutrition",
    eye_ear: "conditionsEyeEar",
    musculoskeletal: "conditionsMusculoskeletal",
  };
  return map[pt] ?? null;
}

function mapAgeGroup(ageYears: number | undefined): keyof typeof DHIS2_DATA_ELEMENTS | null {
  if (ageYears === undefined || ageYears === null) return null;
  if (ageYears < 5) return "patientsUnder5";
  if (ageYears < 18) return "patients5to17";
  if (ageYears < 60) return "patients18to59";
  return "patients60plus";
}

// ─── Aggregation ────────────────────────────────────────────────────────────

export interface AggregatedCounts {
  [key: string]: number;
}

export function aggregateAssessments(assessments: Assessment[]): AggregatedCounts {
  const counts: AggregatedCounts = {};

  // Initialize all data elements to 0
  for (const key of Object.keys(DHIS2_DATA_ELEMENTS)) {
    counts[key] = 0;
  }

  counts.totalAssessments = assessments.length;

  for (const a of assessments) {
    // Urgency
    const urgencyKey = mapUrgency(a.urgency);
    if (urgencyKey) counts[urgencyKey]++;

    // Presentation type / condition category
    const condKey = mapPresentationType(a.presentationType);
    if (condKey) counts[condKey]++;

    // Demographics (we need patient data — use linked assessment data)
    // Age group is approximated from the patient linked to the assessment
    // Sex is not directly on Assessment type, so we skip per-assessment sex counting

    // Referrals
    if (a.referralAdvised) counts.referralsAdvised++;
    if (a.referralStatus === "feedback_received" || a.referralStatus === "resolved") {
      counts.referralsCompleted++;
    }
  }

  return counts;
}

// ─── Export Payload Builder ─────────────────────────────────────────────────

export function buildDhis2Payload(
  config: Dhis2Config,
  counts: AggregatedCounts,
): Dhis2DataSetPayload {
  const dataValues: Dhis2DataValue[] = [];

  for (const [key, value] of Object.entries(counts)) {
    const dataElement = (DHIS2_DATA_ELEMENTS as Record<string, string>)[key];
    if (!dataElement) continue;
    dataValues.push({
      dataElement,
      period: config.period,
      orgUnit: config.orgUnit,
      value,
    });
  }

  return {
    dataSet: config.dataSet,
    completeDate: format(new Date(), "yyyy-MM-dd"),
    period: config.period,
    orgUnit: config.orgUnit,
    dataValues,
  };
}

// ─── HTTP Client ────────────────────────────────────────────────────────────

export async function pushToDhis2(
  config: Dhis2Config,
  payload: Dhis2DataSetPayload,
): Promise<{ ok: boolean; httpStatus: number; response: any }> {
  const basicAuth = btoa(`${config.username}:${config.password}`);

  try {
    const resp = await fetch(
      `${config.baseUrl.replace(/\/$/, "")}/api/dataValueSets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(payload),
      },
    );

    const body = await resp.json();
    return {
      ok: resp.ok,
      httpStatus: resp.status,
      response: body,
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: 0,
      response: { error: (err as Error).message },
    };
  }
}

// ─── Validation ─────────────────────────────────────────────────────────────

export interface ExportValidationResult {
  valid: boolean;
  totalAssessments: number;
  dataElementCount: number;
  warnings: string[];
}

export function validateCounts(counts: AggregatedCounts): ExportValidationResult {
  const warnings: string[] = [];
  const total = counts.totalAssessments || 0;

  if (total === 0) {
    warnings.push("No assessments to export — the report will be empty");
  }

  const urgencySum =
    (counts.assessmentsByUrgencyRed || 0) +
    (counts.assessmentsByUrgencyYellow || 0) +
    (counts.assessmentsByUrgencyGreen || 0);

  if (urgencySum !== total) {
    warnings.push(
      `Urgency count (${urgencySum}) does not match total assessments (${total})`,
    );
  }

  const dataElementCount = Object.entries(counts).filter(
    ([, v]) => v > 0,
  ).length;

  return {
    valid: warnings.length === 0,
    totalAssessments: total,
    dataElementCount,
    warnings,
  };
}

// ─── Monthly Period Helpers ─────────────────────────────────────────────────

export function getCurrentDhis2Period(): string {
  return format(new Date(), "yyyyMM");
}

export function getPreviousDhis2Period(months: number = 1): string {
  return format(subMonths(new Date(), months), "yyyyMM");
}

export function getDhis2PeriodRange(start: Date, end: Date): string[] {
  const periods: string[] = [];
  let current = startOfMonth(start);
  const last = endOfMonth(end);

  while (current <= last) {
    periods.push(format(current, "yyyyMM"));
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return periods;
}

// ─── Supervisor Dashboard Export Trigger ────────────────────────────────────

export async function generateMonthlyDhis2Report(
  config: Dhis2Config,
  assessments: Assessment[],
): Promise<{ success: boolean; message: string; details?: any }> {
  const period = config.period || getCurrentDhis2Period();
  const configWithPeriod: Dhis2Config = { ...config, period };

  // Aggregate the assessment data
  const counts = aggregateAssessments(assessments);

  // Validate
  const validation = validateCounts(counts);
  if (!validation.valid && validation.totalAssessments > 0) {
    return {
      success: false,
      message: `Validation warnings: ${validation.warnings.join("; ")}`,
      details: validation,
    };
  }

  // Build payload
  const payload = buildDhis2Payload(configWithPeriod, counts);

  // Submit
  const result = await pushToDhis2(configWithPeriod, payload);

  if (result.ok) {
    return {
      success: true,
      message: `DHIS2 report submitted successfully (${validation.totalAssessments} assessments, ${validation.dataElementCount} data elements)`,
      details: { validation, payload, dhis2Response: result.response },
    };
  }

  return {
    success: false,
    message: `DHIS2 submission failed: HTTP ${result.httpStatus}`,
    details: result.response,
  };
}
