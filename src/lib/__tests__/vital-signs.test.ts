import { describe, it, expect } from "bun:test";
import { evaluateVitalSigns, getAgeGroup, getNormalRanges } from "@/lib/vital-signs";

describe("Vital Signs", () => {
  describe("getAgeGroup", () => {
    it("should classify infant (<1 year)", () => {
      expect(getAgeGroup(0.5)).toBe("infant");
    });

    it("should classify toddler (1-4 years)", () => {
      expect(getAgeGroup(2)).toBe("toddler");
    });

    it("should classify child (5-12 years)", () => {
      expect(getAgeGroup(10)).toBe("child");
    });

    it("should classify adult (13-64 years)", () => {
      expect(getAgeGroup(30)).toBe("adult");
    });

    it("should classify elderly (65+)", () => {
      expect(getAgeGroup(70)).toBe("elderly");
    });
  });

  describe("getNormalRanges", () => {
    it("should return ranges for adult", () => {
      const ranges = getNormalRanges(30);
      expect(ranges.temperature).toBe("36-37.5");
      expect(ranges.heartRate).toBe("60-100");
      expect(ranges.respiratoryRate).toBe("12-20");
      expect(ranges.oxygenSaturation).toBe("≥ 95");
    });

    it("should return ranges for infant", () => {
      const ranges = getNormalRanges(0.5);
      expect(ranges.heartRate).toBe("100-160");
      expect(ranges.respiratoryRate).toBe("30-50");
    });
  });

  describe("evaluateTemperature", () => {
    it("should flag hypothermia below 36°C as abnormal", () => {
      const result = evaluateVitalSigns({ temperature: 35.5 }, 30);
      expect(result.alerts.length).toBeGreaterThanOrEqual(1);
      const tempAlert = result.alerts.find((a) => a.field === "temperature");
      expect(tempAlert).toBeDefined();
      expect(tempAlert!.severity).toBe("abnormal");
    });

    it("should flag critical hypothermia below 35°C", () => {
      const result = evaluateVitalSigns({ temperature: 34.0 }, 30);
      const tempAlert = result.alerts.find((a) => a.field === "temperature");
      expect(tempAlert).toBeDefined();
      expect(tempAlert!.severity).toBe("critical");
    });

    it("should flag fever above 37.5°C", () => {
      const result = evaluateVitalSigns({ temperature: 38.0 }, 30);
      const tempAlert = result.alerts.find((a) => a.field === "temperature");
      expect(tempAlert).toBeDefined();
      expect(tempAlert!.severity).toBe("abnormal");
    });

    it("should flag critical fever in infant under 1 year", () => {
      const result = evaluateVitalSigns({ temperature: 39.0 }, 0.5);
      const tempAlert = result.alerts.find((a) => a.field === "temperature");
      expect(tempAlert).toBeDefined();
      expect(tempAlert!.severity).toBe("critical");
      expect(tempAlert!.interpretation).toContain("infant");
    });

    it("should flag critical hyperpyrexia at ≥39.5°C", () => {
      const result = evaluateVitalSigns({ temperature: 40.0 }, 30);
      const tempAlert = result.alerts.find((a) => a.field === "temperature");
      expect(tempAlert).toBeDefined();
      expect(tempAlert!.severity).toBe("critical");
    });

    it("should return no alert for normal temperature", () => {
      const result = evaluateVitalSigns({ temperature: 37.0 }, 30);
      const tempAlert = result.alerts.find((a) => a.field === "temperature");
      expect(tempAlert).toBeUndefined();
    });
  });

  describe("evaluateRespiratoryRate", () => {
    it("should flag tachypnoea in adult (RR > 20)", () => {
      const result = evaluateVitalSigns({ respiratoryRate: 28 }, 30);
      const alert = result.alerts.find((a) => a.field === "respiratoryRate");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("abnormal");
    });

    it("should flag critical tachypnoea in adult (RR ≥ 30)", () => {
      const result = evaluateVitalSigns({ respiratoryRate: 32 }, 30);
      const alert = result.alerts.find((a) => a.field === "respiratoryRate");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("critical");
    });

    it("should flag bradypnoea in adult (RR < 12)", () => {
      const result = evaluateVitalSigns({ respiratoryRate: 10 }, 30);
      const alert = result.alerts.find((a) => a.field === "respiratoryRate");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("abnormal");
    });

    it("should flag critical bradypnoea in adult (RR ≤ 8)", () => {
      const result = evaluateVitalSigns({ respiratoryRate: 6 }, 30);
      const alert = result.alerts.find((a) => a.field === "respiratoryRate");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("critical");
    });

    it("should accept normal respiratory rate", () => {
      const result = evaluateVitalSigns({ respiratoryRate: 16 }, 30);
      const alert = result.alerts.find((a) => a.field === "respiratoryRate");
      expect(alert).toBeUndefined();
    });
  });

  describe("evaluateHeartRate", () => {
    it("should flag tachycardia in adult (HR > 100)", () => {
      const result = evaluateVitalSigns({ heartRate: 110 }, 30);
      const alert = result.alerts.find((a) => a.field === "heartRate");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("abnormal");
    });

    it("should flag critical tachycardia (HR ≥ 130)", () => {
      const result = evaluateVitalSigns({ heartRate: 140 }, 30);
      const alert = result.alerts.find((a) => a.field === "heartRate");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("critical");
    });

    it("should flag bradycardia in adult (HR < 60)", () => {
      const result = evaluateVitalSigns({ heartRate: 50 }, 30);
      const alert = result.alerts.find((a) => a.field === "heartRate");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("abnormal");
    });

    it("should flag critical bradycardia (HR ≤ 40)", () => {
      const result = evaluateVitalSigns({ heartRate: 38 }, 30);
      const alert = result.alerts.find((a) => a.field === "heartRate");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("critical");
    });

    it("should accept normal heart rate", () => {
      const result = evaluateVitalSigns({ heartRate: 72 }, 30);
      const alert = result.alerts.find((a) => a.field === "heartRate");
      expect(alert).toBeUndefined();
    });

    it("should use age-specific ranges for infants", () => {
      const result = evaluateVitalSigns({ heartRate: 170 }, 0.5);
      const alert = result.alerts.find((a) => a.field === "heartRate");
      expect(alert).toBeDefined();
    });
  });

  describe("evaluateBloodPressure", () => {
    it("should flag hypotension (SBP < min for adult)", () => {
      const result = evaluateVitalSigns({ systolicBP: 85, diastolicBP: 60 }, 30);
      const alert = result.alerts.find((a) => a.field === "systolicBP");
      expect(alert).toBeDefined();
    });

    it("should flag critical hypotension (SBP below criticalLow)", () => {
      const result = evaluateVitalSigns({ systolicBP: 80, diastolicBP: 60 }, 30);
      const alert = result.alerts.find((a) => a.field === "systolicBP");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("critical");
    });

    it("should flag hypertension (SBP > 120 for adult)", () => {
      const result = evaluateVitalSigns({ systolicBP: 140, diastolicBP: 85 }, 30);
      const alert = result.alerts.find((a) => a.field === "systolicBP");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("abnormal");
    });

    it("should flag critical hypertension (SBP ≥ 180)", () => {
      const result = evaluateVitalSigns({ systolicBP: 190, diastolicBP: 100 }, 30);
      const alert = result.alerts.find((a) => a.field === "systolicBP");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("critical");
    });

    it("should flag critical diastolic hypertension (DBP > 110)", () => {
      const result = evaluateVitalSigns({ systolicBP: 120, diastolicBP: 115 }, 30);
      const alert = result.alerts.find((a) => a.field === "diastolicBP");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("critical");
    });

    it("should flag elevated diastolic BP (DBP > 90)", () => {
      const result = evaluateVitalSigns({ systolicBP: 120, diastolicBP: 95 }, 30);
      const alert = result.alerts.find((a) => a.field === "diastolicBP");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("abnormal");
    });

    it("should accept normal blood pressure", () => {
      const result = evaluateVitalSigns({ systolicBP: 110, diastolicBP: 75 }, 30);
      const alerts = result.alerts.filter((a) => a.field.startsWith("systolic") || a.field.startsWith("diastolic"));
      expect(alerts).toHaveLength(0);
    });
  });

  describe("evaluateOxygenSaturation", () => {
    it("should return no alert for SpO₂ ≥ 95%", () => {
      const result = evaluateVitalSigns({ oxygenSaturation: 96 }, 30);
      const alert = result.alerts.find((a) => a.field === "oxygenSaturation");
      expect(alert).toBeUndefined();
    });

    it("should flag low SpO₂ (< 95%)", () => {
      const result = evaluateVitalSigns({ oxygenSaturation: 93 }, 30);
      const alert = result.alerts.find((a) => a.field === "oxygenSaturation");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("abnormal");
    });

    it("should flag critical hypoxaemia (SpO₂ < 92%)", () => {
      const result = evaluateVitalSigns({ oxygenSaturation: 88 }, 30);
      const alert = result.alerts.find((a) => a.field === "oxygenSaturation");
      expect(alert).toBeDefined();
      expect(alert!.severity).toBe("critical");
    });
  });

  describe("evaluateVitalSigns - aggregate", () => {
    it("should set red urgency override when critical alerts present", () => {
      const result = evaluateVitalSigns({ temperature: 34.0, heartRate: 38 }, 30);
      expect(result.urgencyOverride).toBe("red");
    });

    it("should set yellow urgency when 2+ abnormal alerts present", () => {
      const result = evaluateVitalSigns({ temperature: 38.0, respiratoryRate: 28 }, 30);
      expect(result.urgencyOverride).toBe("yellow");
    });

    it("should set no urgency override for normal vitals", () => {
      const result = evaluateVitalSigns({ temperature: 37.0, heartRate: 72, respiratoryRate: 16, oxygenSaturation: 98, systolicBP: 110 }, 30);
      expect(result.urgencyOverride).toBeNull();
    });

    it("should calculate score correctly", () => {
      const result = evaluateVitalSigns({ temperature: 34.0, heartRate: 50 }, 30);
      expect(result.score).toBeGreaterThan(0);
    });
  });
});
