export interface ChecklistItem {
  id: string;
  label: string;
}

export interface SystemChecklist {
  systemId: string;
  label: string;
  items: ChecklistItem[];
}

export const CHECKLISTS: SystemChecklist[] = [
  {
    systemId: "respiratory",
    label: "Respiratory",
    items: [
      { id: "cough", label: "Cough" },
      { id: "cough_duration_days", label: "Cough > 7 days" },
      { id: "fast_breathing", label: "Fast breathing" },
      { id: "chest_indrawing", label: "Chest indrawing" },
      { id: "stridor", label: "Stridor (noisy breathing)" },
      { id: "wheezing", label: "Wheezing" },
      { id: "difficulty_breathing", label: "Difficulty breathing" },
      { id: "nasal_flaring", label: "Nasal flaring" },
      { id: "cyanosis", label: "Central cyanosis (blue lips/tongue)" },
      { id: "sputum", label: "Sputum production" },
      { id: "night_sweats", label: "Night sweats" },
      { id: "chest_pain", label: "Chest pain" },
    ],
  },
  {
    systemId: "gastrointestinal",
    label: "Gastrointestinal",
    items: [
      { id: "diarrhoea", label: "Diarrhoea" },
      { id: "diarrhoea_duration", label: "Diarrhoea > 7 days" },
      { id: "blood_in_stool", label: "Blood in stool" },
      { id: "vomiting", label: "Vomiting" },
      { id: "vomits_everything", label: "Vomits everything" },
      { id: "abdominal_pain", label: "Abdominal pain" },
      { id: "abdominal_distension", label: "Abdominal distension" },
      { id: "nausea", label: "Nausea" },
      { id: "dysphagia", label: "Difficulty swallowing" },
      { id: "jaundice", label: "Jaundice (yellow eyes/skin)" },
      { id: "dehydration", label: "Signs of dehydration" },
      { id: "sunken_eyes", label: "Sunken eyes" },
    ],
  },
  {
    systemId: "dermatological",
    label: "Dermatological",
    items: [
      { id: "rash", label: "Rash" },
      { id: "rash_location", label: "Localised rash" },
      { id: "rash_diffuse", label: "Widespread / diffuse rash" },
      { id: "itching", label: "Itching" },
      { id: "pain", label: "Pain at site" },
      { id: "swelling", label: "Swelling / oedema" },
      { id: "discharge", label: "Discharge / pus" },
      { id: "blisters", label: "Blisters / vesicles" },
      { id: "ulcer", label: "Ulcer / open sore" },
      { id: "scaling", label: "Scaling / flaking" },
      { id: "fever_with_rash", label: "Fever with rash" },
      { id: "spreading", label: "Spreading redness" },
    ],
  },
  {
    systemId: "neurological",
    label: "Neurological",
    items: [
      { id: "headache", label: "Headache" },
      { id: "severe_headache", label: "Severe headache" },
      { id: "neck_stiffness", label: "Neck stiffness" },
      { id: "photophobia", label: "Sensitivity to light" },
      { id: "confusion", label: "Confusion / altered consciousness" },
      { id: "convulsions", label: "Convulsions / seizures" },
      { id: "limb_weakness", label: "Limb weakness" },
      { id: "facial_droop", label: "Facial droop" },
      { id: "speech_difficulty", label: "Difficulty speaking" },
      { id: "loss_of_balance", label: "Loss of balance" },
      { id: "numbness", label: "Numbness / tingling" },
      { id: "vision_changes", label: "Vision changes" },
    ],
  },
  {
    systemId: "musculoskeletal",
    label: "Musculoskeletal",
    items: [
      { id: "joint_pain", label: "Joint pain" },
      { id: "joint_swelling", label: "Joint swelling" },
      { id: "muscle_pain", label: "Muscle pain" },
      { id: "back_pain", label: "Back pain" },
      { id: "difficulty_walking", label: "Difficulty walking" },
      { id: "injury", label: "Recent injury / trauma" },
      { id: "fracture_signs", label: "Signs of fracture" },
      { id: "limited_motion", label: "Limited range of motion" },
      { id: "redness_over_joint", label: "Redness over joint" },
      { id: "warmth_over_joint", label: "Warmth over joint" },
      { id: "morning_stiffness", label: "Morning stiffness" },
      { id: "fatigue", label: "Fatigue / malaise" },
    ],
  },
  {
    systemId: "genitourinary",
    label: "Genitourinary",
    items: [
      { id: "dysuria", label: "Painful urination" },
      { id: "frequency", label: "Frequent urination" },
      { id: "urgency", label: "Urgent urination" },
      { id: "flank_pain", label: "Flank pain" },
      { id: "suprapubic_pain", label: "Suprapubic pain" },
      { id: "urethral_discharge", label: "Urethral discharge" },
      { id: "vaginal_discharge", label: "Vaginal discharge" },
      { id: "genital_ulcer", label: "Genital ulcer / sore" },
      { id: "genital_swelling", label: "Genital swelling" },
      { id: "hematuria", label: "Blood in urine" },
      { id: "scrotal_pain", label: "Scrotal pain / swelling" },
      { id: "pregnancy_signs", label: "Signs of pregnancy" },
    ],
  },
  {
    systemId: "general",
    label: "General / Systemic",
    items: [
      { id: "fever", label: "Fever" },
      { id: "fever_duration", label: "Fever > 7 days" },
      { id: "chills", label: "Chills / rigors" },
      { id: "weight_loss", label: "Unintentional weight loss" },
      { id: "loss_of_appetite", label: "Loss of appetite" },
      { id: "night_sweats_systemic", label: "Night sweats" },
      { id: "fatigue_systemic", label: "Fatigue / weakness" },
      { id: "lymphadenopathy", label: "Swollen lymph nodes" },
      { id: "bleeding", label: "Unexplained bleeding" },
      { id: "pallor", label: "Pallor (pale skin)" },
      { id: "dehydration_systemic", label: "Signs of dehydration" },
      { id: "allergy", label: "Known allergies" },
    ],
  },
];

export function getChecklistForPresentation(presentationType: string): SystemChecklist {
  const system = presentationType === "dermatology" ? "dermatological" : presentationType;
  const found = CHECKLISTS.find((c) => c.systemId === system);
  return found ?? CHECKLISTS[0];
}
