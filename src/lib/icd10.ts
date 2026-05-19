/* ICD-10 code lookup for common conditions encountered by CHWs.
 * Used as fallback when AI does not provide a code, and for display/reference. */
const ICD10_MAP: Record<string, string> = {
  /* Bacterial skin infections */
  impetigo: "L01.0",
  cellulitis: "L03.9",
  furuncle: "L02.9",
  carbuncle: "L02.9",
  abscess: "L02.9",
  folliculitis: "L73.9",
  erysipelas: "A46",
  "staph infection": "B95.8",
  "staphylococcal infection": "B95.8",
  "strep infection": "B95.5",
  "streptococcal infection": "B95.5",

  /* Viral skin infections */
  "herpes simplex": "B00.9",
  "herpes zoster": "B02.9",
  shingles: "B02.9",
  "chicken pox": "B01.9",
  varicella: "B01.9",
  measles: "B05.9",
  rubella: "B06.9",
  molluscum: "B08.1",
  "molluscum contagiosum": "B08.1",
  warts: "B07",
  "viral wart": "B07",
  "hand foot and mouth": "B08.4",
  "hand-foot-mouth": "B08.4",

  /* Fungal infections */
  ringworm: "B35.4",
  tinea: "B35.9",
  "tinea corporis": "B35.4",
  "tinea capitis": "B35.0",
  "tinea pedis": "B35.3",
  "athletes foot": "B35.3",
  candidiasis: "B37.9",
  "oral thrush": "B37.0",
  pityriasis: "L21.0",
  "pityriasis versicolor": "B36.0",

  /* Parasitic */
  scabies: "B86",
  lice: "B85.2",
  pediculosis: "B85.2",
  "cutaneous larva migrans": "B76.9",
  leishmaniasis: "B55.9",

  /* Eczema and dermatitis */
  eczema: "L30.9",
  dermatitis: "L30.9",
  "atopic dermatitis": "L20.9",
  "contact dermatitis": "L25.9",
  "seborrheic dermatitis": "L21.9",
  "diaper rash": "L22",
  "napkin dermatitis": "L22",
  neurodermatitis: "L28.0",

  /* Allergic */
  urticaria: "L50.9",
  hives: "L50.9",
  "allergic rash": "L50.9",
  "drug eruption": "L27.0",
  " erythema multiforme": "L51.9",

  /* Wounds and trauma */
  abrasion: "S00.90",
  laceration: "S01.9",
  "open wound": "S01.9",
  bruise: "S00.90",
  contusion: "S00.90",
  burn: "T30.0",
  "burn wound": "T30.0",
  "insect bite": "S00.96",
  "animal bite": "S01.5",
  "human bite": "S01.5",

  /* Ulcers */
  "leg ulcer": "L97",
  "pressure ulcer": "L89.9",
  "bed sore": "L89.9",
  "diabetic ulcer": "E11.62",
  "venous ulcer": "L97",

  /* Other skin conditions */
  psoriasis: "L40.9",
  acne: "L70.9",
  "acne vulgaris": "L70.0",
  keloid: "L91.0",
  scar: "L90.5",
  vitiligo: "L80",
  alopecia: "L64.9",
  "hair loss": "L64.9",
  hyperhidrosis: "R61",
  "excessive sweating": "R61",
  jaundice: "R17",
  pallor: "R23.1",

  /* Eye infections */
  conjunctivitis: "H10.9",
  "pink eye": "H10.9",
  stye: "H00.0",
  hordeolum: "H00.0",

  /* Ear infections */
  "otitis media": "H66.9",
  "ear infection": "H66.9",
  "otitis externa": "H60.9",
  "swimmers ear": "H60.9",

  /* Oral */
  "oral ulcer": "K12.3",
  "mouth ulcer": "K12.3",
  gingivitis: "K05.1",
  "gum disease": "K05.1",

  /* Nutritional */
  malnutrition: "E46",
  kwashiorkor: "E40",
  marasmus: "E41",
  anemia: "D64.9",
  "iron deficiency": "D50.9",

  /* Systemic */
  malaria: "B54",
  typhoid: "A01.0",
  dengue: "A90",
  tuberculosis: "A16.9",
  "lymph node swelling": "R59.0",
  lymphadenopathy: "R59.0",
  fever: "R50.9",
  dehydration: "E86",
  diarrhea: "A09",
  pneumonia: "J18.9",
  "upper respiratory infection": "J06.9",
  "urinary tract infection": "N39.0",
  uti: "N39.0",

  /* Unable to assess / default */
  "unable to assess": "Z03.8",
  unknown: "Z03.8",
};

export function lookupIcd10(condition: string): string | undefined {
  if (!condition) return undefined;
  const key = condition.toLowerCase().trim();
  /* Direct match */
  if (ICD10_MAP[key]) return ICD10_MAP[key];
  /* Partial match — find first keyword match */
  for (const [term, code] of Object.entries(ICD10_MAP)) {
    if (key.includes(term)) return code;
  }
  return undefined;
}

export function getIcd10Code(
  result: { condition: string; icd10_code?: string },
): string | undefined {
  /* Use AI-provided code if available and valid */
  if (result.icd10_code && /^[A-Z]\d{2}(\.\d{1,2})?$/.test(result.icd10_code)) {
    return result.icd10_code.toUpperCase();
  }
  /* Fall back to static lookup */
  return lookupIcd10(result.condition);
}
