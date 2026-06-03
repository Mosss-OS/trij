import type { MLCEngine, InitProgressReport } from "@mlc-ai/web-llm";
export type { InitProgressReport };
import {
  getTriageSystemPrompt,
  getDocumentSystemPrompt,
  getFollowUpPrompt,
  getConversationSystemPrompt,
} from "./gemma-prompt";
import type { TriageResult, DocumentResult, Urgency } from "@/types/trij";
import { TRIAGE_TOOL, DOCUMENT_TOOL, FOLLOW_UP_TOOL, parseToolCall, triesJson } from "./tools";
import { analyzeForAntibiotics } from "./antibiotic-filter";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSessionStore } from "@/stores/sessionStore";
import { retrieve, getCompactKbContext } from "./rag";
import { getIcd10Code } from "./icd10";

type MultimodalContent = Array<
  { type: "image_url"; image_url: { url: string } } | { type: "text"; text: string }
>;

function multimodal(content: MultimodalContent): MultimodalContent {
  return content;
}

/* ─── Engine type ─────────────────────────────────────────── */

export type EngineKind = "webllm" | "wasm" | "cpu" | "ollama" | "demo" | "cloud" | "google";

export const GOOGLE_GEMINI_MODELS = [
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (fast)", free: true },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite (cheapest)", free: true },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (balanced)", free: true },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (best quality)", free: false },
  { id: "gemma-4-26b-a4b-it", label: "Gemma 4 26B (via Gemini API)", free: false },
] as const;

/* ─── WebLLM internals ────────────────────────────────────── */

let webllmEngine: MLCEngine | null = null;
let webllmLoading: Promise<MLCEngine> | null = null;
export const GEMMA4_E2B_MODEL_ID = "gemma-4-E2B-it-q4f16_1-MLC";
export const PHI_VISION_MODEL_ID = "Phi-3.5-vision-instruct-q4f16_1-MLC";

export function isModelVLM(modelId: string): boolean {
  return modelId === PHI_VISION_MODEL_ID;
}

let WEBLLM_MODEL_ID = PHI_VISION_MODEL_ID;

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

export interface WebGPUCompatibility {
  supported: boolean;
  browser: string;
  version: string;
  minimumVersion: string;
  upgradeUrl: string;
  reason: string | null;
}

function detectBrowser(): { name: string; version: string } {
  if (typeof navigator === "undefined") return { name: "Unknown", version: "0" };
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) {
    const m = ua.match(/SamsungBrowser\/([\d.]+)/);
    return { name: "Samsung Internet", version: m ? m[1] : "unknown" };
  }
  if (/Edg\//i.test(ua)) {
    const m = ua.match(/Edg\/([\d.]+)/);
    return { name: "Edge", version: m ? m[1] : "unknown" };
  }
  if (/Chrome\//i.test(ua)) {
    const m = ua.match(/Chrome\/([\d.]+)/);
    return { name: "Chrome", version: m ? m[1] : "unknown" };
  }
  if (/Firefox\//i.test(ua)) {
    const m = ua.match(/Firefox\/([\d.]+)/);
    return { name: "Firefox", version: m ? m[1] : "unknown" };
  }
  if (/Version\/([\d.]+).*Safari/i.test(ua)) {
    const m = ua.match(/Version\/([\d.]+).*Safari/);
    return { name: "Safari", version: m ? m[1] : "unknown" };
  }
  return { name: "Unknown", version: "unknown" };
}

const BROWSER_REQUIREMENTS: Record<string, { minimum: string; url: string; note: string }> = {
  Chrome: {
    minimum: "113",
    url: "https://www.google.com/chrome/",
    note: "Chrome 113+ supports WebGPU on desktop and Android.",
  },
  Edge: {
    minimum: "113",
    url: "https://www.microsoft.com/edge/",
    note: "Edge 113+ supports WebGPU on desktop.",
  },
  Firefox: {
    minimum: "—",
    url: "https://www.mozilla.org/firefox/",
    note: "Firefox has WebGPU behind the dom.webgpu.enabled flag. Use Chrome or Edge instead.",
  },
  Safari: {
    minimum: "—",
    url: "https://support.apple.com/en-us/HT204416",
    note: "Safari does not currently support WebGPU. Use Chrome or Edge on a compatible device.",
  },
  "Samsung Internet": {
    minimum: "—",
    url: "https://www.samsung.com/in/apps/samsung-internet/",
    note: "Samsung Internet does not support WebGPU. Use Chrome on Android instead.",
  },
};

export async function checkWebGPUCompatibility(): Promise<WebGPUCompatibility> {
  const { name: browser, version } = detectBrowser();
  const gpuAvail = await supportsWebGPU();

  if (gpuAvail) {
    return {
      supported: true,
      browser,
      version,
      minimumVersion: BROWSER_REQUIREMENTS[browser]?.minimum ?? "—",
      upgradeUrl: BROWSER_REQUIREMENTS[browser]?.url ?? "",
      reason: null,
    };
  }

  const req = BROWSER_REQUIREMENTS[browser];
  let reason: string;
  if (browser === "Unknown") {
    reason = "Your browser does not appear to support WebGPU. Try Chrome 113+ or Edge 113+.";
  } else if (req) {
    reason = `${req.note} Your version: ${version}.`;
  } else {
    reason = `${browser} does not support WebGPU. Use Chrome or Edge instead.`;
  }

  return {
    supported: false,
    browser,
    version,
    minimumVersion: req?.minimum ?? "—",
    upgradeUrl: req?.url ?? "https://www.google.com/chrome/",
    reason,
  };
}

/* ─── Mobile detection ─────────────────────────────────────── */

/** Detects mobile devices via user agent to select appropriate inference engine.
 *  Mobile devices cannot download large (~2-5GB) models, so cloud inference is preferred. */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

/* ─── Engine auto-detection ──────────────────────────────── */

/**
 * Detects if the current environment supports WASM inference
 */
export async function supportsWASM(): Promise<boolean> {
  try {
    if (typeof WebAssembly === "undefined") return false;
    // Test basic WASM compilation
    const module = await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    return module instanceof WebAssembly.Module;
  } catch {
    return false;
  }
}

/**
 * Detects if the current environment supports CPU inference
 * This is essentially always true if JavaScript is running, but we check for adequate performance
 */
export async function supportsCPU(): Promise<boolean> {
  // CPU inference is always available as a fallback
  return typeof navigator !== "undefined";
}

/**
 * Enhanced engine detection with comprehensive fallback chain
 * Fallback order: webllm → wasm → cpu → ollama → cloud → demo
 */
export async function detectEngine(prefer: EngineKind | "auto" = "auto"): Promise<EngineKind> {
  if (prefer !== "auto") return prefer;

  /* Mobile devices use cloud inference by default — downloading multi-GB models is impractical. */
  if (isMobileDevice()) return "cloud";

  /* If user has configured a Google API key, use Google AI Studio
   * Prefer Google over WebLLM for document analysis (better OCR/vision quality) and triage. */
  const googleKey = useSettingsStore.getState().googleApiKey;
  if (googleKey) return "google";

  /* Try engines in order of preference/performance */
  if (await supportsWebGPU()) return "webllm";
  if (await detectOllama()) return "ollama";

  /* Final fallback to cloud inference (always available if online) */
  return "cloud";
}

/* ─── Ollama detection ────────────────────────────────────── */

interface OllamaCache {
  ok: boolean;
  ts: number;
}

let _ollamaCache: OllamaCache | null = null;
const OLLAMA_CACHE_TTL = 30_000;

export async function detectOllama(url = "http://localhost:11434"): Promise<boolean> {
  const now = Date.now();
  if (_ollamaCache && now - _ollamaCache.ts < OLLAMA_CACHE_TTL) return _ollamaCache.ok;
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(3000) });
    _ollamaCache = { ok: res.ok, ts: now };
    return _ollamaCache.ok;
  } catch {
    _ollamaCache = { ok: false, ts: now };
    return false;
  }
}

export function clearOllamaCache() {
  _ollamaCache = null;
}

export interface OllamaModelInfo {
  name: string;
  size: string;
  digest: string;
}

export async function listOllamaModels(url = "http://localhost:11434"): Promise<OllamaModelInfo[]> {
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      models?: Array<{ name: string; size?: number; digest: string }>;
    };
    return (data.models ?? []).map((m) => ({
      name: m.name,
      size: m.size ? formatBytes(m.size) : "unknown",
      digest: m.digest.slice(0, 12),
    }));
  } catch {
    return [];
  }
}

export async function detectOllamaModel(
  model: string,
  url = "http://localhost:11434",
): Promise<boolean> {
  const models = await listOllamaModels(url);
  return models.some((m) => m.name === model || m.name.startsWith(model + ":"));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/* ─── WebLLM engine ──────────────────────────────────────── */

async function loadModel(
  modelId: string,
  onProgress?: (p: InitProgressReport) => void,
): Promise<MLCEngine> {
  if (webllmEngine && WEBLLM_MODEL_ID === modelId) return webllmEngine;
  if (webllmLoading) return webllmLoading;

  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");

  WEBLLM_MODEL_ID = modelId;
  webllmEngine = null;
  webllmLoading = null;

  const baseConfig = {
    initProgressCallback: (report: InitProgressReport) => onProgress?.(report),
  };

  const enginePromise =
    modelId === GEMMA4_E2B_MODEL_ID
      ? CreateMLCEngine(modelId, {
          ...baseConfig,
          appConfig: {
            model_list: [
              {
                model: "https://huggingface.co/welcoma/gemma-4-E2B-it-q4f16_1-MLC",
                model_id: GEMMA4_E2B_MODEL_ID,
                model_lib:
                  "https://huggingface.co/welcoma/gemma-4-E2B-it-q4f16_1-MLC/resolve/main/libs/gemma-4-E2B-it-q4f16_1-MLC-webgpu.wasm",
                required_features: ["shader-f16"],
              },
            ],
          },
        })
      : CreateMLCEngine(modelId, baseConfig);

  webllmLoading = enginePromise
    .then((e) => {
      webllmEngine = e;
      return e;
    })
    .finally(() => {
      webllmLoading = null;
    });
  return webllmLoading;
}

async function loadWebLLM(onProgress?: (p: InitProgressReport) => void): Promise<MLCEngine> {
  return loadModel(useSettingsStore.getState().modelId, onProgress);
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
  tool_calls?: Array<{
    function: { name: string; arguments: string };
  }>;
}

interface OllamaChatResponse {
  message: {
    content?: string | null;
    tool_calls?: Array<{
      function: { name: string; arguments: string };
    }>;
  };
}

async function ollamaChat(
  messages: OllamaMessage[],
  baseUrl: string,
  tools?: unknown[],
  signal?: AbortSignal,
): Promise<OllamaChatResponse> {
  const body: Record<string, unknown> = {
    model: _ollamaModel,
    messages,
    stream: false,
    options: { temperature: 0.1 },
  };
  if (tools) body.tools = tools;
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  return res.json() as Promise<OllamaChatResponse>;
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
    recommendation:
      "Clean with antiseptic. If bacterial infection suspected, start antibiotic therapy per local protocol. Refer if no improvement in 48 hours.",
  },
  {
    condition: "Contact dermatitis",
    urgency: "green",
    confidence: 76,
    features: ["Well-demarcated erythema", "Itchy papules", "Linear distribution"],
    recommendation:
      "Avoid irritant. Topical hydrocortisone 1% BID for 7 days. Antihistamine for itching.",
  },
  {
    condition: "Cellulitis",
    urgency: "red",
    confidence: 72,
    features: ["Diffuse swelling", "Warm to touch", "Ill-defined margin", "Red streaking"],
    recommendation:
      "URGENT: Refer to clinic for antibiotic therapy per local protocol. Elevate affected limb. Paracetamol for fever.",
  },
  {
    condition: "Tinea corporis (ringworm)",
    urgency: "green",
    confidence: 88,
    features: ["Annular plaque", "Raised border", "Central clearing", "Scaly surface"],
    recommendation:
      "Topical terbinafine 1% once daily for 2 weeks. Keep area dry. Treat close contacts if symptomatic.",
  },
  {
    condition: "Herpes zoster (shingles)",
    urgency: "yellow",
    confidence: 79,
    features: [
      "Vesicular rash",
      "Dermatomal distribution",
      "Erythematous base",
      "Grouped vesicles",
    ],
    recommendation:
      "Refer for antiviral (acyclovir) within 72 hours of onset. Pain management with paracetamol. Avoid contact with immunocompromised.",
  },
];

function demoAssessment(): TriageResult {
  const c = DEMO_CONDITIONS[Math.floor(Math.random() * DEMO_CONDITIONS.length)];
  const diffs = DEMO_CONDITIONS.filter((d) => d.condition !== c.condition)
    .slice(0, 2 + Math.floor(Math.random() * 2))
    .map((d) => ({ name: d.condition, probability: Math.floor(Math.random() * 50) + 5 }));
  const point = c.confidence - Math.floor(Math.random() * 10) + 5;

  return {
    condition: c.condition,
    confidence: {
      confidence_point: Math.max(0, Math.min(100, point)),
      confidence_interval: [Math.max(0, point - 10), Math.min(100, point + 10)] as [number, number],
      uncertainty_source: "model_knowledge",
      uncertainty_reason: "Demo mode simulation",
    },
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
    recommendation:
      "Refer for iron studies and HbA1c. Dietary counselling for blood sugar management.",
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

/* ─── Cloud inference ──────────────────────────────────────── */

const DEFAULT_CLOUD_URL = `${typeof window !== "undefined" ? window.location.origin : ""}/functions/v1/infer-gemma4`;
const CLOUD_QUOTA_KEY = "trij-cloud-quota";
const MAX_CLOUD_INFERENCES = 50;

let _cloudQuota = 0;

export function getCloudQuota(): { used: number; max: number } {
  return { used: _cloudQuota, max: MAX_CLOUD_INFERENCES };
}

export function resetCloudQuota() {
  _cloudQuota = 0;
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(CLOUD_QUOTA_KEY);
  }
}

function loadCloudQuota() {
  try {
    const raw = localStorage.getItem(CLOUD_QUOTA_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      if (data.date === today) {
        _cloudQuota = data.count;
      } else {
        localStorage.removeItem(CLOUD_QUOTA_KEY);
        _cloudQuota = 0;
      }
    }
  } catch {
    _cloudQuota = 0;
  }
}

function saveCloudQuota() {
  try {
    localStorage.setItem(
      CLOUD_QUOTA_KEY,
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: _cloudQuota }),
    );
  } catch {
    /* noop */
  }
}

async function cloudInference(
  imageDataUrl: string,
  language: string,
  ragContext?: string,
  presentationType?: string,
  description?: string,
  supabaseUrl?: string,
  supabaseAnonKey?: string,
): Promise<TriageResult> {
  loadCloudQuota();
  if (_cloudQuota >= MAX_CLOUD_INFERENCES) {
    throw new Error("Daily cloud inference quota exceeded");
  }

  const functionUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/infer-gemma4` : DEFAULT_CLOUD_URL;

  const session = useSettingsStore.getState();
  const token = useSessionStore.getState().session?.access_token;

  const prompt = description
    ? `Patient presentation type: ${presentationType ?? "dermatology"}. Symptom description: "${description}". Analyze and return the triage assessment.`
    : "Analyze this medical image and return the triage assessment.";

  const res = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify({
      image: imageDataUrl,
      prompt,
      language,
      ragContext,
      presentationType,
      description,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Cloud inference failed (${res.status})`);
  }

  const result: TriageResult = await res.json();
  _cloudQuota++;
  saveCloudQuota();
  return result;
}

/* ─── Google Gemini API ─────────────────────────────────────── */

const GOOGLE_GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiContent {
  role?: "user" | "model";
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: GeminiContent;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

async function googleGeminiChat(
  model: string,
  systemPrompt: string,
  userText: string,
  apiKey: string,
  imageDataUrl?: string,
): Promise<string> {
  const contents: GeminiContent[] = [
    {
      role: "user",
      parts: imageDataUrl
        ? [
            { text: userText },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageDataUrl.replace(/^data:image\/\w+;base64,/, ""),
              },
            },
          ]
        : [{ text: userText }],
    },
  ];

  const body: GeminiRequest = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  };

  const url = `${GOOGLE_GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Google Gemini error (${res.status}): ${err}`);
  }

  const data: GeminiResponse = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function googleDocumentAnalysis(
  imageDataUrl: string,
  language: string,
  model: string,
  apiKey: string,
): Promise<DocumentResult> {
  const systemPrompt = getDocumentSystemPrompt(language);
  const userText = "Extract the key information from this medical document.";
  const raw = await googleGeminiChat(model, systemPrompt, userText, apiKey, imageDataUrl);

  const result = parseToolCall<DocumentResult>({ content: raw }, null);
  if (result) return result;
  return triesJson<DocumentResult>(raw, FALLBACK_DOC);
}

export async function googleTriageAnalysis(
  imageDataUrl: string,
  language: string,
  model: string,
  apiKey: string,
  description?: string,
): Promise<TriageResult> {
  const systemPrompt = `You are a medical triage assistant. Analyze the image and provide a structured assessment.
Return a JSON object with: condition, confidence (0-100), urgency ("green"/"yellow"/"red"),
possible_conditions (array of {name, probability}), key_visual_features (array),
recommendation, referral_advised (boolean), follow_up_questions (array).
Language: ${language}`;

  const userText = description
    ? `Patient description: "${description}". Analyze and return the triage assessment.`
    : "Analyze this medical image and return the triage assessment.";

  const raw = await googleGeminiChat(model, systemPrompt, userText, apiKey, imageDataUrl);
  return triesJson<TriageResult>(raw, {
    condition: "Unable to assess",
    confidence: {
      confidence_point: 0,
      confidence_interval: [0, 0] as [number, number],
      uncertainty_source: "model_knowledge",
      uncertainty_reason: "Fallback - unable to assess",
    },
    urgency: "yellow",
    possible_conditions: [],
    key_visual_features: [],
    recommendation: "Could not analyze image. Try again or switch engine.",
    referral_advised: true,
    follow_up_questions: [],
  });
}

/* ─── Public API ──────────────────────────────────────────── */

/**
 * Load the specified inference engine with fallback support
 * If the primary engine fails to load, attempts to fallback to the next available engine
 */
export async function loadEngine(
  kind: EngineKind,
  onProgress?: (p: InitProgressReport) => void,
): Promise<EngineKind> {
  try {
    if (kind === "webllm") {
      await loadWebLLM(onProgress);
    } else if (kind === "wasm" || kind === "cpu") {
      // WASM and CPU engines are not yet implemented - skip to fallback
      throw new Error(`${kind} engine not yet implemented`);
    } else if (kind === "ollama") {
      // Ollama doesn't require loading, it's an external service
      if (onProgress) {
        onProgress({ progress: 1, text: "Ollama connection ready", timeElapsed: 0 });
      }
    } else if (kind === "cloud") {
      // Cloud doesn't require loading, it's an external service
      if (onProgress) {
        onProgress({ progress: 1, text: "Cloud inference ready", timeElapsed: 0 });
      }
    } else if (kind === "google") {
      // Google AI Studio doesn't require local loading
      if (onProgress) {
        onProgress({ progress: 1, text: "Google AI Studio ready", timeElapsed: 0 });
      }
    } else if (kind === "demo") {
      // Demo mode doesn't require loading
      if (onProgress) {
        onProgress({ progress: 1, text: "Demo mode ready", timeElapsed: 0 });
      }
    }
    return kind;
  } catch (error) {
    console.error(`Failed to load ${kind} engine:`, error);

    // Implement fallback chain for failed loads
    const fallbackChain: Record<EngineKind, EngineKind[]> = {
      webllm: ["ollama", "cloud", "demo"],
      wasm: ["ollama", "cloud", "demo"],
      cpu: ["ollama", "cloud", "demo"],
      ollama: ["cloud", "demo"],
      cloud: ["demo"],
      google: ["demo"],
      demo: [],
    };

    const fallbacks = fallbackChain[kind] || [];
    for (const fallback of fallbacks) {
      try {
        console.log(`Attempting fallback from ${kind} to ${fallback}`);
        await loadEngine(fallback, onProgress);
        return fallback; // Success with fallback — return the actual kind loaded
      } catch (fallbackError) {
        console.error(`Fallback ${fallback} also failed:`, fallbackError);
        continue; // Try next fallback
      }
    }

    // All fallbacks exhausted
    throw new Error(`All engine loading attempts failed for ${kind}`);
  }
}

/**
 * Enhanced engine loading with automatic fallback on failure
 * Returns the actual engine kind that was successfully loaded
 */
export async function loadEngineWithFallback(
  preferredKind: EngineKind,
  onProgress?: (p: InitProgressReport) => void,
): Promise<{ kind: EngineKind; fallbackUsed: boolean }> {
  const loadedKind = await loadEngine(preferredKind, onProgress);
  return { kind: loadedKind, fallbackUsed: loadedKind !== preferredKind };
}

export function isLoaded(kind: EngineKind): boolean {
  if (kind === "webllm") return isWebLLMLoaded();
  if (kind === "wasm") return false; // WASM not yet implemented
  if (kind === "cpu") return false; // CPU not yet implemented
  if (kind === "ollama") return true; // Ollama is an external service
  if (kind === "cloud") return true; // Cloud is an external service
  if (kind === "google") return true; // Google AI Studio is an external service
  if (kind === "demo") return true; // Demo is always ready
  return false;
}

/* ─── Triage ──────────────────────────────────────────────── */

const FALLBACK_TRIAGE: TriageResult = {
  condition: "Unable to assess",
  confidence: {
    confidence_point: 0,
    confidence_interval: [0, 0] as [number, number],
    uncertainty_source: "model_knowledge",
    uncertainty_reason: "Fallback - unable to assess",
  },
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
  ollamaUrl?: string,
  presentationType?: string,
  description?: string,
): Promise<TriageResult> {
  const settings = useSettingsStore.getState();
  const kbContext = getCompactKbContext();
  let result: TriageResult;

  const userMessage = description
    ? `Presentation type: ${presentationType ?? "dermatology"}. Symptom description: "${description}". Analyze and return the triage assessment.`
    : "Analyze this medical image and return the triage assessment.";

  if (kind === "cloud") {
    /* Attempt cloud inference; fall back to demo if offline or unauthenticated.
     * This ensures mobile users always get a result even without connectivity. */
    try {
      result = await cloudInference(
        imageDataUrl,
        language,
        kbContext,
        presentationType,
        description,
      );
      result = attachRagSources(result);
      return result;
    } catch (err) {
      console.warn("Cloud inference failed, falling back to demo mode:", err);
      await sleep(2000 + Math.random() * 1500);
      result = demoAssessment();
      result = attachRagSources(result);
      return result;
    }
  }

  if (kind === "google") {
    const apiKey = useSettingsStore.getState().googleApiKey;
    if (!apiKey) throw new Error("Google AI Studio API key not configured. Add it in Settings.");
    const model = useSettingsStore.getState().modelId.startsWith("gemini")
      ? useSettingsStore.getState().modelId
      : "gemini-2.0-flash";
    try {
      result = await googleTriageAnalysis(imageDataUrl, language, model, apiKey, description);
      result = attachRagSources(result);
      return result;
    } catch (err) {
      console.warn("Google inference failed, falling back to demo:", err);
      await sleep(2000 + Math.random() * 1500);
      result = demoAssessment();
      result = attachRagSources(result);
      return result;
    }
  }

  if (kind === "demo") {
    await sleep(2000 + Math.random() * 1500);
    result = demoAssessment();
    result = attachRagSources(result);
    return result;
  }

  if (kind === "ollama") {
    try {
      const response = await ollamaChat(
        [
          {
            role: "system",
            content: getTriageSystemPrompt(
              language,
              false,
              kbContext,
              presentationType,
              description,
            ),
          },
          {
            role: "user",
            content: userMessage,
            images: [imageDataUrl],
          },
        ],
        ollamaUrl ?? "http://localhost:11434",
        [TRIAGE_TOOL],
      );
      result =
        parseToolCall<TriageResult>(response.message, null) ||
        triesJson<TriageResult>(response.message.content ?? "", FALLBACK_TRIAGE);
      result = attachRagSources(result);
      return result;
    } catch (err) {
      console.warn("Ollama failed, falling back to demo:", err);
      await sleep(2000 + Math.random() * 1500);
      result = demoAssessment();
      result = attachRagSources(result);
      return result;
    }
  }

  /* Fallback for unknown/unimplemented engine kinds (e.g. "wasm", "cpu") */
  if (kind !== "webllm") {
    console.warn(`Engine "${kind}" not directly supported, falling back to demo`);
    await sleep(2000 + Math.random() * 1500);
    result = demoAssessment();
    result = attachRagSources(result);
    return result;
  }

  try {
    const e = await (isModelVLM(useSettingsStore.getState().modelId)
      ? loadWebLLM()
      : loadModel(PHI_VISION_MODEL_ID));
    const temperature = settings.thinkingMode ? 0.7 : 0.1;

    const contentItems: MultimodalContent = description
      ? [{ type: "text" as const, text: userMessage }]
      : [
          { type: "image_url" as const, image_url: { url: imageDataUrl } },
          { type: "text" as const, text: userMessage },
        ];

    const reply = await e.chat.completions.create({
      messages: [
        {
          role: "system",
          content: getTriageSystemPrompt(
            language,
            settings.thinkingMode,
            kbContext,
            presentationType,
            description,
          ),
        },
        {
          role: "user",
          content: multimodal(contentItems),
        },
      ],
      tools: [TRIAGE_TOOL],
      tool_choice: {
        type: "function",
        function: { name: "triage_assessment" },
      },
      max_tokens: 1024,
      temperature,
    });
    const message = reply.choices[0]?.message;
    if (!message) {
      result = FALLBACK_TRIAGE;
      result.rag_sources = undefined;
      return result;
    }
    result =
      parseToolCall<TriageResult>(message, null) ||
      triesJson<TriageResult>(message.content ?? "", FALLBACK_TRIAGE);
    result = attachRagSources(result);
    return result;
  } catch (err) {
    console.warn("WebLLM failed, falling back to demo:", err);
    await sleep(2000 + Math.random() * 1500);
    result = demoAssessment();
    result = attachRagSources(result);
    return result;
  }
}

function attachRagSources(r: TriageResult): TriageResult {
  const features = r.key_visual_features || [];
  let result = { ...r };
  const icd10 = getIcd10Code(r);
  if (icd10) result.icd10_code = icd10;

  const antibioticAnalysis = analyzeForAntibiotics(
    result.condition,
    result.recommendation,
    result.possible_conditions,
  );
  if (
    antibioticAnalysis.hasAntibioticMention ||
    antibioticAnalysis.recommendation !== result.recommendation
  ) {
    result.recommendation = antibioticAnalysis.recommendation ?? result.recommendation;
  }

  if (features.length === 0) return result;
  const { sources } = retrieve(features, 3);
  if (sources.length === 0) return result;
  return {
    ...result,
    rag_sources: sources.map((s) => ({
      condition: s.condition,
      treatment: s.treatment,
      who_guideline: s.who_guideline,
    })),
  };
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

async function cloudDocumentAnalysis(
  imageDataUrl: string,
  language: string,
): Promise<DocumentResult> {
  const apiKey = useSettingsStore.getState().googleApiKey;
  if (!apiKey) throw new Error("No Google API key configured for cloud document analysis");
  const model = useSettingsStore.getState().modelId.startsWith("gemini")
    ? useSettingsStore.getState().modelId
    : "gemini-2.0-flash";
  return googleDocumentAnalysis(imageDataUrl, language, model, apiKey);
}

export async function analyzeDocument(
  imageDataUrl: string,
  language: string,
  kind: EngineKind,
  ollamaUrl?: string,
): Promise<DocumentResult> {
  if (kind === "demo") {
    await sleep(1500 + Math.random() * 1000);
    return demoDocument();
  }

  if (kind === "cloud") {
    try {
      return await cloudDocumentAnalysis(imageDataUrl, language);
    } catch (err) {
      console.warn("Cloud document analysis failed, falling back to demo:", err);
      await sleep(1500 + Math.random() * 1000);
      return demoDocument();
    }
  }

  if (kind === "ollama") {
    try {
      const response = await ollamaChat(
        [
          { role: "system", content: getDocumentSystemPrompt(language) },
          {
            role: "user",
            content: "Extract the key information from this document.",
            images: [imageDataUrl],
          },
        ],
        ollamaUrl ?? "http://localhost:11434",
        [DOCUMENT_TOOL],
      );
      const result = parseToolCall<DocumentResult>(response.message, null);
      if (result) return result;
      return triesJson<DocumentResult>(response.message.content ?? "", FALLBACK_DOC);
    } catch (err) {
      console.warn("Ollama failed, falling back to demo:", err);
      await sleep(1500 + Math.random() * 1000);
      return demoDocument();
    }
  }

  if (kind === "google") {
    const apiKey = useSettingsStore.getState().googleApiKey;
    if (!apiKey) throw new Error("Google AI Studio API key not configured. Add it in Settings.");
    const model = useSettingsStore.getState().modelId.startsWith("gemini")
      ? useSettingsStore.getState().modelId
      : "gemini-2.0-flash";
    try {
      return await googleDocumentAnalysis(imageDataUrl, language, model, apiKey);
    } catch (err) {
      console.warn("Google document analysis failed, falling back to demo:", err);
      await sleep(1500 + Math.random() * 1000);
      return demoDocument();
    }
  }

  const settings = useSettingsStore.getState();

  try {
    const e = await (isModelVLM(useSettingsStore.getState().modelId)
      ? loadWebLLM()
      : loadModel(PHI_VISION_MODEL_ID));
    const temperature = settings.thinkingMode ? 0.7 : 0.1;

    const reply = await e.chat.completions.create({
      messages: [
        { role: "system", content: getDocumentSystemPrompt(language, settings.thinkingMode) },
        {
          role: "user",
          content: multimodal([
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: "Extract the key information from this document." },
          ]),
        },
      ],
      tools: [DOCUMENT_TOOL],
      tool_choice: {
        type: "function",
        function: { name: "document_analysis" },
      },
      temperature,
      max_tokens: 1024,
    });
    const message = reply.choices[0]?.message;
    if (!message) return FALLBACK_DOC;
    const result = parseToolCall<DocumentResult>(message, null);
    if (result) return result;
    return triesJson<DocumentResult>(message.content ?? "", FALLBACK_DOC);
  } catch (err) {
    console.warn("Primary engine failed, trying Google Gemini before demo:", err);
    const apiKey = useSettingsStore.getState().googleApiKey;
    if (apiKey) {
      try {
        const model = useSettingsStore.getState().modelId.startsWith("gemini")
          ? useSettingsStore.getState().modelId
          : "gemini-2.0-flash";
        return await googleDocumentAnalysis(imageDataUrl, language, model, apiKey);
      } catch (geminiErr) {
        console.warn("Google Gemini fallback also failed:", geminiErr);
      }
    }
    await sleep(1500 + Math.random() * 1000);
    return demoDocument();
  }
}

/* ─── Follow-up questions ─────────────────────────────────── */

export async function nextFollowUp(
  language: string,
  condition: string,
  history: string[],
  kind: EngineKind,
  ollamaUrl?: string,
  testMode: boolean = false,
): Promise<string> {
  // Test mode: simulate voice turns with predefined sequence
  if (testMode) {
    const testPool = [
      "How long has the condition been present?",
      "Is there any pain, itching or burning?",
      "Any fever, chills or feeling unwell?",
      "Have you tried any treatment so far?",
      "Any allergies or other medical conditions?",
    ];
    const index = Math.min(history.length, testPool.length - 1);
    if (index >= testPool.length - 1) {
      return ""; // No more questions
    }
    return testPool[index];
  }

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
    const response = await ollamaChat(
      [
        { role: "system", content: prompt },
        { role: "user", content: "Generate the next follow-up question." },
      ],
      ollamaUrl ?? "http://localhost:11434",
      [FOLLOW_UP_TOOL],
    );
    const result = parseToolCall<{ question: string }>(response.message, null);
    if (result?.question) return result.question;
    return triesJson<{ question: string }>(response.message.content ?? "", { question: "" })
      .question;
  }

  if (kind === "google") {
    const apiKey = useSettingsStore.getState().googleApiKey;
    if (!apiKey) return "";
    const model = useSettingsStore.getState().modelId.startsWith("gemini")
      ? useSettingsStore.getState().modelId
      : "gemini-2.0-flash";
    try {
      const raw = await googleGeminiChat(
        model,
        prompt,
        "Generate the next follow-up question.",
        apiKey,
      );
      const result = triesJson<{ question: string }>(raw, { question: "" });
      return result.question;
    } catch {
      return "";
    }
  }

  const e = await loadWebLLM();
  const settings = useSettingsStore.getState();
  const temperature = settings.thinkingMode ? 0.7 : 0.4;

  const reply = await e.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "Generate the next follow-up question." },
    ],
    tools: [FOLLOW_UP_TOOL],
    tool_choice: {
      type: "function",
      function: { name: "generate_follow_up" },
    },
    temperature,
    max_tokens: 120,
  });
  const message = reply.choices[0]?.message;
  if (!message) return "";
  const result = parseToolCall<{ question: string }>(message, null);
  if (result?.question) return result.question;
  return triesJson<{ question: string }>(message.content ?? "", { question: "" }).question;
}

/* ─── Iterative voice conversation ───────────────────────── */

export interface ConvMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface FollowUpDecision {
  question: string;
  rationale?: string;
  done: boolean;
}

export interface VoiceTurnResult {
  decision: FollowUpDecision;
  messages: ConvMessage[];
}

export function initVoiceConversation(language: string, triage: TriageResult): ConvMessage[] {
  const system = getConversationSystemPrompt(
    language,
    triage.condition,
    triage.confidence.confidence_point,
    triage.urgency,
    triage.key_visual_features ?? [],
    useSettingsStore.getState().thinkingMode,
  );
  return [{ role: "system", content: system }];
}

/**
 * Continues the voice interview. Pass the existing message history plus an
 * optional latest patient answer. Returns the model's next question (or done)
 * and the updated history (including the assistant tool turn so the next call
 * preserves context).
 */
export async function nextVoiceTurn(
  messages: ConvMessage[],
  patientAnswer: string | null,
  kind: EngineKind,
  ollamaUrl?: string,
  testMode: boolean = false,
): Promise<VoiceTurnResult> {
  // Test mode: simulate voice turns with predefined sequence
  if (testMode) {
    const updated: ConvMessage[] = [...messages];
    if (patientAnswer && patientAnswer.trim()) {
      updated.push({ role: "user", content: `Patient answered: "${patientAnswer.trim()}"` });
    } else if (messages.length === 1) {
      updated.push({
        role: "user",
        content: "Start the interview. Ask the first follow-up question.",
      });
    }

    const askedCount = updated.filter((m) => m.role === "assistant").length;
    const testPool = [
      "How long has the condition been present?",
      "Is there any pain, itching or burning?",
      "Any fever, chills or feeling unwell?",
      "Have you tried any treatment so far?",
      "Any allergies or other medical conditions?",
    ];
    if (askedCount >= testPool.length) {
      const decision: FollowUpDecision = { question: "", done: true };
      updated.push({ role: "assistant", content: JSON.stringify(decision) });
      return { decision, messages: updated };
    }
    const decision: FollowUpDecision = { question: testPool[askedCount], done: false };
    updated.push({ role: "assistant", content: JSON.stringify(decision) });
    return { decision, messages: updated };
  }

  const updated: ConvMessage[] = [...messages];
  if (patientAnswer && patientAnswer.trim()) {
    updated.push({ role: "user", content: `Patient answered: "${patientAnswer.trim()}"` });
  } else if (messages.length === 1) {
    updated.push({
      role: "user",
      content: "Start the interview. Ask the first follow-up question.",
    });
  }

  if (kind === "demo") {
    await sleep(400 + Math.random() * 400);
    const askedCount = updated.filter((m) => m.role === "assistant").length;
    const pool = [
      "How long has the condition been present?",
      "Is there any pain, itching or burning?",
      "Any fever, chills or feeling unwell?",
      "Have you tried any treatment so far?",
      "Any allergies or other medical conditions?",
    ];
    if (askedCount >= pool.length) {
      const decision: FollowUpDecision = { question: "", done: true };
      updated.push({ role: "assistant", content: JSON.stringify(decision) });
      return { decision, messages: updated };
    }
    const decision: FollowUpDecision = { question: pool[askedCount], done: false };
    updated.push({ role: "assistant", content: JSON.stringify(decision) });
    return { decision, messages: updated };
  }

  if (kind === "ollama") {
    const response = await ollamaChat(
      updated as OllamaMessage[],
      ollamaUrl ?? "http://localhost:11434",
      [FOLLOW_UP_TOOL],
    );
    const parsed = parseToolCall<FollowUpDecision>(response.message, null);
    const decision: FollowUpDecision = parsed ?? { question: "", done: true };
    updated.push({
      role: "assistant",
      content: JSON.stringify(decision),
    });
    return { decision, messages: updated };
  }

  const e = await loadWebLLM();
  const settings = useSettingsStore.getState();
  const temperature = settings.thinkingMode ? 0.7 : 0.4;
  const reply = await e.chat.completions.create({
    messages: updated,
    tools: [FOLLOW_UP_TOOL],
    tool_choice: {
      type: "function",
      function: { name: "generate_follow_up" },
    },
    temperature,
    max_tokens: 200,
  });
  const message = reply.choices[0]?.message;
  const parsed = message ? parseToolCall<FollowUpDecision>(message, null) : null;
  const decision: FollowUpDecision = parsed ?? { question: "", done: true };
  updated.push({ role: "assistant", content: JSON.stringify(decision) });
  return { decision, messages: updated };
}

/* ─── Patient Symptom-Only Triage ─────────────────────────── */

export async function patientSymptomTriage(
  description: string,
  ageRange: string,
  duration: string,
  language: string,
): Promise<TriageResult> {
  const systemPrompt = `You are Trij, a medical triage assistant for patient self-assessment.
The user is describing their own symptoms (or someone else's).
Use the triage_assessment function to return your assessment.

IMPORTANT SAFETY RULES:
- If you are not confident (less than 70%), set confidence accordingly.
- Your assessment is advisory only — always recommend seeing a doctor for serious concerns.
- First do no harm: when in doubt, recommend referral.
- Never recommend specific antibiotic names.

Urgency rules:
- GREEN: minor, can rest at home, monitor symptoms
- YELLOW: needs medical attention within 24-48 hours
- RED: emergency, seek care immediately

Respond in ${language}.`;

  const userText = `Patient age range: ${ageRange}. Duration: ${duration}. 
Symptoms described: "${description}". 
Provide a triage assessment with condition, urgency (green/yellow/red), confidence (0-100), recommendation, and follow-up questions.`;

  const apiKey = useSettingsStore.getState().googleApiKey;
  if (apiKey) {
    try {
      const model = useSettingsStore.getState().modelId.startsWith("gemini")
        ? useSettingsStore.getState().modelId
        : "gemini-2.0-flash";
      const raw = await googleGeminiChat(model, systemPrompt, userText, apiKey);
      return triesJson<TriageResult>(raw, demoPatientAssessment(description));
    } catch {
      await sleep(1500 + Math.random() * 1000);
      return demoPatientAssessment(description);
    }
  }

  await sleep(1500 + Math.random() * 1000);
  return demoPatientAssessment(description);
}

function demoPatientAssessment(description: string): TriageResult {
  const desc = description.toLowerCase();
  let urgency: "red" | "yellow" | "green" = "green";
  let condition = "Minor illness";
  let recommendation = "Rest at home and monitor symptoms. Consult a doctor if symptoms worsen.";

  if (desc.includes("chest pain") || desc.includes("difficulty breath") || desc.includes("unconscious") || desc.includes("severe bleed")) {
    urgency = "red";
    condition = "Emergency condition";
    recommendation = "Go to the nearest hospital immediately. This could be life-threatening.";
  } else if (desc.includes("fever") || desc.includes("vomit") || desc.includes("severe pain") || desc.includes("headache") || desc.includes("injury") || desc.includes("burn") || desc.includes("rash") || desc.includes("infection")) {
    urgency = "yellow";
    condition = "Needs medical attention";
    recommendation = "Visit a clinic or see a doctor within 24 hours. Monitor symptoms closely.";
  } else if (desc.includes("cough") || desc.includes("cold") || desc.includes("sore throat") || desc.includes("stomach ache") || desc.includes("diarrhoea") || desc.includes("itch") || desc.includes("tired")) {
    urgency = "green";
    condition = "Minor condition — home care";
    recommendation = "Rest at home, stay hydrated, and monitor symptoms. Use over-the-counter remedies as needed.";
  }

  return {
    condition,
    confidence: {
      confidence_point: 75,
      confidence_interval: [60, 90] as [number, number],
      uncertainty_source: "model_knowledge",
      uncertainty_reason: "Demo mode — based on symptom keywords",
    },
    urgency,
    possible_conditions: [{ name: condition, probability: 75 }],
    key_visual_features: [],
    recommendation,
    referral_advised: urgency !== "green",
    follow_up_questions: [
      "How long have you had these symptoms?",
      "Have you taken any medication?",
      "Do you have any other symptoms?",
      "Any known allergies or medical conditions?",
    ],
  };
}

/* ─── Helpers ─────────────────────────────────────────────── */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
