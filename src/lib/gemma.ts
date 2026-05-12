/**
 * On-device Gemma 4 inference via WebLLM (WebGPU).
 *
 * NOTE: At time of writing, Gemma 4 E2B is not yet published in the WebLLM
 * model registry. We default to the closest available Gemma family build and
 * expose `setModelId()` so the spec's target ID can be swapped in once it ships.
 * All inference stays on-device.
 */
import { CreateMLCEngine, type MLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";
import {
  getTriageSystemPrompt,
  getDocumentSystemPrompt,
  getFollowUpPrompt,
} from "./gemma-prompt";
import type { TriageResult, DocumentResult } from "@/types/trij";

let engine: MLCEngine | null = null;
let loading: Promise<MLCEngine> | null = null;
let MODEL_ID = "gemma-2-2b-it-q4f16_1-MLC"; // closest published Gemma

export function setModelId(id: string) {
  MODEL_ID = id;
  engine = null;
  loading = null;
}
export function getModelId() {
  return MODEL_ID;
}

export async function supportsWebGPU(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  // @ts-expect-error - webgpu types
  if (!navigator.gpu) return false;
  try {
    // @ts-expect-error
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

export async function loadEngine(
  onProgress?: (p: InitProgressReport) => void
): Promise<MLCEngine> {
  if (engine) return engine;
  if (loading) return loading;
  loading = CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (report) => onProgress?.(report),
  })
    .then((e) => {
      engine = e;
      return e;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

export function isLoaded() {
  return engine !== null;
}

function safeJSON<T>(raw: string, fallback: T): T {
  // strip code fences if any
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
        /* ignore */
      }
    }
    return fallback;
  }
}

export async function triageImage(
  imageDataUrl: string,
  language: string
): Promise<TriageResult> {
  const e = await loadEngine();
  const reply = await e.chat.completions.create({
    messages: [
      { role: "system", content: getTriageSystemPrompt(language) },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: "Analyze this medical image and return the JSON triage assessment." },
        ] as never,
      },
    ],
    temperature: 0.1,
    max_tokens: 800,
  });
  const text = reply.choices[0]?.message?.content ?? "";
  return safeJSON<TriageResult>(text, {
    condition: "Unable to assess",
    confidence: 0,
    urgency: "yellow",
    possible_conditions: [],
    key_visual_features: [],
    recommendation: "Refer for in-person evaluation.",
    referral_advised: true,
    follow_up_questions: [],
  });
}

export async function analyzeDocument(
  imageDataUrl: string,
  language: string
): Promise<DocumentResult> {
  const e = await loadEngine();
  const reply = await e.chat.completions.create({
    messages: [
      { role: "system", content: getDocumentSystemPrompt(language) },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: "Extract the key information from this document." },
        ] as never,
      },
    ],
    temperature: 0.1,
    max_tokens: 800,
  });
  const text = reply.choices[0]?.message?.content ?? "";
  return safeJSON<DocumentResult>(text, {
    document_type: "other",
    key_findings: [],
    summary: "Unable to analyze document.",
    plain_language_explanation: "",
    abnormal_flags: [],
    recommendation: "",
  });
}

export async function nextFollowUp(
  language: string,
  condition: string,
  history: string[]
): Promise<string> {
  const e = await loadEngine();
  const reply = await e.chat.completions.create({
    messages: [
      { role: "system", content: getFollowUpPrompt(language, condition, history) },
      { role: "user", content: "Generate the next question." },
    ],
    temperature: 0.4,
    max_tokens: 120,
  });
  const text = reply.choices[0]?.message?.content ?? "";
  return safeJSON<{ question: string }>(text, { question: "" }).question;
}
