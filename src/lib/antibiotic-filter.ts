const ANTIBIOTIC_DRUGS = [
  "amoxicillin", "amoxiclav", "co-amoxiclav", "ampicillin", "azithromycin",
  "cefalexin", "cephalexin", "cefazolin", "cefuroxime", "ceftriaxone",
  "cefotaxime", "ceftazidime", "ciprofloxacin", "clarithromycin",
  "clindamycin", "cloxacillin", "co-trimoxazole", "doxycycline",
  "erythromycin", "flucloxacillin", "gentamicin", "levofloxacin",
  "linezolid", "meropenem", "metronidazole", "mupirocin",
  "nitrofurantoin", "norfloxacin", "ofloxacin", "oxacillin",
  "penicillin", "piperacillin", "rifampicin", "rifaximin",
  "roxithromycin", "sulfamethoxazole", "tetracycline",
  "tigecycline", "trimethoprim", "vancomycin",
  "fusidic acid", "fucidin",
];

const ANTIBIOTIC_PATTERNS = [
  /antibiotic/i, /antibacterial/i, /antimicrobial/i,
  /antibiotics/i, /antibacterials/i,
];

const PLACEHOLDER = "antibiotic therapy per local protocol";

type AntibioticMention = {
  drug?: string;
  dose?: string;
  duration?: string;
  route?: string;
};

function findMentions(text: string): AntibioticMention[] {
  const mentions: AntibioticMention[] = [];
  const lower = text.toLowerCase();

  for (const drug of ANTIBIOTIC_DRUGS) {
    const escaped = drug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    let match;
    while ((match = regex.exec(lower)) !== null) {
      mentions.push({ drug: drug });
    }
  }

  return mentions;
}

function replaceAntibioticNames(text: string): string {
  let result = text;
  for (const drug of ANTIBIOTIC_DRUGS) {
    const escaped = drug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?:${escaped}\\s*(?:\\d+\\s*(?:mg|g|mcg|µg|iu|units?)\\s*(?:\\w+\\s+)*)?(?:\\w+\\s+(?:bid|tid|qid|od|bd|tds|qds|once daily|twice daily|three times daily|four times daily|pm|prn|stat)\\b)?)`,
      "gi",
    );
    result = result.replace(regex, PLACEHOLDER);
  }
  return result;
}

export function filterAntibioticContent(text: string): string {
  const mentions = findMentions(text);
  if (mentions.length === 0) return text;
  return replaceAntibioticNames(text);
}

export interface AntibioticFilterResult {
  condition?: string;
  recommendation?: string;
  hasAntibioticMention: boolean;
  hasViralIndication: boolean;
  viralVsBacterialNote?: string;
}

const VIRAL_INDICATORS = [
  "viral", "virus", "influenza", "COVID-19", "covid", "common cold",
  "rhinovirus", "adenovirus", "RSV", "bronchiolitis", "viral syndrome",
  "viral infection", "viral illness", "self-limiting", "self limited",
];

const BACTERIAL_INDICATORS = [
  "bacterial", "bacteria", "cellulitis", "impetigo", "pneumonia",
  "UTI", "urinary tract infection", "abscess", "wound infection",
  "sepsis", "meningitis", "tuberculosis", "TB", "typhoid",
  "cholera", "dysentery", "streptococcal", "staphylococcal",
  "purulent", "pus", "folliculitis", "furuncle", "carbuncle",
];

export function analyzeForAntibiotics(
  condition: string,
  recommendation: string,
  possibleConditions?: Array<{ name: string; probability: number }>,
): AntibioticFilterResult {
  const conditionLower = condition.toLowerCase();
  const recLower = recommendation.toLowerCase();

  const rawMentions = findMentions(recommendation);
  const antibioticPatternMatch = ANTIBIOTIC_PATTERNS.some((p) => p.test(recommendation));
  const hasAntibioticMention = rawMentions.length > 0 || antibioticPatternMatch;

  const viralKeywords = VIRAL_INDICATORS.some((v) => conditionLower.includes(v));
  const recViralKeywords = VIRAL_INDICATORS.some((v) => recLower.includes(v));
  const hasViralIndication = viralKeywords || recViralKeywords;

  const bacterialKeywords = BACTERIAL_INDICATORS.some((b) => conditionLower.includes(b));
  const recBacterialKeywords = BACTERIAL_INDICATORS.some((b) => recLower.includes(b));

  if (possibleConditions) {
    const anyBacterial = possibleConditions.some((pc) =>
      BACTERIAL_INDICATORS.some((b) => pc.name.toLowerCase().includes(b)),
    );
    const anyViral = possibleConditions.some((pc) =>
      VIRAL_INDICATORS.some((v) => pc.name.toLowerCase().includes(v)),
    );
    if (anyBacterial && !anyViral && !bacterialKeywords) {
    }
  }

  let viralVsBacterialNote: string | undefined;
  if (hasViralIndication && !bacterialKeywords && !recBacterialKeywords) {
    viralVsBacterialNote = "This condition appears to be viral. Antibiotics are not indicated for viral infections. Treat symptoms and monitor.";
  } else if (bacterialKeywords || recBacterialKeywords) {
    viralVsBacterialNote = "This condition may be bacterial. If antibiotics are warranted, follow local antibiotic protocol guidelines.";
  }

  let filteredRecommendation = recommendation;
  if (hasAntibioticMention) {
    filteredRecommendation = filterAntibioticContent(recommendation);
  }

  return {
    condition,
    recommendation: filteredRecommendation,
    hasAntibioticMention,
    hasViralIndication,
    viralVsBacterialNote,
  };
}
