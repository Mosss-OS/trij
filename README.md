# Trij — On-device AI medical triage for community health workers

[![Gemma 4 Good Hackathon](https://img.shields.io/badge/Kaggle-Gemma_4_Good_Hackathon-20BEFF?logo=kaggle)](https://www.kaggle.com/competitions/gemma-4-good-hackathon)
[![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E)
![Gemma 4](https://img.shields.io/badge/Gemma_4-Google_DeepMind-4285F4)

**Trij** is an offline-first progressive web app that brings AI-assisted medical triage to **community health workers in remote areas**. Powered by **Google DeepMind's Gemma 4** models — entirely on-device.

Built for the **Gemma 4 Good Hackathon** (Kaggle + Google DeepMind, $200K prize pool).  
**Track:** Health & Sciences / Global Resilience.

---

## Quick demo

```
Take a photo → AI assesses → Get urgency + recommendation → Save offline → Auto-sync
```

No internet needed. No patient data leaves the device.

---

## Features

- **📸 Wound & rash triage** — Snap a photo, Gemma 4 analyzes it on-device
- **📄 Medical document scanner** — OCR + analysis of lab reports, prescriptions
- **🎤 Voice-guided assessments** — Speak in your language, get spoken responses
- **📋 Patient records** — Create, view, and track patients offline
- **🏷️ Urgency triage** — Green (routine), Yellow (soon), Red (urgent)
- **📎 Referral PDFs** — Auto-generated referral slips for clinic handoff
- **🔄 Offline-first sync** — All data stored locally, syncs when online
- **🌍 Multilingual** — English, Spanish, French, Swahili, Hindi, Arabic, Portuguese
- **🔒 Privacy-first** — All AI runs on-device. No cloud AI API.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + TanStack Start + React 19 + TypeScript |
| **AI** | WebLLM (WebGPU) + Ollama bridge + Demo mode |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **Offline** | Dexie.js (IndexedDB) + background sync |
| **Backend** | Supabase (Auth, Postgres, Storage, RLS) |
| **Voice** | Web Speech API (7 languages) |
| **PWA** | vite-plugin-pwa (installable on Android/iOS) |

---

## Getting started

### Prerequisites

- Node.js 22+
- Bun (recommended) or npm
- A Supabase account (free tier)
- (Optional) [Ollama](https://ollama.com) for local Gemma 4 inference

### 1. Clone and install

```bash
git clone https://github.com/Mosss-OS/trij.git
cd trij
bun install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env` and fill in your Supabase credentials
3. Run migrations:

```bash
npx supabase db push
```

### 3. Set up Gemma 4 (choose one)

| Option | Setup | Notes |
|---|---|---|
| **Demo mode** | Nothing to do | App works immediately with mock data |
| **Ollama** | `ollama pull gemma4` | Best real-model experience on laptop |
| **WebLLM** | Requires Chrome + WebGPU | Loads ~1.5GB model on first triage |

For Ollama:
```bash
ollama pull gemma4
# Or download from Kaggle: scripts/download-gemma4.sh
```

### 4. Run

```bash
bun run dev
```

Open http://localhost:5173 — sign up, and you're ready.

---

## Project structure

```
src/
├── routes/          # TanStack file routes
│   ├── index.tsx    # Login / sign-up
│   ├── _app.tsx     # Auth layout
│   ├── _app.dashboard.tsx
│   ├── _app.triage.tsx        # Camera → AI → result
│   ├── _app.document.tsx      # Document scanner
│   ├── _app.patients.index.tsx
│   ├── _app.patients.$patientId.tsx
│   ├── _app.supervisor.tsx
│   └── _app.settings.tsx
├── components/      # Reusable UI components
├── lib/             # Core logic
│   ├── gemma.ts         # WebLLM + Ollama + demo engines
│   ├── gemma-prompt.ts  # System prompts for Gemma 4
│   ├── db.ts            # Dexie IndexedDB schema
│   ├── sync.ts          # Background sync engine
│   ├── voice.ts         # Speech I/O
│   └── referral.ts      # PDF generation
├── hooks/
│   ├── useGemma.ts      # Model lifecycle hook
│   └── useOnlineStatus.ts
├── stores/          # Zustand state
└── types/
```

---

## Hackathon submission

- **Technical writeup**: [TECHNICAL_WRITEUP.md](./TECHNICAL_WRITEUP.md)
- **SRS**: [SRS.md](./SRS.md)
- **Development prompt**: [DEVELOPMENT_PROMPT.md](./DEVELOPMENT_PROMPT.md)
- **Model setup**: [scripts/download-gemma4.sh](./scripts/download-gemma4.sh)

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

*Built with ❤️ for the Gemma 4 Good Hackathon.*
