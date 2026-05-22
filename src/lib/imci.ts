export type ImciAgeGroup = "young_infant" | "infant" | "child" | "over_5";

export type ImciDangerSign =
  | "unable_to_drink"
  | "vomits_everything"
  | "convulsions"
  | "lethargic"
  | "unconscious"
  | "chest_indrawing"
  | "stridor"
  | "central_cyanosis";

export type ImciClassification =
  | { category: "severe_pneumonia"; urgency: "red" }
  | { category: "pneumonia"; urgency: "yellow" }
  | { category: "no_pneumonia"; urgency: "green" }
  | { category: "severe_disease_with_danger_sign"; urgency: "red" }
  | { category: "severe_persistent_diarrhoea"; urgency: "red" }
  | { category: "persistent_diarrhoea"; urgency: "yellow" }
  | { category: "dysentery"; urgency: "yellow" }
  | { category: "severe_dehydration"; urgency: "red" }
  | { category: "some_dehydration"; urgency: "yellow" }
  | { category: "no_dehydration"; urgency: "green" }
  | { category: "very_severe_febrile_disease"; urgency: "red" }
  | { category: "malaria"; urgency: "yellow" }
  | { category: "fever_no_malaria"; urgency: "green" }
  | { category: "severe_malnutrition_complicated"; urgency: "red" }
  | { category: "severe_malnutrition"; urgency: "yellow" }
  | { category: "moderate_malnutrition"; urgency: "yellow" }
  | { category: "anaemia_severe"; urgency: "red" }
  | { category: "anaemia"; urgency: "yellow" }
  | { category: "young_infant_bacterial_infection"; urgency: "red" }
  | { category: "young_infant_local_infection"; urgency: "yellow" }
  | { category: "young_infant_jaundice_severe"; urgency: "red" }
  | { category: "young_infant_jaundice"; urgency: "yellow" }
  | { category: "young_infant_diarrhoea_dehydration"; urgency: "yellow" }
  | { category: "well_child"; urgency: "green" };

export interface ImciInput {
  ageMonths: number;
  dangerSigns: ImciDangerSign[];
  respiratoryRate: number;
  chestIndrawing: boolean;
  stridor: boolean;
  temperature: number;
  muacCm: number;
  weightKg: number;
  hasDiarrhoea: boolean;
  diarrhoeaDays: number;
  bloodInStool: boolean;
  sunkenEyes: boolean;
  unableToDrink: boolean;
  drinksPoorly: boolean;
  vomiting: boolean;
  coughDays: number;
  feverDays: number;
  malariaEndemic: boolean;
  convulsingNow: boolean;
  oedema: boolean;
  pallor: boolean;
}

const RR_THRESHOLDS: Record<ImciAgeGroup, { fastBreathing: number; severe: number }> = {
  young_infant: { fastBreathing: 60, severe: 70 },
  infant: { fastBreathing: 50, severe: 60 },
  child: { fastBreathing: 40, severe: 50 },
  over_5: { fastBreathing: 30, severe: 40 },
};

export function classifyAge(ageMonths: number): ImciAgeGroup {
  if (ageMonths < 0) return "over_5";
  if (ageMonths < 2) return "young_infant";
  if (ageMonths < 12) return "infant";
  if (ageMonths < 60) return "child";
  return "over_5";
}

export function muacStatus(muacCm: number): { color: "red" | "yellow" | "green"; label: string } {
  if (muacCm < 11.5) return { color: "red", label: "SAM" };
  if (muacCm <= 12.5) return { color: "yellow", label: "MAM" };
  return { color: "green", label: "Normal" };
}

export function assessImci(input: ImciInput): ImciClassification[] {
  const classifications: ImciClassification[] = [];
  const ageGroup = classifyAge(input.ageMonths);
  const rrThreshold = RR_THRESHOLDS[ageGroup];

  if (input.dangerSigns.length > 0) {
    classifications.push({ category: "severe_disease_with_danger_sign", urgency: "red" });
  }

  if (input.stridor || input.central_cyanosis || input.chest_indrawing) {
    classifications.push({
      category: input.dangerSigns.length > 0 ? "severe_pneumonia" : "pneumonia",
      urgency: input.dangerSigns.length > 0 ? "red" : "yellow",
    });
  } else if (input.coughDays > 0 || input.respiratoryRate > 0) {
    if (input.respiratoryRate > rrThreshold.severe) {
      classifications.push({ category: "severe_pneumonia", urgency: "red" });
    } else if (input.respiratoryRate > rrThreshold.fastBreathing) {
      classifications.push({ category: "pneumonia", urgency: "yellow" });
    } else if (input.coughDays > 0) {
      classifications.push({ category: "no_pneumonia", urgency: "green" });
    }
  }

  if (input.hasDiarrhoea) {
    if (input.bloodInStool) {
      classifications.push({ category: "dysentery", urgency: "yellow" });
    } else if (input.diarrhoeaDays >= 14) {
      classifications.push(
        (input.sunkenEyes && input.unableToDrink)
          ? { category: "severe_persistent_diarrhoea", urgency: "red" }
          : { category: "persistent_diarrhoea", urgency: "yellow" },
      );
    }

    if (input.sunkenEyes && (input.unableToDrink || input.drinksPoorly)) {
      classifications.push({ category: "severe_dehydration", urgency: "red" });
    } else if (input.sunkenEyes || input.drinksPoorly || input.vomiting) {
      classifications.push({ category: "some_dehydration", urgency: "yellow" });
    } else {
      classifications.push({ category: "no_dehydration", urgency: "green" });
    }
  }

  if (input.feverDays > 0) {
    if (input.malariaEndemic) {
      classifications.push({ category: "malaria", urgency: "yellow" });
    }
    if (input.dangerSigns.length > 0) {
      classifications.push({ category: "very_severe_febrile_disease", urgency: "red" });
    } else if (!input.malariaEndemic) {
      classifications.push({ category: "fever_no_malaria", urgency: "green" });
    }
  }

  if (input.muacCm < 11.5 || input.oedema) {
    classifications.push(
      input.dangerSigns.length > 0
        ? { category: "severe_malnutrition_complicated", urgency: "red" }
        : { category: "severe_malnutrition", urgency: "yellow" },
    );
  } else if (input.muacCm <= 12.5) {
    classifications.push({ category: "moderate_malnutrition", urgency: "yellow" });
  }

  if (input.pallor) {
    classifications.push({ category: "anaemia_severe", urgency: "red" });
  }

  if (ageGroup === "young_infant" && input.dangerSigns.length > 0) {
    classifications.push({ category: "young_infant_bacterial_infection", urgency: "red" });
  }

  if (classifications.length === 0) {
    classifications.push({ category: "well_child", urgency: "green" });
  }

  return classifications;
}

export function getOverallUrgency(classifications: ImciClassification[]): "red" | "yellow" | "green" {
  if (classifications.some((c) => c.urgency === "red")) return "red";
  if (classifications.some((c) => c.urgency === "yellow")) return "yellow";
  return "green";
}

export function getClassificationLabel(category: ImciClassification["category"]): string {
  const labels: Record<string, string> = {
    severe_pneumonia: "Severe pneumonia",
    pneumonia: "Pneumonia",
    no_pneumonia: "Cough or cold — no pneumonia",
    severe_disease_with_danger_sign: "Severe disease with danger sign",
    severe_persistent_diarrhoea: "Severe persistent diarrhoea",
    persistent_diarrhoea: "Persistent diarrhoea",
    dysentery: "Dysentery",
    severe_dehydration: "Severe dehydration",
    some_dehydration: "Some dehydration",
    no_dehydration: "No dehydration",
    very_severe_febrile_disease: "Very severe febrile disease",
    malaria: "Malaria",
    fever_no_malaria: "Fever — malaria unlikely",
    severe_malnutrition_complicated: "Severe acute malnutrition with complications",
    severe_malnutrition: "Severe acute malnutrition",
    moderate_malnutrition: "Moderate acute malnutrition",
    anaemia_severe: "Severe anaemia",
    anaemia: "Anaemia",
    young_infant_bacterial_infection: "Possible serious bacterial infection",
    young_infant_local_infection: "Local bacterial infection",
    young_infant_jaundice_severe: "Severe jaundice",
    young_infant_jaundice: "Jaundice",
    young_infant_diarrhoea_dehydration: "Diarrhoea with dehydration",
    well_child: "Well child — no IMCI classification",
  };
  return labels[category] || category;
}

export function getImciAction(classifications: ImciClassification[]): string {
  const actions: string[] = [];
  for (const c of classifications) {
    switch (c.category) {
      case "severe_pneumonia":
        actions.push("Refer urgently to hospital. Give first dose of antibiotic. Keep airway clear.");
        break;
      case "pneumonia":
        actions.push("Home care with oral antibiotic (amoxicillin). Follow up in 2 days.");
        break;
      case "no_pneumonia":
        actions.push("Home care. Soothe throat, treat fever. No antibiotics needed.");
        break;
      case "severe_disease_with_danger_sign":
        actions.push("Emergency referral. Treat before transfer. Keep nil by mouth.");
        break;
      case "severe_dehydration":
        actions.push("IV fluids urgently. Refer for inpatient care. Plan C per WHO protocol.");
        break;
      case "some_dehydration":
        actions.push("Give ORS according to plan B. Observe for 4 hours. Reassess hydration.");
        break;
      case "no_dehydration":
        actions.push("Give ORS plan A at home. Continue feeding. Watch for danger signs.");
        break;
      case "dysentery":
        actions.push("Oral ciprofloxacin for 3 days. Follow up in 2 days.");
        break;
      case "malaria":
        actions.push("Treat with ACT (artemisinin-based combination therapy). Give first dose. Follow up in 2 days.");
        break;
      case "very_severe_febrile_disease":
        actions.push("Emergency referral. Give first dose of antibiotic and antimalarial if endemic.");
        break;
      case "severe_malnutrition_complicated":
        actions.push("Admit to therapeutic feeding centre. Treat complications. Start F-75.");
        break;
      case "severe_malnutrition":
        actions.push("Refer to therapeutic feeding programme. Start F-75 at home if no complications.");
        break;
      case "moderate_malnutrition":
        actions.push("Supplementary feeding. Nutritional counselling. Follow up monthly.");
        break;
      case "anaemia":
        actions.push("Iron supplementation for 3 months. Encourage iron-rich foods. Follow up.");
        break;
      case "anaemia_severe":
        actions.push("Emergency referral for transfusion. Treat underlying cause.");
        break;
      case "young_infant_bacterial_infection":
        actions.push("Emergency referral. Give first dose of antibiotics. Keep warm. Monitor breathing.");
        break;
      case "young_infant_local_infection":
        actions.push("Treat with oral antibiotics. Follow up in 2 days. Keep warm.");
        break;
      case "young_infant_jaundice_severe":
        actions.push("Emergency referral for phototherapy. Check bilirubin urgently.");
        break;
      case "young_infant_jaundice":
        actions.push("Advise frequent feeding. Ensure warm. Follow up in 2 days. Refer if persists.");
        break;
      case "severe_persistent_diarrhoea":
        actions.push("Refer to hospital. IV fluids. Treat dehydration. Investigate cause.");
        break;
      case "persistent_diarrhoea":
        actions.push("Continue feeding. Give ORS. Treat with zinc for 14 days. Follow up in 5 days.");
        break;
      case "well_child":
        actions.push("No IMCI classification. Continue routine care and monitoring.");
        break;
      default:
        actions.push("Refer to clinic for further assessment.");
    }
  }
  return [...new Set(actions)].join(" ");
}
