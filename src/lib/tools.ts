import type { TriageResult, DocumentResult } from "@/types/trij";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const TRIAGE_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "triage_assessment",
    description:
      "Analyze a patient's condition (skin image and/or symptom description) and return a structured triage assessment with urgency, differential diagnoses, and recommendation.",
    parameters: {
      type: "object",
      properties: {
        condition: {
          type: "string",
          description: "Clinical name of the most likely condition",
        },
        confidence: {
          type: "object",
          description: "Confidence with uncertainty quantification",
          properties: {
            confidence_point: {
              type: "number",
              description: "Point estimate of confidence 0-100",
              minimum: 0,
              maximum: 100,
            },
            confidence_interval: {
              type: "array",
              description: "95% confidence interval [lower, upper]",
              items: {
                type: "number",
                minimum: 0,
                maximum: 100,
              },
              minItems: 2,
              maxItems: 2,
            },
            uncertainty_source: {
              type: "string",
              enum: ["image_quality", "model_knowledge", "both"],
              description: "Primary source of uncertainty",
            },
            uncertainty_reason: {
              type: "string",
              description: "Human-readable explanation of uncertainty source",
            },
          },
          required: ["confidence_point", "confidence_interval", "uncertainty_source", "uncertainty_reason"],
        },
        urgency: {
          type: "string",
          enum: ["green", "yellow", "red"],
          description: "Urgency level of the condition",
        },
        presentation_type: {
          type: "string",
          enum: ["dermatology", "respiratory", "fever", "gastrointestinal", "neurological", "malnutrition", "eye_ear", "musculoskeletal"],
          description: "Body system / presentation type being assessed",
        },
        description: {
          type: "string",
          description: "Free-text symptom description provided by the CHW (for non-dermatology presentations)",
        },
        possible_conditions: {
          type: "array",
          description: "Differential diagnoses with probabilities",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Condition name" },
              probability: {
                type: "number",
                description: "Probability 0-100",
                minimum: 0,
                maximum: 100,
              },
            },
            required: ["name", "probability"],
          },
        },
        key_visual_features: {
          type: "array",
          description: "Key visual features that drove the assessment (empty array for text-only assessments)",
          items: { type: "string" },
        },
        visual_feature_regions: {
          type: "array",
          description: "Optional spatial regions in the image corresponding to key visual features. Each region uses percentage coordinates (0-100) relative to the image dimensions.",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Short label for this feature (e.g. 'Erythema', 'Ulcer', 'Rash border')" },
              x: { type: "number", description: "Left edge as percentage of image width (0-100)" },
              y: { type: "number", description: "Top edge as percentage of image height (0-100)" },
              width: { type: "number", description: "Width as percentage of image width (0-100)" },
              height: { type: "number", description: "Height as percentage of image height (0-100)" },
              description: { type: "string", description: "Clinical explanation of this visual feature and how it contributes to the diagnosis" },
            },
            required: ["label", "x", "y", "width", "height", "description"],
          },
        },
        recommendation: {
          type: "string",
          description: "Treatment or referral recommendation for the CHW",
        },
        referral_advised: {
          type: "boolean",
          description: "Whether the patient should be referred to a clinic",
        },
        follow_up_questions: {
          type: "array",
          description: "Suggested follow-up questions for the CHW to ask",
          items: { type: "string" },
        },
        icd10_code: {
          type: "string",
          description: "ICD-10 code for the primary condition (e.g. L01.0 for impetigo, L03.9 for cellulitis)",
        },
        differential_diagnosis: {
          type: "object",
          description: "Structured differential diagnosis with supporting evidence",
          properties: {
            primary_diagnosis: {
              type: "object",
              description: "The most likely diagnosis with supporting evidence",
              properties: {
                name: { type: "string", description: "Name of the primary diagnosis" },
                confidence: { type: "number", description: "Confidence score 0-100", minimum: 0, maximum: 100 },
                supporting_features: {
                  type: "array",
                  description: "Clinical features that support this diagnosis",
                  items: { type: "string" },
                },
                against_features: {
                  type: "array",
                  description: "Clinical features that argue against this diagnosis",
                  items: { type: "string" },
                },
              },
              required: ["name", "confidence", "supporting_features", "against_features"],
            },
            differentials: {
              type: "array",
              description: "Alternative diagnoses ranked by likelihood",
              items: {
                type: "object",
                properties: {
                  rank: { type: "number", description: "Rank order (2 = first alternative)" },
                  name: { type: "string", description: "Condition name" },
                  confidence: { type: "number", description: "Confidence score 0-100", minimum: 0, maximum: 100 },
                  distinguishing_questions: {
                    type: "array",
                    description: "Questions a CHW can ask the patient to differentiate this from the primary diagnosis",
                    items: { type: "string" },
                  },
                },
                required: ["rank", "name", "confidence", "distinguishing_questions"],
              },
            },
          },
          required: ["primary_diagnosis", "differentials"],
        },
      },
      required: ["condition", "confidence", "urgency", "recommendation", "referral_advised"],
    },
  },
};

export const DOCUMENT_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "document_analysis",
    description:
      "Analyze a medical document (lab report, prescription, or referral letter) and extract structured findings.",
    parameters: {
      type: "object",
      properties: {
        document_type: {
          type: "string",
          enum: ["lab_report", "prescription", "referral", "other"],
          description: "Type of document analyzed",
        },
        key_findings: {
          type: "array",
          description: "Extracted clinical findings from the document",
          items: {
            type: "object",
            properties: {
              parameter: { type: "string", description: "Name of the parameter/test" },
              value: { type: "string", description: "Value or result" },
              is_abnormal: {
                type: "boolean",
                description: "Whether the value is outside normal range",
              },
            },
            required: ["parameter", "value", "is_abnormal"],
          },
        },
        summary: {
          type: "string",
          description: "Brief clinical summary of the document",
        },
        plain_language_explanation: {
          type: "string",
          description: "Explanation understandable by a patient",
        },
        abnormal_flags: {
          type: "array",
          description: "List of abnormal or concerning findings",
          items: { type: "string" },
        },
        recommendation: {
          type: "string",
          description: "Recommended next steps",
        },
      },
      required: ["document_type", "key_findings", "summary", "plain_language_explanation"],
    },
  },
};

export const FOLLOW_UP_TOOL: ToolDefinition = {
  type: "function",
  function: {
    name: "generate_follow_up",
    description:
      "Decide the next step of the patient interview. Either ask ONE more short follow-up question, or mark the interview complete when you have enough information to refine the assessment.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description:
            "The next follow-up question in plain language. Required when done=false. Leave empty when done=true.",
        },
        rationale: {
          type: "string",
          description: "Short clinical reason this question is being asked (1 sentence). Optional.",
        },
        done: {
          type: "boolean",
          description:
            "Set true when enough information has been gathered and no more questions are needed.",
        },
      },
      required: ["done"],
    },
  },
};

export function parseToolCall<T>(
  message: {
    tool_calls?: Array<{
      function: { name: string; arguments: string };
    }>;
    content?: string | null;
  },
  fallback: T | null = null,
): T | null {
  if (message.tool_calls && message.tool_calls.length > 0) {
    try {
      return JSON.parse(message.tool_calls[0].function.arguments) as T;
    } catch {
      return null;
    }
  }
  if (message.content) {
    const trimmed = message.content
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      const m = trimmed.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          return JSON.parse(m[0]) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function triesJson<T>(raw: string, fallback: T): T {
  const trimmed = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}
