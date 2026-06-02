export type MaternalPhase = "antenatal" | "postnatal" | "neonatal";

export type AntenatalDangerSign =
  | "heavy_bleeding"
  | "severe_headache"
  | "blurred_vision"
  | "fitting"
  | "reduced_fetal_movement"
  | "fever"
  | "difficulty_breathing"
  | "severe_abdominal_pain"
  | "water_broken_no_contractions"
  | "swollen_face_hands";

export type PostnatalDangerSign =
  | "heavy_bleeding_postnatal"
  | "offensive_discharge"
  | "fever_postnatal"
  | "breast_abscess"
  | "breast_engorgement"
  | "perineal_wound_infection";

export type NeonatalDangerSign =
  | "neonatal_breathing_difficulty"
  | "neonatal_not_feeding"
  | "neonatal_jaundice"
  | "neonatal_hypothermia"
  | "neonatal_fever"
  | "neonatal_umbilical_redness"
  | "neonatal_umbilical_discharge"
  | "neonatal_convulsions"
  | "neonatal_vomiting";

export interface MaternalAssessmentInput {
  phase: MaternalPhase;
  gestationalWeeks?: number;
  fundalHeight?: number;
  fetalHeartRate?: number;
  parity?: number;
  gravidity?: number;
  antenatalDangerSigns: AntenatalDangerSign[];
  postnatalDangerSigns: PostnatalDangerSign[];
  neonatalDangerSigns: NeonatalDangerSign[];
  temperature?: number;
  systolicBP?: number;
  diastolicBP?: number;
  neonatalWeight?: number;
  neonatalAgeDays?: number;
}

export interface MaternalAssessmentResult {
  urgency: "red" | "yellow" | "green";
  dangerSignsFound: string[];
  suspectedCondition: string;
  recommendation: string;
  referralRequired: boolean;
  referralDetails?: string;
  phase: MaternalPhase;
}

const ANTENATAL_ACTIONS: Record<AntenatalDangerSign, { condition: string; action: string }> = {
  heavy_bleeding: {
    condition: "Antepartum haemorrhage",
    action:
      "Immediate emergency transport to maternity facility. Do not do vaginal examination. Lie patient on left side. IV access if possible.",
  },
  severe_headache: {
    condition: "Severe pre-eclampsia / Hypertension",
    action:
      "Emergency referral. Check BP. If SBP ≥160 or DBP ≥110, treat as emergency. Magnesium sulphate if fitting. Transfer to hospital with obstetric ICU.",
  },
  blurred_vision: {
    condition: "Severe pre-eclampsia with visual disturbance",
    action:
      "Emergency referral. Sign of severe pre-eclampsia/eclampsia. Magnesium sulphate. Urgent delivery may be needed.",
  },
  fitting: {
    condition: "Eclampsia",
    action:
      "EMERGENCY. Maintain airway. Magnesium sulphate 4g IV. Do not leave patient alone. Transfer to ICU after seizure controlled.",
  },
  reduced_fetal_movement: {
    condition: "Reduced fetal movement / Fetal distress",
    action:
      "Urgent referral for CTG and ultrasound. Assess fetal wellbeing. Kick count chart if ≤36 weeks.",
  },
  fever: {
    condition: "Maternal infection / Chorioamnionitis",
    action:
      "Refer for assessment. Antibiotics if infection suspected. Monitor fetal heart rate. Paracetamol for fever.",
  },
  difficulty_breathing: {
    condition: "Respiratory distress / Pulmonary oedema / Severe anaemia",
    action:
      "Emergency referral. Oxygen if available. Assess for COVID-19, pneumonia, pulmonary embolism. Cardiac assessment.",
  },
  severe_abdominal_pain: {
    condition: "Abruptio placentae / Labour / Other emergency",
    action:
      "Emergency referral. Do not do vaginal examination. Monitor fetal movements. Prepare for possible emergency delivery.",
  },
  water_broken_no_contractions: {
    condition: "Prolonged rupture of membranes",
    action:
      "Refer for assessment. Risk of infection. If >18 hours since rupture, antibiotics indicated. Induction may be needed.",
  },
  swollen_face_hands: {
    condition: "Pre-eclampsia",
    action:
      "Check BP and urine protein. Refer for assessment. Monitor for severe headache and visual changes.",
  },
};

const POSTNATAL_ACTIONS: Record<PostnatalDangerSign, { condition: string; action: string }> = {
  heavy_bleeding_postnatal: {
    condition: "Postpartum haemorrhage",
    action:
      "EMERGENCY. Fundal massage. Oxytocin 10 IU IM/IV. IV fluids. Emergency referral. Monitor vital signs closely.",
  },
  offensive_discharge: {
    condition: "Postpartum sepsis / Endometritis",
    action:
      "Urgent referral. Broad-spectrum antibiotics (IV if severe). Uterine culture. Monitor for septic shock.",
  },
  fever_postnatal: {
    condition: "Puerperal sepsis",
    action:
      "Refer for assessment. Full septic workup. IV antibiotics. Exclude retained products of conception.",
  },
  breast_abscess: {
    condition: "Breast abscess / Mastitis",
    action:
      "Refer for incision and drainage if abscess. Continue breastfeeding or expressing. Antibiotics (flucloxacillin). Analgesia.",
  },
  breast_engorgement: {
    condition: "Breast engorgement",
    action:
      "Advise frequent feeding. Warm compresses before feeding. Cold compresses after. Refer if not improving or if fever develops.",
  },
  perineal_wound_infection: {
    condition: "Perineal wound infection / Breakdown",
    action:
      "Refer for wound assessment. Sitz baths. Antibiotics if signs of infection. Surgical debridement may be needed.",
  },
};

const NEONATAL_ACTIONS: Record<NeonatalDangerSign, { condition: string; action: string }> = {
  neonatal_breathing_difficulty: {
    condition: "Neonatal respiratory distress",
    action:
      "EMERGENCY. Keep warm. Clear airway. Oxygen if available. Refer urgently to neonatal unit. Check for grunting, chest indrawing.",
  },
  neonatal_not_feeding: {
    condition: "Neonatal feeding difficulty / Possible infection",
    action:
      "Urgent referral. Assess for signs of infection. Ensure warmth. Express breastmilk and cup feed if necessary.",
  },
  neonatal_jaundice: {
    condition: "Neonatal jaundice",
    action:
      "Refer for bilirubin assessment. If appearing <24 hours of age: EMERGENCY (pathological jaundice). Ensure adequate feeding. Phototherapy may be needed.",
  },
  neonatal_hypothermia: {
    condition: "Neonatal hypothermia",
    action:
      "Warm slowly (skin-to-skin, warm room). Feed if able. Refer if not warming or if signs of infection. Kangaroo mother care if stable.",
  },
  neonatal_fever: {
    condition: "Neonatal fever / Possible sepsis",
    action:
      "EMERGENCY. Full septic workup. IV antibiotics. Monitor temperature. Lumbar puncture may be needed. Refer to neonatal unit.",
  },
  neonatal_umbilical_redness: {
    condition: "Neonatal omphalitis",
    action:
      "Urgent referral. Topical and systemic antibiotics. Monitor for signs of spreading infection. Keep cord clean and dry.",
  },
  neonatal_umbilical_discharge: {
    condition: "Neonatal umbilical discharge",
    action:
      "Keep cord clean and dry. Topical antiseptic (chlorhexidine). Refer if redness spreads or if fever develops.",
  },
  neonatal_convulsions: {
    condition: "Neonatal seizures",
    action:
      "EMERGENCY. Maintain airway. Check blood glucose. Phenobarbital loading if continuing. Urgent referral to neonatal ICU.",
  },
  neonatal_vomiting: {
    condition: "Neonatal vomiting / Possible obstruction",
    action:
      "Refer for assessment. Bilious vomiting is EMERGENCY (intestinal obstruction). Keep nil by mouth. IV fluids.",
  },
};

export function assessMaternal(input: MaternalAssessmentInput): MaternalAssessmentResult {
  const allDangerSigns: string[] = [];
  let highestUrgency: "red" | "yellow" | "green" = "green";

  if (input.phase === "antenatal" || input.phase === "postnatal") {
    const bpHigh = (input.systolicBP ?? 0) >= 160 || (input.diastolicBP ?? 0) >= 110;
    const fever = (input.temperature ?? 0) >= 38;

    for (const sign of input.antenatalDangerSigns) {
      const info = ANTENATAL_ACTIONS[sign];
      if (info) {
        allDangerSigns.push(`${info.condition}: ${info.action}`);
      }
    }

    for (const sign of input.postnatalDangerSigns) {
      const info = POSTNATAL_ACTIONS[sign];
      if (info) {
        allDangerSigns.push(`${info.condition}: ${info.action}`);
      }
    }

    if (
      input.antenatalDangerSigns.includes("fitting") ||
      input.antenatalDangerSigns.includes("heavy_bleeding")
    ) {
      highestUrgency = "red";
    } else if (bpHigh) {
      allDangerSigns.push(
        "Severe hypertension: emergency referral for BP management and magnesium sulphate assessment.",
      );
      highestUrgency = "red";
    } else if (
      fever &&
      (input.phase === "postnatal" || input.antenatalDangerSigns.includes("fever"))
    ) {
      allDangerSigns.push(
        "Maternal fever: assess for sepsis. Antibiotics and source control needed.",
      );
      highestUrgency = "red";
    } else if (input.antenatalDangerSigns.length > 0 || input.postnatalDangerSigns.length > 0) {
      highestUrgency = "yellow";
    }
  }

  if (input.phase === "neonatal" || input.phase === "postnatal") {
    for (const sign of input.neonatalDangerSigns) {
      const info = NEONATAL_ACTIONS[sign];
      if (info) {
        allDangerSigns.push(`${info.condition}: ${info.action}`);
      }
    }

    if (
      input.neonatalDangerSigns.includes("neonatal_breathing_difficulty") ||
      input.neonatalDangerSigns.includes("neonatal_convulsions") ||
      input.neonatalDangerSigns.includes("neonatal_fever")
    ) {
      if (highestUrgency !== "red") highestUrgency = "red";
    } else if (input.neonatalDangerSigns.length > 0) {
      if (highestUrgency !== "red") highestUrgency = "yellow";
    }
  }

  const hasRed = highestUrgency === "red" || allDangerSigns.some((s) => s.startsWith("EMERGENCY"));
  const urgency: "red" | "yellow" | "green" = hasRed
    ? "red"
    : highestUrgency === "yellow"
      ? "yellow"
      : "green";

  const suspectedConditions = [...new Set(allDangerSigns.map((s) => s.split(":")[0].trim()))];
  const recommendations = allDangerSigns.map((s) => s.split(":")[1]?.trim() || s).filter(Boolean);

  return {
    urgency,
    dangerSignsFound: allDangerSigns,
    suspectedCondition: suspectedConditions.join("; ") || "No danger signs detected",
    recommendation:
      recommendations.join(" ") ||
      "Continue routine antenatal/postnatal care. No immediate danger signs detected.",
    referralRequired: urgency === "red" || urgency === "yellow",
    referralDetails:
      urgency === "red"
        ? `Obstetric emergency: ${suspectedConditions.join(", ")}. Immediate referral to highest-level maternity facility.`
        : recommendedFacility(suspectedConditions),
    phase: input.phase,
  };
}

function recommendedFacility(conditions: string[]): string {
  if (conditions.some((c) => /seizure|eclampsia|haemorrhage|resuscitat|intensive/i.test(c))) {
    return "Refer to tertiary hospital with obstetric ICU and neonatal ICU capabilities.";
  }
  if (conditions.some((c) => /pre.?eclampsia|infection|sepsis|antibiotic/i.test(c))) {
    return "Refer to hospital with inpatient maternity ward and laboratory services.";
  }
  return "Refer to nearest health centre with skilled birth attendant for further assessment.";
}

export function getFundalHeightGuide(weeks: number): string {
  if (weeks < 12) return "Not palpable above pubic symphysis";
  if (weeks <= 14) return "Just palpable above pubic symphysis";
  if (weeks <= 18) return "~2-3 cm below umbilicus";
  if (weeks <= 22) return "At umbilicus";
  if (weeks <= 26) return "~2-3 cm above umbilicus";
  if (weeks <= 30) return "Midway between umbilicus and xiphisternum";
  if (weeks <= 34) return "At xiphisternum";
  if (weeks <= 36) return "Highest point (may decrease after 36w as engagement occurs)";
  if (weeks <= 40) return "Slightly below xiphisternum (engagement)";
  return "Post-term — below xiphisternum";
}
