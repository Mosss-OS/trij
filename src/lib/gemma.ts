/**
 * On-device Gemma 4 inference engine.
 *
 * Supports three engine modes:
 *   1. WebLLM (WebGPU) – primary: loads Gemma in-browser
 *   2. Ollama bridge     – fallback: connects to local Ollama instance
 *   3. Demo / mock       – fallback: returns realistic fake results for demos
 *
 *   Engine is auto-detected on first use. The user can override via Settings.
 *   No patient data ever leaves the device for AI inference.
 */

import { CreateMLCEngine, type MLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";
export type { InitProgressReport };
import {
  getTriageSystemPrompt,
  getDocumentSystemPrompt,
  getFollowUpPrompt,
} from "./gemma-prompt";
import type { TriageResult, DocumentResult, Urgency } from "@/types/trij";

/* ─── Engine type ─────────────────────────────────────────── */

export type EngineKind = "webllm" | "ollama" | "demo";

/* ─── WebLLM internals ────────────────────────────────────── */

let webllmEngine: MLCEngine | null = null;
let webllmLoading: Promise<MLCEngine> | null = null;
let WEBLLM_MODEL_ID = "gemma-2-2b-it-q4f16_1-MLC"; // Gemma-4 E2B when published

export function setModelId(id: string) {
  WEBLLM_MODEL_ID = id;
  webllmEngine = null;
  webllmLoading = null;
}
export function getModelId() {
  return WEBLLM_MODEL_ID;
}

/* ─── WebGPU detection ────────────────────────────────────── */

export async function supportsWebGPU(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  const gpu = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/* ─── Engine auto-detection ──────────────────────────────── */

export async function detectEngine(
  prefer: EngineKind | "auto" = "auto"
): Promise<EngineKind> {
  if (prefer !== "auto") return prefer;

  if (await supportsWebGPU()) return "webllm";

  if (await detectOllama()) return "ollama";

  return "demo";
}

/* ─── Ollama detection ────────────────────────────────────── */

let _ollamaOk: boolean | null = null;

export async function detectOllama(url = "http://localhost:11434"): Promise<boolean> {
  if (_ollamaOk !== null) return _ollamaOk;
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) });
    _ollamaOk = res.ok;
    return _ollamaOk;
  } catch {
    _ollamaOk = false;
    return false;
  }
}

export function clearOllamaCache() {
  _ollamaOk = null;
}

/* ─── WebLLM engine ──────────────────────────────────────── */

async function loadWebLLM(
  onProgress?: (p: InitProgressReport) => void
): Promise<MLCEngine> {
  if (webllmEngine) return webllmEngine;
  if (webllmLoading) return webllmLoading;
  webllmLoading = CreateMLCEngine(WEBLLM_MODEL_ID, {
    initProgressCallback: (report) => onProgress?.(report),
  })
    .then((e) => {
      webllmEngine = e;
      return e;
    })
    .finally(() => {
      webllmLoading = null;
    });
  return webllmLoading;
}

export function isWebLLMLoaded() {
  return webllmEngine !== null;
}

/* ─── Ollama bridge ───────────────────────────────────────── */

let _ollamaModel = "gemma4:latest";

export function setOllamaModel(m: string) {
  _ollamaModel = m;
}
export function getOllamaModel() {
  return _ollamaModel;
}

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

async function ollamaChat(
  messages: OllamaMessage[],
  baseUrl: string,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: _ollamaModel,
      messages,
      stream: false,
      options: { temperature: 0.1 },
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.message?.content ?? "";
}

/* ─── Demo / mock engine ──────────────────────────────────── */

const DEMO_CONDITIONS: Array<{
  condition: string;
  urgency: Urgency;
  confidence: number;
  features: string[];
  recommendation: string;
}> = [
  {
    condition: "Impetigo (non-bullous)",
    urgency: "yellow",
    confidence: 84,
    features: ["Honey-coloured crusts", "Perioral distribution", "Erythematous base"],
    recommendation: "Clean with antiseptic. Topical mupirocin TID for 5 days. Refer if no improvement in 48 hours.",
  },
  {
    condition: "Contact dermatitis",
    urgency: "green",
    confidence: 76,
    features: ["Well-demarcated erythema", "Itchy papules", "Linear distribution"],
    recommendation: "Avoid irritant. Topical hydrocortisone 1% BID for 7 days. Antihistamine for itching.",
  },
  {
    condition: "Cellulitis",
    urgency: "red",
    confidence: 72,
    features: ["Diffuse swelling", "Warm to touch", "Ill-defined margin", "Red streaking"],
    recommendation: "URGENT: Refer to clinic for oral antibiotics. Elevate affected limb. Paracetamol for fever.",
  },
  {
    condition: "Tinea corporis (ringworm)",
    urgency: "green",
    confidence: 88,
    features: ["Annular plaque", "Raised border", "Central clearing", "Scaly surface"],
    recommendation: "Topical terbinafine 1% once daily for 2 weeks. Keep area dry. Treat close contacts if symptomatic.",
  },
  {
    condition: "Herpes zoster (shingles)",
    urgency: "yellow",
    confidence: 79,
    features: ["Vesicular rash", "Dermatomal distribution", "Erythematous base", "Grouped vesicles"],
    recommendation: "Refer for antiviral (acyclovir) within 72 hours of onset. Pain management with paracetamol. Avoid contact with immunocompromised.",
  },
];

function demoAssessment(): TriageResult {
  const c = DEMO_CONDITIONS[Math.floor(Math.random() * DEMO_CONDITIONS.length)];
  const diffs = DEMO_CONDITIONS.filter((d) => d.condition !== c.condition)
    .slice(0, 2 + Math.floor(Math.random() * 2))
    .map((d) => ({ name: d.condition, probability: Math.floor(Math.random() * 50) + 5 }));

  return {
    condition: c.condition,
    confidence: c.confidence - Math.floor(Math.random() * 10) + 5,
    urgency: c.urgency,
    possible_conditions: diffs,
    key_visual_features: c.features,
    recommendation: c.recommendation,
    referral_advised: c.urgency === "red" || c.urgency === "yellow",
    follow_up_questions: [
      "How long has the rash been present?",
      "Is there any associated pain or itching?",
      "Have you had this before?",
      "Do you have any known allergies?",
      "Any fever or chills?",
    ],
  };
}

const DEMO_DOCUMENTS: DocumentResult[] = [
  {
    document_type: "lab_report",
    key_findings: [
      { parameter: "Haemoglobin", value: "11.2 g/dL", is_abnormal: true },
      { parameter: "WBC", value: "8.4 ×10³/µL", is_abnormal: false },
      { parameter: "Platelets", value: "220 ×10³/µL", is_abnormal: false },
      { parameter: "Glucose (fasting)", value: "142 mg/dL", is_abnormal: true },
    ],
    summary: "Mild anaemia and elevated fasting glucose detected.",
    plain_language_explanation:
      "Your red blood cells are slightly low (anaemia), which can make you feel tired. Your blood sugar is higher than normal, which could be a sign of diabetes. The other values are within normal range.",
    abnormal_flags: ["Low haemoglobin", "High fasting glucose"],
    recommendation: "Refer for iron studies and HbA1c. Dietary counselling for blood sugar management.",
  },
  {
    document_type: "prescription",
    key_findings: [
      { parameter: "Amoxicillin", value: "500 mg TID × 7d", is_abnormal: false },
      { parameter: "Ibuprofen", value: "400 mg PRN", is_abnormal: false },
    ],
    summary: "Antibiotic and NSAID prescription for suspected bacterial infection.",
    plain_language_explanation:
      "This is a prescription for an antibiotic (amoxicillin) to treat a bacterial infection, and ibuprofen for pain or fever. Take the antibiotic three times a day for a full week.",
    abnormal_flags: [],
    recommendation: "Complete full course of antibiotics. Return if no improvement after 72 hours.",
  },
];

function demoDocument(): DocumentResult {
  return DEMO_DOCUMENTS[Math.floor(Math.random() * DEMO_DOCUMENTS.length)];
}

/* ─── JSON safety ─────────────────────────────────────────── */

function safeJSON<T>(raw: string, fallback: T): T {
  const trimmed = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        /* */
      }
    }
    return fallback;
  }
}

/* ─── Public API ──────────────────────────────────────────── */

export async function loadEngine(
  kind: EngineKind,
  onProgress?: (p: InitProgressReport) => void
): Promise<void> {
  if (kind === "webllm") {
    await loadWebLLM(onProgress);
  }
  /* ollama & demo need no preloading */
}

export function isLoaded(kind: EngineKind): boolean {
  if (kind === "webllm") return isWebLLMLoaded();
  return true; /* ollama & demo are always "loaded" */
}

/* ─── Triage ──────────────────────────────────────────────── */

const FALLBACK_TRIAGE: TriageResult = {
  condition: "Unable to assess",
  confidence: 0,
  urgency: "yellow",
  possible_conditions: [],
  key_visual_features: [],
  recommendation: "Refer for in-person evaluation.",
  referral_advised: true,
  follow_up_questions: [],
};

export async function triageImage(
  imageDataUrl: string,
  language: string,
  kind: EngineKind,
  ollamaUrl?: string
): Promise<TriageResult> {
  if (kind === "demo") {
    await sleep(2000 + Math.random() * 1500);
    return demoAssessment();
  }

  if (kind === "ollama") {
    const text = await ollamaChat(
      [
        { role: "system", content: getTriageSystemPrompt(language) },
        {
          role: "user",
          content: "Analyze this medical image and return the JSON triage assessment.",
          images: [imageDataUrl],
        },
      ],
      ollamaUrl ?? "http://localhost:11434"
    );
    return safeJSON<TriageResult>(text, FALLBACK_TRIAGE);
  }

  /* webllm */
  const e = await loadWebLLM();
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
  return safeJSON<TriageResult>(text, FALLBACK_TRIAGE);
}

/* ─── Document analysis ───────────────────────────────────── */

const FALLBACK_DOC: DocumentResult = {
  document_type: "other",
  key_findings: [],
  summary: "Unable to analyze document.",
  plain_language_explanation: "",
  abnormal_flags: [],
  recommendation: "",
};

export async function analyzeDocument(
  imageDataUrl: string,
  language: string,
  kind: EngineKind,
  ollamaUrl?: string
): Promise<DocumentResult> {
  if (kind === "demo") {
    await sleep(1500 + Math.random() * 1000);
    return demoDocument();
  }

  if (kind === "ollama") {
    const text = await ollamaChat(
      [
        { role: "system", content: getDocumentSystemPrompt(language) },
        {
          role: "user",
          content: "Extract the key information from this document.",
          images: [imageDataUrl],
        },
      ],
      ollamaUrl ?? "http://localhost:11434"
    );
    return safeJSON<DocumentResult>(text, FALLBACK_DOC);
  }

  const e = await loadWebLLM();
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
  return safeJSON<DocumentResult>(text, FALLBACK_DOC);
}

/* ─── Follow-up questions ─────────────────────────────────── */

export async function nextFollowUp(
  language: string,
  condition: string,
  history: string[],
  kind: EngineKind,
  ollamaUrl?: string
): Promise<string> {
  if (kind === "demo") {
    const pool = [
      "Is the area painful when touched?",
      "Have you noticed any discharge or fluid?",
      "Did the rash appear suddenly or gradually?",
      "Have you used any new soap, lotion, or medication recently?",
      "Do you have any other medical conditions like diabetes?",
    ];
    const unseen = pool.filter((q) => !history.includes(q));
    return unseen[Math.floor(Math.random() * unseen.length)] ?? pool[0];
  }

  const prompt = getFollowUpPrompt(language, condition, history);

  if (kind === "ollama") {
    const text = await ollamaChat(
      [
        { role: "system", content: prompt },
        { role: "user", content: "Generate the next question." },
      ],
      ollamaUrl ?? "http://localhost:11434"
    );
    return safeJSON<{ question: string }>(text, { question: "" }).question;
  }

  const e = await loadWebLLM();
  const reply = await e.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "Generate the next question." },
    ],
    temperature: 0.4,
    max_tokens: 120,
  });
  const text = reply.choices[0]?.message?.content ?? "";
  return safeJSON<{ question: string }>(text, { question: "" }).question;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
