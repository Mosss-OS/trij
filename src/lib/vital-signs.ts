/**
 * Vital Signs Assessment Module
 * 
 * This module evaluates vital signs against age-specific normal ranges to detect
 * abnormalities that may indicate serious medical conditions. It implements
 * age-based thresholds for temperature, heart rate, respiratory rate, blood pressure,
 * and oxygen saturation based on standard pediatric and adult reference values.
 * 
 * The evaluation considers both abnormal and critical thresholds, with critical
 * values triggering immediate red urgency overrides.
 */

export type VitalSignAgeGroup = "infant" | "toddler" | "child" | "adult" | "elderly";

export interface VitalSignAlert {
  field: string;
  label: string;
  value: number;
  severity: "abnormal" | "critical";
  interpretation: string;
  normalRange: string;
}

export interface VitalSignsEvaluation {
  alerts: VitalSignAlert[];
  score: number;
  urgencyOverride: "green" | "yellow" | "red" | null;
}

interface NormalRange {
  min: number;
  max: number;
  criticalLow?: number;
  criticalHigh?: number;
  label: string;
}

/**
 * Classify a patient into an age group for vital signs evaluation.
 * 
 * Age groups are defined as:
 * - Infant: 0 to < 1 year
 * - Toddler: 1 to < 5 years  
 * - Child: 5 to < 13 years
 * - Adult: 13 to < 65 years
 * - Elderly: 65+ years
 * 
 * @param ageYears - Patient's age in years (can be fractional)
 * @returns The appropriate VitalSignAgeGroup for the patient's age
 */
function classifyAge(ageYears: number): VitalSignAgeGroup {
  if (ageYears < 1) return "infant";
  if (ageYears < 5) return "toddler";
  if (ageYears < 13) return "child";
  if (ageYears < 65) return "adult";
  return "elderly";
}

const TEMP_MIN = 35;
const TEMP_HYPOTHERMIA = 36;
const TEMP_NORMAL_MAX = 37.5;
const TEMP_FEVER = 38.5;
const TEMP_CRITICAL = 39.5;

function evaluateTemperature(temp: number, ageYears: number): VitalSignAlert | null {
  if (temp < TEMP_HYPOTHERMIA) {
    return {
      field: "temperature",
      label: "Temperature",
      value: temp,
      severity: temp < TEMP_MIN ? "critical" : "abnormal",
      interpretation:
        temp < TEMP_MIN
          ? "Critical hypothermia — immediate warming required"
          : "Mild hypothermia — monitor and warm patient",
      normalRange: `${TEMP_HYPOTHERMIA}-${TEMP_NORMAL_MAX}`,
    };
  }
  if (temp > TEMP_NORMAL_MAX) {
    const isInfant = ageYears < 1;
    const infantFeverThreshold = 38.5;
    if (temp >= infantFeverThreshold && isInfant) {
      return {
        field: "temperature",
        label: "Temperature",
        value: temp,
        severity: "critical",
        interpretation: "Fever in infant under 1 year — high risk of serious bacterial infection",
        normalRange: `${TEMP_HYPOTHERMIA}-${TEMP_NORMAL_MAX}`,
      };
    }
    if (temp >= TEMP_CRITICAL) {
      return {
        field: "temperature",
        label: "Temperature",
        value: temp,
        severity: "critical",
        interpretation: "Critical hyperpyrexia — risk of seizures, immediate cooling measures",
        normalRange: `${TEMP_HYPOTHERMIA}-${TEMP_NORMAL_MAX}`,
      };
    }
    return {
      field: "temperature",
      label: "Temperature",
      value: temp,
      severity: temp >= TEMP_FEVER ? "abnormal" : "abnormal",
      interpretation:
        temp >= TEMP_FEVER
          ? "High fever — consider antipyretics"
          : "Mild fever — monitor and reassess",
      normalRange: `${TEMP_HYPOTHERMIA}-${TEMP_NORMAL_MAX}`,
    };
  }
  return null;
}

const RR_RANGES: Record<VitalSignAgeGroup, NormalRange> = {
  infant: { min: 30, max: 50, criticalLow: 20, criticalHigh: 60, label: "30-50" },
  toddler: { min: 22, max: 40, criticalLow: 15, criticalHigh: 50, label: "22-40" },
  child: { min: 18, max: 30, criticalLow: 12, criticalHigh: 40, label: "18-30" },
  adult: { min: 12, max: 20, criticalLow: 8, criticalHigh: 30, label: "12-20" },
  elderly: { min: 12, max: 24, criticalLow: 8, criticalHigh: 28, label: "12-24" },
};

function evaluateRespiratoryRate(rr: number, ageYears: number): VitalSignAlert | null {
  const group = classifyAge(ageYears);
  const range = RR_RANGES[group];
  if (rr < range.min) {
    const isCritical = range.criticalLow !== undefined && rr <= range.criticalLow!;
    return {
      field: "respiratoryRate",
      label: "Resp. Rate",
      value: rr,
      severity: isCritical ? "critical" : "abnormal",
      interpretation: isCritical ? "Bradypnoea — respiratory depression risk" : "Low respiratory rate — monitor closely",
      normalRange: range.label,
    };
  }
  if (rr > range.max) {
    const isCritical = range.criticalHigh !== undefined && rr >= range.criticalHigh!;
    return {
      field: "respiratoryRate",
      label: "Resp. Rate",
      value: rr,
      severity: isCritical ? "critical" : "abnormal",
      interpretation: isCritical
        ? "Severe tachypnoea — possible respiratory distress or sepsis"
        : "Tachypnoea — assess for respiratory distress",
      normalRange: range.label,
    };
  }
  return null;
}

const HR_RANGES: Record<VitalSignAgeGroup, NormalRange> = {
  infant: { min: 100, max: 160, criticalLow: 80, criticalHigh: 180, label: "100-160" },
  toddler: { min: 80, max: 140, criticalLow: 60, criticalHigh: 160, label: "80-140" },
  child: { min: 70, max: 120, criticalLow: 50, criticalHigh: 140, label: "70-120" },
  adult: { min: 60, max: 100, criticalLow: 40, criticalHigh: 130, label: "60-100" },
  elderly: { min: 60, max: 100, criticalLow: 40, criticalHigh: 130, label: "60-100" },
};

function evaluateHeartRate(hr: number, ageYears: number): VitalSignAlert | null {
  const group = classifyAge(ageYears);
  const range = HR_RANGES[group];
  if (hr < range.min) {
    const isCritical = range.criticalLow !== undefined && hr <= range.criticalLow!;
    return {
      field: "heartRate",
      label: "Heart Rate",
      value: hr,
      severity: isCritical ? "critical" : "abnormal",
      interpretation: isCritical
        ? "Severe bradycardia — immediate assessment required"
        : "Bradycardia — consider cardiac evaluation",
      normalRange: range.label,
    };
  }
  if (hr > range.max) {
    const isCritical = range.criticalHigh !== undefined && hr >= range.criticalHigh!;
    return {
      field: "heartRate",
      label: "Heart Rate",
      value: hr,
      severity: isCritical ? "critical" : "abnormal",
      interpretation: isCritical
        ? "Severe tachycardia — possible shock, fever, or cardiac arrhythmia"
        : "Tachycardia — assess for fever, pain, dehydration",
      normalRange: range.label,
    };
  }
  return null;
}

const SBP_RANGES: Record<VitalSignAgeGroup, NormalRange> = {
  infant: { min: 70, max: 100, criticalLow: 60, criticalHigh: 120, label: "70-100" },
  toddler: { min: 80, max: 105, criticalLow: 70, criticalHigh: 120, label: "80-105" },
  child: { min: 85, max: 115, criticalLow: 75, criticalHigh: 130, label: "85-115" },
  adult: { min: 90, max: 120, criticalLow: 90, criticalHigh: 180, label: "90-120" },
  elderly: { min: 90, max: 140, criticalLow: 90, criticalHigh: 180, label: "90-140" },
};

function evaluateBloodPressure(sbp: number, dbp: number | undefined, ageYears: number): VitalSignAlert[] {
  const alerts: VitalSignAlert[] = [];
  const group = classifyAge(ageYears);
  const range = SBP_RANGES[group];

  if (sbp < range.min) {
    const isCritical = range.criticalLow !== undefined && sbp <= range.criticalLow!;
    alerts.push({
      field: "systolicBP",
      label: "Systolic BP",
      value: sbp,
      severity: isCritical ? "critical" : "abnormal",
      interpretation: isCritical
        ? "Critical hypotension — risk of shock, immediate IV access required"
        : "Low blood pressure — monitor for signs of shock",
      normalRange: range.label,
    });
  }
  if (sbp > range.max) {
    const isCritical = range.criticalHigh !== undefined && sbp >= range.criticalHigh!;
    alerts.push({
      field: "systolicBP",
      label: "Systolic BP",
      value: sbp,
      severity: isCritical ? "critical" : "abnormal",
      interpretation: isCritical
        ? "Severe hypertension — risk of hypertensive emergency"
        : "Elevated blood pressure — reassess and monitor",
      normalRange: range.label,
    });
  }

  if (dbp !== undefined && dbp > 110) {
    alerts.push({
      field: "diastolicBP",
      label: "Diastolic BP",
      value: dbp,
      severity: "critical",
      interpretation: "Severe diastolic hypertension — possible pre-eclampsia or hypertensive crisis",
      normalRange: "< 110",
    });
  } else if (dbp !== undefined && dbp > 90) {
    alerts.push({
      field: "diastolicBP",
      label: "Diastolic BP",
      value: dbp,
      severity: "abnormal",
      interpretation: "Elevated diastolic BP — monitor and reassess",
      normalRange: "< 90",
    });
  }

  return alerts;
}

const SPO2_NORMAL = 95;
const SPO2_CRITICAL = 92;

function evaluateOxygenSaturation(spo2: number): VitalSignAlert | null {
  if (spo2 >= SPO2_NORMAL) return null;
  const isCritical = spo2 < SPO2_CRITICAL;
  return {
    field: "oxygenSaturation",
    label: "O₂ Sat",
    value: spo2,
    severity: isCritical ? "critical" : "abnormal",
    interpretation: isCritical
      ? "Critical hypoxaemia — urgent oxygen therapy required"
      : "Low oxygen saturation — provide oxygen and reassess",
    normalRange: `≥ ${SPO2_NORMAL}`,
  };
}

export function evaluateVitalSigns(
  vitals: {
    temperature?: number;
    respiratoryRate?: number;
    heartRate?: number;
    systolicBP?: number;
    diastolicBP?: number;
    oxygenSaturation?: number;
  },
  ageYears: number,
): VitalSignsEvaluation {
  const alerts: VitalSignAlert[] = [];

  if (vitals.temperature !== undefined) {
    const alert = evaluateTemperature(vitals.temperature, ageYears);
    if (alert) alerts.push(alert);
  }

  if (vitals.respiratoryRate !== undefined) {
    const alert = evaluateRespiratoryRate(vitals.respiratoryRate, ageYears);
    if (alert) alerts.push(alert);
  }

  if (vitals.heartRate !== undefined) {
    const alert = evaluateHeartRate(vitals.heartRate, ageYears);
    if (alert) alerts.push(alert);
  }

  if (vitals.systolicBP !== undefined) {
    const bpAlerts = evaluateBloodPressure(vitals.systolicBP, vitals.diastolicBP, ageYears);
    alerts.push(...bpAlerts);
  }

  if (vitals.oxygenSaturation !== undefined) {
    const alert = evaluateOxygenSaturation(vitals.oxygenSaturation);
    if (alert) alerts.push(alert);
  }

  const criticals = alerts.filter((a) => a.severity === "critical");
  const abnormals = alerts.filter((a) => a.severity === "abnormal");

  let urgencyOverride: "green" | "yellow" | "red" | null = null;
  if (criticals.length > 0) {
    urgencyOverride = "red";
  } else if (abnormals.length >= 2) {
    urgencyOverride = "yellow";
  }

  const score = alerts.reduce((s, a) => s + (a.severity === "critical" ? 2 : 1), 0);

  return { alerts, score, urgencyOverride };
}

export function getAgeGroup(ageYears: number): VitalSignAgeGroup {
  return classifyAge(ageYears);
}

export function getNormalRanges(ageYears: number): Record<string, string> {
  const group = classifyAge(ageYears);
  return {
    temperature: `${TEMP_HYPOTHERMIA}-${TEMP_NORMAL_MAX}`,
    respiratoryRate: RR_RANGES[group].label,
    heartRate: HR_RANGES[group].label,
    systolicBP: SBP_RANGES[group].label,
    oxygenSaturation: `≥ ${SPO2_NORMAL}`,
  };
}
