/**
 * Nutrition Assessment Module
 * 
 * This module evaluates nutritional status using Mid-Upper Arm Circumference (MUAC)
 * measurements to detect acute malnutrition in children and adults. It implements
 * WHO-established thresholds for classifying nutritional status and determining
 * appropriate interventions.
 * 
 * The assessment considers:
 * - MUAC measurement (in cm)
 * - Age (to determine child vs adult thresholds)
 * - Presence of bilateral edema
 * - Visible wasting
 * - Hair and skin changes
 * 
 * Results are classified according to WHO standards:
 * - SAM: Severe Acute Malnutrition (requires urgent intervention)
 * - MAM: Moderate Acute Malnutrition (needs supplemental feeding)
 * - Normal: Adequate nutritional status
 * - Overweight: Risk of obesity-related conditions
 * - Obese: High risk of obesity complications
 */

export type NutritionClassification = "sam" | "mam" | "normal" | "overweight" | "obese";

export interface NutritionAssessmentResult {
  muacCm: number;
  classification: NutritionClassification;
  oedema: "none" | "bilateral_mild" | "bilateral_moderate" | "bilateral_severe";
  visibleWasting: boolean;
  hairChanges: boolean;
  skinChanges: boolean;
  isChild: boolean;
  samTriggered: boolean;
  urgency: "green" | "yellow" | "red";
}

/**
 * MUAC thresholds for children (0-18 years)
 * Values in cm
 */
const CHILD_MUAC_THRESHOLDS = {
  sam: 11.5,  // Below this: Severe Acute Malnutrition
  mam: 12.5,  // Below this: Moderate Acute Malnutrition  
  normal: 17.0, // Below this: Normal
  overweight: 20.0, // Below this: Overweight
};

/**
 * MUAC thresholds for adults (18+ years)
 * Values in cm
 */
const ADULT_MUAC_THRESHOLDS = {
  sam: 18.5,  // Below this: Severe Acute Malnutrition
  mam: 20.0,  // Below this: Moderate Acute Malnutrition
  normal: 25.0, // Below this: Normal
  overweight: 30.0, // Below this: Overweight
};

export function classifyMUAC(muacCm: number, isChild: boolean): NutritionClassification {
  const t = isChild ? CHILD_MUAC_THRESHOLDS : ADULT_MUAC_THRESHOLDS;
  if (muacCm < t.sam) return "sam";
  if (muacCm < t.mam) return "mam";
  if (muacCm < t.normal) return "normal";
  if (muacCm < t.overweight) return "overweight";
  return "obese";
}

export function assessNutrition(
  muacCm: number,
  ageYears: number,
  oedema: NutritionAssessmentResult["oedema"],
  visibleWasting: boolean,
  hairChanges: boolean,
  skinChanges: boolean,
): NutritionAssessmentResult {
  const isChild = ageYears < 18;
  const classification = classifyMUAC(muacCm, isChild);
  const samTriggered = classification === "sam" || oedema !== "none";
  const urgency = samTriggered ? "red" : classification === "mam" ? "yellow" : "green";

  return {
    muacCm,
    classification,
    oedema,
    visibleWasting,
    hairChanges,
    skinChanges,
    isChild,
    samTriggered,
    urgency,
  };
}

export function getClassificationLabel(classification: NutritionClassification): string {
  const labels: Record<NutritionClassification, string> = {
    sam: "Severe Acute Malnutrition (SAM)",
    mam: "Moderate Acute Malnutrition (MAM)",
    normal: "Normal",
    overweight: "Overweight",
    obese: "Obese",
  };
  return labels[classification];
}

export function getClassificationColor(classification: NutritionClassification): string {
  const colors: Record<NutritionClassification, string> = {
    sam: "text-urgency-red border-urgency-red/30 bg-urgency-red/10",
    mam: "text-urgency-yellow border-urgency-yellow/30 bg-urgency-yellow/10",
    normal: "text-emerald-600 border-emerald-500/20 bg-emerald-50/50",
    overweight: "text-amber-600 border-amber-400/30 bg-amber-50",
    obese: "text-urgency-red border-urgency-red/30 bg-urgency-red/10",
  };
  return colors[classification];
}

export function getOedemaLabel(oedema: NutritionAssessmentResult["oedema"]): string {
  const labels: Record<NutritionAssessmentResult["oedema"], string> = {
    none: "None",
    bilateral_mild: "Bilateral mild (+)",
    bilateral_moderate: "Bilateral moderate (++)",
    bilateral_severe: "Bilateral severe (+++)",
  };
  return labels[oedema];
}
