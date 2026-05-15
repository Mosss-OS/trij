import { CreateMLCEngine, type MLCEngine, type InitProgressReport } from "@mlc-ai/web-llm";
export type { InitProgressReport };
import { getTriageSystemPrompt, getDocumentSystemPrompt, getFollowUpPrompt } from "./gemma-prompt";
import type { TriageResult, DocumentResult, Urgency } from "@/types/trij";
import { TRIAGE_TOOL, DOCUMENT_TOOL, FOLLOW_UP_TOOL, parseToolCall, triesJson } from "./tools";
import { useSettingsStore } from "@/stores/settingsStore";

/* ─── Engine type ─────────────────────────────────────────── */

export type EngineKind = "webllm" | "ollama" | "demo";

/* ─── WebLLM internals ────────────────────────────────────── */

let webllmEngine: MLCEngine | null = null;
let webllmLoading: Promise<MLCEngine> | null = null;
let WEBLLM_MODEL_ID = "gemma-2-2b-it-q4f16_1-MLC";

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

/* ─── Engine auto-detection ──────────────────────────────── */

export async function detectEngine(prefer: EngineKind | "auto" = "auto"): Promise<EngineKind> {
  if (prefer !== "auto") return prefer;
  if (await supportsWebGPU()) return "webllm";
  if (await detectOllama()) return "ollama";
  return "demo";
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
    const data = await res.json() as { models?: Array<{ name: string; size?: number; digest: string }> };
    return (data.models ?? []).map((m) => ({
      name: m.name,
      size: m.size ? formatBytes(m.size) : "unknown",
      digest: m.digest.slice(0, 12),
    }));
  } catch {
    return [];
  }
}

export async function detectOllamaModel(model: string, url = "http://localhost:11434"): Promise<boolean> {
  const models = await listOllamaModels(url);
  return models.some((m) => m.name === model || m.name.startsWith(model + ":"));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/* ─── WebLLM engine ──────────────────────────────────────── */

async function loadWebLLM(onProgress?: (p: InitProgressReport) => void): Promise<MLCEngine> {
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
      "Clean with antiseptic. Topical mupirocin TID for 5 days. Refer if no improvement in 48 hours.",
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
      "URGENT: Refer to clinic for oral antibiotics. Elevate affected limb. Paracetamol for fever.",
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

/* ─── Public API ──────────────────────────────────────────── */

export async function loadEngine(
  kind: EngineKind,
  onProgress?: (p: InitProgressReport) => void,
): Promise<void> {
  if (kind === "webllm") {
    await loadWebLLM(onProgress);
  }
}

export function isLoaded(kind: EngineKind): boolean {
  if (kind === "webllm") return isWebLLMLoaded();
  return true;
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
  ollamaUrl?: string,
): Promise<TriageResult> {
  if (kind === "demo") {
    await sleep(2000 + Math.random() * 1500);
    return demoAssessment();
  }

  if (kind === "ollama") {
    const response = await ollamaChat(
      [
        { role: "system", content: getTriageSystemPrompt(language) },
        {
          role: "user",
          content: "Analyze this medical image and return the triage assessment.",
          images: [imageDataUrl],
        },
      ],
      ollamaUrl ?? "http://localhost:11434",
      [TRIAGE_TOOL],
    );
    const result = parseToolCall<TriageResult>(response.message, null);
    if (result) return result;
    return triesJson<TriageResult>(response.message.content ?? "", FALLBACK_TRIAGE);
  }

  const e = await loadWebLLM();
  const settings = useSettingsStore.getState();
  const temperature = settings.thinkingMode ? 0.7 : 0.1;
  
  const reply = await e.chat.completions.create({
    messages: [
      { role: "system", content: getTriageSystemPrompt(language, settings.thinkingMode) },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: "Analyze this medical image and return the triage assessment." },
        ] as never,
      },
    ],
    tools: [TRIAGE_TOOL as never],
    tool_choice: {
      type: "function",
      function: { name: "triage_assessment" },
    } as never,
    max_tokens: 800,
    temperature,
  });
  const message = reply.choices[0]?.message;
  if (!message) return FALLBACK_TRIAGE;
  const result = parseToolCall<TriageResult>(message, null);
  if (result) return result;
  return triesJson<TriageResult>(message.content ?? "", FALLBACK_TRIAGE);
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
  ollamaUrl?: string,
): Promise<DocumentResult> {
  if (kind === "demo") {
    await sleep(1500 + Math.random() * 1000);
    return demoDocument();
  }

  if (kind === "ollama") {
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
  }

  const e = await loadWebLLM();
  const settings = useSettingsStore.getState();
  const temperature = settings.thinkingMode ? 0.7 : 0.1;
  
  const reply = await e.chat.completions.create({
    messages: [
      { role: "system", content: getDocumentSystemPrompt(language, settings.thinkingMode) },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageDataUrl } },
          { type: "text", text: "Extract the key information from this document." },
        ] as never,
      },
    ],
    tools: [DOCUMENT_TOOL as never],
    tool_choice: {
      type: "function",
      function: { name: "document_analysis" },
    } as never,
    temperature,
    max_tokens: 800,
  });
  const message = reply.choices[0]?.message;
  if (!message) return FALLBACK_DOC;
  const result = parseToolCall<DocumentResult>(message, null);
  if (result) return result;
  return triesJson<DocumentResult>(message.content ?? "", FALLBACK_DOC);
}

/* ─── Follow-up questions ─────────────────────────────────── */

export async function nextFollowUp(
  language: string,
  condition: string,
  history: string[],
  kind: EngineKind,
  ollamaUrl?: string,
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

  const e = await loadWebLLM();
  const settings = useSettingsStore.getState();
  const temperature = settings.thinkingMode ? 0.7 : 0.4;
  
  const reply = await e.chat.completions.create({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "Generate the next follow-up question." },
    ],
    tools: [FOLLOW_UP_TOOL as never],
    tool_choice: {
      type: "function",
      function: { name: "generate_follow_up" },
    } as never,
    temperature,
    max_tokens: 120,
  });
  const message = reply.choices[0]?.message;
  if (!message) return "";
  const result = parseToolCall<{ question: string }>(message, null);
  if (result?.question) return result.question;
  return triesJson<{ question: string }>(message.content ?? "", { question: "" }).question;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
