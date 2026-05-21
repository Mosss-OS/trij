# Trij — On-device AI medical triage for community health workers

[![Gemma 4 Good Hackathon](https://img.shields.io/badge/Kaggle-Gemma_4_Good_Hackathon-20BEFF?logo=kaggle)](https://www.kaggle.com/competitions/gemma-4-good-hackathon)
[![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/Mosss-OS/trij/actions/workflows/ci.yml/badge.svg)](https://github.com/Mosss-OS/trij/actions/workflows/ci.yml)
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

> **Tip:** Add a 30s screen recording GIF here showing the triage flow (camera → analysis → result → save). Videos/photos of the app in action dramatically increase engagement on GitHub.

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

| Layer        | Technology                                    |
| ------------ | --------------------------------------------- |
| **Frontend** | Vite + TanStack Start + React 19 + TypeScript |
| **AI**       | WebLLM (WebGPU) + Ollama bridge + Demo mode   |
| **Styling**  | Tailwind CSS v4 + shadcn/ui                   |
| **Offline**  | Dexie.js (IndexedDB) + background sync        |
| **Backend**  | Supabase (Auth, Postgres, Storage, RLS)       |
| **Voice**    | Web Speech API (7 languages)                  |
| **PWA**      | vite-plugin-pwa (installable on Android/iOS)  |

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

| Option        | Setup                    | Notes                                |
| ------------- | ------------------------ | ------------------------------------ |
| **Demo mode** | Nothing to do            | App works immediately with mock data |
| **Ollama**    | `ollama pull gemma4`     | Best real-model experience on laptop |
| **WebLLM**    | Requires Chrome + WebGPU | Loads ~1.5GB model on first triage   |

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

### Alternative: Docker (full stack)

```bash
cp .env.docker .env
docker compose up
```

This starts the app (hot-reload), Ollama with Gemma 4, and a local Supabase stack.  
Open http://localhost:5173.

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

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, code conventions, and pull request process.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

## For investors

Trij is actively looking for mission-aligned investors to scale impact.

**Why Trij?** 1 billion people lack access to a physician within a 2-hour travel radius. Smartphone penetration in these regions is >60%, but reliable internet is rare. Trij is the only open-source, offline-first AI triage app that runs completely on-device — no internet, no cloud costs, no patient data leaving the phone.

**Ask:** We're looking for seed funding to support real-world pilots, clinical validation studies, and language expansion across Sub-Saharan Africa and South Asia.

**Contact:** triij.app@gmail.com · [x.com/Trij_app](https://x.com/Trij_app)

---

**Product Hunt investor answers:**

**Why are you the right founder/team to work on this?**
> Solo founder with 8+ years building production web applications and AI systems at scale. Deep understanding of both the technical stack (WebGPU, LLM inference optimization, offline-first architecture, PWA) and the deployment constraints of low-resource settings. Chose on-device inference over cloud APIs because I've seen firsthand that connectivity assumptions baked into most healthtech products fail in the field. This isn't a prototype — it's a working, deployed PWA with real medical AI inference happening entirely in-browser.

**Why did you pick this idea to work on?**
> Because existing telemedicine and AI triage tools require internet, cloud access, or expensive subscriptions — making them useless for the community health workers who need them most. I wanted to prove that on-device Gemma 4 could deliver clinically useful triage on a $100 Android phone with zero connectivity. The Kaggle x Google DeepMind "Gemma 4 Good" Hackathon was the perfect catalyst. Every architectural decision — WebGPU inference, IndexedDB storage, Web Speech API for voice — was driven by the constraint of working without internet.

**Who are your competitors, and what do you understand about this idea that they don't?**
> - **Cloud telemedicine platforms** (Babylon, Ada Health, K Health) — require constant internet, charge per consult, not designed for CHWs in remote villages.
> - **Rule-based digital IMCI tools** — no image analysis, no voice, no document OCR. Limited to decision-tree algorithms.
> - **Closed-source on-device AI apps** — can't be audited, customized, or extended by the communities they serve.
>
> What we understand that competitors don't: **On-devide AI + open-source + offline-first is the only combination that works at scale for community health in low-resource settings.** Cloud-dependent tools fail where connectivity is unreliable. Closed-source tools can't be localized or verified. Rule-based tools can't analyze images or voice. Trij combines all three capabilities — image assessment, voice guidance, document OCR — in a single free, open-source PWA that runs on any modern smartphone with or without internet.

**What's your revenue and/or growth rate?**
> Currently pre-revenue. The app is free and open-source (Apache 2.0). Built for the Gemma 4 Good Hackathon and launched publicly on Product Hunt. Early traction includes organic interest from global health NGOs, CHW training programs, and digital health communities. Revenue model under exploration: premium deployment support for NGOs/governments, API access for health system integration, and managed hosting for institutions. Core triage functionality will remain free and open-source.

**Anything else you would like investors to know?**
> We're looking for more than capital — we need strategic partners who can open doors to pilot programs with ministries of health, NGO networks, and CHW training organizations. The technical foundation is solid (React 19, TanStack Start, WebLLM + WebGPU, Dexie.js, Supabase) and the app is fully functional. The next critical steps are: (1) clinical validation studies with real CHWs, (2) expansion to additional languages and regions, (3) integration with national health record systems. If you have networks in global health or digital public goods, we should talk.

---

_Built with ❤️ for the Gemma 4 Good Hackathon._
