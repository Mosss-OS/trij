# Trij — On-device AI medical triage for community health workers

[![Gemma 4 Good Hackathon](https://img.shields.io/badge/Kaggle-Gemma_4_Good_Hackathon-20BEFF?logo=kaggle)](https://www.kaggle.com/competitions/gemma-4-good-hackathon)
[![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://github.com/Mosss-OS/trij/actions/workflows/ci.yml/badge.svg)](https://github.com/Mosss-OS/trij/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E)
![Gemma 4](https://img.shields.io/badge/Gemma_4-Google_DeepMind-4285F4)
![Offline First](https://img.shields.io/badge/Offline-First-success)
![200+ Tests](https://img.shields.io/badge/tests-200%2B-brightgreen)

**Trij** is an offline-first progressive web app that brings AI-assisted medical triage to **community health workers in remote areas**. Powered by **Google DeepMind's Gemma 4** — entirely on-device. No internet, no cloud costs, no patient data leaving the phone.

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

| Feature | Description |
|---------|-------------|
| **📸 Wound & rash triage** | Snap a photo, Gemma 4 analyzes it on-device — classification, urgency, management advice |
| **📄 Medical document scanner** | OCR + analysis of lab reports, prescriptions, referrals |
| **🎤 Voice-guided assessments** | Speak in 7 languages, get spoken responses — hands-free for CHWs |
| **📋 Patient records** | Create, view, and track patients offline with AES-GCM encrypted storage |
| **🏷️ Urgency triage** | Green (routine), Yellow (soon), Red (urgent) — with AI explainability heatmaps |
| **📎 Referral PDFs** | Auto-generated referral slips for clinic handoff |
| **🔄 Offline-first sync** | All data stored in IndexedDB, syncs to Supabase when online |
| **🌍 Multilingual** | 7 languages with certification system — English (Certified), 6 more in review |
| **🔒 Privacy-first** | All AI runs on-device. No cloud AI API. No images uploaded. |
| **📱 Patient QR sharing** | Encrypted health card via QR code — scan, view, verify chain |
| **🏥 Async telemedicine** | Request specialist consultation — queues offline, syncs when online |
| **🩺 Clinician dashboard** | Dedicated interface for clinicians to review and respond to consultations |
| **🧠 AI explainability** | Saliency heatmaps show what the model focused on — bounding-box overlays |
| **📷 Image quality validation** | Blur, exposure, and resolution checks before AI analysis — with low-light preprocessing |
| **🏪 Facility lookup** | 19 hospitals across 6 regions with Haversine distance-based nearest facility finder |
| **🧪 200+ unit tests** | Vital signs, maternal health, nutrition, red flags, outbreak detection, WHO standards |

---

## Tech stack

| Layer        | Technology                                    |
| ------------ | --------------------------------------------- |
| **Frontend** | Vite + TanStack Start + React 19 + TypeScript |
| **AI**       | WebLLM (WebGPU) + Ollama bridge               |
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

| Option     | Setup                    | Notes                                |
| ---------- | ------------------------ | ------------------------------------ |
| **Ollama** | `ollama pull gemma4`     | Best real-model experience on laptop |
| **WebLLM** | Requires Chrome + WebGPU | Loads ~1.5GB model on first triage   |

For Ollama:

```bash
ollama pull gemma4
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
├── routes/
│   ├── index.tsx                          # Login / sign-up
│   ├── _app.tsx                           # Auth layout
│   ├── _app.dashboard.tsx                 # Main dashboard
│   ├── _app.triage.tsx                    # Camera → AI → result
│   ├── _app.document.tsx                  # Document scanner
│   ├── _app.patients.index.tsx            # Patient list
│   ├── _app.patients.$patientId.tsx       # Patient record
│   ├── _app.patient.record.tsx            # Patient health card
│   ├── _app.patient.scan.tsx             # QR scanner
│   ├── _app.consultations.tsx            # Consultations list
│   ├── _app.clinician.consultations.tsx  # Clinician dashboard
│   ├── _app.clinician.consultations.$id.tsx  # Respond to consultation
│   ├── _app.supervisor.tsx               # Supervisor view
│   └── _app.settings.tsx                 # Settings
├── components/                          # Reusable UI components
│   ├── SaliencyOverlay.tsx              # AI explainability heatmap
│   └── ...
├── lib/                                 # Core logic
│   ├── gemma.ts                         # WebLLM + Ollama engines
│   ├── gemma-prompt.ts                  # System prompts for Gemma 4
│   ├── db.ts                            # Dexie IndexedDB schema (v10)
│   ├── sync.ts                          # Background sync engine
│   ├── voice.ts                         # Speech I/O
│   ├── referral.ts                      # PDF generation
│   ├── image-quality.ts                 # Blur/exposure/resolution checks
│   ├── image-processing.ts              # CLAHE, denoise, gamma correction
│   ├── memory-manager.ts               # WebGPU memory pressure handling
│   ├── facilities.ts                    # 19-hospital facility database
│   ├── i18n.ts                          # 7-language translation system
│   ├── vital-signs.ts                   # Vital signs assessment
│   ├── maternal.ts                      # Maternal health indicators
│   ├── nutrition.ts                     # Nutrition assessment
│   ├── red-flags.ts                     # Critical red flag detection
│   ├── outbreak-flags.ts               # Outbreak pattern detection
│   ├── who-standards.ts                # WHO guideline compliance
│   └── patient-records.ts              # AES-GCM encrypted records
├── hooks/
│   ├── useGemma.ts                     # Model lifecycle hook
│   └── useOnlineStatus.ts
├── stores/                             # Zustand state
└── types/
```

---

## Async Telemedicine & Clinician Dashboard

Trij supports **asynchronous consultation requests** — CHWs can request specialist review of a triage case, and clinicians respond via a dedicated dashboard.

- **Consultation request**: From patient record → "Request Consultation" — includes triage images, AI assessment, and CHW notes
- **Offline queuing**: Requests queue in IndexedDB when offline, sync automatically when connectivity returns
- **Clinician dashboard**: `/clinician/consultations` lists all open cases; click through to review AI assessment, add diagnosis and management plan
- **Polling**: Clinicians poll every 30s for new requests; CHWs poll for responses
- **Supabase RLS**: Clinicians authenticated via `role = 'admin'` in Supabase Auth

---

## Datasets & Bias Audit

Trij includes a **Fitzpatrick skin tone bias audit pipeline** to evaluate model performance across skin tones — essential before deploying any dermatology AI in diverse populations.

| Dataset | Images | FST Labels | Source | Status |
|---------|--------|------------|--------|--------|
| **MSKCC Skin Tone** | 4,872 | Yes (I–VI) | ISIC Archive (CC-BY) | ✅ Downloaded |
| **SCIN** (Google) | 5,032 | Yes (4,979) | Google Research | ✅ Extracted |
| **Fitzpatrick17k** | 16,577 (CSV) | Yes (Scale/Centaur) | Groh et al. | ✅ Metadata, ❌ Images dead |
| **DDI** | — | — | Stanford AIMI | ❌ Manual request |
| **DDI-2** | — | — | Daneshjou Lab | ❌ Manual request |

**Audit result (simulated on 4,872 MSKCC images): 🔴 RED — 12.8% accuracy gap** between FST I–II (83.0%) and FST V–VI (70.2%). Real model inference blocked pending GPU-equipped machine.

See [`BIAS_AUDIT.md`](./BIAS_AUDIT.md) and [`docs/bias-audit/`](./docs/bias-audit/) for full pipeline, methodology, and results.

---

## Clinical Validation

Clinical validation framework available at [`docs/clinical-validation/`](./docs/clinical-validation/):
- **Partner outreach plan** — target NGOs, ministries of health, CHW training organizations
- **IRB protocol template** — ready for institutional ethics board submission
- **One-pager** — for partner engagement and stakeholder briefings

Target: Real-world pilot studies in Q3 2026.

---

## References & Citations

The bias audit uses publicly available datasets. See [`docs/bias-audit/README.md`](./docs/bias-audit/README.md) for full citation details. The combined audit dataset is available on [Hugging Face](https://huggingface.co/datasets/Mosss-os/trij-bias-audit-dataset).

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
> What we understand that competitors don't: **On-device AI + open-source + offline-first is the only combination that works at scale for community health in low-resource settings.** Cloud-dependent tools fail where connectivity is unreliable. Closed-source tools can't be localized or verified. Rule-based tools can't analyze images or voice. Trij combines all three capabilities — image assessment, voice guidance, document OCR — in a single free, open-source PWA that runs on any modern smartphone with or without internet.

**What's your revenue and/or growth rate?**
> Currently pre-revenue. The app is free and open-source (Apache 2.0). Built for the Gemma 4 Good Hackathon and launched publicly on Product Hunt. Early traction includes organic interest from global health NGOs, CHW training programs, and digital health communities. Revenue model under exploration: premium deployment support for NGOs/governments, API access for health system integration, and managed hosting for institutions. Core triage functionality will remain free and open-source.

**Anything else you would like investors to know?**
> We're looking for more than capital — we need strategic partners who can open doors to pilot programs with ministries of health, NGO networks, and CHW training organizations. The technical foundation is solid (React 19, TanStack Start, WebLLM + WebGPU, Dexie.js, Supabase) and the app is fully functional. The next critical steps are: (1) clinical validation studies with real CHWs, (2) expansion to additional languages and regions, (3) integration with national health record systems. If you have networks in global health or digital public goods, we should talk.

---

_Built with ❤️ for the Gemma 4 Good Hackathon._
