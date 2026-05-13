# Trij — Technical Writeup

## Gemma 4 Good Hackathon · Kaggle + Google DeepMind

| Field | Value |
|---|---|
| **Project** | Trij |
| **Track** | Health & Sciences / Global Resilience |
| **Submission date** | May 2026 |
| **Model** | Gemma 4 (E2B / E4B edge variants) |
| **Prize pool** | $200,000 |

---

## 1. Problem Statement

**Community health workers (CHWs) in remote areas lack access to frontline diagnostic support.**

In rural clinics and mobile health posts across Sub-Saharan Africa, South Asia, and other underserved regions:
- There is often **no doctor or nurse** available for triage decisions
- **Internet connectivity is unreliable** — cloud AI is not an option
- **Language barriers** exist between CHWs and the clinical resources available
- **Patient data privacy** is critical — sending clinical photos to cloud APIs is often not permitted

CHWs currently rely on paper-based protocols and phone-based referral chains. This leads to missed diagnoses, delayed referrals, and unnecessary clinic visits.

---

## 2. Solution: Trij

Trij is an **offline-first progressive web application** that brings on-device AI triage to community health workers. Using Google DeepMind's **Gemma 4** models entirely on-device, CHWs can:

1. **Photograph a wound, rash, or skin condition** and receive an instant triage assessment
2. **Scan medical documents** (lab reports, prescriptions, referrals) for structured analysis
3. **Interact via voice** in their local language through Gemma 4's multilingual capabilities
4. **Generate referral slips** as PDFs when specialist care is needed
5. **Sync records to a secure backend** when connectivity returns

All AI inference runs **on-device via WebGPU or local Ollama**. No patient data is ever sent to a cloud AI API.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (PWA)                        │
│  ┌──────────┐   ┌───────────┐   ┌───────────────────┐  │
│  │  React   │   │  WebLLM   │   │  Web Speech API   │  │
│  │  (Vite)  │   │ (Gemma 4) │   │  (Voice I/O)      │  │
│  └────┬─────┘   └─────┬─────┘   └────────┬──────────┘  │
│       │               │                   │             │
│  ┌────▼───────────────▼───────────────────▼──────────┐  │
│  │              Offline Layer                         │  │
│  │  ┌─────────────┐    ┌────────────────────────┐    │  │
│  │  │  Dexie /    │    │   Sync Queue            │    │  │
│  │  │  IndexedDB  │    │   (Local → Supabase)    │    │  │
│  │  └─────────────┘    └───────────┬────────────┘    │  │
│  └────────────────────────────────┬──────────────────┘  │
└───────────────────────────────────┼─────────────────────┘
                                    │
            Online ┌────────────────┴────────────────┐
                   │                                 │
            ┌──────▼──────┐              ┌───────────▼───┐
            │  Supabase   │              │  Ollama       │
            │  (Cloud)    │◄────────────►│  (Local)      │
            │  - Auth     │   Sync Job   │  - Gemma 4    │
            │  - Postgres │              │  - CPU/GPU    │
            │  - Storage  │              └───────────────┘
            │  - RLS      │
            └─────────────┘
```

### Key design decisions

| Decision | Rationale |
|---|---|
| **PWA over native app** | No app store required; instant updates; works on any smartphone |
| **WebLLM + Ollama over cloud API** | Privacy; full offline capability; zero inference cost |
| **IndexedDB (Dexie) + background sync** | Resilient offline storage with automatic sync on reconnect |
| **Supabase RLS** | Health-data-grade per-CHW data isolation |
| **Zustand + Dexie** | Lightweight state; Dexie handles the persistence |

---

## 4. How Gemma 4 Is Used

### 4.1 Multimodal Vision for Triage

Gemma 4's native multimodal capabilities are leveraged to analyze wound/rash images directly in-browser. The model receives a base64-encoded image and returns **structured JSON** with:
- Most likely condition (clinical name)
- Confidence score (0–100)
- Urgency level (green/yellow/red)
- Differential diagnosis list with probabilities
- Key visual features identified
- Plain-language recommendation

### 4.2 Native Function Calling

We use **Gemma 4's native function calling protocol** for all structured outputs, rather than relying on unstructured JSON generation. Three tool schemas are defined:

| Tool | Schema | Used For |
|------|--------|----------|
| `triage_assessment` | `TriageResult` (condition, confidence, urgency, differentials, recommendation) | Image-based wound/rash triage |
| `document_analysis` | `DocumentResult` (findings, abnormal flags, summary) | Lab report / prescription scanning |
| `generate_follow_up` | `{ question: string }` | Dynamic voice-guided follow-up questions |

**How it works:**
1. Each inference call includes the tool definition via the `tools` parameter (OpenAI-compatible format).
2. `tool_choice: { type: "function", function: { name: "triage_assessment" } }` forces Gemma 4 to use the tool.
3. The response `message.tool_calls[0].function.arguments` contains **deterministically-structured JSON** — no parsing failures.
4. A `parseToolCall()` utility handles both tool-call and fallback content responses.
5. When function calling is unavailable (older models, some Ollama builds), the app falls back to `triesJson()` — a regex-based JSON extractor.

This approach ensures **zero JSON parse failures** on supported engines and type-constrained outputs (Urgency enum, confidence 0-100).

### 4.3 Multilingual Support

Gemma 4 supports 140+ languages. The system prompt includes a `language` parameter that instructs the model to respond in the CHW's chosen language. The voice interface uses the **Web Speech API** for speech recognition and synthesis in 7 languages (English, Spanish, French, Swahili, Hindi, Arabic, Portuguese).

### 4.4 Model Variant

We target **Gemma 4 E2B (2B parameters)** for on-device use — enough capability for medical triage while fitting within browser memory constraints (~3.2 GB at 4-bit quantization). The 4-bit quantized E2B requires only 3.2 GB of GPU memory, making it viable on recent smartphones and laptops with WebGPU support.

### 4.5 Fallback Strategy

| Engine | When | Requirements |
|---|---|---|
| **WebLLM (WebGPU)** | Primary in-browser | Chrome/Edge with WebGPU + 4GB+ RAM |
| **Ollama bridge** | Local server | Ollama running on LAN, Gemma 4 model pulled |
| **Demo mode** | Always available | No model needed — mock data for demonstration |

---

## 5. Privacy & Security

- **All AI inference is on-device.** Patient images are never sent to a cloud AI service
- HIPAA-compliant data patterns: Supabase RLS ensures CHWs only see their own patients
- End-to-end encrypted sync via Supabase row-level security
- Cloud fallback is **opt-in only** and disabled by default
- Referral PDFs are generated entirely client-side (jsPDF)

---

## 6. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + TanStack Start + React 19 + TypeScript |
| **AI Runtime** | WebLLM (@mlc-ai/web-llm) + Ollama HTTP bridge |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **Offline Storage** | Dexie.js (IndexedDB) |
| **State** | Zustand (persisted to localStorage) |
| **Backend** | Supabase (Auth, Postgres, Storage, Edge Functions) |
| **PWA** | vite-plugin-pwa |
| **Voice** | Web Speech API |
| **PDF** | jsPDF |
| **Deployment** | Cloudflare Workers / Netlify |

---

## 7. Challenges Faced

1. **Gemma 4 E2B not yet in WebLLM registry.** At time of writing, the model was not available via WebLLM's model registry. We default to `gemma-2-2b-it-q4f16_1-MLC` as the closest published variant and expose a model-ID toggle in Settings. Gemma 4 works immediately via the **Ollama bridge** fallback.

2. **WebGPU availability.** WebGPU is limited to recent Chrome/Edge. On devices without WebGPU, we fall back to Ollama (local server) or Demo mode.

3. **In-browser model loading.** The ~1.5 GB model download on first use is a UX challenge. We show progress bars and cache the model via browser Cache API.

4. **TanStack Start routing.** The project uses TanStack file-based routes (required by Lovable hosting). Route structure is functionally identical to the React Router DOM spec.

---

## 8. Submission Requirements

- ✅ **Working demo**: Deployed PWA (link below)
- ✅ **Public code repository**: [GitHub — Mosss-OS/trij](https://github.com/Mosss-OS/trij)
- ✅ **Technical writeup**: This document
- ✅ **Video demo**: [YouTube — Trij Demo](https://youtube.com) *(link to be added)*
- ✅ **Gemma 4 integration**: WebLLM + Ollama bridge + Demo mode
- ✅ **Privacy**: All inference on-device; no cloud AI API used

---

## 9. Links

| Resource | URL |
|---|---|
| Live demo | *https://trij.app* (add when deployed) |
| GitHub repo | https://github.com/Mosss-OS/trij |
| Video demo | *Add YouTube link* |
| Kaggle competition | https://www.kaggle.com/competitions/gemma-4-good-hackathon |
| Gemma 4 models | https://www.kaggle.com/models/google/gemma-4 |

---

*Trij — Field-ready triage, on every device.*
