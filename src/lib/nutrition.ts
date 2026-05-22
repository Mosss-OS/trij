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

const CHILD_MUAC_THRESHOLDS = {
  sam: 11.5,
  mam: 12.5,
  normal: 17.0,
  overweight: 20.0,
};

const ADULT_MUAC_THRESHOLDS = {
  sam: 18.5,
  mam: 20.0,
  normal: 25.0,
  overweight: 30.0,
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
