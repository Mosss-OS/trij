/**
 * Navigation Voice Translations — turn-by-turn instructions in multiple languages.
 */

type NavLanguage = "en" | "sw" | "hi" | "yo";

const NAV_INSTRUCTIONS: Record<NavLanguage, {
  depart: string;
  arrive: string;
  turn_left: string;
  turn_right: string;
  turn_slight_left: string;
  turn_slight_right: string;
  turn_sharp_left: string;
  turn_sharp_right: string;
  continue: string;
  onRoad: string;
  forDistance: string;
  thenContinue: string;
  offRoute: string;
  recalculating: string;
  arrived: string;
  startNavigating: string;
}> = {
  en: {
    depart: "Start navigating",
    arrive: "You have arrived at your destination.",
    turn_left: "turn left",
    turn_right: "turn right",
    turn_slight_left: "bear left",
    turn_slight_right: "bear right",
    turn_sharp_left: "sharp left",
    turn_sharp_right: "sharp right",
    continue: "continue",
    onRoad: "onto",
    forDistance: "Continue for",
    thenContinue: "Then",
    offRoute: "You are off route.",
    recalculating: "Recalculating.",
    arrived: "You have arrived at your destination.",
    startNavigating: "Start navigating",
  },
  sw: {
    depart: "Anza kusafiri",
    arrive: "Umefika kwenye unakokwenda.",
    turn_left: "geuka kushoto",
    turn_right: "geuka kulia",
    turn_slight_left: "inama kidogo kushoto",
    turn_slight_right: "inama kidogo kulia",
    turn_sharp_left: "geuka kali kushoto",
    turn_sharp_right: "geuka kali kulia",
    continue: "endelea",
    onRoad: "kwenye",
    forDistance: "Endelea kwa",
    thenContinue: "Kisha",
    offRoute: "Umevunja njia.",
    recalculating: "Inahesabu upya.",
    arrived: "Umefika kwenye unakokwenda.",
    startNavigating: "Anza kusafiri",
  },
  hi: {
    depart: "chalana shuru karein",
    arrive: "Aap apni manzil par pahunch gaye hain.",
    turn_left: "bayen mud jayen",
    turn_right: "dahen mud jayen",
    turn_slight_left: "thoda bayen mud jayen",
    turn_slight_right: "thoda dahen mud jayen",
    turn_sharp_left: "tez bayen mud jayen",
    turn_sharp_right: "tez dahen mud jayen",
    continue: "chalte rahein",
    onRoad: "par",
    forDistance: "Iske liye chalein",
    thenContinue: "Phir",
    offRoute: "Aap galat raste par hain.",
    recalculating: "Punarganana ho rahi hai.",
    arrived: "Aap apni manzil par pahunch gaye hain.",
    startNavigating: "chalana shuru karein",
  },
  yo: {
    depart: "Bere irin",
    arrive: "O ti de ibi ti o n lo.",
    turn_left: "tun si awosi",
    turn_right: "tun si otun",
    turn_slight_left: "tun di sii awosi",
    turn_slight_right: "tun di sii otun",
    turn_sharp_left: "tun ga si awosi",
    turn_sharp_right: "tun ga si otun",
    continue: "loke de",
    onRoad: "si",
    forDistance: "Tesi iwaju",
    thenContinue: "Lẹhinna",
    offRoute: "O ti fo sọna.",
    recalculating: "A n sọtun sii.",
    arrived: "O ti de ibi ti o n lo.",
    startNavigating: "bere irin",
  },
};

export function getNavLanguage(lang: string): NavLanguage {
  if (lang.startsWith("sw")) return "sw";
  if (lang.startsWith("hi")) return "hi";
  if (lang.startsWith("yo")) return "yo";
  return "en";
}

export function getNavInstruction(
  lang: NavLanguage,
  instruction: string,
  roadName?: string,
): string {
  const t = NAV_INSTRUCTIONS[lang];
  const road = roadName ? ` ${t.onRoad} ${roadName}` : "";

  switch (instruction) {
    case "depart":
      return `${t.startNavigating}${road}.`;
    case "arrive":
      return t.arrived;
    case "turn_left":
    case "turn_right":
    case "turn_slight_left":
    case "turn_slight_right":
    case "turn_sharp_left":
    case "turn_sharp_right":
    case "continue":
      return `${t[instruction as keyof typeof t]}${road}.`;
    default:
      return `${t.continue}${road}.`;
  }
}

export function getNavAnnouncement(
  lang: NavLanguage,
  type: "off_route" | "arrived",
): string {
  const t = NAV_INSTRUCTIONS[lang];
  switch (type) {
    case "off_route":
      return `${t.offRoute} ${t.recalculating}`;
    case "arrived":
      return t.arrived;
  }
}
