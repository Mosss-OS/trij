/**
 * WHO Child Growth Standards (2006) Reference Data
 * Simplified implementation for Z-score calculations
 * Based on WHO Multicentre Growth Reference Study (MGRS)
 */

export interface WHOGrowthStandard {
  ageMonths: number;
  L: number; // Box-Cox transformation parameter
  M: number; // Median value
  S: number; // Coefficient of variation
}

export interface ZScoreResult {
  waz: number; // Weight-for-Age Z-score
  haz: number; // Height-for-Age Z-score  
  whz: number; // Weight-for-Height Z-score
  bmiForAge: number; // BMI-for-Age Z-score
  classification: "sam" | "mam" | "normal" | "overweight" | "obese";
  urgency: "green" | "yellow" | "red";
}

/**
 * WHO 2006 Boys Weight-for-Age standards (0-60 months)
 * Simplified key data points for interpolation
 */
export const BOYS_WFA: WHOGrowthStandard[] = [
  { ageMonths: 0, L: 0.3505, M: 3.3464, S: 0.14602 },
  { ageMonths: 6, L: 0.0673, M: 7.9368, S: 0.11977 },
  { ageMonths: 12, L: 0.0294, M: 9.6468, S: 0.11268 },
  { ageMonths: 18, L: 0.0160, M: 10.785, S: 0.11106 },
  { ageMonths: 24, L: 0.0109, M: 11.730, S: 0.11130 },
  { ageMonths: 36, L: 0.0063, M: 13.428, S: 0.11373 },
  { ageMonths: 48, L: 0.0035, M: 14.812, S: 0.11723 },
  { ageMonths: 60, L: 0.0015, M: 16.069, S: 0.12108 },
];

/**
 * WHO 2006 Girls Weight-for-Age standards (0-60 months)
 */
export const GIRLS_WFA: WHOGrowthStandard[] = [
  { ageMonths: 0, L: 0.3809, M: 3.2322, S: 0.14171 },
  { ageMonths: 6, L: 0.1024, M: 7.2970, S: 0.12017 },
  { ageMonths: 12, L: 0.0555, M: 8.9517, S: 0.11321 },
  { ageMonths: 18, L: 0.0324, M: 10.023, S: 0.11162 },
  { ageMonths: 24, L: 0.0210, M: 10.902, S: 0.11173 },
  { ageMonths: 36, L: 0.0105, M: 12.537, S: 0.11387 },
  { ageMonths: 48, L: 0.0054, M: 13.846, S: 0.11723 },
  { ageMonths: 60, L: 0.0027, M: 15.017, S: 0.12088 },
];

/**
 * WHO 2006 Boys Length/Height-for-Age standards (0-60 months)
 */
export const BOYS_HFA: WHOGrowthStandard[] = [
  { ageMonths: 0, L: 1, M: 49.884, S: 0.03795 },
  { ageMonths: 6, L: 1, M: 67.623, S: 0.03552 },
  { ageMonths: 12, L: 1, M: 75.728, S: 0.03486 },
  { ageMonths: 18, L: 1, M: 82.257, S: 0.03466 },
  { ageMonths: 24, L: 1, M: 87.842, S: 0.03471 },
  { ageMonths: 36, L: 1, M: 96.109, S: 0.03533 },
  { ageMonths: 48, L: 1, M: 103.319, S: 0.03615 },
  { ageMonths: 60, L: 1, M: 109.944, S: 0.03701 },
];

/**
 * WHO 2006 Girls Length/Height-for-Age standards (0-60 months)
 */
export const GIRLS_HFA: WHOGrowthStandard[] = [
  { ageMonths: 0, L: 1, M: 49.148, S: 0.03830 },
  { ageMonths: 6, L: 1, M: 65.736, S: 0.03619 },
  { ageMonths: 12, L: 1, M: 74.017, S: 0.03557 },
  { ageMonths: 18, L: 1, M: 80.653, S: 0.03537 },
  { ageMonths: 24, L: 1, M: 86.432, S: 0.03544 },
  { ageMonths: 36, L: 1, M: 94.874, S: 0.03609 },
  { ageMonths: 48, L: 1, M: 102.298, S: 0.03694 },
  { ageMonths: 60, L: 1, M: 109.100, S: 0.03780 },
];

/**
 * WHO 2006 Boys Weight-for-Length/Height standards (45-110 cm)
 * Key data points for common heights
 */
export const BOYS_WFH: { heightCm: number; L: number; M: number; S: number }[] = [
  { heightCm: 45, L: 0.3352, M: 2.558, S: 0.12533 },
  { heightCm: 65, L: 0.1152, M: 7.345, S: 0.11628 },
  { heightCm: 75, L: 0.0558, M: 9.322, S: 0.11267 },
  { heightCm: 85, L: 0.0296, M: 11.335, S: 0.11128 },
  { heightCm: 95, L: 0.0163, M: 13.392, S: 0.11132 },
  { heightCm: 105, L: 0.0089, M: 15.511, S: 0.11225 },
  { heightCm: 110, L: 0.0061, M: 16.602, S: 0.11312 },
];

/**
 * WHO 2006 Girls Weight-for-Length/Height standards (45-110 cm)
 */
export const GIRLS_WFH: { heightCm: number; L: number; M: number; S: number }[] = [
  { heightCm: 45, L: 0.3705, M: 2.504, S: 0.12645 },
  { heightCm: 65, L: 0.1463, M: 6.832, S: 0.11757 },
  { heightCm: 75, L: 0.0792, M: 8.743, S: 0.11393 },
  { heightCm: 85, L: 0.0468, M: 10.686, S: 0.11251 },
  { heightCm: 95, L: 0.0282, M: 12.675, S: 0.11248 },
  { heightCm: 105, L: 0.0168, M: 14.732, S: 0.11330 },
  { heightCm: 110, L: 0.0131, M: 15.807, S: 0.11411 },
];

/**
 * WHO 2006 BMI-for-Age standards (0-60 months)
 */
export const BOYS_BMI: WHOGrowthStandard[] = [
  { ageMonths: 0, L: -0.4265, M: 13.416, S: 0.12376 },
  { ageMonths: 6, L: -0.1166, M: 16.162, S: 0.12997 },
  { ageMonths: 12, L: -0.0381, M: 16.826, S: 0.13244 },
  { ageMonths: 18, L: -0.0069, M: 16.708, S: 0.13297 },
  { ageMonths: 24, L: 0.0064, M: 16.594, S: 0.13335 },
  { ageMonths: 36, L: 0.0189, M: 16.228, S: 0.13391 },
  { ageMonths: 48, L: 0.0235, M: 15.906, S: 0.13445 },
  { ageMonths: 60, L: 0.0252, M: 15.672, S: 0.13495 },
];

export const GIRLS_BMI: WHOGrowthStandard[] = [
  { ageMonths: 0, L: -0.3589, M: 13.282, S: 0.12446 },
  { ageMonths: 6, L: -0.0799, M: 15.828, S: 0.12973 },
  { ageMonths: 12, L: -0.0178, M: 16.574, S: 0.13214 },
  { ageMonths: 18, L: 0.0058, M: 16.556, S: 0.13262 },
  { ageMonths: 24, L: 0.0158, M: 16.546, S: 0.13295 },
  { ageMonths: 36, L: 0.0246, M: 16.338, S: 0.13341 },
  { ageMonths: 48, L: 0.0279, M: 16.130, S: 0.13387 },
  { ageMonths: 60, L: 0.0293, M: 15.965, S: 0.13430 },
];

/**
 * Linear interpolation for WHO standards
 */
function interpolateStandard(
  standards: WHOGrowthStandard[],
  ageMonths: number
): WHOGrowthStandard {
  if (ageMonths <= standards[0].ageMonths) return standards[0];
  if (ageMonths >= standards[standards.length - 1].ageMonths) {
    return standards[standards.length - 1];
  }

  for (let i = 0; i < standards.length - 1; i++) {
    if (ageMonths >= standards[i].ageMonths && ageMonths <= standards[i + 1].ageMonths) {
      const t = (ageMonths - standards[i].ageMonths) / (standards[i + 1].ageMonths - standards[i].ageMonths);
      return {
        ageMonths,
        L: standards[i].L + t * (standards[i + 1].L - standards[i].L),
        M: standards[i].M + t * (standards[i + 1].M - standards[i].M),
        S: standards[i].S + t * (standards[i + 1].S - standards[i].S),
      };
    }
  }

  return standards[standards.length - 1];
}

/**
 * Linear interpolation for weight-for-height standards
 */
function interpolateWFH(
  standards: { heightCm: number; L: number; M: number; S: number }[],
  heightCm: number
): { L: number; M: number; S: number } {
  if (heightCm <= standards[0].heightCm) {
    return { L: standards[0].L, M: standards[0].M, S: standards[0].S };
  }
  if (heightCm >= standards[standards.length - 1].heightCm) {
    const last = standards[standards.length - 1];
    return { L: last.L, M: last.M, S: last.S };
  }

  for (let i = 0; i < standards.length - 1; i++) {
    if (heightCm >= standards[i].heightCm && heightCm <= standards[i + 1].heightCm) {
      const t = (heightCm - standards[i].heightCm) / (standards[i + 1].heightCm - standards[i].heightCm);
      return {
        L: standards[i].L + t * (standards[i + 1].L - standards[i].L),
        M: standards[i].M + t * (standards[i + 1].M - standards[i].M),
        S: standards[i].S + t * (standards[i + 1].S - standards[i].S),
      };
    }
  }

  const last = standards[standards.length - 1];
  return { L: last.L, M: last.M, S: last.S };
}

/**
 * Calculate Z-score using WHO Box-Cox transformation
 * Z = ((X/M)^L - 1) / (L * S) for L ≠ 0
 * Z = ln(X/M) / S for L = 0
 */
function calculateZScore(value: number, L: number, M: number, S: number): number {
  if (L === 0) {
    return Math.log(value / M) / S;
  }
  return (Math.pow(value / M, L) - 1) / (L * S);
}

/**
 * Calculate all WHO Z-scores for a child
 */
export function calculateWHOScores(
  weightKg: number,
  heightCm: number,
  ageMonths: number,
  sex: "male" | "female"
): ZScoreResult | null {
  // Validation
  if (ageMonths < 0 || ageMonths > 60) return null; // WHO standards 0-60 months
  if (weightKg <= 0 || heightCm <= 0) return null;

  const isBoy = sex === "male";
  
  // Get appropriate standards
  const wfaStandards = isBoy ? BOYS_WFA : GIRLS_WFA;
  const hfaStandards = isBoy ? BOYS_HFA : GIRLS_HFA;
  const wfhStandards = isBoy ? BOYS_WFH : GIRLS_WFH;
  const bmiStandards = isBoy ? BOYS_BMI : GIRLS_BMI;

  // Interpolate standards for exact age
  const wfaStandard = interpolateStandard(wfaStandards, ageMonths);
  const hfaStandard = interpolateStandard(hfaStandards, ageMonths);
  const bmiStandard = interpolateStandard(bmiStandards, ageMonths);
  const wfhStandard = interpolateWFH(wfhStandards, heightCm);

  // Calculate Z-scores
  const waz = calculateZScore(weightKg, wfaStandard.L, wfaStandard.M, wfaStandard.S);
  const haz = calculateZScore(heightCm, hfaStandard.L, hfaStandard.M, hfaStandard.S);
  const whz = calculateZScore(weightKg, wfhStandard.L, wfhStandard.M, wfhStandard.S);

  // Calculate BMI
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  const bmiForAge = calculateZScore(bmi, bmiStandard.L, bmiStandard.M, bmiStandard.S);

  // Classify based on WHZ (primary indicator for acute malnutrition)
  let classification: ZScoreResult["classification"];
  let urgency: ZScoreResult["urgency"];

  if (whz < -3) {
    classification = "sam";
    urgency = "red";
  } else if (whz < -2) {
    classification = "mam";
    urgency = "yellow";
  } else if (bmiForAge > 2) {
    classification = "overweight";
    urgency = "green";
  } else if (bmiForAge > 3) {
    classification = "obese";
    urgency = "yellow";
  } else {
    classification = "normal";
    urgency = "green";
  }

  return {
    waz,
    haz,
    whz,
    bmiForAge,
    classification,
    urgency,
  };
}

/**
 * Get Z-score classification label
 */
export function getZScoreLabel(zScore: number): string {
  if (zScore < -3) return "Severe (< -3)";
  if (zScore < -2) return "Moderate (-3 to -2)";
  if (zScore < -1) return "Mild (-2 to -1)";
  if (zScore < 1) return "Normal (-1 to +1)";
  if (zScore < 2) return "Mild (+1 to +2)";
  if (zScore < 3) return "Moderate (+2 to +3)";
  return "High (> +3)";
}

/**
 * Get Z-score color for UI
 */
export function getZScoreColor(zScore: number): string {
  if (zScore < -3) return "text-urgency-red";
  if (zScore < -2) return "text-urgency-yellow";
  if (zScore < -1) return "text-amber-600";
  if (zScore < 1) return "text-emerald-600";
  if (zScore < 2) return "text-amber-600";
  if (zScore < 3) return "text-urgency-yellow";
  return "text-urgency-red";
}