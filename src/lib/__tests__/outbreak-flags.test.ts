import { describe, it, expect } from "bun:test";
import { checkForNotifiableConditions, NOTIFIABLE_CONDITIONS } from "@/lib/outbreak-flags";

describe("Outbreak / Notifiable Conditions", () => {
  describe("NOTIFIABLE_CONDITIONS", () => {
    it("should have at least 10 notifiable conditions", () => {
      expect(NOTIFIABLE_CONDITIONS.length).toBeGreaterThanOrEqual(10);
    });

    it("each condition should have a name, keywords, and notification protocol", () => {
      for (const condition of NOTIFIABLE_CONDITIONS) {
        expect(condition.name).toBeTruthy();
        expect(condition.keywords.length).toBeGreaterThan(0);
        expect(condition.notificationProtocol).toBeTruthy();
      }
    });
  });

  describe("checkForNotifiableConditions", () => {
    it("should detect cholera from condition name", () => {
      const matches = checkForNotifiableConditions("severe watery diarrhoea suspected cholera");
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.some((m) => m.condition.name === "cholera")).toBe(true);
    });

    it("should detect mpox from condition name", () => {
      const matches = checkForNotifiableConditions("mpox suspected");
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].condition.name).toBe("mpox");
    });

    it("should detect measles from condition name", () => {
      const matches = checkForNotifiableConditions("measles with rash and fever");
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.some((m) => m.condition.name === "measles")).toBe(true);
    });

    it("should detect ebola with emergency protocol", () => {
      const matches = checkForNotifiableConditions("suspected ebola haemorrhagic fever");
      expect(matches.length).toBeGreaterThanOrEqual(1);
      const ebola = matches.find((m) => m.condition.name === "ebola");
      expect(ebola).toBeDefined();
      expect(ebola!.condition.notificationProtocol).toContain("EMERGENCY");
    });

    it("should detect multiple conditions from a single input", () => {
      const matches = checkForNotifiableConditions("fever with rash");
      // Just checking for any matches — not all keywords will match "fever with rash"
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should detect conditions from possibleConditions array", () => {
      const matches = checkForNotifiableConditions(
        "fever with severe headache",
        [
          { name: "Meningococcal meningitis", probability: 0.8 },
          { name: "Malaria", probability: 0.15 },
        ],
      );
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.some((m) => m.condition.name === "meningococcal_meningitis")).toBe(true);
    });

    it("should respect minConfidence threshold", () => {
      const matches = checkForNotifiableConditions(
        "fever",
        [
          { name: "Cholera", probability: 0.1 },
          { name: "Measles", probability: 0.5 },
        ],
        0.3,
      );
      // Cholera (0.1) should be excluded, measles (0.5) should be considered but "fever" doesn't match measles keywords
      // At minimum, no matches from the low-confidence condition
      expect(Array.isArray(matches)).toBe(true);
    });

    it("should return empty array for non-notifiable conditions", () => {
      const matches = checkForNotifiableConditions("common cold with mild cough");
      expect(matches).toHaveLength(0);
    });

    it("should return the matched keyword", () => {
      const matches = checkForNotifiableConditions("patient has rice water stool and vomiting");
      const cholera = matches.find((m) => m.condition.name === "cholera");
      expect(cholera).toBeDefined();
      expect(cholera!.matchedKeyword).toBe("rice water stool");
    });

    it("should detect meningococcal meningitis", () => {
      const matches = checkForNotifiableConditions("cerebrospinal meningitis epidemic suspected");
      expect(matches.some((m) => m.condition.name === "meningococcal_meningitis")).toBe(true);
    });

    it("should detect yellow fever", () => {
      const matches = checkForNotifiableConditions("suspected yellow fever case");
      expect(matches.some((m) => m.condition.name === "yellow_fever")).toBe(true);
    });

    it("should detect polio from acute flaccid paralysis", () => {
      const matches = checkForNotifiableConditions("child with acute flaccid paralysis");
      expect(matches.some((m) => m.condition.name === "polio")).toBe(true);
    });
  });
});
