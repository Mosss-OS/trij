export interface RedFlag {
  id: string;
  title: string;
  suspectedCondition: string;
  description: string;
  action: string;
}

export interface RedFlagInput {
  vitalSigns?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    respiratoryRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    muac?: number;
    weight?: number;
    painScale?: number;
  };
  symptomDescription?: string;
  presentationType?: string;
  age?: number;
  sex?: string;
}

const SEPSIS_KEYWORDS = [
  "fever", "hot", "chills", "rigors", "confusion", "lethargic",
  "unconscious", "unresponsive", "fast breathing", "rapid breathing",
  "shortness of breath", "difficulty breathing", "sob", "dyspnoea",
  "dyspnea", "low blood pressure", "dizziness", "lightheaded",
  "not passing urine", "low urine output", "oliguria",
];

const MENINGISM_KEYWORDS = [
  "stiff neck", "neck stiffness", "nuchal rigidity",
  "photophobia", "light sensitivity", "headache severe",
  "vomiting", "rash", "purpura", "petechiae",
  "bulging fontanelle", "high pitched cry",
  "seizure", "convulsion", "fitting",
];

const OBSTETRIC_KEYWORDS = [
  "pregnant", "pregnancy", "vaginal bleeding", "heavy bleeding",
  "fitting in pregnancy", "seizure in pregnancy", "eclampsia",
  "pre-eclampsia", "swollen face", "swollen hands",
  "severe headache pregnant", "blurred vision pregnant",
  "abdominal pain pregnant", "contractions", "water broken",
  "membrane rupture", "decreased fetal movement",
];

const STROKE_KEYWORDS = [
  "facial droop", "face drooping", "face numb",
  "arm weakness", "arm numb", "one sided weakness",
  "hemiparesis", "hemiplegia", "speech slurred",
  "slurred speech", "dysarthria", "difficulty speaking",
  "aphasia", "cannot speak", "confusion sudden",
  "balance loss", "vertigo sudden", "vision loss",
  "diplopia", "double vision",
];

const DEHYDRATION_KEYWORDS = [
  "sunken eyes", "dry mouth", "thirst excessive",
  "no urine", "not urinating", "dark urine",
  "weak", "lethargic", "unable to drink",
  "drinking poorly", "vomiting everything",
  "diarrhoea severe", "diarrhea severe", " watery stool",
];

const DIABETIC_KEYWORDS = [
  "diabetic", "diabetes", "high blood sugar", "hyperglycaemia",
  "hyperglycemia", "low blood sugar", "hypoglycaemia",
  "hypoglycemia", "fruity breath", "acetone breath",
  "deep breathing", "kussmaul", "confusion diabetic",
  "unconscious diabetic", "insulin",
];

const MALNUTRITION_KEYWORDS = [
  "severe malnutrition", "sam", "mam", "wasting",
  "muscle wasting", "visible ribs", "severe thin",
  "underweight severe", "failure to thrive",
  "kwashiorkor", "marasmus", "oedema feet",
  "swollen feet", "bilateral pitting oedema",
];

export function checkRedFlags(input: RedFlagInput): RedFlag[] {
  const flags: RedFlag[] = [];
  const symptoms = (input.symptomDescription || "").toLowerCase();
  const vs = input.vitalSigns;
  const temp = vs?.temperature;
  const hr = vs?.heartRate;
  const rr = vs?.respiratoryRate;
  const spo2 = vs?.oxygenSaturation;
  const sbp = vs?.systolicBP;
  const muac = vs?.muac;

  if (hasKeywords(symptoms, SEPSIS_KEYWORDS)) {
    flags.push({
      id: "sepsis",
      title: "Signs of Sepsis",
      suspectedCondition: "Sepsis / Systemic Infection",
      description: "Fever with altered consciousness or rapid breathing detected.",
      action: "Immediate referral to hospital. Administer broad-spectrum antibiotics if available. IV fluids if shock suspected.",
    });
  }

  if (hasKeywords(symptoms, MENINGISM_KEYWORDS)) {
    flags.push({
      id: "meningitis",
      title: "Meningism Indicators",
      suspectedCondition: "Meningitis / Encephalitis",
      description: "Neck stiffness with fever and photophobia or neurological signs.",
      action: "Emergency referral. Lumbar puncture at hospital. IV antibiotics and anticonvulsants if fitting.",
    });
  }

  if (hasKeywords(symptoms, OBSTETRIC_KEYWORDS)) {
    flags.push({
      id: "obstetric_emergency",
      title: "Obstetric Emergency",
      suspectedCondition: "Obstetric Complication",
      description: "Signs of obstetric emergency detected: vaginal bleeding, fitting, or severe headache in pregnancy.",
      action: "Immediate emergency transport to maternity facility. Do not wait. Lie patient on left side during transport.",
    });
  }

  if (hasKeywords(symptoms, STROKE_KEYWORDS)) {
    flags.push({
      id: "stroke",
      title: "Stroke Signs",
      suspectedCondition: "Cerebrovascular Accident (Stroke)",
      description: "Facial droop, arm weakness, or speech disturbance detected.",
      action: "Emergency referral to stroke-capable facility. Note time of symptom onset. Keep nil by mouth. Position head elevated 30°.",
    });
  }

  if (hasKeywords(symptoms, DEHYDRATION_KEYWORDS)) {
    flags.push({
      id: "severe_dehydration",
      title: "Severe Dehydration",
      suspectedCondition: "Severe Dehydration / Hypovolaemic Shock",
      description: "Sunken eyes, no urine output, unable to drink — signs of severe dehydration.",
      action: "Urgent IV fluid resuscitation. Refer to facility capable of paediatric IV access if child. Give ORS sips if able to drink.",
    });
  }

  if (hasKeywords(symptoms, DIABETIC_KEYWORDS)) {
    flags.push({
      id: "diabetic_emergency",
      title: "Diabetic Emergency",
      suspectedCondition: "Diabetic Ketoacidosis / Severe Hypoglycaemia",
      description: "Signs of diabetic emergency: altered consciousness, fruity breath, or known diabetic with acute deterioration.",
      action: "Check blood glucose if available. If hypoglycaemic: oral glucose or IM glucagon. If DKA suspected: emergency referral for IV insulin and fluids.",
    });
  }

  if (hasKeywords(symptoms, MALNUTRITION_KEYWORDS)) {
    flags.push({
      id: "severe_malnutrition",
      title: "Severe Malnutrition with Complications",
      suspectedCondition: "Severe Acute Malnutrition (SAM) with Medical Complication",
      description: "Signs of severe malnutrition with complications detected.",
      action: "Refer to therapeutic feeding centre. Admit for complicated SAM management. Start F-75 therapeutic milk. Treat complications before refeeding.",
    });
  }

  if (temp !== undefined && temp !== null && temp >= 39.5) {
    flags.push({
      id: "high_fever",
      title: "High Fever (≥39.5°C)",
      suspectedCondition: "Severe Febrile Illness",
      description: `Temperature ${temp}°C indicates severe infection.`,
      action: "Assess for source of infection. Consider malaria, typhoid, UTI. Antipyretic (paracetamol). Refer if no clear source or if <3 months old.",
    });
  }

  if (spo2 !== undefined && spo2 !== null && spo2 < 90) {
    flags.push({
      id: "hypoxia",
      title: "Severe Hypoxia (SpO₂ < 90%)",
      suspectedCondition: "Severe Respiratory Distress / Hypoxaemia",
      description: `Oxygen saturation ${spo2}% is critically low.`,
      action: "Emergency referral. Position upright. Administer oxygen if available. Keep airway clear.",
    });
  }

  if (rr !== undefined && rr !== null && rr > 30) {
    flags.push({
      id: "tachypnoea",
      title: "Severe Tachypnoea (RR > 30/min)",
      suspectedCondition: "Severe Respiratory Distress",
      description: `Respiratory rate ${rr}/min indicates respiratory distress.`,
      action: "Emergency assessment. Look for chest indrawing, grunting, nasal flaring. Refer for oxygen and respiratory support.",
    });
  }

  if (hr !== undefined && hr !== null && hr > 130) {
    flags.push({
      id: "tachycardia",
      title: "Severe Tachycardia (HR > 130 bpm)",
      suspectedCondition: "Shock / Severe Decompensation",
      description: `Heart rate ${hr} bpm may indicate shock or decompensation.`,
      action: "Assess for signs of shock: cold peripheries, prolonged capillary refill, weak pulse. IV fluids if shock confirmed. Urgent referral.",
    });
  }

  if (sbp !== undefined && sbp !== null && sbp < 90) {
    flags.push({
      id: "hypotension",
      title: "Hypotension (SBP < 90 mmHg)",
      suspectedCondition: "Shock / Severe Dehydration / Haemorrhage",
      description: `Systolic BP ${sbp} mmHg is below threshold.`,
      action: "Sign of decompensated shock. Lie flat. IV fluids rapidly. Urgent referral to hospital.",
    });
  }

  if (muac !== undefined && muac !== null && muac < 11.5) {
    flags.push({
      id: "sam_muac",
      title: "Severe Acute Malnutrition (MUAC < 11.5 cm)",
      suspectedCondition: "Severe Acute Malnutrition",
      description: `MUAC ${muac} cm indicates severe acute malnutrition.`,
      action: "Refer to therapeutic feeding programme. Assess for complications before refeeding. Start F-75 or therapeutic milk.",
    });
  }

  return flags;
}

function hasKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}
