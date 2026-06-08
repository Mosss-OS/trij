import { describe, it, expect } from "bun:test";
import {
  mapPatientToFhir,
  mapVitalSignsToFhirObservations,
  mapAssessmentToFhirCondition,
  mapAssessmentToFhirClinicalImpression,
  mapAssessmentToFhirBundle,
  createFhirBundle,
  exportFhirAsJson,
} from "@/lib/fhir";
import type { Patient, Assessment, VitalSigns } from "@/types/trij";

const mockPatient: Patient = {
  id: "patient-123",
  chwUserId: "chw-456",
  identifier: "P001",
  ageYears: 35,
  sex: "M",
  notes: "Regular patient",
  locationLat: 6.5244,
  locationLng: 3.3792,
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
  version: 1,
};

const mockVitalSigns: VitalSigns = {
  systolicBP: 120,
  diastolicBP: 80,
  heartRate: 72,
  respiratoryRate: 16,
  temperature: 37.0,
  oxygenSaturation: 98,
  weight: 70,
  muac: 25,
  painScale: 3,
};

const mockAssessment: Assessment = {
  id: "assessment-789",
  patientId: "patient-123",
  chwUserId: "chw-456",
  images: [],
  presentationType: "dermatology",
  description: "Patient presents with skin rash",
  vitalSigns: mockVitalSigns,
  condition: "Contact Dermatitis",
  icd10Code: "L23.9",
  confidence: {
    confidence_point: 85,
    confidence_interval: [75, 95],
    uncertainty_source: "image_quality",
    uncertainty_reason: "Adequate image quality",
  },
  urgency: "yellow",
  possibleConditions: [
    { name: "Contact Dermatitis", probability: 0.85 },
    { name: "Atopic Dermatitis", probability: 0.1 },
    { name: "Psoriasis", probability: 0.05 },
  ],
  keyVisualFeatures: ["erythema", "scaling", "pruritus"],
  recommendation: "Apply topical corticosteroids and avoid irritants",
  language: "en",
  referralStatus: "none",
  patientConsent: true,
  consentTimestamp: "2024-01-15T10:30:00Z",
  createdAt: "2024-01-15T10:30:00Z",
  version: 1,
};

const mockFemalePatient: Patient = {
  ...mockPatient,
  id: "patient-456",
  identifier: "P002",
  sex: "F",
};

describe("FHIR R4 Mapping", () => {
  describe("mapPatientToFhir", () => {
    it("should map a male patient correctly", () => {
      const fhirPatient = mapPatientToFhir(mockPatient);
      expect(fhirPatient.resourceType).toBe("Patient");
      expect(fhirPatient.id).toBe("patient-123");
      expect(fhirPatient.identifier[0].value).toBe("P001");
      expect(fhirPatient.gender).toBe("male");
      expect(fhirPatient.active).toBe(true);
    });

    it("should map a female patient correctly", () => {
      const fhirPatient = mapPatientToFhir(mockFemalePatient);
      expect(fhirPatient.gender).toBe("female");
    });

    it("should estimate birthDate from ageYears", () => {
      const fhirPatient = mapPatientToFhir(mockPatient);
      expect(fhirPatient.birthDate).toBeDefined();
      const birthYear = new Date(fhirPatient.birthDate!).getFullYear();
      const expectedYear = new Date().getFullYear() - 35;
      expect(birthYear).toBe(expectedYear);
    });

    it("should include location extension when coordinates present", () => {
      const fhirPatient = mapPatientToFhir(mockPatient);
      expect(fhirPatient.extension).toBeDefined();
      expect(fhirPatient.extension![0].valueString).toBe("6.5244,3.3792");
    });

    it("should include meta with version", () => {
      const fhirPatient = mapPatientToFhir(mockPatient);
      expect(fhirPatient.meta).toBeDefined();
      expect(fhirPatient.meta!.versionId).toBe("1");
    });

    it("should set active to false when patient is merged", () => {
      const mergedPatient: Patient = { ...mockPatient, mergedInto: "patient-999" };
      const fhirPatient = mapPatientToFhir(mergedPatient);
      expect(fhirPatient.active).toBe(false);
    });
  });

  describe("mapVitalSignsToFhirObservations", () => {
    it("should create observations for all provided vital signs", () => {
      const observations = mapVitalSignsToFhirObservations(mockVitalSigns, "patient-123", "assessment-789");
      expect(observations.length).toBeGreaterThan(0);
      expect(observations.every((obs) => obs.resourceType === "Observation")).toBe(true);
      expect(observations.every((obs) => obs.status === "final")).toBe(true);
    });

    it("should create a blood pressure panel with components", () => {
      const observations = mapVitalSignsToFhirObservations(mockVitalSigns, "patient-123", "assessment-789");
      const bpPanel = observations.find((o) => o.code.coding[0].code === "85354-9");
      expect(bpPanel).toBeDefined();
      expect(bpPanel!.component).toHaveLength(2);
    });

    it("should create individual observations for each vital sign", () => {
      const observations = mapVitalSignsToFhirObservations(mockVitalSigns, "patient-123", "assessment-789");
      const loincCodes = observations.map((o) => o.code.coding[0].code);
      expect(loincCodes).toContain("8867-4"); // heart rate
      expect(loincCodes).toContain("9279-1"); // respiratory rate
      expect(loincCodes).toContain("8310-5"); // temperature
      expect(loincCodes).toContain("2708-6"); // oxygen saturation
      expect(loincCodes).toContain("29463-7"); // body weight
      expect(loincCodes).toContain("72302-7"); // MUAC
      expect(loincCodes).toContain("72514-3"); // pain scale
    });

    it("should return empty array for empty vital signs", () => {
      const observations = mapVitalSignsToFhirObservations({}, "patient-123", "assessment-789");
      expect(observations).toHaveLength(0);
    });

    it("should handle partial vital signs", () => {
      const partial: VitalSigns = { heartRate: 72, temperature: 37.0 };
      const observations = mapVitalSignsToFhirObservations(partial, "patient-123", "assessment-789");
      expect(observations.length).toBeGreaterThanOrEqual(2);
      const loincCodes = observations.map((o) => o.code.coding[0].code);
      expect(loincCodes).toContain("8867-4");
      expect(loincCodes).toContain("8310-5");
      expect(loincCodes).not.toContain("9279-1");
    });
  });

  describe("mapAssessmentToFhirCondition", () => {
    it("should create a condition with correct resource type and references", () => {
      const fhirCondition = mapAssessmentToFhirCondition(mockAssessment, "patient-123");
      expect(fhirCondition).not.toBeNull();
      expect(fhirCondition!.resourceType).toBe("Condition");
      expect(fhirCondition!.id).toBe("assessment-789");
      expect(fhirCondition!.subject.reference).toBe("Patient/patient-123");
    });

    it("should include ICD-10 code in condition coding", () => {
      const fhirCondition = mapAssessmentToFhirCondition(mockAssessment, "patient-123");
      expect(fhirCondition!.code).toBeDefined();
      const icdCoding = fhirCondition!.code!.coding.find((c) => c.system?.includes("icd-10"));
      expect(icdCoding).toBeDefined();
      expect(icdCoding!.code).toBe("L23.9");
    });

    it("should set verification status as confirmed", () => {
      const fhirCondition = mapAssessmentToFhirCondition(mockAssessment, "patient-123");
      expect(fhirCondition!.verificationStatus.coding[0].display).toBe("Confirmed");
    });

    it("should map urgency to severity", () => {
      const fhirCondition = mapAssessmentToFhirCondition(mockAssessment, "patient-123");
      expect(fhirCondition!.severity).toBeDefined();
      expect(fhirCondition!.severity!.coding[0].display).toBe("yellow");
    });

    it("should include evidence from key visual features", () => {
      const fhirCondition = mapAssessmentToFhirCondition(mockAssessment, "patient-123");
      expect(fhirCondition!.evidence).toBeDefined();
      expect(fhirCondition!.evidence![0].code![0].coding.map((c) => c.code)).toContain("erythema");
    });

    it("should return null when no condition or ICD-10 code", () => {
      const emptyAssessment: Assessment = {
        ...mockAssessment,
        condition: undefined,
        icd10Code: undefined,
      };
      const fhirCondition = mapAssessmentToFhirCondition(emptyAssessment, "patient-123");
      expect(fhirCondition).toBeNull();
    });
  });

  describe("mapAssessmentToFhirClinicalImpression", () => {
    it("should create a completed ClinicalImpression", () => {
      const impression = mapAssessmentToFhirClinicalImpression(mockAssessment, "patient-123");
      expect(impression).not.toBeNull();
      expect(impression!.resourceType).toBe("ClinicalImpression");
      expect(impression!.status).toBe("completed");
      expect(impression!.subject.reference).toBe("Patient/patient-123");
    });

    it("should include summary and description", () => {
      const impression = mapAssessmentToFhirClinicalImpression(mockAssessment, "patient-123");
      expect(impression!.summary).toContain("Contact Dermatitis");
      expect(impression!.description).toBe("Patient presents with skin rash");
    });

    it("should include findings from possible conditions", () => {
      const impression = mapAssessmentToFhirClinicalImpression(mockAssessment, "patient-123");
      expect(impression!.finding).toHaveLength(3);
      expect(impression!.finding![0].itemCodeableConcept!.text).toContain("Contact Dermatitis");
    });

    it("should include prognosis based on urgency", () => {
      const impression = mapAssessmentToFhirClinicalImpression(mockAssessment, "patient-123");
      expect(impression!.prognosisCodeableConcept).toBeDefined();
      expect(impression!.prognosisCodeableConcept![0].coding[0].display).toBe("yellow");
    });

    it("should include recommendation in notes", () => {
      const impression = mapAssessmentToFhirClinicalImpression(mockAssessment, "patient-123");
      expect(impression!.note![0].text).toContain("topical corticosteroids");
    });

    it("should reference condition ID when provided", () => {
      const impression = mapAssessmentToFhirClinicalImpression(mockAssessment, "patient-123", "assessment-789");
      expect(impression!.problem).toBeDefined();
      expect(impression!.problem![0].reference).toBe("Condition/assessment-789");
    });

    it("should include investigation for vital signs", () => {
      const impression = mapAssessmentToFhirClinicalImpression(mockAssessment, "patient-123");
      expect(impression!.investigation).toBeDefined();
      expect(impression!.investigation![0].code.coding[0].display).toBe("Vital signs measurement");
    });
  });

  describe("mapAssessmentToFhirBundle", () => {
    it("should return all four resource types", () => {
      const bundle = mapAssessmentToFhirBundle(mockAssessment, mockPatient);
      expect(bundle.patient.resourceType).toBe("Patient");
      expect(Array.isArray(bundle.observations)).toBe(true);
      expect(bundle.condition).not.toBeNull();
      expect(bundle.condition!.resourceType).toBe("Condition");
      expect(bundle.clinicalImpression).not.toBeNull();
      expect(bundle.clinicalImpression!.resourceType).toBe("ClinicalImpression");
    });

    it("should have empty observations when no vital signs", () => {
      const assessmentNoVitals: Assessment = { ...mockAssessment, vitalSigns: undefined };
      const bundle = mapAssessmentToFhirBundle(assessmentNoVitals, mockPatient);
      expect(bundle.observations).toHaveLength(0);
    });
  });

  describe("createFhirBundle", () => {
    it("should create a Bundle resource of type document", () => {
      const bundle = createFhirBundle(mockAssessment, mockPatient);
      expect(bundle.resourceType).toBe("Bundle");
      expect(bundle.type).toBe("document");
      expect(Array.isArray(bundle.entry)).toBe(true);
      expect(bundle.entry.length).toBeGreaterThan(0);
    });

    it("should include all resources as entries", () => {
      const bundle = createFhirBundle(mockAssessment, mockPatient);
      const entryTypes = bundle.entry.map((e) => e.resource.resourceType);
      expect(entryTypes).toContain("Patient");
      expect(entryTypes).toContain("Observation");
      expect(entryTypes).toContain("Condition");
      expect(entryTypes).toContain("ClinicalImpression");
    });
  });

  describe("exportFhirAsJson", () => {
    it("should produce valid JSON string", () => {
      const fhirData = mapAssessmentToFhirBundle(mockAssessment, mockPatient);
      const jsonString = exportFhirAsJson(fhirData);
      expect(typeof jsonString).toBe("string");
      expect(jsonString.includes("resourceType")).toBe(true);
      expect(jsonString.includes("Patient")).toBe(true);
    });
  });
});
