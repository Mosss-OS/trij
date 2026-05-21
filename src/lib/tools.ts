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
          type: "number",
          description: "Confidence score 0-100",
          minimum: 0,
          maximum: 100,
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
