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
      "Analyze a wound, rash, or skin condition image and return a structured triage assessment with urgency, differential diagnoses, and recommendation.",
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
          description: "Key visual features that drove the assessment",
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
      "Generate a single follow-up question for the patient based on the suspected condition and already-asked questions.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The follow-up question in plain language",
        },
      },
      required: ["question"],
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
  fallback: T,
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
