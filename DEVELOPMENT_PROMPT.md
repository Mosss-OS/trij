# Trij — Development Prompt

Build the complete Trij application: an offline-first progressive web app for community health workers in remote areas. It uses Google DeepMind's Gemma 4 models for AI-assisted medical triage entirely on-device.

---

## Tech Stack

| Layer               | Technology                                           |
| ------------------- | ---------------------------------------------------- |
| **Frontend**        | Vite + React 19 + TypeScript                         |
| **Styling**         | Tailwind CSS v4                                      |
| **State**           | Zustand                                              |
| **Offline Storage** | IndexedDB (via Dexie.js)                             |
| **Backend**         | Supabase (Auth, Postgres, Storage, Edge Functions)   |
| **AI Runtime**      | WebLLM (runs Gemma 4 E2B/E4B in-browser via WebGPU)  |
| **PWA**             | vite-plugin-pwa (Service Worker + manifest)          |
| **Voice**           | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| **Maps**            | Leaflet (supervisor dashboard)                       |
| **PDF**             | jsPDF (referral slip generation)                     |
| **Testing**         | Vitest + Playwright                                  |
| **Lint**            | Biome                                                |
| **Deploy**          | Netlify (frontend) + Supabase (backend)              |

**IMPORTANT**: This project targets the **Gemma 4 Good Hackathon**. The model requirement is Gemma 4 — specifically the E2B or E4B edge variants for on-device inference. All AI inference MUST happen on the client device. No patient data should ever be sent to a cloud AI API. This is non-negotiable for the hackathon's privacy requirements.

---

## Project Setup

### Initialize the project

```bash
mkdir trij && cd trij
npm create vite@latest . -- --template react-ts
npm install
```

### Core dependencies

```bash
npm install zustand dexie @supabase/supabase-js @mlc-ai/web-llm
npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa
```

### Optional but recommended

```bash
npm install leaflet react-leaflet jspdf
npm install -D @types/leaflet biome vitest @playwright/test
```

### Vite config

Configure the Vite plugin for Tailwind, PWA, and WebLLM compatibility:

- Enable `@tailwindcss/vite` plugin
- Configure `vite-plugin-pwa` with:
  - `registerType: "autoUpdate"`
  - `workbox globPatterns` for all assets
  - `includeAssets: ["**/*.wasm", "**/*.bin"]` (for WebLLM model shards)
  - `srcDir: "src"` with custom service worker for background sync
- Set `build.target: "esnext"` for WebGPU support
- Add WebLLM to `optimizeDeps.exclude` (it ships WASM)

---

## Directory Structure

```
src/
├── main.tsx                    # App entry + PWA registration
├── App.tsx                     # Root component with router
├── vite-env.d.ts
│
├── routes/
│   ├── Login.tsx               # PIN + Supabase auth
│   ├── Dashboard.tsx           # CHW home: recent patients, quick triage
│   ├── NewTriage.tsx           # Camera → AI analysis → result
│   ├── PatientDetail.tsx       # Patient visit history
│   ├── DocumentScan.tsx        # Medical document OCR analysis
│   ├── ReferralView.tsx        # Referral slip + status
│   └── SupervisorDashboard.tsx # Map + queue + analytics (supervisor only)
│
├── components/
│   ├── CameraCapture.tsx       # Camera interface with flash/auto-focus
│   ├── AssessmentResult.tsx    # Triage result card with confidence
│   ├── VoiceAssistant.tsx      # Voice I/O component
│   ├── PatientSelector.tsx     # Search/select patient
│   ├── OfflineIndicator.tsx    # Connection status badge
│   ├── LanguagePicker.tsx      # Language selector
│   ├── SyncStatus.tsx          # Pending sync count indicator
│   └── ReferralSlip.tsx        # PDF referral slip component
│
├── lib/
│   ├── gemma.ts                # WebLLM integration: load model, inference
│   ├── gemma-prompt.ts         # System prompts for triage, document analysis
│   ├── db.ts                   # Dexie IndexedDB schema + operations
│   ├── sync.ts                 # Background sync orchestration
│   ├── voice.ts                # Web Speech API wrapper
│   ├── supabase.ts             # Supabase client singleton
│   ├── camera.ts               # Camera capture utilities
│   └── language-packs.ts       # Language string bundles
│
├── stores/
│   ├── patientStore.ts         # Zustand: patient state
│   ├── assessmentStore.ts      # Zustand: assessment state
│   ├── syncStore.ts            # Zustand: sync queue state
│   └── settingsStore.ts        # Zustand: language, theme, model config
│
├── types/
│   ├── patient.ts              # Patient type definitions
│   ├── assessment.ts           # Assessment type definitions
│   ├── gemma.ts                # Model inference types
│   └── sync.ts                 # Sync queue types
│
├── hooks/
│   ├── useOnlineStatus.ts      # Navigator.onLine listener
│   ├── useCamera.ts            # Camera stream management
│   ├── useGemma.ts             # Model loading + inference lifecycle
│   └── useVoice.ts             # Speech recognition + synthesis
│
└── styles/
    └── index.css               # Tailwind imports + custom utilities
```

---

## Build Instructions

### Step 1: Supabase Setup

1. Create a Supabase project at `https://supabase.com`
2. Run this SQL schema:

```sql
-- Patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chw_id UUID REFERENCES chw_profiles(id),
  identifier TEXT NOT NULL,
  age_years INTEGER,
  sex TEXT CHECK (sex IN ('M','F','other')),
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessments table
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  chw_id UUID REFERENCES chw_profiles(id),
  images TEXT[],
  condition TEXT,
  confidence REAL,
  urgency TEXT CHECK (urgency IN ('green','yellow','red')),
  possible_conditions JSONB,
  recommendation TEXT,
  voice_log TEXT,
  language TEXT,
  referral_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- CHW profiles
CREATE TABLE chw_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  region TEXT,
  supervisor_id UUID REFERENCES chw_profiles(id),
  device_id TEXT,
  last_sync TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chw_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies (CHW sees own data; supervisor sees region data)
CREATE POLICY "chw_own_patients" ON patients
  FOR ALL USING (chw_id = auth.uid());
CREATE POLICY "chw_own_assessments" ON assessments
  FOR ALL USING (chw_id = auth.uid());
```

3. Enable Supabase Auth (email-less: phone OTP or magic link for simplicity)
4. Create Supabase Storage bucket `triage-images` (public for referral sharing, encrypted at rest)
5. Create Edge Function `sync-assessments` that batch-inserts assessments with conflict resolution

### Step 2: Gemma 4 Integration (WebLLM)

The key technical challenge. Use @mlc-ai/web-llm to load Gemma 4 E2B in the browser.

```typescript
// src/lib/gemma.ts
import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

let engine: MLCEntry | null = null;

const MODEL_ID = "gemma-4-E2B-it-q4f16_1-MLC"; // Replace with actual Gemma 4 E2B WebLLM ID

export async function loadModel(onProgress?: (progress: number) => void): Promise<MLCEngine> {
  if (engine) return engine;
  engine = await CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (report) => {
      if (onProgress) onProgress(report.progress);
    },
  });
  return engine;
}

export async function triageImage(imageBase64: string, language: string): Promise<TriageResult> {
  if (!engine) throw new Error("Model not loaded");

  const systemPrompt = getTriageSystemPrompt(language);
  const userMessage = `Analyze this medical image. ${getTriageUserPrompt(language)}`;

  const reply = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageBase64 } },
          { type: "text", text: userMessage },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 1024,
  });

  return JSON.parse(reply.choices[0].message.content || "{}");
}

export async function analyzeDocument(
  imageBase64: string,
  language: string,
): Promise<DocumentResult> {
  if (!engine) throw new Error("Model not loaded");
  // Similar pattern with document-specific system prompt
}
```

**Important**: Gemma 4 E2B has not yet been published for WebLLM at model creation time. The prompt below includes fallback strategies.

### Step 3: IndexedDB Schema (Dexie)

```typescript
// src/lib/db.ts
import Dexie, { Table } from "dexie";
import type { Patient, Assessment, SyncQueueItem } from "../types";

export class TrijDB extends Dexie {
  patients!: Table<Patient, string>;
  assessments!: Table<Assessment, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super("TrijDB");
    this.version(2).stores({
      patients: "id, chwId, identifier, createdAt",
      assessments: "id, patientId, chwId, urgency, createdAt, syncedAt",
      syncQueue: "++id, table, action, createdAt",
    });
  }
}

export const db = new TrijDB();
```

### Step 4: Sync Engine

```typescript
// src/lib/sync.ts
import { db } from "./db";
import { supabase } from "./supabase";

export async function processSyncQueue() {
  const items = await db.syncQueue.toArray();

  for (const item of items) {
    try {
      const { data, error } = await supabase.rpc("sync_record", {
        p_table: item.table,
        p_action: item.action,
        p_record: item.record,
      });

      if (error) throw error;

      // Mark local record as synced
      if (item.table === "assessments") {
        await db.assessments.update(item.record.id, {
          syncedAt: new Date().toISOString(),
        });
      }

      await db.syncQueue.delete(item.id!);
    } catch (err) {
      // Will retry on next sync cycle (exponential backoff)
      console.error("Sync failed for item", item.id, err);
    }
  }
}
```

### Step 5: Voice I/O

```typescript
// src/lib/voice.ts
export class VoiceAssistant {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;

  constructor(language: string) {
    if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = language;
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
    this.synthesis = window.speechSynthesis;
  }

  async listen(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) return reject("Speech recognition not available");
      this.recognition.onresult = (e) => resolve(e.results[0][0].transcript);
      this.recognition.onerror = () => reject("Recognition error");
      this.recognition.start();
    });
  }

  speak(text: string, lang: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    this.synthesis.speak(utterance);
  }
}
```

### Step 6: Build the Routes

#### Login.tsx

- PIN input (6-digit, stored locally via hash on first login)
- "First time? Register with supervisor code" flow
- Falls back to Supabase Auth when online
- Language picker on login screen

#### Dashboard.tsx

- Date-stamped greeting in user's language
- Quick action FAB: "New Triage" (camera icon)
- Recent patients list (last 10 assessments, swipeable)
- Sync status badge (pending count + last sync time)
- Voice shortcut: "Start triage" activates voice flow
- Bottom nav: Dashboard | Patients | Scan | Profile

#### NewTriage.tsx

- Step 1: Patient lookup (search by ID/name) or quick register
- Step 2: Capture image (camera with guidelines overlay for wound photo framing)
- Step 3: AI analyzes (show model loading progress on first use; spinner on subsequent)
- Step 4: Result screen:
  - Urgency badge (colored: Green/Yellow/Red)
  - Condition name + confidence bar
  - Possible conditions list with probabilities
  - "Read aloud" button
  - "Ask follow-up" voice button (Gemma 4 function calling generates next question)
  - "Generate referral" if urgency is Yellow/Red
  - "Save & finish"

#### PatientDetail.tsx

- Patient info header (age, sex, location, visit count)
- Timeline view of all assessments (newest first)
- Each assessment card: date, condition, urgency dot, confidence
- Tap to expand: full assessment details + image thumbnail
- "New assessment for this patient" button

#### DocumentScan.tsx

- Capture photo of document
- Crop/rotate tools
- AI extracts: lab values, diagnosis, prescription
- Flags abnormal values (red highlight)
- "Explain in plain language" button
- Save to patient record

#### ReferralView.tsx

- List of referrals (filterable: pending/active/resolved)
- Referral slip: patient info + assessment summary + QR code
- Share via: WhatsApp, SMS, email (when online)
- Status updates from supervisor (when synced)

#### SupervisorDashboard.tsx

- Leaflet map with CHW pins (green = synced recently, red = overdue)
- Referral queue table
- Analytics cards: assessments/week, top conditions, sync compliance
- Export data button

### Step 7: PWA Configuration

```typescript
// vite.config.ts (excerpt for PWA)
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
  manifest: {
    name: "Trij - FieldMed Triage",
    short_name: "Trij",
    description: "AI-assisted medical triage for community health workers",
    theme_color: "#0f766e",
    background_color: "#0f766e",
    display: "standalone",
    orientation: "portrait",
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,bin}"],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/[^.]*\.supabase\.co\/.*/i,
        handler: "NetworkFirst",
        options: { cacheName: "supabase-cache" },
      },
    ],
  },
});
```

### Step 8: System Prompts for Gemma 4

Create `src/lib/gemma-prompt.ts`:

```typescript
export function getTriageSystemPrompt(language: string): string {
  return `You are Trij, an AI medical triage assistant for community health workers. 
You analyze images of wounds, rashes, and skin conditions.

You must ALWAYS respond with valid JSON only. No markdown. No explanation. Just JSON.

Your response schema:
{
  "condition": "string (clinical name of most likely condition)",
  "confidence": "number (0-100)",
  "urgency": "green | yellow | red",
  "possible_conditions": [{"name": "string", "probability": "number"}],
  "key_visual_features": ["string"],
  "recommendation": "string",
  "referral_advised": boolean,
  "follow_up_questions": ["string"]
}

Urgency rules:
- GREEN: minor condition, treat locally, no referral needed
- YELLOW: needs medical attention within 24-48 hours, consider referral  
- RED: emergency, immediate referral required

Respond in ${language}.`;
}

export function getDocumentSystemPrompt(language: string): string {
  return `You are Trij, an AI assistant that analyzes medical documents.
You extract key information from lab reports, prescriptions, and referral letters.

Respond with valid JSON only:
{
  "document_type": "lab_report | prescription | referral | other",
  "key_findings": [{"parameter": "string", "value": "string", "is_abnormal": boolean}],
  "summary": "string",
  "plain_language_explanation": "string",
  "abnormal_flags": ["string"],
  "recommendation": "string"
}

Respond in ${language}.`;
}
```

### Step 9: Handling Model Availability (Critical)

Gemma 4 E2B may not have a WebLLM package at the time of building. Implement a **fallback strategy**:

1. **Primary**: WebLLM with Gemma 4 E2B loaded in-browser
2. **Fallback A**: If WebGPU unavailable, use Ollama bridge (CHW runs Ollama locally, app connects via `localhost:11434`)
3. **Fallback B**: If no local model possible at all, use Supabase Edge Function with Gemma 4 via Google AI Studio API — **but only as last resort**, and with explicit user consent about data leaving device

Detection logic in `useGemma.ts`:

```typescript
export async function getEngine(): Promise<InferenceEngine> {
  if (await supportsWebGPU()) {
    return new WebLLMEngine();
  }
  if (await detectOllama()) {
    return new OllamaBridgeEngine();
  }
  // Fall back only with user consent
  return new CloudFallbackEngine();
}
```

### Step 10: Submit to Hackathon

Per hackathon rules, you need:

1. **Working demo** — Deploy frontend to Netlify (`npm run build && npx netlify deploy --prod`)
2. **Public GitHub repo** — Include this entire project with clear README
3. **Technical writeup** — In `TECHNICAL_WRITEUP.md` (see template below)
4. **Video demo** — 2-3 minute YouTube video showing: app install, offline triage flow, voice interaction, sync

Create a `TECHNICAL_WRITEUP.md` with:

- Problem statement (CHWs in remote areas lack triage support)
- Solution overview (Trij uses Gemma 4 on-device)
- Architecture diagram
- How Gemma 4 is used (vision, function calling, multilingual)
- Which model variant and why (E2B for edge deployment)
- Privacy considerations (all inference local, no cloud AI)
- Challenges faced (WebGPU availability, model quantization)
- Links to demo, repo, video

---

## Key Design Decisions

| Decision                 | Rationale                                                     |
| ------------------------ | ------------------------------------------------------------- |
| PWA over native app      | No app store needed; instant updates; works on any smartphone |
| WebLLM over API          | Privacy; offline capability; zero inference cost              |
| Zustand over Redux       | Minimal boilerplate; works with async Dexie well              |
| Dexie over raw IndexedDB | Clean API; indexing; versioning                               |
| Supabase RLS             | Health data HIPAA patterns; per-CHW data isolation            |
| Leaflet over Mapbox      | Free tier; offline tile caching possible                      |

---

## Acceptance Criteria

- [ ] CHW can register with supervisor code (online)
- [ ] CHW can log in with PIN (offline)
- [ ] CHW can take a photo of a wound
- [ ] AI returns triage assessment with confidence score (offline)
- [ ] Assessment displayed with urgency badge and recommendations
- [ ] Voice assistant works in 5+ languages
- [ ] Patient records created and viewed offline
- [ ] Records sync to Supabase when connectivity returns
- [ ] Supervisor dashboard shows region analytics
- [ ] Referral slip generated and shareable
- [ ] App installable as PWA on Android/iOS
- [ ] All patient data stays on-device for AI inference
- [ ] App works with < 10s inference time on target device

---

## Testing

```bash
# Unit tests
npx vitest run

# E2E tests (requires app running)
npx playwright test

# Coverage
npx vitest run --coverage
```

---

## Deployment

```bash
# Frontend (Netlify)
npm run build
npx netlify deploy --prod

# Supabase migrations
npx supabase db push

# Edge Functions
npx supabase functions deploy sync-assessments
```

---

_This prompt is the complete specification for building Trij. Use it with any AI coding agent or as a manual development guide. Deadline for the Gemma 4 Good Hackathon is May 18, 2026._
