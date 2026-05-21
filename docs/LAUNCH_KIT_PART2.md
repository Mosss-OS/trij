# Trij Launch Kit — Part 2: Content & Reference

**Links to include in every post:**
- Website: https://trij.vercel.app
- GitHub: https://github.com/Mosss-OS/trij
- X (Twitter): https://x.com/Trij_app
- Email: triij.app@gmail.com

---

## Dev.to

**URL:** https://dev.to/new

**Title:** Building an Offline-First AI Medical Triage App That Runs 100% On-Device

**Tags:** react, webassembly, healthcare, opensource, ai

**Body:**

![Trij logo](https://res.cloudinary.com/dv0tt80vn/image/upload/v1778960068/Trij_l7tyxj.png)

## The Problem

Community health workers (CHWs) in remote areas face a brutal choice when they encounter a patient with a concerning wound or rash: send a photo to a distant doctor and wait days for a reply, or make a decision with limited training and no specialist backup.

1 billion people live in areas with fewer than 1 physician per 10,000. Smartphone penetration in these regions is surprisingly high (often >60%), but reliable internet is scarce. Cloud-dependent AI tools simply don't work here.

Trij solves this: a progressive web app that runs Google DeepMind's Gemma 4 entirely on-device, delivering AI-assisted triage in under 10 seconds — no internet required, no patient data ever leaves the phone.

## Technical Architecture

### The Inference Stack

The core challenge was running a meaningful LLM in the browser. We chose WebLLM with WebGPU as the primary path, with two fallbacks:

```
Auto-detect: WebGPU available? → WebLLM (Gemma 4 E2B, ~1.5B params, quantized)
            Ollama running locally? → Ollama API
            Neither? → Demo mode (mock data, no real model)
```

WebLLM loads the Gemma 4 model into the browser's GPU via WebGPU. The first load takes ~30 seconds to download and compile ~1.5GB of model weights (cached for subsequent visits). Subsequent inferences complete in under 10 seconds on devices with 4GB+ RAM.

### Offline-First Storage

All patient data is stored in IndexedDB via Dexie.js. The schema:

```typescript
// Patients
interface Patient {
  id: string;
  chwUserId: string;
  identifier: string;
  ageYears?: number;
  sex: 'M' | 'F' | 'other';
  locationLat?: number;
  locationLng?: number;
  createdAt: string;
  updatedAt: string;
}

// Assessments
interface Assessment {
  id: string;
  patientId: string;
  images: string[]; // base64 locally, URLs when synced
  condition: string;
  confidence: number;
  urgency: 'green' | 'yellow' | 'red';
  possibleConditions: Array<{ name: string; probability: number }>;
  recommendation: string;
  referralStatus: 'none' | 'pending' | 'active' | 'resolved';
  language: string;
  createdAt: string;
}
```

A background sync engine processes a queue when connectivity returns, uploading records to Supabase with last-write-wins conflict resolution.

### Voice-Guided Assessments

Using the Web Speech API for both synthesis and recognition, the app supports 7 languages. The voice flow is a dynamic conversation tree:

```
1. "Who is the patient? Say the ID number."
2. Patient responds → parsed for identifier
3. "Frame the affected area in the camera."
4. Photo captured → analyzed
5. "The assessment shows [condition] with [confidence]% confidence."
6. Dynamic follow-ups based on the result
```

The conversation state is persistable — if the CHW is interrupted, they can resume where they left off.

### Medical Document Analysis

The same Gemma 4 model handles document analysis through carefully crafted prompts. The system prompt instructs the model to:

1. Extract structured findings from lab reports
2. Highlight abnormal values
3. Generate plain-language explanations
4. Classify the document type (lab report, prescription, referral letter)

## Key Challenges & Solutions

### Challenge 1: Model Loading Time

The 1.5GB model download on first visit is painful. We show a progress bar with percentage and estimated time, and cache aggressively via the service worker. On subsequent visits, the model loads from cache in ~5 seconds.

### Challenge 2: WebGPU Availability

WebGPU is currently Chrome-only on desktop and Android. We detect availability upfront and show a clear message if it's not available, guiding users to Ollama or demo mode.

### Challenge 3: Voice Recognition Accuracy

Speech recognition in rural environments (noisy, varying accents) is unreliable. We implemented a hybrid approach: voice input plus a text fallback. Users can speak or type answers.

### Challenge 4: Hallucination Risk

Like all LLMs, Gemma 4 can hallucinate. Every assessment includes:
- A confidence score (0-100%)
- Differential diagnoses with probability breakdown
- An auto-suggestion to refer when confidence < 70%
- A prominent medical disclaimer

## The Stack

- **Frontend:** React 19, TanStack Start (SSR), Vite
- **AI:** WebLLM + WebGPU (Gemma 4 E2B), Ollama fallback
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Offline Storage:** Dexie.js (IndexedDB)
- **Voice:** Web Speech API
- **Backend:** Supabase (Auth, PostgreSQL, Storage, RLS)
- **PWA:** vite-plugin-pwa (installable on Android/iOS)
- **PDF Generation:** jsPDF + qrcode

## Try It

The app is live and free to use:

🔗 **https://trij.vercel.app**

No account needed — you can use demo mode immediately.

## Open Source

Trij is Apache 2.0. Contributions welcome:

🐙 **https://github.com/Mosss-OS/trij**

We need help with:
- Additional language packs
- UI/UX polish
- Real-world testing
- Clinical validation
- Performance optimization

## What's Next

- Offline map tiles for the supervisor view
- PWA background sync for iOS
- More granular condition classification
- Integration with common health record systems

---

*Built for the Gemma 4 Good Hackathon (Kaggle x Google DeepMind). Track: Health & Sciences / Global Resilience.*

📧 triij.app@gmail.com
🐦 https://x.com/Trij_app

---

## Medium

**URL:** https://medium.com/new-story

Same content as Dev.to above, but add this opening line:

*Originally published on Dev.to — cross-posting for the Medium healthcare and AI community.*

---

## Google Search Console

**URL:** https://search.google.com/search-console/welcome

**What to submit:**
1. Add property: `https://trij.vercel.app`
2. Verification method: Add TXT record to Vercel domain settings (or upload HTML file)
3. Sitemap: `https://trij.vercel.app/sitemap.xml`

---

## GitHub Repository Settings

**Topics to add** (Settings → Topics):
```
medical-triage, community-health, offline-first, gemma, healthcare, pwa, open-source, ai-for-good, global-health, webllm, supabase, react, typescript, vite, webgpu
```

**Repository description:**
> Free, offline-first AI medical triage for community health workers. On-device wound, rash, and document assessment powered by Google DeepMind Gemma 4. No internet needed — patient data never leaves the device. Open-source (Apache 2.0).

**Website URL:**
> https://trij.vercel.app

---

## WHO / UNICEF Innovation Submissions

**Contacts & submission links:**

| Organization | Contact / Link | Notes |
|-------------|----------------|-------|
| **UNICEF Venture Fund** | venturefund@unicef.org | Apply at https://unicefventurefund.org. Invests up to $100K equity-free in open-source tech startups. Must be registered in a UNICEF programme country. |
| **WHO Innovation Hub** | https://who.int/teams/digital-health-and-innovation/who-innovation-hub | Apply via their website. Also check LEAD Innovation Challenge for "AI for All" calls. |
| **Digital Square (PATH)** | https://digitalsquare.org/global-goods | Submit as a "digital public good" for global health. |
| **Linux Foundation Public Health** | https://lfph.io | Host open-source health projects. Could host Trij under their foundation. |
| **Community Health Toolkit** | https://communityhealthtoolkit.org | Open-source toolkit by Medic. Explore integration or partnership. |

**Email template (for UNICEF Venture Fund / general outreach):**

```
Subject: Trij — Free Offline AI Medical Triage for Community Health Workers

Dear [Team Name],

I'm submitting Trij for consideration as a digital public good for community health.

Trij is a free, open-source (Apache 2.0), offline-first AI medical triage PWA designed for community health workers in low-connectivity settings. It uses Google DeepMind's Gemma 4 to assess wounds, rashes, skin conditions, and medical documents entirely on-device — no internet, no cloud, no patient data transfer.

Key features:
- On-device AI triage via WebGPU (Gemma 4 E2B)
- Works 100% offline
- Voice-guided assessments in 7 languages
- Medical document OCR + analysis
- Supervisor dashboard with maps and analytics
- Auto-generated referral PDFs
- Privacy-first: all inference local, encrypted sync

Stack: React 19, TanStack Start, WebLLM, Dexie.js, Web Speech API, Supabase

The app is live at https://trij.vercel.app
Source code: https://github.com/Mosss-OS/trij
Contact: triij.app@gmail.com

I'd be happy to provide more information or do a demo.

Best regards,
[Your Name]
```

---

## Hashtag Master List

Use these across all platforms (max 3-5 per post):

| Category | Hashtags |
|----------|----------|
| **Core** | #AIforGood #GlobalHealth #OpenSource |
| **Health** | #MedTech #DigitalHealth #PublicHealth #HealthEquity #CommunityHealth #HealthcareInnovation |
| **AI/Tech** | #Gemma4 #MachineLearning #WebGPU #OfflineFirst #PWA #ReactJS #WebAssembly |
| **Community** | #CHW #PrimaryCare #HealthForAll #NoOneLeftBehind |
| **Hackathon** | #GoogleDeepMind #Kaggle |

---

## Quick Links Reference

```
Website:   https://trij.vercel.app
GitHub:    https://github.com/Mosss-OS/trij
X/Twitter: https://x.com/Trij_app
Email:     triij.app@gmail.com
Product Hunt:   https://producthunt.com/posts/new
Hacker News:    https://news.ycombinator.com/submit
Dev.to:         https://dev.to/new
Medium:         https://medium.com/new-story
Google Console: https://search.google.com/search-console/welcome
```
