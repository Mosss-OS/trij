/**
 * FHIR R4 Type Definitions and Mappings for Trij
 * 
 * This module provides FHIR R4 compliant data structures and mapping functions
 * to convert Trij's internal data models to standard FHIR resources.
 * 
 * Supported FHIR Resources:
 * - Patient: Demographics and administrative information about patients
 * - Observation: Vital signs and clinical measurements
 * - Condition: Diagnoses and clinical conditions
 * - ClinicalImpression: Overall clinical assessment and impression
 * 
 * References:
 * - FHIR R4 Specification: https://hl7.org/FHIR/R4/
 * - FHIR Patient: https://hl7.org/FHIR/R4/patient.html
 * - FHIR Observation: https://hl7.org/FHIR/R4/observation.html
 * - FHIR Condition: https://hl7.org/FHIR/R4/condition.html
 * - FHIR ClinicalImpression: https://hl7.org/FHIR/R4/clinicalimpression.html
 */

import type { Patient, Assessment, VitalSigns } from "@/types/trij";

// ============================================================================
// FHIR R4 Core Types
// ============================================================================

export interface FhirReference {
  reference: string;
  type?: string;
  identifier?: FhirIdentifier;
  display?: string;
}

export interface FhirIdentifier {
  system?: string;
  value: string;
  use?: "usual" | "official" | "temp" | "secondary" | "old";
  type?: FhirCodeableConcept;
  period?: FhirPeriod;
  assigner?: FhirReference;
}

export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

export interface FhirCoding {
  system?: string;
  version?: string;
  code: string;
  display?: string;
  userSelected?: boolean;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirQuantity {
  value: number;
  comparator?: "<" | "<=" | ">=" | ">" | "ad";
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirAnnotation {
  authorReference?: FhirReference;
  authorString?: string;
  time?: string;
  text: string;
}

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: FhirCoding[];
  tag?: FhirCoding[];
}

export interface FhirExtension {
  url: string;
  valueBase64Binary?: string;
  valueBoolean?: boolean;
  valueCanonical?: string;
  valueCode?: string;
  valueDate?: string;
  valueDateTime?: string;
  valueDecimal?: number;
  valueId?: string;
  valueInstant?: string;
  valueInteger?: number;
  valueMarkdown?: string;
  valueOid?: string;
  valuePositiveInt?: number;
  valueString?: string;
  valueTime?: string;
  valueUnsignedInt?: number;
  valueUri?: string;
  valueUrl?: string;
  valueUuid?: string;
  valueAddress?: unknown;
  valueAge?: unknown;
  valueAttachment?: unknown;
  valueCodeableConcept?: FhirCodeableConcept;
  valueCoding?: FhirCoding;
  valueContactPoint?: unknown;
  valueCount?: unknown;
  valueDistance?: unknown;
  valueDuration?: unknown;
  valueHumanName?: unknown;
  valueIdentifier?: FhirIdentifier;
  valueMoney?: unknown;
  valuePeriod?: FhirPeriod;
  valueQuantity?: FhirQuantity;
  valueRange?: unknown;
  valueRatio?: unknown;
  valueReference?: FhirReference;
  valueSampledData?: unknown;
  valueSignature?: unknown;
  valueTiming?: unknown;
  valueContactDetail?: unknown;
  valueContributor?: unknown;
  valueDataRequirement?: unknown;
  valueExpression?: unknown;
  valueParameterDefinition?: unknown;
  valueRelatedArtifact?: unknown;
  valueTriggerDefinition?: unknown;
  valueUsageContext?: unknown;
  valueDosage?: unknown;
}

// ============================================================================
// FHIR R4 Resource Types
// ============================================================================

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: FhirMeta;
  implicitRules?: string;
  language?: string;
  text?: unknown;
  contained?: unknown[];
  extension?: FhirExtension[];
  modifierExtension?: FhirExtension[];
}

export interface FhirPatient extends FhirResource {
  resourceType: "Patient";
  identifier: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  deceased?: boolean | string;
  address?: FhirAddress[];
  maritalStatus?: FhirCodeableConcept;
  multipleBirth?: boolean | number;
  photo?: FhirAttachment[];
  contact?: FhirPatientContact[];
  communication?: FhirPatientCommunication[];
  generalPractitioner?: FhirReference[];
  managingOrganization?: FhirReference;
  link?: FhirPatientLink[];
}

export interface FhirHumanName {
  use?: "usual" | "official" | "temp" | "nickname" | "anonymous" | "old" | "maiden";
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FhirPeriod;
}

export interface FhirContactPoint {
  system?: "phone" | "fax" | "email" | "pager" | "url" | "sms" | "other";
  value: string;
  use?: "home" | "work" | "temp" | "old" | "mobile";
  rank?: number;
  period?: FhirPeriod;
}

export interface FhirAddress {
  use?: "home" | "work" | "temp" | "old" | "billing";
  type?: "postal" | "physical" | "both";
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FhirPeriod;
}

export interface FhirAttachment {
  contentType?: string;
  language?: string;
  data?: string;
  url?: string;
  size?: number;
  hash?: string;
  title?: string;
  creation?: string;
}

export interface FhirPatientContact {
  relationship?: FhirCodeableConcept[];
  name?: FhirHumanName;
  telecom?: FhirContactPoint[];
  address?: FhirAddress;
  gender?: "male" | "female" | "other" | "unknown";
  organization?: FhirReference;
  period?: FhirPeriod;
}

export interface FhirPatientCommunication {
  language: FhirCodeableConcept;
  preferred?: boolean;
}

export interface FhirPatientLink {
  other: FhirReference;
  type: "replaced-by" | "replaces" | "refer" | "seealso";
}

export interface FhirObservation extends FhirResource {
  resourceType: "Observation";
  identifier?: FhirIdentifier[];
  basedOn?: FhirReference[];
  partOf?: FhirReference[];
  status: "final" | "amended" | "corrected" | "preliminary" | "cancelled" | "entered-in-error" | "unknown";
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  focus?: FhirReference[];
  encounter?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  effectiveTiming?: unknown;
  effectiveInstant?: string;
  issued?: string;
  performer?: FhirReference[];
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: unknown;
  valueRatio?: unknown;
  valueSampledData?: unknown;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: FhirPeriod;
  dataAbsentReason?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  note?: FhirAnnotation[];
  bodySite?: FhirCodeableConcept;
  method?: FhirCodeableConcept;
  specimen?: FhirReference;
  device?: FhirReference;
  referenceRange?: FhirObservationReferenceRange[];
  hasMember?: FhirReference[];
  derivedFrom?: FhirReference[];
  component?: FhirObservation[];
}

export interface FhirObservationReferenceRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
  normalValue?: FhirCodeableConcept;
  type?: FhirCodeableConcept;
  appliesTo?: FhirCodeableConcept[];
  age?: unknown;
  text?: string;
}

export interface FhirCondition extends FhirResource {
  resourceType: "Condition";
  identifier?: FhirIdentifier[];
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  severity?: FhirCodeableConcept;
  code?: FhirCodeableConcept;
  bodySite?: FhirCodeableConcept[];
  subject: FhirReference;
  encounter?: FhirReference;
  onsetDateTime?: string;
  onsetAge?: unknown;
  onsetPeriod?: FhirPeriod;
  onsetRange?: unknown;
  onsetString?: string;
  abatementDateTime?: string;
  abatementAge?: unknown;
  abatementPeriod?: FhirPeriod;
  abatementRange?: unknown;
  abatementString?: string;
  recordedDate?: string;
  recorder?: FhirReference;
  asserter?: FhirReference;
  stage?: FhirConditionStage[];
  evidence?: FhirConditionEvidence[];
  note?: FhirAnnotation[];
}

export interface FhirConditionStage {
  summary?: FhirCodeableConcept;
  assessment?: FhirReference[];
  type?: FhirCodeableConcept;
}

export interface FhirConditionEvidence {
  code?: FhirCodeableConcept[];
  detail?: FhirReference[];
}

export interface FhirClinicalImpression extends FhirResource {
  resourceType: "ClinicalImpression";
  identifier?: FhirIdentifier[];
  status: "in-progress" | "completed" | "entered-in-error";
  statusReason?: FhirCodeableConcept;
  code?: FhirCodeableConcept;
  description?: string;
  subject: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  date?: string;
  assessor?: FhirReference;
  previous?: FhirReference;
  problem?: FhirReference[];
  investigation?: FhirClinicalImpressionInvestigation[];
  protocol?: string[];
  summary?: string;
  finding?: FhirClinicalImpressionFinding[];
  prognosisCodeableConcept?: FhirCodeableConcept[];
  prognosisReference?: FhirReference[];
  supportingInfo?: FhirReference[];
  note?: FhirAnnotation[];
}

export interface FhirClinicalImpressionInvestigation {
  code: FhirCodeableConcept;
  item?: FhirReference[];
}

export interface FhirClinicalImpressionFinding {
  itemCodeableConcept?: FhirCodeableConcept;
  itemReference?: FhirReference;
  basis?: string;
}

// ============================================================================
// LOINC Codes for Vital Signs
// ============================================================================

const LOINC_CODES = {
  // Vital Signs Panel
  VITAL_SIGNS_PANEL: "85353-1",
  
  // Individual Vital Signs
  BODY_WEIGHT: "29463-7",
  BODY_HEIGHT: "8302-2",
  BMI: "39156-5",
  SYSTOLIC_BP: "8480-6",
  DIASTOLIC_BP: "8462-4",
  HEART_RATE: "8867-4",
  RESPIRATORY_RATE: "9279-1",
  TEMPERATURE: "8310-5",
  OXYGEN_SATURATION: "2708-6",
  PAIN_SCALE: "72514-3",
  MUAC: "72302-7",
} as const;

// ============================================================================
// SNOMED CT Codes for Clinical Concepts
// ============================================================================

const SNOMED_CODES = {
  // Condition Categories
  CONDITION_CATEGORY_PROBLEM_LIST: "55607002",
  CONDITION_CATEGORY_ENCOUNTER_DIAGNOSIS: "439401001",
  
  // Clinical Status
  CLINICAL_STATUS_ACTIVE: "55561003",
  CLINICAL_STATUS_INACTIVE: "73488006",
  CLINICAL_STATUS_RESOLVED: "263826000",
  CLINICAL_STATUS_REMISSION: "268967000",
  CLINICAL_STATUS_RECURRENCE: "249455004",
  CLINICAL_STATUS_RELAPSE: "26696006",
  
  // Verification Status
  VERIFICATION_CONFIRMED: "410605003",
  VERIFICATION_PROVISIONAL: "394846009",
  VERIFICATION_DIFFERENTIAL: "176210006",
  VERIFICATION_UNCONFIRMED: "2931005",
  VERIFICATION_REFUTED: "410594000",
  VERIFICATION_ENTERED_IN_ERROR: "410593000",
  
  // Observation Categories
  OBSERVATION_CATEGORY_VITAL_SIGNS: "vital-signs",
  
  // Severity
  SEVERITY_MILD: "255604002",
  SEVERITY_MODERATE: "6736007",
  SEVERITY_SEVERE: "24484000",
} as const;

// ============================================================================
// UCUM Units for Vital Signs
// ============================================================================

const UCUM_UNITS = {
  MM_HG: "mm[Hg]",
  BEATS_PER_MINUTE: "/min",
  BREATHS_PER_MINUTE: "/min",
  CELSIUS: "Cel",
  PERCENT: "%",
  CM: "cm",
  KG: "kg",
  NO_UNIT: "1",
} as const;

// ============================================================================
// System URLs for Coding Systems
// ============================================================================

const SYSTEM_URLS = {
  LOINC: "http://loinc.org",
  SNOMED_CT: "http://snomed.info/sct",
  UCUM: "http://unitsofmeasure.org",
  ICD_10: "http://hl7.org/fhir/sid/icd-10",
  TRIJ: "https://github.com/Mosss-OS/trij",
} as const;

// ============================================================================
// Mapping Functions: Trij → FHIR
// ============================================================================

/**
 * Convert Trij Patient to FHIR Patient resource
 */
export function mapPatientToFhir(patient: Patient): FhirPatient {
  const fhirPatient: FhirPatient = {
    resourceType: "Patient",
    id: patient.id,
    identifier: [
      {
        system: `${SYSTEM_URLS.TRIJ}/patient-identifier`,
        value: patient.identifier,
        use: "usual",
      },
    ],
    active: !patient.mergedInto,
  };

  // Add gender if available
  if (patient.sex) {
    const genderMap: Record<string, "male" | "female" | "other"> = {
      M: "male",
      F: "female",
      other: "other",
    };
    fhirPatient.gender = genderMap[patient.sex] || "unknown";
  }

  // Add birth date if age is available (estimated)
  if (patient.ageYears) {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - patient.ageYears);
    fhirPatient.birthDate = birthDate.toISOString().split("T")[0];
  }

  // Add location as extension if available
  if (patient.locationLat && patient.locationLng) {
    fhirPatient.extension = [
      {
        url: `${SYSTEM_URLS.TRIJ}/StructureDefinition/patient-location`,
        valueString: `${patient.locationLat},${patient.locationLng}`,
      },
    ];
  }

  // Add notes if available
  if (patient.notes) {
    fhirPatient.text = {
      status: "generated",
      div: `<div xmlns="http://www.w3.org/1999/xhtml">${patient.notes}</div>`,
    };
  }

  // Add metadata
  fhirPatient.meta = {
    lastUpdated: patient.updatedAt,
    versionId: patient.version.toString(),
  };

  return fhirPatient;
}

/**
 * Convert Trij VitalSigns to FHIR Observation resources
 */
export function mapVitalSignsToFhirObservations(
  vitalSigns: VitalSigns,
  patientId: string,
  assessmentId: string
): FhirObservation[] {
  const observations: FhirObservation[] = [];

  // Helper function to create observation
  const createObservation = (
    loincCode: string,
    displayName: string,
    value?: number,
    unit?: string,
    ucumCode?: string
  ): FhirObservation | null => {
    if (value === undefined) return null;

    return {
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: SYSTEM_URLS.LOINC,
            code: loincCode,
            display: displayName,
          },
        ],
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: {
        value,
        unit: unit || "",
        system: SYSTEM_URLS.UCUM,
        code: ucumCode || "",
      },
    };
  };

  // Blood Pressure (needs component observations)
  if (vitalSigns.systolicBP || vitalSigns.diastolicBP) {
    const components: FhirObservation[] = [];

    if (vitalSigns.systolicBP) {
      components.push(
        createObservation(
          LOINC_CODES.SYSTOLIC_BP,
          "Systolic blood pressure",
          vitalSigns.systolicBP,
          "mmHg",
          UCUM_UNITS.MM_HG
        )!
      );
    }

    if (vitalSigns.diastolicBP) {
      components.push(
        createObservation(
          LOINC_CODES.DIASTOLIC_BP,
          "Diastolic blood pressure",
          vitalSigns.diastolicBP,
          "mmHg",
          UCUM_UNITS.MM_HG
        )!
      );
    }

    // Create blood pressure panel observation
    if (components.length > 0) {
      observations.push({
        resourceType: "Observation",
        status: "final",
        category: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/observation-category",
                code: "vital-signs",
                display: "Vital Signs",
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: SYSTEM_URLS.LOINC,
              code: "85354-9", // Blood pressure panel
              display: "Blood pressure panel with all children optional",
            },
          ],
        },
        subject: {
          reference: `Patient/${patientId}`,
        },
        effectiveDateTime: new Date().toISOString(),
        component: components,
      });
    }
  }

  // Individual vital signs
  if (vitalSigns.heartRate) {
    const obs = createObservation(
      LOINC_CODES.HEART_RATE,
      "Heart rate",
      vitalSigns.heartRate,
      "beats/minute",
      UCUM_UNITS.BEATS_PER_MINUTE
    );
    if (obs) observations.push(obs);
  }

  if (vitalSigns.respiratoryRate) {
    const obs = createObservation(
      LOINC_CODES.RESPIRATORY_RATE,
      "Respiratory rate",
      vitalSigns.respiratoryRate,
      "breaths/minute",
      UCUM_UNITS.BREATHS_PER_MINUTE
    );
    if (obs) observations.push(obs);
  }

  if (vitalSigns.temperature) {
    const obs = createObservation(
      LOINC_CODES.TEMPERATURE,
      "Body temperature",
      vitalSigns.temperature,
      "°C",
      UCUM_UNITS.CELSIUS
    );
    if (obs) observations.push(obs);
  }

  if (vitalSigns.oxygenSaturation) {
    const obs = createObservation(
      LOINC_CODES.OXYGEN_SATURATION,
      "Oxygen saturation",
      vitalSigns.oxygenSaturation,
      "%",
      UCUM_UNITS.PERCENT
    );
    if (obs) observations.push(obs);
  }

  if (vitalSigns.weight) {
    const obs = createObservation(
      LOINC_CODES.BODY_WEIGHT,
      "Body weight",
      vitalSigns.weight,
      "kg",
      UCUM_UNITS.KG
    );
    if (obs) observations.push(obs);
  }

  if (vitalSigns.muac) {
    const obs = createObservation(
      LOINC_CODES.MUAC,
      "Mid-upper arm circumference",
      vitalSigns.muac,
      "cm",
      UCUM_UNITS.CM
    );
    if (obs) observations.push(obs);
  }

  if (vitalSigns.painScale) {
    const obs = createObservation(
      LOINC_CODES.PAIN_SCALE,
      "Pain severity",
      vitalSigns.painScale,
      "score",
      UCUM_UNITS.NO_UNIT
    );
    if (obs) observations.push(obs);
  }

  return observations;
}

/**
 * Convert Trij Assessment to FHIR Condition resource
 */
export function mapAssessmentToFhirCondition(
  assessment: Assessment,
  patientId: string
): FhirCondition | null {
  if (!assessment.condition && !assessment.icd10Code) {
    return null;
  }

  const condition: FhirCondition = {
    resourceType: "Condition",
    id: assessment.id,
    subject: {
      reference: `Patient/${patientId}`,
    },
    verificationStatus: {
      coding: [
        {
          system: SYSTEM_URLS.SNOMED_CT,
          code: SNOMED_CODES.VERIFICATION_CONFIRMED,
          display: "Confirmed",
        },
      ],
    },
    clinicalStatus: {
      coding: [
        {
          system: SYSTEM_URLS.SNOMED_CT,
          code: SNOMED_CODES.CLINICAL_STATUS_ACTIVE,
          display: "Active",
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: SYSTEM_URLS.SNOMED_CT,
            code: SNOMED_CODES.CONDITION_CATEGORY_ENCOUNTER_DIAGNOSIS,
            display: "Encounter Diagnosis",
          },
        ],
      },
    ],
  };

  // Add condition code
  if (assessment.condition) {
    condition.code = {
      coding: [
        {
          system: `${SYSTEM_URLS.TRIJ}/condition-codes`,
          code: assessment.condition,
          display: assessment.condition,
        },
      ],
      text: assessment.condition,
    };
  }

  // Add ICD-10 code if available
  if (assessment.icd10Code) {
    if (condition.code) {
      condition.code.coding.push({
        system: SYSTEM_URLS.ICD_10,
        code: assessment.icd10Code,
        display: assessment.icd10Code,
      });
    } else {
      condition.code = {
        coding: [
          {
            system: SYSTEM_URLS.ICD_10,
            code: assessment.icd10Code,
            display: assessment.icd10Code,
          },
        ],
      };
    }
  }

  // Add severity based on urgency
  if (assessment.urgency) {
    const severityMap: Record<string, string> = {
      green: SNOMED_CODES.SEVERITY_MILD,
      yellow: SNOMED_CODES.SEVERITY_MODERATE,
      red: SNOMED_CODES.SEVERITY_SEVERE,
    };
    condition.severity = {
      coding: [
        {
          system: SYSTEM_URLS.SNOMED_CT,
          code: severityMap[assessment.urgency],
          display: assessment.urgency,
        },
      ],
    };
  }

  // Add evidence (key visual features)
  if (assessment.keyVisualFeatures && assessment.keyVisualFeatures.length > 0) {
    condition.evidence = [
      {
        code: assessment.keyVisualFeatures.map(feature => ({
          system: `${SYSTEM_URLS.TRIJ}/feature-codes`,
          code: feature,
          display: feature,
        })),
      },
    ];
  }

  // Add notes
  if (assessment.description) {
    condition.note = [
      {
        text: assessment.description,
      },
    ];
  }

  // Add metadata
  condition.meta = {
    lastUpdated: assessment.createdAt,
    versionId: assessment.version.toString(),
  };

  return condition;
}

/**
 * Convert Trij Assessment to FHIR ClinicalImpression resource
 */
export function mapAssessmentToFhirClinicalImpression(
  assessment: Assessment,
  patientId: string,
  conditionId?: string
): FhirClinicalImpression | null {
  const clinicalImpression: FhirClinicalImpression = {
    resourceType: "ClinicalImpression",
    id: `${assessment.id}-impression`,
    status: "completed",
    subject: {
      reference: `Patient/${patientId}`,
    },
    effectiveDateTime: assessment.createdAt,
    date: assessment.createdAt,
  };

  // Add summary
  if (assessment.condition) {
    clinicalImpression.summary = `Assessment indicates: ${assessment.condition}`;
  }

  // Add description
  if (assessment.description) {
    clinicalImpression.description = assessment.description;
  }

  // Add problem reference if condition was created
  if (conditionId) {
    clinicalImpression.problem = [
      {
        reference: `Condition/${conditionId}`,
      },
    ];
  }

  // Add investigation (vital signs observations would be referenced here)
  if (assessment.vitalSigns) {
    clinicalImpression.investigation = [
      {
        code: {
          coding: [
            {
              system: SYSTEM_URLS.SNOMED_CT,
              code: "386035009",
              display: "Vital signs measurement",
            },
          ],
        },
      },
    ];
  }

  // Add findings (possible conditions)
  if (assessment.possibleConditions && assessment.possibleConditions.length > 0) {
    clinicalImpression.finding = assessment.possibleConditions.map(condition => ({
      itemCodeableConcept: {
        coding: [
          {
            system: `${SYSTEM_URLS.TRIJ}/condition-codes`,
            code: condition.name,
            display: condition.name,
          },
        ],
        text: `${condition.name} (${(condition.probability * 100).toFixed(1)}% confidence)`,
      },
    }));
  }

  // Add recommendation
  if (assessment.recommendation) {
    clinicalImpression.note = [
      {
        text: `Recommendation: ${assessment.recommendation}`,
      },
    ];
  }

  // Add prognosis based on urgency
  if (assessment.urgency) {
    const urgencyCodeMap: Record<string, string> = {
      green: "good",
      yellow: "fair",
      red: "poor",
    };
    clinicalImpression.prognosisCodeableConcept = [
      {
        coding: [
          {
            system: `${SYSTEM_URLS.TRIJ}/prognosis-codes`,
            code: urgencyCodeMap[assessment.urgency],
            display: assessment.urgency,
          },
        ],
      },
    ];
  }

  // Add metadata
  clinicalImpression.meta = {
    lastUpdated: assessment.createdAt,
    versionId: assessment.version.toString(),
  };

  return clinicalImpression;
}

/**
 * Convert complete Trij Assessment to FHIR bundle
 * This creates a comprehensive FHIR document containing Patient, Observations, Condition, and ClinicalImpression
 */
export function mapAssessmentToFhirBundle(
  assessment: Assessment,
  patient: Patient
): {
  patient: FhirPatient;
  observations: FhirObservation[];
  condition: FhirCondition | null;
  clinicalImpression: FhirClinicalImpression;
} {
  const fhirPatient = mapPatientToFhir(patient);
  const fhirObservations = assessment.vitalSigns
    ? mapVitalSignsToFhirObservations(assessment.vitalSigns, patient.id, assessment.id)
    : [];
  const fhirCondition = mapAssessmentToFhirCondition(assessment, patient.id);
  const fhirClinicalImpression = mapAssessmentToFhirClinicalImpression(
    assessment,
    patient.id,
    fhirCondition?.id
  );

  return {
    patient: fhirPatient,
    observations: fhirObservations,
    condition: fhirCondition,
    clinicalImpression: fhirClinicalImpression,
  };
}

/**
 * Export FHIR resources as JSON string
 */
export function exportFhirAsJson(fhirData: unknown): string {
  return JSON.stringify(fhirData, null, 2);
}

/**
 * Create a FHIR Bundle containing all resources for an assessment
 */
export function createFhirBundle(
  assessment: Assessment,
  patient: Patient
): {
  resourceType: "Bundle";
  type: "document";
  timestamp: string;
  entry: Array<{
    fullUrl: string;
    resource: FhirResource;
  }>;
} {
  const fhirData = mapAssessmentToFhirBundle(assessment, patient);
  const entries: Array<{
    fullUrl: string;
    resource: FhirResource;
  }> = [];

  // Add patient
  entries.push({
    fullUrl: `urn:uuid:${fhirData.patient.id}`,
    resource: fhirData.patient,
  });

  // Add observations
  fhirData.observations.forEach((obs, index) => {
    entries.push({
      fullUrl: `urn:uuid:observation-${index}`,
      resource: obs,
    });
  });

  // Add condition if exists
  if (fhirData.condition) {
    entries.push({
      fullUrl: `urn:uuid:${fhirData.condition.id}`,
      resource: fhirData.condition,
    });
  }

  // Add clinical impression
  entries.push({
    fullUrl: `urn:uuid:${fhirData.clinicalImpression.id}`,
    resource: fhirData.clinicalImpression,
  });

  return {
    resourceType: "Bundle",
    type: "document",
    timestamp: new Date().toISOString(),
    entry: entries,
  };
}