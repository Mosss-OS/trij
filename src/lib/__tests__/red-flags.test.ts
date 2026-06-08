import { describe, it, expect } from "bun:test";
import {
  checkRedFlags,
  checkRedFlagsWithConfig,
  getAllRedFlagRules,
  getRulesByCategory,
  checkSpecificRule,
  enableRule,
  disableRule,
  isRuleEnabled,
} from "@/lib/red-flags";

describe("Red Flag Detection", () => {
  describe("getAllRedFlagRules", () => {
    it("should return a non-empty array of rules", () => {
      const rules = getAllRedFlagRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it("should have id and name for every rule", () => {
      const rules = getAllRedFlagRules();
      for (const rule of rules) {
        expect(rule.id).toBeTruthy();
        expect(rule.name).toBeTruthy();
      }
    });
  });

  describe("getRulesByCategory", () => {
    it("should return rules filtered by category", () => {
      const infectionRules = getRulesByCategory("infection");
      expect(infectionRules.length).toBeGreaterThan(0);
      expect(infectionRules.every((r) => r.category === "infection")).toBe(true);
    });

    it("should return empty array for non-existent category", () => {
      const rules = getRulesByCategory("trauma" as any);
      expect(rules).toHaveLength(0);
    });
  });

  describe("Sepsis detection", () => {
    it("should detect sepsis classic triad: fever + altered consciousness + rapid breathing", () => {
      const result = checkRedFlags({
        fever: true,
        alteredConsciousness: true,
        rapidBreathing: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "sepsis-1")).toBe(true);
    });

    it("should detect sepsis with high fever ≥39°C and confusion", () => {
      const result = checkRedFlags({
        feverTemperature: 39.5,
        confusion: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "sepsis-2")).toBe(true);
    });

    it("should detect sepsis with extreme tachypnea (RR ≥40) and fever", () => {
      const result = checkRedFlags({
        fever: true,
        respiratoryRate: 45,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "sepsis-3")).toBe(true);
    });
  });

  describe("Meningitis detection", () => {
    it("should detect meningitis classic triad: stiff neck + fever + photophobia", () => {
      const result = checkRedFlags({
        stiffNeck: true,
        fever: true,
        photophobia: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "meningitis-1")).toBe(true);
    });

    it("should detect meningitis with severe headache + fever + stiff neck", () => {
      const result = checkRedFlags({
        severeHeadache: true,
        fever: true,
        stiffNeck: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "meningitis-2")).toBe(true);
    });
  });

  describe("Obstetric emergency detection", () => {
    it("should detect vaginal bleeding in pregnancy", () => {
      const result = checkRedFlags({
        pregnancy: true,
        vaginalBleeding: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "obstetric-1")).toBe(true);
    });

    it("should detect seizures in pregnancy (eclampsia)", () => {
      const result = checkRedFlags({
        pregnancy: true,
        fitting: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "obstetric-2")).toBe(true);
    });

    it("should detect pre-eclampsia in third trimester", () => {
      const result = checkRedFlags({
        pregnancy: true,
        pregnantTrimester: 3,
        severeHeadache: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "obstetric-3")).toBe(true);
    });
  });

  describe("Stroke detection", () => {
    it("should detect stroke from facial droop", () => {
      const result = checkRedFlags({ facialDroop: true });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "stroke-1")).toBe(true);
    });

    it("should detect stroke from arm weakness", () => {
      const result = checkRedFlags({ armWeakness: true });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "stroke-2")).toBe(true);
    });

    it("should detect stroke from speech slurring", () => {
      const result = checkRedFlags({ speechSlurring: true });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "stroke-3")).toBe(true);
    });
  });

  describe("Severe dehydration detection", () => {
    it("should detect severe dehydration with sunken eyes, no urine >6h, unable to drink", () => {
      const result = checkRedFlags({
        sunkenEyes: true,
        noUrineDuration: 8,
        unableToDrink: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "dehydration-1")).toBe(true);
    });

    it("should detect prolonged no urine >12h with dehydration signs", () => {
      const result = checkRedFlags({
        noUrineDuration: 14,
        sunkenEyes: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "dehydration-2")).toBe(true);
    });
  });

  describe("Diabetic emergency detection", () => {
    it("should detect DKA: high blood sugar + dehydration + altered consciousness", () => {
      const result = checkRedFlags({
        bloodSugar: 300,
        dryMouth: true,
        alteredConsciousness: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "diabetic-2")).toBe(true);
    });

    it("should detect severe hypoglycemia with altered consciousness", () => {
      const result = checkRedFlags({
        lowBloodSugar: true,
        confusion: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "diabetic-3")).toBe(true);
    });

    it("should detect hyperglycemic emergency (BS ≥400 + altered consciousness)", () => {
      const result = checkRedFlags({
        bloodSugar: 450,
        alteredConsciousness: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "diabetic-1")).toBe(true);
    });
  });

  describe("Severe malnutrition detection", () => {
    it("should detect kwashiorkor: severe weight loss + muscle wasting + edema", () => {
      const result = checkRedFlags({
        severeWeightLoss: true,
        muscleWasting: true,
        edema: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "malnutrition-1")).toBe(true);
    });

    it("should detect marasmus with infection: severe weight loss + muscle wasting + fever", () => {
      const result = checkRedFlags({
        severeWeightLoss: true,
        muscleWasting: true,
        fever: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "malnutrition-2")).toBe(true);
    });
  });

  describe("Cardiovascular emergency detection", () => {
    it("should detect cardiac emergency: chest pain + breathing difficulty", () => {
      const result = checkRedFlags({
        chestPain: true,
        shortnessOfBreath: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "cardio-1")).toBe(true);
    });

    it("should detect shock: blue lips/skin + weakness/altered consciousness", () => {
      const result = checkRedFlags({
        blueLips: true,
        weakness: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "cardio-2")).toBe(true);
    });
  });

  describe("GI emergency detection", () => {
    it("should detect vomiting blood", () => {
      const result = checkRedFlags({ vomitingBlood: true });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "gi-1")).toBe(true);
    });

    it("should detect black tarry stool", () => {
      const result = checkRedFlags({ blackStool: true });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "gi-2")).toBe(true);
    });

    it("should detect severe abdominal pain with distension", () => {
      const result = checkRedFlags({
        severeAbdominalPain: true,
        abdominalDistension: true,
      });
      expect(result.detected).toBe(true);
      expect(result.flags.some((f) => f.rule.id === "gi-3")).toBe(true);
    });
  });

  describe("checkSpecificRule", () => {
    it("should return true for a triggered rule", () => {
      const triggered = checkSpecificRule("sepsis-1", {
        fever: true,
        alteredConsciousness: true,
        rapidBreathing: true,
      });
      expect(triggered).toBe(true);
    });

    it("should return false for a non-triggered rule", () => {
      const triggered = checkSpecificRule("sepsis-1", {
        fever: false,
        alteredConsciousness: false,
        rapidBreathing: false,
      });
      expect(triggered).toBe(false);
    });

    it("should return false for unknown rule ID", () => {
      const triggered = checkSpecificRule("non-existent-rule", {});
      expect(triggered).toBe(false);
    });
  });

  describe("No red flags detected", () => {
    it("should return detected=false for empty input", () => {
      const result = checkRedFlags({});
      expect(result.detected).toBe(false);
      expect(result.flags).toHaveLength(0);
      expect(result.emergencyAction).toBe("");
    });

    it("should return detected=false for non-emergency symptoms", () => {
      const result = checkRedFlags({
        fever: false,
        chestPain: false,
        headache: false,
      });
      expect(result.detected).toBe(false);
    });
  });

  describe("checkRedFlagsWithConfig", () => {
    it("should respect disabled rules", () => {
      disableRule("sepsis-3");

      const result = checkRedFlagsWithConfig({
        fever: true,
        respiratoryRate: 45,
      });
      expect(result.detected).toBe(false);

      enableRule("sepsis-3");
    });

    it("should detect enabled rules after re-enabling", () => {
      enableRule("sepsis-3");
      expect(isRuleEnabled("sepsis-3")).toBe(true);

      const result = checkRedFlagsWithConfig({
        fever: true,
        respiratoryRate: 45,
      });
      expect(result.detected).toBe(true);
    });
  });
});
