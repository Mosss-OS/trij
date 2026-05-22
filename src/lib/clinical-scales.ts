export interface ClinicalScaleResult {
  scaleName: string;
  scaleId: string;
  score: number;
  maxScore: number;
  grade: string;
  interpretation: string;
  managementGuidance: string;
  source: string;
  sourceUrl?: string;
}

export interface BradenInputs {
  sensoryPerception: 1 | 2 | 3 | 4;
  moisture: 1 | 2 | 3 | 4;
  activity: 1 | 2 | 3 | 4;
  mobility: 1 | 2 | 3 | 4;
  nutrition: 1 | 2 | 3 | 4;
  frictionShear: 1 | 2 | 3;
}

export interface BurnInputs {
  percentHead: number;
  percentTrunk: number;
  percentArmLeft: number;
  percentArmRight: number;
  percentLegLeft: number;
  percentLegRight: number;
  percentPerineum: number;
  depth: "superficial" | "partial" | "full";
}

const WOUND_KEYWORDS = [
  "ulcer", "wound", "diabetic foot", "pressure sore", "pressure ulcer",
  "burn", "scald", "cellulitis", "abscess", "laceration", "cut",
];

export function detectApplicableScale(condition: string, keywords?: string[]): string | null {
  const terms = keywords ?? WOUND_KEYWORDS;
  const lower = condition.toLowerCase();
  for (const kw of terms) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

export function getScaleForCondition(condition: string): string | null {
  const lower = condition.toLowerCase();
  if (lower.includes("diabetic foot") || lower.includes("diabetic ulcer")) return "wagner";
  if (lower.includes("burn") || lower.includes("scald")) return "lund-browder";
  if (lower.includes("pressure") || (lower.includes("ulcer") && !lower.includes("diabetic"))) return "braden";
  if (lower.includes("wound") || lower.includes("ulcer")) return "wagner";
  return null;
}

export function applyWagnerScale(grade: number): ClinicalScaleResult {
  const interpretations: Record<number, { grade: string; interpretation: string; management: string }> = {
    0: {
      grade: "0 — No ulcer",
      interpretation: "Intact skin, no open lesion. High-risk foot.",
      management: "Patient education on foot care, proper footwear, daily inspection.",
    },
    1: {
      grade: "1 — Superficial ulcer",
      interpretation: "Full-thickness skin loss, not involving tendon, capsule, or bone.",
      management: "Offloading, wound debridement, infection control, blood glucose optimization.",
    },
    2: {
      grade: "2 — Deep ulcer",
      interpretation: "Deep ulcer penetrating to tendon or joint capsule, bone not involved.",
      management: "Urgent referral to specialist. Surgical debridement likely needed.",
    },
    3: {
      grade: "3 — Deep ulcer with abscess/osteitis",
      interpretation: "Deep ulcer with abscess, osteomyelitis, or joint sepsis.",
      management: "Immediate referral. Requires IV antibiotics, possible surgical intervention.",
    },
    4: {
      grade: "4 — Localised gangrene",
      interpretation: "Gangrene of toes or forefoot.",
      management: "Emergency referral. Vascular assessment and likely amputation.",
    },
    5: {
      grade: "5 — Extensive gangrene",
      interpretation: "Extensive gangrene involving whole foot.",
      management: "Emergency referral. Major amputation likely required.",
    },
  };
  const clamped = Math.max(0, Math.min(5, Math.round(grade)));
  const data = interpretations[clamped];
  return {
    scaleName: "Wagner Ulcer Classification Scale",
    scaleId: "wagner",
    score: clamped,
    maxScore: 5,
    grade: data.grade,
    interpretation: data.interpretation,
    managementGuidance: data.management,
    source: "Wagner FW. The dysvascular foot: a system for diagnosis and treatment. Foot Ankle. 1981.",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/7319435/",
  };
}

export function applyBradenScale(inputs: BradenInputs): ClinicalScaleResult {
  const scores = [
    inputs.sensoryPerception,
    inputs.moisture,
    inputs.activity,
    inputs.mobility,
    inputs.nutrition,
    inputs.frictionShear,
  ];
  const total = scores.reduce((s, v) => s + v, 0);

  const riskLevel =
    total <= 9 ? "Severe risk" :
    total <= 12 ? "High risk" :
    total <= 14 ? "Moderate risk" :
    total <= 18 ? "Mild risk" : "Minimal risk";

  const interpretation = `Total Braden score: ${total}/23 — ${riskLevel}.`;
  const guidance =
    total <= 12
      ? "Implement turning schedule every 2 hours, use pressure-relieving surfaces, optimize nutrition, keep skin dry."
      : total <= 18
        ? "Standard pressure injury prevention: regular repositioning, skin inspection, moisture management."
        : "Continue current prevention protocols. Maintain skin hygiene and regular monitoring.";

  return {
    scaleName: "Braden Scale for Predicting Pressure Injury Risk",
    scaleId: "braden",
    score: total,
    maxScore: 23,
    grade: riskLevel,
    interpretation,
    managementGuidance: guidance,
    source: "Bergstrom N, Braden BJ, Laguzza A, Holman V. The Braden Scale for Predicting Pressure Sore Risk. Nurs Res. 1987.",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/3299278/",
  };
}

export function applyLundBrowderChart(inputs: BurnInputs): ClinicalScaleResult {
  const totalBsa = Math.min(100,
    inputs.percentHead + inputs.percentTrunk + inputs.percentArmLeft +
    inputs.percentArmRight + inputs.percentLegLeft + inputs.percentLegRight +
    inputs.percentPerineum
  );

  const severity =
    totalBsa < 10 && inputs.depth === "superficial" ? "Minor" :
    totalBsa < 15 && inputs.depth !== "full" ? "Moderate" :
    totalBsa >= 15 || inputs.depth === "full" ? "Severe" : "Moderate";

  const interpretation = `Estimated burn surface area: ${totalBsa}% (${inputs.depth} depth). Severity: ${severity}.`;
  const guidance =
    severity === "Minor"
      ? "Clean with saline, apply topical antimicrobial (per local protocol), cover with non-adherent dressing. Follow up in 24-48h."
      : severity === "Moderate"
        ? "Refer to district hospital for burn wound assessment and IV fluid resuscitation if needed."
        : "EMERGENCY: Immediate referral to burn centre. < 2h transport. Cover with clean dry cloth, keep warm, start IV fluids per Parkland formula if available.";

  return {
    scaleName: "Lund-Browder Chart — Burn Surface Area Estimation",
    scaleId: "lund-browder",
    score: totalBsa,
    maxScore: 100,
    grade: `${severity} — ${totalBsa}% TBSA`,
    interpretation,
    managementGuidance: guidance,
    source: "Lund CC, Browder NC. The estimation of areas of burns. Surg Gynecol Obstet. 1944.",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21233547/",
  };
}

export function autoAssignWagnerFromCondition(condition: string): ClinicalScaleResult | null {
  const lower = condition.toLowerCase();
  if (lower.includes("gangrene")) return applyWagnerScale(5);
  if (lower.includes("osteomyelitis") || lower.includes("bone")) return applyWagnerScale(3);
  if (lower.includes("deep") && lower.includes("ulcer")) return applyWagnerScale(2);
  if (lower.includes("ulcer") || lower.includes("diabetic foot")) return applyWagnerScale(1);
  if (lower.includes("wound")) return applyWagnerScale(1);
  return null;
}
