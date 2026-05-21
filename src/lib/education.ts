import type { Patient, Assessment } from "@/types/trij";

export type EducationMaterialId =
  | "wound-care"
  | "fever-management"
  | "diarrhea-ors"
  | "breastfeeding"
  | "malaria-prevention"
  | "tb-adherence"
  | "hypertension"
  | "diabetes-foot-care"
  | "asthma-inhaler"
  | "nutrition-child";

export interface EducationMaterial {
  id: EducationMaterialId;
  title: string;
  content: string;
}

const educationLibrary: Record<EducationMaterialId, EducationMaterial> = {
  "wound-care": {
    id: "wound-care",
    title: "Wound Care",
    content:
      "**Keep the wound clean and dry.**\n\n- Wash your hands before and after touching the wound.\n- Clean the wound gently with clean water and mild soap.\n- Apply a clean bandage or dressing daily.\n- Watch for signs of infection: redness, swelling, warmth, or pus.\n- Seek medical help if the wound becomes more painful or you develop a fever.\n- Keep the wound elevated if it is on a limb to reduce swelling.",
  },
  "fever-management": {
    id: "fever-management",
    title: "Fever Management",
    content:
      "**How to manage a fever at home.**\n\n- Give plenty of fluids (water, oral rehydration solution, soup).\n- Rest as much as possible.\n- Use paracetamol or ibuprofen as directed by a health worker.\n- Sponge with lukewarm water if the fever is very high.\n- **Return to clinic immediately if:** the fever lasts more than 3 days, the person cannot drink, has a stiff neck, is confused, has a rash, or has difficulty breathing.",
  },
  "diarrhea-ors": {
    id: "diarrhea-ors",
    title: "Diarrhea and Oral Rehydration",
    content:
      "**Prevent dehydration from diarrhea.**\n\n- Give oral rehydration solution (ORS) after every loose stool:\n  - Children under 2 years: 50–100 ml (¼–½ cup)\n  - Children 2–9 years: 100–200 ml (½–1 cup)\n  - Adults: as much as they want\n- Continue breastfeeding or feeding.\n- Give zinc supplements if available (10-20 mg daily for 10-14 days).\n- **Danger signs:** sunken eyes, skin that stays pinched, unable to drink, blood in stool.\n- **Handwashing with soap** prevents the spread of diarrhea.",
  },
  "breastfeeding": {
    id: "breastfeeding",
    title: "Breastfeeding Guide",
    content:
      "**Breast milk is the best food for your baby.**\n\n- Breastfeed exclusively for the first 6 months.\n- Breastfeed on demand, day and night (8–12 times per day).\n- Ensure a good latch: the baby's mouth covers both the nipple and the dark area around it.\n- Sit comfortably with support for your back.\n- If breastfeeding hurts, seek help from a health worker.\n- Continue breastfeeding after introducing foods (up to 2 years or beyond).\n- Breastfeeding helps protect the baby from infections and supports brain development.",
  },
  "malaria-prevention": {
    id: "malaria-prevention",
    title: "Malaria Prevention",
    content:
      "**Protect yourself and your family from malaria.**\n\n- Sleep under an insecticide-treated bed net every night.\n- Pregnant women should take preventive medicine as directed.\n- Clear standing water where mosquitoes breed.\n- Use mosquito repellent and wear long sleeves in the evening.\n- **Seek medical help immediately if:** you have fever, chills, headache, and muscle aches.\n- Early diagnosis and treatment save lives.",
  },
  "tb-adherence": {
    id: "tb-adherence",
    title: "Taking TB Medicine",
    content:
      "**Tuberculosis is curable — take your medicine every day.**\n\n- Take your TB medicine at the same time every day.\n- Complete the full course (6 months or as directed).\n- Do not miss doses — this can make the bacteria resistant.\n- Cover your mouth when coughing or sneezing.\n- Open windows at home for ventilation.\n- Eat well to help your body recover.\n- **Side effects (tell your health worker):** yellow eyes or skin, dark urine, rash, vision changes.",
  },
  "hypertension": {
    id: "hypertension",
    title: "Managing High Blood Pressure",
    content:
      "**Control your blood pressure to prevent heart disease and stroke.**\n\n- Take your blood pressure medicine every day as prescribed.\n- Reduce salt in your cooking and food.\n- Eat more fruits, vegetables, and whole grains.\n- Exercise for 30 minutes most days (walking is good).\n- Maintain a healthy weight.\n- Limit alcohol and avoid smoking.\n- Check your blood pressure regularly.\n- **Seek help immediately for:** severe headache, chest pain, shortness of breath, vision changes.",
  },
  "diabetes-foot-care": {
    id: "diabetes-foot-care",
    title: "Foot Care for Diabetes",
    content:
      "**Protect your feet if you have diabetes.**\n\n- Check your feet every day for cuts, blisters, redness, or swelling.\n- Wash your feet daily with warm water and mild soap, then dry them gently.\n- Wear clean, dry socks and well-fitting shoes.\n- Trim toenails straight across.\n- Do not walk barefoot.\n- **See a health worker immediately if:** you have a foot sore that is not healing, redness, swelling, or black skin.",
  },
  "asthma-inhaler": {
    id: "asthma-inhaler",
    title: "Using Your Asthma Inhaler",
    content:
      "**How to use your inhaler correctly.**\n\n1. Shake the inhaler well.\n2. Breathe out gently.\n3. Put the mouthpiece in your mouth and seal your lips around it.\n4. Press the canister once and breathe in deeply and slowly.\n5. Hold your breath for 10 seconds.\n6. Wait 30–60 seconds between puffs if you need more than one.\n- Rinse your mouth with water after using steroid inhalers.\n- **Seek emergency help if:** the inhaler does not help, you cannot speak in full sentences, or your lips turn blue.",
  },
  "nutrition-child": {
    id: "nutrition-child",
    title: "Child Nutrition",
    content:
      "**Feed your child well for healthy growth.**\n\n- Breastfeed exclusively for the first 6 months.\n- Starting at 6 months, introduce soft, mashed foods:\n  - Mashed vegetables and fruits\n  - Porridge with added groundnuts or beans\n  - Eggs, fish, or meat (mashed)\n- Feed your child 3–4 times per day.\n- Add a little oil or fat to meals for energy.\n- Continue breastfeeding until 2 years.\n- Take your child to regular growth monitoring visits.\n- **Seek help if:** your child is losing weight, has swollen feet or face, or is not eating.",
  },
};

export function getEducationMaterial(id: EducationMaterialId): EducationMaterial {
  return educationLibrary[id];
}

export function getEducationForCondition(condition: string): EducationMaterial[] {
  const conditionLower = condition.toLowerCase().trim();
  const conditionMap: Record<string, EducationMaterialId[]> = {
    impetigo: ["wound-care"],
    cellulitis: ["wound-care"],
    abscess: ["wound-care"],
    wound: ["wound-care"],
    laceration: ["wound-care"],
    abrasion: ["wound-care"],
    cut: ["wound-care"],
    burn: ["wound-care"],
    malaria: ["fever-management", "malaria-prevention"],
    typhoid: ["fever-management"],
    dengue: ["fever-management"],
    fever: ["fever-management"],
    diarrhea: ["diarrhea-ors"],
    vomiting: ["diarrhea-ors"],
    dehydration: ["diarrhea-ors"],
    breastfeeding: ["breastfeeding"],
    mastitis: ["breastfeeding"],
    hypertension: ["hypertension"],
    diabetes: ["diabetes-foot-care"],
    asthma: ["asthma-inhaler"],
    tuberculosis: ["tb-adherence"],
    malnutrition: ["nutrition-child"],
    kwashiorkor: ["nutrition-child"],
    marasmus: ["nutrition-child"],
  };
  const ids = conditionMap[conditionLower] || [];
  return ids.map((id) => educationLibrary[id]);
}

export function shareContent(
  title: string,
  text: string,
): void {
  if (navigator.share) {
    navigator.share({ title, text }).catch(() => {});
  } else {
    /* Fallback: copy to clipboard */
    navigator.clipboard.writeText(text).catch(() => {});
  }
}
