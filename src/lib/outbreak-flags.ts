/**
 * Outbreak / Notifiable Conditions Detection Module
 * 
 * This module contains a database of notifiable (reportable) diseases that require
 * immediate public health notification when suspected. It enables community health
 * workers to identify potential outbreak conditions based on clinical presentations
 * and trigger appropriate notification protocols.
 * 
 * The module includes:
 * - A curated list of high-priority infectious diseases with outbreak potential
 * - Keyword matching algorithms to detect suspected cases from symptom descriptions
 * - Specific notification protocols for each condition based on international
 *   public health guidelines
 * 
 * When a notifiable condition is suspected, the system provides:
 * - Immediate notification instructions for health authorities
 * - Isolation and containment recommendations
 * - Guidance on sample collection and transport when applicable
 * - Contact tracing protocols where relevant
 * 
 * This supports early detection and response to potential outbreaks, helping to
 * prevent wider community spread through timely public health intervention.
 */

export const NOTIFIABLE_CONDITIONS: Array<{
  name: string;
  keywords: string[];
  notificationProtocol: string;
}> = [
  {
    name: "cholera",
    keywords: ["cholera", "vibrio cholerae", "severe watery diarrhoea", "rice water stool", "acute watery diarrhoea"],
    notificationProtocol: "Immediately notify district health office. Prepare oral rehydration and refer to cholera treatment centre.",
  },
  {
    name: "mpox",
    keywords: ["mpox", "monkeypox", "monkey pox", "mpox virus"],
    notificationProtocol: "Notify district health office. Isolate patient. Contact tracing required. Refer to treatment centre.",
  },
  {
    name: "lassa_fever",
    keywords: ["lassa fever", "lassa", "lassa virus", "lassa haemorrhagic fever"],
    notificationProtocol: "URGENT: Notify state health department immediately. Strict isolation required. Use full PPE.",
  },
  {
    name: "measles",
    keywords: ["measles", "rubeola", "measles virus"],
    notificationProtocol: "Notify district health office. Vaccinate close contacts. Report to EPI programme.",
  },
  {
    name: "meningococcal_meningitis",
    keywords: ["meningococcal meningitis", "meningococcal", "neisseria meningitidis", "cerebrospinal meningitis", "meningitis epidemic"],
    notificationProtocol: "URGENT: Notify health authorities immediately. Chemoprophylaxis for close contacts. Refer for CSF analysis.",
  },
  {
    name: "ebola",
    keywords: ["ebola", "ebola virus", "ebola haemorrhagic fever", "ebola hemorrhagic fever", "viral haemorrhagic fever"],
    notificationProtocol: "EMERGENCY: Activate outbreak response team. Strict isolation. Full PPE required. Notify WHO and national authorities.",
  },
  {
    name: "typhoid",
    keywords: ["typhoid", "salmonella typhi", "enteric fever", "typhoid fever"],
    notificationProtocol: "Notify district health office. Test and treat. Trace water source. Vaccinate household contacts.",
  },
  {
    name: "dengue",
    keywords: ["dengue", "dengue fever", "dengue haemorrhagic fever", "dengue shock syndrome", "breakbone fever"],
    notificationProtocol: "Notify district health office. Mosquito control measures. Monitor for warning signs of severe dengue.",
  },
  {
    name: "yellow_fever",
    keywords: ["yellow fever", "yellow fever virus", "flavivirus"],
    notificationProtocol: "URGENT: Notify health authorities. Confirm with serology. Initiate vector control. Vaccinate at-risk population.",
  },
  {
    name: "polio",
    keywords: ["polio", "poliomyelitis", "poliovirus", "acute flaccid paralysis"],
    notificationProtocol: "EMERGENCY: Notify national polio eradication programme immediately. Collect stool samples. Begin outbreak response vaccination.",
  },
];

export function checkForNotifiableConditions(
  condition: string,
  possibleConditions?: Array<{ name: string; probability: number }>,
  minConfidence?: number,
): Array<{ condition: typeof NOTIFIABLE_CONDITIONS[0]; matchedKeyword: string }> {
  const matches: Array<{ condition: typeof NOTIFIABLE_CONDITIONS[0]; matchedKeyword: string }> = [];
  const searchText = [condition.toLowerCase()];

  if (possibleConditions) {
    for (const pc of possibleConditions) {
      if (minConfidence !== undefined && pc.probability < minConfidence) continue;
      searchText.push(pc.name.toLowerCase());
    }
  }

  for (const notifiable of NOTIFIABLE_CONDITIONS) {
    for (const keyword of notifiable.keywords) {
      const found = searchText.some((text) => text.includes(keyword));
      if (found) {
        matches.push({ condition: notifiable, matchedKeyword: keyword });
        break;
      }
    }
  }

  return matches;
}
