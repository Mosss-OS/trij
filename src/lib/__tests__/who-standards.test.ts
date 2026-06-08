import { describe, it, expect } from "bun:test";
import { calculateWHOScores, getZScoreLabel, getZScoreColor } from "@/lib/who-standards";

describe("WHO Child Growth Standards", () => {
  describe("calculateWHOScores", () => {
    it("should return near-zero Z-scores for a 12-month-old boy at median values", () => {
      const result = calculateWHOScores(9.6, 75.7, 12, "male");
      expect(result).not.toBeNull();
      expect(Math.abs(result!.waz)).toBeLessThan(1);
      expect(Math.abs(result!.haz)).toBeLessThan(1);
      expect(Math.abs(result!.whz)).toBeLessThan(1);
    });

    it("should have negative Z-scores for underweight 24-month-old girl", () => {
      const result = calculateWHOScores(10.0, 85.0, 24, "female");
      expect(result).not.toBeNull();
      expect(result!.waz).toBeLessThan(0);
      expect(result!.whz).toBeLessThan(0);
    });

    it("should have negative Z-scores for low-weight 6-month-old boy", () => {
      const result = calculateWHOScores(5.5, 62.0, 6, "male");
      expect(result).not.toBeNull();
      expect(result!.waz).toBeLessThan(0);
      expect(result!.haz).toBeLessThan(0);
    });

    it("should return normal for a healthy 36-month-old girl", () => {
      const result = calculateWHOScores(14.0, 96.0, 36, "female");
      expect(result).not.toBeNull();
      expect(result!.classification).toBe("normal");
      expect(result!.urgency).toBe("green");
    });

    it("should return null for out-of-range age", () => {
      expect(calculateWHOScores(10, 75, 72, "male")).toBeNull();
      expect(calculateWHOScores(10, 75, -1, "male")).toBeNull();
    });

    it("should return null for invalid measurements", () => {
      expect(calculateWHOScores(0, 75, 12, "male")).toBeNull();
      expect(calculateWHOScores(10, 0, 12, "male")).toBeNull();
    });

    it("should produce very negative WHZ for extreme wasting", () => {
      const result = calculateWHOScores(5.5, 75.0, 12, "male");
      expect(result).not.toBeNull();
      expect(result!.whz).toBeLessThan(-3);
      expect(result!.classification).toBe("sam");
      expect(result!.urgency).toBe("red");
    });

    it("should return finite Z-scores for all test cases", () => {
      const testCases = [
        [7.0, 68.0, 6, "male"] as const,
        [8.5, 72.0, 12, "female"] as const,
        [12.0, 88.0, 24, "male"] as const,
        [15.0, 100.0, 48, "female"] as const,
      ];
      for (const [weight, height, ageMonths, sex] of testCases) {
        const result = calculateWHOScores(weight, height, ageMonths, sex);
        expect(result).not.toBeNull();
        expect(Number.isFinite(result!.waz)).toBe(true);
        expect(Number.isFinite(result!.haz)).toBe(true);
        expect(Number.isFinite(result!.whz)).toBe(true);
        expect(Number.isFinite(result!.bmiForAge)).toBe(true);
      }
    });
  });

  describe("getZScoreLabel", () => {
    it("should classify severe below -3", () => {
      expect(getZScoreLabel(-3.5)).toBe("Severe (< -3)");
    });

    it("should classify moderate between -3 and -2", () => {
      expect(getZScoreLabel(-2.5)).toBe("Moderate (-3 to -2)");
    });

    it("should classify normal between -1 and +1", () => {
      expect(getZScoreLabel(0)).toBe("Normal (-1 to +1)");
    });

    it("should classify high above +3", () => {
      expect(getZScoreLabel(3.5)).toBe("High (> +3)");
    });
  });

  describe("getZScoreColor", () => {
    it("should return red for severe malnutrition", () => {
      expect(getZScoreColor(-3.5)).toBe("text-urgency-red");
    });

    it("should return green for normal range", () => {
      expect(getZScoreColor(0)).toBe("text-emerald-600");
    });

    it("should return yellow for moderate ranges", () => {
      expect(getZScoreColor(-2.5)).toBe("text-urgency-yellow");
      expect(getZScoreColor(2.5)).toBe("text-urgency-yellow");
    });
  });
});
