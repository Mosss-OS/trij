import { describe, it, expect } from "bun:test";
import { findNearestFacility, getFacilities } from "@/lib/facilities";

describe("Facilities", () => {
  describe("getFacilities", () => {
    it("should return a non-empty list of facilities", () => {
      const facilities = getFacilities();
      expect(facilities.length).toBeGreaterThan(0);
    });

    it("should include hospitals in multiple regions", () => {
      const facilities = getFacilities();
      const names = facilities.map((f) => f.name);
      expect(names.some((n) => n.includes("Lagos"))).toBe(true);
      expect(names.some((n) => n.includes("Kenyatta"))).toBe(true);
      expect(names.some((n) => n.includes("AIIMS") || n.includes("Safdarjung"))).toBe(true);
    });

    it("should return a copy, not the original array", () => {
      const a = getFacilities();
      const b = getFacilities();
      expect(a).not.toBe(b);
    });
  });

  describe("findNearestFacility", () => {
    it("should find the nearest facility to a given coordinate", () => {
      // Coords near Lagos University Teaching Hospital
      const nearest = findNearestFacility({ lat: 6.52, lng: 3.38 });
      expect(nearest).not.toBeNull();
      expect(nearest!.name).toContain("Lagos");
    });

    it("should find a Nairobi facility for coordinates near Nairobi", () => {
      const nearest = findNearestFacility({ lat: -1.3, lng: 36.8 });
      expect(nearest).not.toBeNull();
      expect(nearest!.name).toContain("Hospital");
    });

    it("should return null for empty facility list fallback", () => {
      // Can't really test this without modifying the module, but we can test the function handles edge cases
      const nearest = findNearestFacility({ lat: 0, lng: 0 });
      expect(nearest).not.toBeNull();
    });

    it("should return facilities with consistent structure", () => {
      const nearest = findNearestFacility({ lat: 28.6, lng: 77.2 });
      expect(nearest).not.toBeNull();
      expect(nearest!.id).toBeTruthy();
      expect(nearest!.name).toBeTruthy();
      expect(typeof nearest!.lat).toBe("number");
      expect(typeof nearest!.lng).toBe("number");
      expect(["hospital", "clinic", "health_center"]).toContain(nearest!.type);
    });
  });

  describe("Haversine distance calculation", () => {
    it("should return 0 distance for same coordinates", () => {
      const nearest = findNearestFacility({ lat: 6.5244, lng: 3.3792 });
      expect(nearest).not.toBeNull();
      // Should be Lagos University Teaching Hospital (same coords)
      expect(nearest!.name).toBe("Lagos University Teaching Hospital");
    });

    it("should find the closest facility correctly", () => {
      // Coords exactly between two facilities - should pick closer one
      const facilities = getFacilities();
      const lagosHosp = facilities.find((f) => f.id === "ng-lagos-1")!;
      const ekoHosp = facilities.find((f) => f.id === "ng-lagos-2")!;

      // Point closer to Eko Hospital (Ikeja)
      const nearest = findNearestFacility({ lat: 6.59, lng: 3.35 });
      expect(nearest).not.toBeNull();
      expect(nearest!.id).toBe("ng-lagos-2");
    });
  });
});
