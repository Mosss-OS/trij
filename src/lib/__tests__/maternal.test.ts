import { describe, it, expect } from "bun:test";
import { assessMaternal, getFundalHeightGuide } from "@/lib/maternal";

describe("Maternal Health Assessment", () => {
  describe("assessMaternal - Antenatal", () => {
    it("should return green urgency when no danger signs", () => {
      const result = assessMaternal({
        phase: "antenatal",
        antenatalDangerSigns: [],
        postnatalDangerSigns: [],
        neonatalDangerSigns: [],
      });
      expect(result.urgency).toBe("green");
      expect(result.referralRequired).toBe(false);
      expect(result.suspectedCondition).toContain("No danger signs detected");
    });

    it("should return red urgency for fitting (eclampsia)", () => {
      const result = assessMaternal({
        phase: "antenatal",
        antenatalDangerSigns: ["fitting"],
        postnatalDangerSigns: [],
        neonatalDangerSigns: [],
      });
      expect(result.urgency).toBe("red");
      expect(result.referralRequired).toBe(true);
      expect(result.suspectedCondition).toContain("Eclampsia");
    });

    it("should return red urgency for heavy bleeding", () => {
      const result = assessMaternal({
        phase: "antenatal",
        antenatalDangerSigns: ["heavy_bleeding"],
        postnatalDangerSigns: [],
        neonatalDangerSigns: [],
      });
      expect(result.urgency).toBe("red");
      expect(result.suspectedCondition).toContain("haemorrhage");
    });

    it("should return red urgency for severe hypertension", () => {
      const result = assessMaternal({
        phase: "antenatal",
        antenatalDangerSigns: [],
        postnatalDangerSigns: [],
        neonatalDangerSigns: [],
        systolicBP: 160,
        diastolicBP: 110,
      });
      expect(result.urgency).toBe("red");
      expect(result.suspectedCondition).toContain("hypertension");
    });

    it("should return yellow urgency for non-emergency danger signs", () => {
      const result = assessMaternal({
        phase: "antenatal",
        antenatalDangerSigns: ["swollen_face_hands"],
        postnatalDangerSigns: [],
        neonatalDangerSigns: [],
      });
      expect(result.urgency).toBe("yellow");
      expect(result.referralRequired).toBe(true);
    });

    it("should return red urgency for maternal fever", () => {
      const result = assessMaternal({
        phase: "antenatal",
        antenatalDangerSigns: ["fever"],
        postnatalDangerSigns: [],
        neonatalDangerSigns: [],
        temperature: 38.5,
      });
      expect(result.urgency).toBe("red");
    });
  });

  describe("assessMaternal - Postnatal", () => {
    it("should return yellow urgency for postnatal heavy bleeding", () => {
      const result = assessMaternal({
        phase: "postnatal",
        antenatalDangerSigns: [],
        postnatalDangerSigns: ["heavy_bleeding_postnatal"],
        neonatalDangerSigns: [],
      });
      expect(result.urgency).toBe("yellow");
      expect(result.suspectedCondition).toContain("haemorrhage");
    });

    it("should return yellow urgency for breast engorgement", () => {
      const result = assessMaternal({
        phase: "postnatal",
        antenatalDangerSigns: [],
        postnatalDangerSigns: ["breast_engorgement"],
        neonatalDangerSigns: [],
      });
      expect(result.urgency).toBe("yellow");
    });

    it("should return green when no postnatal danger signs", () => {
      const result = assessMaternal({
        phase: "postnatal",
        antenatalDangerSigns: [],
        postnatalDangerSigns: [],
        neonatalDangerSigns: [],
      });
      expect(result.urgency).toBe("green");
    });
  });

  describe("assessMaternal - Neonatal", () => {
    it("should return red urgency for neonatal breathing difficulty", () => {
      const result = assessMaternal({
        phase: "postnatal",
        antenatalDangerSigns: [],
        postnatalDangerSigns: [],
        neonatalDangerSigns: ["neonatal_breathing_difficulty"],
      });
      expect(result.urgency).toBe("red");
      expect(result.suspectedCondition).toContain("respiratory distress");
    });

    it("should return red urgency for neonatal convulsions", () => {
      const result = assessMaternal({
        phase: "postnatal",
        antenatalDangerSigns: [],
        postnatalDangerSigns: [],
        neonatalDangerSigns: ["neonatal_convulsions"],
      });
      expect(result.urgency).toBe("red");
      expect(result.suspectedCondition).toContain("seizures");
    });

    it("should return red urgency for neonatal fever", () => {
      const result = assessMaternal({
        phase: "postnatal",
        antenatalDangerSigns: [],
        postnatalDangerSigns: [],
        neonatalDangerSigns: ["neonatal_fever"],
      });
      expect(result.urgency).toBe("red");
      expect(result.suspectedCondition).toContain("sepsis");
    });

    it("should return yellow urgency for non-critical neonatal signs", () => {
      const result = assessMaternal({
        phase: "postnatal",
        antenatalDangerSigns: [],
        postnatalDangerSigns: [],
        neonatalDangerSigns: ["neonatal_umbilical_discharge"],
      });
      expect(result.urgency).toBe("yellow");
    });
  });

  describe("getFundalHeightGuide", () => {
    it("should return correct guide for early pregnancy", () => {
      expect(getFundalHeightGuide(10)).toBe("Not palpable above pubic symphysis");
    });

    it("should return correct guide for 20 weeks", () => {
      expect(getFundalHeightGuide(20)).toBe("At umbilicus");
    });

    it("should return correct guide for 32 weeks", () => {
      expect(getFundalHeightGuide(32)).toBe("At xiphisternum");
    });

    it("should return correct guide for 36 weeks", () => {
      expect(getFundalHeightGuide(36)).toBe("Highest point (may decrease after 36w as engagement occurs)");
    });

    it("should return post-term guide beyond 40 weeks", () => {
      expect(getFundalHeightGuide(42)).toBe("Post-term — below xiphisternum");
    });
  });
});
