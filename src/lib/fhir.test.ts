/**
 * FHIR R4 Mapping Tests
 *
 * Tests for validating that Trij data structures are correctly mapped to FHIR R4 resources
 */

import {
  mapPatientToFhir,
  mapVitalSignsToFhirObservations,
  mapAssessmentToFhirCondition,
  mapAssessmentToFhirClinicalImpression,
  mapAssessmentToFhirBundle,
  createFhirBundle,
  exportFhirAsJson,
} from "./fhir";
import type { Patient, Assessment, VitalSigns } from "@/types/trij";

// Test data
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

function runTests() {
  console.log("Running FHIR R4 Mapping Tests...\n");

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Patient to FHIR mapping
  totalTests++;
  try {
    const fhirPatient = mapPatientToFhir(mockPatient);

    if (
      fhirPatient.resourceType === "Patient" &&
      fhirPatient.id === "patient-123" &&
      fhirPatient.identifier.length > 0 &&
      fhirPatient.identifier[0].value === "P001" &&
      fhirPatient.gender === "male" &&
      fhirPatient.active === true
    ) {
      console.log("✓ Test 1 passed: Patient to FHIR mapping");
      passedTests++;
    } else {
      console.log("✗ Test 1 failed: Patient to FHIR mapping");
    }
  } catch (error) {
    console.log(`✗ Test 1 failed with error: ${error}`);
  }

  // Test 2: Vital Signs to FHIR Observations mapping
  totalTests++;
  try {
    const fhirObservations = mapVitalSignsToFhirObservations(
      mockVitalSigns,
      "patient-123",
      "assessment-789",
    );

    if (
      Array.isArray(fhirObservations) &&
      fhirObservations.length > 0 &&
      fhirObservations.every((obs) => obs.resourceType === "Observation") &&
      fhirObservations.every((obs) => obs.status === "final")
    ) {
      console.log("✓ Test 2 passed: Vital Signs to FHIR Observations mapping");
      passedTests++;
    } else {
      console.log("✗ Test 2 failed: Vital Signs to FHIR Observations mapping");
    }
  } catch (error) {
    console.log(`✗ Test 2 failed with error: ${error}`);
  }

  // Test 3: Assessment to FHIR Condition mapping
  totalTests++;
  try {
    const fhirCondition = mapAssessmentToFhirCondition(mockAssessment, "patient-123");

    if (
      fhirCondition !== null &&
      fhirCondition.resourceType === "Condition" &&
      fhirCondition.id === "assessment-789" &&
      fhirCondition.subject.reference === "Patient/patient-123" &&
      fhirCondition.code !== null &&
      fhirCondition.verificationStatus !== null
    ) {
      console.log("✓ Test 3 passed: Assessment to FHIR Condition mapping");
      passedTests++;
    } else {
      console.log("✗ Test 3 failed: Assessment to FHIR Condition mapping");
    }
  } catch (error) {
    console.log(`✗ Test 3 failed with error: ${error}`);
  }

  // Test 4: Assessment to FHIR ClinicalImpression mapping
  totalTests++;
  try {
    const fhirImpression = mapAssessmentToFhirClinicalImpression(
      mockAssessment,
      "patient-123",
      "assessment-789",
    );

    if (
      fhirImpression !== null &&
      fhirImpression.resourceType === "ClinicalImpression" &&
      fhirImpression.status === "completed" &&
      fhirImpression.subject.reference === "Patient/patient-123" &&
      fhirImpression.effectiveDateTime === mockAssessment.createdAt
    ) {
      console.log("✓ Test 4 passed: Assessment to FHIR ClinicalImpression mapping");
      passedTests++;
    } else {
      console.log("✗ Test 4 failed: Assessment to FHIR ClinicalImpression mapping");
    }
  } catch (error) {
    console.log(`✗ Test 4 failed with error: ${error}`);
  }

  // Test 5: Complete Assessment to FHIR Bundle mapping
  totalTests++;
  try {
    const fhirBundle = mapAssessmentToFhirBundle(mockAssessment, mockPatient);

    if (
      fhirBundle.patient.resourceType === "Patient" &&
      Array.isArray(fhirBundle.observations) &&
      fhirBundle.condition !== null &&
      fhirBundle.clinicalImpression?.resourceType === "ClinicalImpression"
    ) {
      console.log("✓ Test 5 passed: Complete Assessment to FHIR Bundle mapping");
      passedTests++;
    } else {
      console.log("✗ Test 5 failed: Complete Assessment to FHIR Bundle mapping");
    }
  } catch (error) {
    console.log(`✗ Test 5 failed with error: ${error}`);
  }

  // Test 6: FHIR Bundle creation
  totalTests++;
  try {
    const fhirBundle = createFhirBundle(mockAssessment, mockPatient);

    if (
      fhirBundle.resourceType === "Bundle" &&
      fhirBundle.type === "document" &&
      Array.isArray(fhirBundle.entry) &&
      fhirBundle.entry.length > 0 &&
      fhirBundle.entry.every((entry) => entry.resource.resourceType !== undefined)
    ) {
      console.log("✓ Test 6 passed: FHIR Bundle creation");
      passedTests++;
    } else {
      console.log("✗ Test 6 failed: FHIR Bundle creation");
    }
  } catch (error) {
    console.log(`✗ Test 6 failed with error: ${error}`);
  }

  // Test 7: FHIR JSON export
  totalTests++;
  try {
    const fhirData = mapAssessmentToFhirBundle(mockAssessment, mockPatient);
    const jsonString = exportFhirAsJson(fhirData);

    if (
      typeof jsonString === "string" &&
      jsonString.includes("resourceType") &&
      jsonString.includes("Patient")
    ) {
      console.log("✓ Test 7 passed: FHIR JSON export");
      passedTests++;
    } else {
      console.log("✗ Test 7 failed: FHIR JSON export");
    }
  } catch (error) {
    console.log(`✗ Test 7 failed with error: ${error}`);
  }

  // Summary
  console.log(`\nTest Results: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("All tests passed! ✓");
    return 0;
  } else {
    console.log(`${totalTests - passedTests} tests failed.`);
    return 1;
  }
}

// Run tests if executed directly
if (require.main === module) {
  const exitCode = runTests();
  process.exit(exitCode);
}

export { runTests };
