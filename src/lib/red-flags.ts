/**
 * Red Flag Symptom Detection System
 *
 * Critical clinical safety rules that detect emergency conditions
 * and force immediate referral regardless of AI model confidence.
 *
 * These rules run synchronously BEFORE AI inference to ensure
 * patient safety is never dependent on model reliability.
 *
 * The system implements hard-coded clinical decision rules for
 * identifying time-critical conditions like sepsis, meningitis,
 * stroke, cardiac emergencies, and obstetric complications.
 * When any rule is triggered, the patient is flagged for immediate
 * referral regardless of the AI assessment confidence level.
 */

// Symptom and vital sign input types
export interface SymptomInput {
  fever?: boolean;
  feverTemperature?: number; // in Celsius
  alteredConsciousness?: boolean;
  confusion?: boolean;
  rapidBreathing?: boolean;
  respiratoryRate?: number; // breaths per minute
  stiffNeck?: boolean;
  photophobia?: boolean;
  headache?: boolean;
  vaginalBleeding?: boolean;
  pregnancy?: boolean;
  fitting?: boolean;
  seizures?: boolean;
  facialDroop?: boolean;
  armWeakness?: boolean;
  speechSlurring?: boolean;
  difficultySpeaking?: boolean;
  sunkenEyes?: boolean;
  noUrine?: boolean;
  noUrineDuration?: number; // hours
  unableToDrink?: boolean;
  dryMouth?: boolean;
  thirst?: boolean;
  highBloodSugar?: boolean;
  bloodSugar?: number; // mg/dL
  lowBloodSugar?: boolean;
  severeWeightLoss?: boolean;
  muscleWasting?: boolean;
  edema?: boolean;
  kwashiorkor?: boolean;
  marasmus?: boolean;
  chestPain?: boolean;
  shortnessOfBreath?: boolean;
  difficultyBreathing?: boolean;
  blueLips?: boolean;
  blueSkin?: boolean;
  severeAbdominalPain?: boolean;
  abdominalDistension?: boolean;
  vomitingBlood?: boolean;
  blackStool?: boolean;
  severeHeadache?: boolean;
  visionChanges?: boolean;
  weakness?: boolean;
  numbness?: boolean;
  age?: number; // in years
  pregnantTrimester?: number; // 1, 2, or 3
}

export interface RedFlagRule {
  id: string;
  name: string;
  description: string;
  immediateAction: string;
  check: (input: SymptomInput) => boolean;
  severity: "critical" | "severe";
  category:
    | "infection"
    | "neurological"
    | "obstetric"
    | "cardiovascular"
    | "metabolic"
    | "nutritional"
    | "trauma"
    | "other";
}

export interface RedFlagDetection {
  rule: RedFlagRule;
  triggered: boolean;
  timestamp: Date;
  input: Partial<SymptomInput>;
}

export interface RedFlagResult {
  detected: boolean;
  flags: RedFlagDetection[];
  emergencyAction: string;
  nearestFacility?: string;
}

// Sepsis detection rules
const sepsisRules: RedFlagRule[] = [
  {
    id: "sepsis-1",
    name: "Sepsis - Classic Triad",
    description: "Fever + altered consciousness + rapid breathing",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for suspected sepsis. Administer antibiotics if available and transport urgently.",
    check: (input) =>
      input.fever === true &&
      (input.alteredConsciousness === true || input.confusion === true) &&
      (input.rapidBreathing === true || (input.respiratoryRate ?? 0) > 30),
    severity: "critical",
    category: "infection",
  },
  {
    id: "sepsis-2",
    name: "Sepsis - High Fever with Altered Mental State",
    description: "High fever (≥39°C) with confusion or altered consciousness",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for severe infection. Monitor vital signs during transport.",
    check: (input) =>
      input.feverTemperature !== undefined &&
      input.feverTemperature >= 39 &&
      (input.alteredConsciousness === true || input.confusion === true),
    severity: "critical",
    category: "infection",
  },
  {
    id: "sepsis-3",
    name: "Sepsis - Extreme Tachypnea with Fever",
    description: "Fever with very rapid breathing (≥40 breaths/min)",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for respiratory distress. Provide oxygen if available.",
    check: (input) =>
      input.fever === true && input.respiratoryRate !== undefined && input.respiratoryRate >= 40,
    severity: "critical",
    category: "infection",
  },
];

// Meningitis detection rules
const meningitisRules: RedFlagRule[] = [
  {
    id: "meningitis-1",
    name: "Meningitis - Classic Triad",
    description: "Stiff neck + fever + photophobia",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for suspected meningitis. Do not delay for lumbar puncture - start antibiotics urgently.",
    check: (input) =>
      input.stiffNeck === true && input.fever === true && input.photophobia === true,
    severity: "critical",
    category: "neurological",
  },
  {
    id: "meningitis-2",
    name: "Meningitis - Severe Headache with Fever and Neck Stiffness",
    description: "Severe headache + fever + stiff neck",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for suspected meningitis. Transport with head elevation.",
    check: (input) =>
      input.severeHeadache === true && input.fever === true && input.stiffNeck === true,
    severity: "critical",
    category: "neurological",
  },
  {
    id: "meningitis-3",
    name: "Meningitis - Altered Consciousness with Fever",
    description: "Fever + altered consciousness or confusion",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for CNS infection. Monitor airway and breathing during transport.",
    check: (input) =>
      input.fever === true && (input.alteredConsciousness === true || input.confusion === true),
    severity: "critical",
    category: "neurological",
  },
];

// Obstetric emergency rules
const obstetricRules: RedFlagRule[] = [
  {
    id: "obstetric-1",
    name: "Obstetric Emergency - Heavy Vaginal Bleeding",
    description: "Heavy vaginal bleeding in pregnancy",
    immediateAction:
      "EMERGENCY: Immediate referral to facility with surgical capability. Place patient in left lateral position, elevate legs.",
    check: (input) => input.pregnancy === true && input.vaginalBleeding === true,
    severity: "critical",
    category: "obstetric",
  },
  {
    id: "obstetric-2",
    name: "Obstetric Emergency - Seizures in Pregnancy",
    description: "Fitting or seizures during pregnancy (eclampsia)",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for suspected eclampsia. Monitor blood pressure, administer magnesium sulfate if available.",
    check: (input) =>
      input.pregnancy === true && (input.fitting === true || input.seizures === true),
    severity: "critical",
    category: "obstetric",
  },
  {
    id: "obstetric-3",
    name: "Obstetric Emergency - Third Trimester with Severe Symptoms",
    description: "Pregnancy (third trimester) with headache, vision changes, or swelling",
    immediateAction:
      "EMERGENCY: Immediate referral for suspected pre-eclampsia. Monitor blood pressure and fetal movements.",
    check: (input) =>
      input.pregnancy === true &&
      input.pregnantTrimester === 3 &&
      (input.severeHeadache === true || input.visionChanges === true || input.edema === true),
    severity: "critical",
    category: "obstetric",
  },
];

// Stroke detection rules
const strokeRules: RedFlagRule[] = [
  {
    id: "stroke-1",
    name: "Stroke - FAST: Facial Droop",
    description: "Facial droop or asymmetry",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for suspected stroke. Note time of onset - clot-buster therapy time-critical (<4.5 hours).",
    check: (input) => input.facialDroop === true,
    severity: "critical",
    category: "neurological",
  },
  {
    id: "stroke-2",
    name: "Stroke - FAST: Arm Weakness",
    description: "Arm weakness or numbness (especially one-sided)",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for suspected stroke. Note time of onset - clot-buster therapy time-critical (<4.5 hours).",
    check: (input) => input.armWeakness === true || input.numbness === true,
    severity: "critical",
    category: "neurological",
  },
  {
    id: "stroke-3",
    name: "Stroke - FAST: Speech Difficulties",
    description: "Speech slurring or difficulty speaking",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for suspected stroke. Note time of onset - clot-buster therapy time-critical (<4.5 hours).",
    check: (input) => input.speechSlurring === true || input.difficultySpeaking === true,
    severity: "critical",
    category: "neurological",
  },
  {
    id: "stroke-4",
    name: "Stroke - Sudden Onset Multiple Symptoms",
    description: "Sudden onset of facial droop, arm weakness, or speech difficulties",
    immediateAction:
      "EMERGENCY: Immediate hospital referral for suspected stroke. Act FAST - call emergency services if available.",
    check: (input) =>
      input.facialDroop === true || input.armWeakness === true || input.speechSlurring === true,
    severity: "critical",
    category: "neurological",
  },
];

// Severe dehydration rules
const dehydrationRules: RedFlagRule[] = [
  {
    id: "dehydration-1",
    name: "Severe Dehydration - Classic Signs",
    description: "Sunken eyes, no urine >6 hours, unable to drink",
    immediateAction:
      "EMERGENCY: Immediate referral for severe dehydration. Start oral rehydration solution if able to drink, otherwise IV fluids needed.",
    check: (input) =>
      input.sunkenEyes === true &&
      (input.noUrine === true ||
        (input.noUrineDuration !== undefined && input.noUrineDuration > 6)) &&
      input.unableToDrink === true,
    severity: "critical",
    category: "metabolic",
  },
  {
    id: "dehydration-2",
    name: "Severe Dehydration - Prolonged No Output",
    description: "No urine for >12 hours with other dehydration signs",
    immediateAction:
      "EMERGENCY: Immediate referral for severe dehydration. Patient may require intravenous fluids.",
    check: (input) =>
      input.noUrineDuration !== undefined &&
      input.noUrineDuration > 12 &&
      (input.sunkenEyes === true || input.dryMouth === true || input.thirst === true),
    severity: "critical",
    category: "metabolic",
  },
];

// Diabetic emergency rules
const diabeticRules: RedFlagRule[] = [
  {
    id: "diabetic-1",
    name: "Diabetic Emergency - Very High Blood Sugar",
    description: "Blood sugar ≥400 mg/dL with altered consciousness",
    immediateAction:
      "EMERGENCY: Immediate referral for hyperglycemic emergency. Do not administer insulin without blood glucose monitoring.",
    check: (input) =>
      input.bloodSugar !== undefined &&
      input.bloodSugar >= 400 &&
      (input.alteredConsciousness === true || input.confusion === true),
    severity: "critical",
    category: "metabolic",
  },
  {
    id: "diabetic-2",
    name: "Diabetic Emergency - DKA Signs",
    description: "High blood sugar + dehydration + altered consciousness",
    immediateAction:
      "EMERGENCY: Immediate referral for suspected diabetic ketoacidosis. This is life-threatening and requires hospital care.",
    check: (input) =>
      (input.highBloodSugar === true ||
        (input.bloodSugar !== undefined && input.bloodSugar >= 250)) &&
      (input.sunkenEyes === true || input.dryMouth === true) &&
      (input.alteredConsciousness === true || input.confusion === true),
    severity: "critical",
    category: "metabolic",
  },
  {
    id: "diabetic-3",
    name: "Diabetic Emergency - Severe Hypoglycemia",
    description: "Low blood sugar with altered consciousness or fitting",
    immediateAction:
      "EMERGENCY: Immediate referral for severe hypoglycemia. Administer oral glucose if conscious, otherwise IV dextrose needed.",
    check: (input) =>
      input.lowBloodSugar === true &&
      (input.alteredConsciousness === true ||
        input.confusion === true ||
        input.fitting === true ||
        input.seizures === true),
    severity: "critical",
    category: "metabolic",
  },
];

// Severe malnutrition rules
const malnutritionRules: RedFlagRule[] = [
  {
    id: "malnutrition-1",
    name: "Severe Malnutrition with Complications",
    description: "Severe weight loss + muscle wasting + edema (Kwashiorkor)",
    immediateAction:
      "EMERGENCY: Immediate referral for severe acute malnutrition with complications. Requires therapeutic feeding and medical management.",
    check: (input) =>
      input.severeWeightLoss === true && input.muscleWasting === true && input.edema === true,
    severity: "critical",
    category: "nutritional",
  },
  {
    id: "malnutrition-2",
    name: "Severe Malnutrition - Marasmus with Infection Signs",
    description: "Severe weight loss + muscle wasting + fever",
    immediateAction:
      "EMERGENCY: Immediate referral for severe acute malnutrition with infection. High risk of mortality without urgent treatment.",
    check: (input) =>
      input.severeWeightLoss === true && input.muscleWasting === true && input.fever === true,
    severity: "critical",
    category: "nutritional",
  },
  {
    id: "malnutrition-3",
    name: "Severe Malnutrition - Visible Wasting",
    description: "Visible severe wasting in children",
    immediateAction:
      "URGENT: Immediate referral for severe acute malnutrition. Use WHO growth chart for confirmation if available.",
    check: (input) =>
      input.marasmus === true || (input.severeWeightLoss === true && input.muscleWasting === true),
    severity: "severe",
    category: "nutritional",
  },
];

// Cardiovascular emergency rules
const cardiovascularRules: RedFlagRule[] = [
  {
    id: "cardio-1",
    name: "Cardiac Emergency - Chest Pain with Breathing Difficulty",
    description: "Chest pain + shortness of breath",
    immediateAction:
      "EMERGENCY: Immediate referral for suspected heart attack. Keep patient calm, provide aspirin if not allergic, monitor vital signs.",
    check: (input) =>
      input.chestPain === true &&
      (input.shortnessOfBreath === true || input.difficultyBreathing === true),
    severity: "critical",
    category: "cardiovascular",
  },
  {
    id: "cardio-2",
    name: "Cardiac Emergency - Signs of Shock",
    description: "Blue lips or blue skin with weakness or altered consciousness",
    immediateAction:
      "EMERGENCY: Immediate referral for suspected shock. Keep patient warm, elevate legs, provide oxygen if available.",
    check: (input) =>
      (input.blueLips === true || input.blueSkin === true) &&
      (input.weakness === true || input.alteredConsciousness === true),
    severity: "critical",
    category: "cardiovascular",
  },
  {
    id: "cardio-3",
    name: "Respiratory Emergency - Severe Breathing Difficulty",
    description: "Severe difficulty breathing with blue lips or skin",
    immediateAction:
      "EMERGENCY: Immediate referral for respiratory distress. Sit patient upright, provide oxygen if available.",
    check: (input) =>
      (input.difficultyBreathing === true || input.shortnessOfBreath === true) &&
      (input.blueLips === true || input.blueSkin === true),
    severity: "critical",
    category: "cardiovascular",
  },
];

// Gastrointestinal emergency rules
const gastrointestinalRules: RedFlagRule[] = [
  {
    id: "gi-1",
    name: "GI Emergency - Vomiting Blood",
    description: "Vomiting blood or coffee-ground material",
    immediateAction:
      "EMERGENCY: Immediate referral for upper GI bleeding. Monitor vital signs, keep patient NPO (nothing by mouth).",
    check: (input) => input.vomitingBlood === true,
    severity: "critical",
    category: "other",
  },
  {
    id: "gi-2",
    name: "GI Emergency - Black Tarry Stool",
    description: "Black, tarry stool (melena)",
    immediateAction:
      "EMERGENCY: Immediate referral for upper GI bleeding. This indicates significant blood loss requiring urgent care.",
    check: (input) => input.blackStool === true,
    severity: "critical",
    category: "other",
  },
  {
    id: "gi-3",
    name: "GI Emergency - Severe Abdominal Pain with Distension",
    description: "Severe abdominal pain with abdominal distension",
    immediateAction:
      "EMERGENCY: Immediate referral for suspected bowel obstruction or surgical emergency. Nothing by mouth.",
    check: (input) => input.severeAbdominalPain === true && input.abdominalDistension === true,
    severity: "critical",
    category: "other",
  },
];

// Combine all rules
const ALL_RED_FLAG_RULES: RedFlagRule[] = [
  ...sepsisRules,
  ...meningitisRules,
  ...obstetricRules,
  ...strokeRules,
  ...dehydrationRules,
  ...diabeticRules,
  ...malnutritionRules,
  ...cardiovascularRules,
  ...gastrointestinalRules,
];

/**
 * Check input against all red flag rules
 * Runs synchronously before AI inference
 */
export function checkRedFlags(input: SymptomInput): RedFlagResult {
  const triggeredFlags: RedFlagDetection[] = [];
  const timestamp = new Date();

  for (const rule of ALL_RED_FLAG_RULES) {
    if (rule.check(input)) {
      triggeredFlags.push({
        rule,
        triggered: true,
        timestamp,
        input,
      });
    }
  }

  const detected = triggeredFlags.length > 0;

  // Get the most critical flag for emergency action
  const criticalFlags = triggeredFlags.filter((f) => f.rule.severity === "critical");
  const emergencyAction =
    criticalFlags.length > 0
      ? criticalFlags[0].rule.immediateAction
      : triggeredFlags.length > 0
        ? triggeredFlags[0].rule.immediateAction
        : "";

  return {
    detected,
    flags: triggeredFlags,
    emergencyAction,
    nearestFacility: undefined, // TODO: Integrate with geolocation/facility data
  };
}

/**
 * Get all red flag rules (for configuration/display)
 */
export function getAllRedFlagRules(): RedFlagRule[] {
  return [...ALL_RED_FLAG_RULES];
}

/**
 * Get rules by category
 */
export function getRulesByCategory(category: RedFlagRule["category"]): RedFlagRule[] {
  return ALL_RED_FLAG_RULES.filter((rule) => rule.category === category);
}

/**
 * Check if a specific rule is triggered
 */
export function checkSpecificRule(ruleId: string, input: SymptomInput): boolean {
  const rule = ALL_RED_FLAG_RULES.find((r) => r.id === ruleId);
  return rule ? rule.check(input) : false;
}

/**
 * Enable/disable specific rules (for supervisor configuration)
 * This would be integrated with settings in a full implementation
 */
const DISABLED_RULES = new Set<string>();

export function enableRule(ruleId: string): void {
  DISABLED_RULES.delete(ruleId);
}

export function disableRule(ruleId: string): void {
  DISABLED_RULES.add(ruleId);
}

export function isRuleEnabled(ruleId: string): boolean {
  return !DISABLED_RULES.has(ruleId);
}

/**
 * Check red flags with supervisor-configured rules disabled
 */
export function checkRedFlagsWithConfig(input: SymptomInput): RedFlagResult {
  const enabledRules = ALL_RED_FLAG_RULES.filter((rule) => isRuleEnabled(rule.id));
  const triggeredFlags: RedFlagDetection[] = [];
  const timestamp = new Date();

  for (const rule of enabledRules) {
    if (rule.check(input)) {
      triggeredFlags.push({
        rule,
        triggered: true,
        timestamp,
        input,
      });
    }
  }

  const detected = triggeredFlags.length > 0;
  const criticalFlags = triggeredFlags.filter((f) => f.rule.severity === "critical");
  const emergencyAction =
    criticalFlags.length > 0
      ? criticalFlags[0].rule.immediateAction
      : triggeredFlags.length > 0
        ? triggeredFlags[0].rule.immediateAction
        : "";

  return {
    detected,
    flags: triggeredFlags,
    emergencyAction,
    nearestFacility: undefined,
  };
}
