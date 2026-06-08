import { describe, it, expect } from "bun:test";
import { classifyMUAC, assessNutrition, getClassificationLabel, getClassificationColor, getOedemaLabel } from "@/lib/nutrition";

describe("Nutrition Assessment", () => {
  describe("classifyMUAC", () => {
    it("should classify child MUAC < 11.5 as SAM", () => {
      expect(classifyMUAC(10.5, true)).toBe("sam");
    });

    it("should classify child MUAC 11.5-12.4 as MAM", () => {
      expect(classifyMUAC(12.0, true)).toBe("mam");
    });

    it("should classify child MUAC 12.5-16.9 as normal", () => {
      expect(classifyMUAC(15.0, true)).toBe("normal");
    });

    it("should classify child MUAC 17.0-19.9 as overweight", () => {
      expect(classifyMUAC(18.0, true)).toBe("overweight");
    });

    it("should classify child MUAC ≥ 20.0 as obese", () => {
      expect(classifyMUAC(22.0, true)).toBe("obese");
    });

    it("should classify adult MUAC < 18.5 as SAM", () => {
      expect(classifyMUAC(16.0, false)).toBe("sam");
    });

    it("should classify adult MUAC 18.5-19.9 as MAM", () => {
      expect(classifyMUAC(19.0, false)).toBe("mam");
    });

    it("should classify adult MUAC 20.0-24.9 as normal", () => {
      expect(classifyMUAC(22.0, false)).toBe("normal");
    });

    it("should classify adult MUAC 25.0-29.9 as overweight", () => {
      expect(classifyMUAC(27.0, false)).toBe("overweight");
    });

    it("should classify adult MUAC ≥ 30.0 as obese", () => {
      expect(classifyMUAC(32.0, false)).toBe("obese");
    });
  });

  describe("assessNutrition", () => {
    it("should return red urgency for SAM", () => {
      const result = assessNutrition(10.0, 2, "none", false, false, false);
      expect(result.classification).toBe("sam");
      expect(result.urgency).toBe("red");
      expect(result.samTriggered).toBe(true);
    });

    it("should return red urgency with any oedema", () => {
      const result = assessNutrition(15.0, 2, "bilateral_mild", false, false, false);
      expect(result.samTriggered).toBe(true);
      expect(result.urgency).toBe("red");
    });

    it("should return yellow urgency for MAM", () => {
      const result = assessNutrition(12.0, 2, "none", false, false, false);
      expect(result.classification).toBe("mam");
      expect(result.urgency).toBe("yellow");
      expect(result.samTriggered).toBe(false);
    });

    it("should return green urgency for normal", () => {
      const result = assessNutrition(15.0, 2, "none", false, false, false);
      expect(result.classification).toBe("normal");
      expect(result.urgency).toBe("green");
      expect(result.samTriggered).toBe(false);
    });

    it("should treat age >= 18 as adult", () => {
      const result = assessNutrition(22.0, 30, "none", false, false, false);
      expect(result.isChild).toBe(false);
      expect(result.classification).toBe("normal");
    });

    it("should treat age < 18 as child", () => {
      const result = assessNutrition(15.0, 10, "none", false, false, false);
      expect(result.isChild).toBe(true);
    });
  });

  describe("getClassificationLabel", () => {
    it("should return label for each classification", () => {
      expect(getClassificationLabel("sam")).toBe("Severe Acute Malnutrition (SAM)");
      expect(getClassificationLabel("mam")).toBe("Moderate Acute Malnutrition (MAM)");
      expect(getClassificationLabel("normal")).toBe("Normal");
      expect(getClassificationLabel("overweight")).toBe("Overweight");
      expect(getClassificationLabel("obese")).toBe("Obese");
    });
  });

  describe("getClassificationColor", () => {
    it("should return a non-empty string for each classification", () => {
      const classifications = ["sam", "mam", "normal", "overweight", "obese"] as const;
      for (const c of classifications) {
        expect(getClassificationColor(c)).toBeTruthy();
        expect(typeof getClassificationColor(c)).toBe("string");
      }
    });
  });

  describe("getOedemaLabel", () => {
    it("should return label for each oedema level", () => {
      expect(getOedemaLabel("none")).toBe("None");
      expect(getOedemaLabel("bilateral_mild")).toBe("Bilateral mild (+)");
      expect(getOedemaLabel("bilateral_moderate")).toBe("Bilateral moderate (++)");
      expect(getOedemaLabel("bilateral_severe")).toBe("Bilateral severe (+++)");
    });
  });
});
