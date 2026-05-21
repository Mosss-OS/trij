# Trij Launch Kit — Full Platform Content

**Links to include in every post:**
- Website: https://trij.vercel.app
- GitHub: https://github.com/Mosss-OS/trij
- X (Twitter): https://x.com/Trij_app
- Email: triij.app@gmail.com

---

## Product Hunt

**URL to post:** https://producthunt.com/posts/new

**Title:** Trij — Free AI medical triage for community health workers. Works offline.

**Tagline:** On-device wound, rash, and document assessment powered by Google DeepMind Gemma 4 — no internet, no cloud, no patient data ever leaves the phone.

**Description:**

Trij is a free, open-source, offline-first progressive web app that brings AI-assisted medical triage to community health workers in remote areas.

**How it works:**
1. 📸 Snap a photo of a wound, rash, skin condition, or lab report
2. 🧠 Gemma 4 AI analyzes it on-device via WebGPU — no upload, no waiting
3. 🟢🟡🔟 Get urgency level, confidence score, and treatment recommendation
4. 🎤 Voice-guided follow-ups in 7 languages
5. 📄 Generate referral PDFs with QR codes
6. 🔄 Everything syncs to the supervisor dashboard when you're back online

**Why Trij:**
- 100% offline — works in villages with zero connectivity
- All AI runs on-device — patient data never leaves the phone
- Privacy-first — HIPAA-conscious design patterns
- Open-source — Apache 2.0, free forever
- Built with Google DeepMind's Gemma 4 for the Kaggle Gemma 4 Good Hackathon

**Tech:** React 19, TanStack Start, Vite, WebLLM + WebGPU, Dexie.js (IndexedDB), Web Speech API, Supabase

**First Comment (post right after launch):**

> Built this solo for the Kaggle x Google DeepMind "Gemma 4 Good" Hackathon. The core idea was simple: community health workers in remote areas shouldn't need internet to get AI-assisted triage. Every decision — WebGPU for on-device inference, Dexie.js for offline storage, Web Speech API for voice — was driven by that constraint.
>
> Key numbers:
> - ~1.5GB Gemma 4 E2B model runs entirely in-browser
> - <10s inference time on devices with 4GB+ RAM
> - 7 languages supported at launch
> - 10,000 patients per deployment instance
>
> Fully open-source, contributions very welcome.
>
> 🔗 https://trij.vercel.app
> 🐙 https://github.com/Mosss-OS/trij
> 🐦 https://x.com/Trij_app

**Shoutouts (3 spots):**

These shoutouts tag related products/tools on Product Hunt. Choose ones that are already on PH and relevant to Trij's stack.

| # | Shoutout | Why |
|---|----------|-----|
| 1 | **Supabase** — https://producthunt.com/products/supabase | Core backend — auth, database, storage, RLS. Strong PH presence, big community. |
| 2 | **Gemma 4 by Google DeepMind** — https://producthunt.com/posts/gemma-4 | The AI model powering everything. Google DeepMind is a major brand on PH. |
| 3 | **Vercel** — https://producthunt.com/products/vercel | Deployment platform. React/Next.js community is massive on PH. |

Alternatively, if Gemma 4 doesn't have a PH page, replace with:
- **WebLLM** — https://producthunt.com/posts/webllm (MLC AI's in-browser LLM engine)
- **Ollama** — https://producthunt.com/posts/ollama-3 (local LLM runner — great dev audience)

**Tags:** Health, AI, Open Source, Medical, PWA

**Hashtags:** #AIforGood #GlobalHealth #OpenSource #MedTech #DigitalHealth #Gemma4 #OfflineFirst #CommunityHealth

---

## Hacker News (Show HN)

**URL to post:** https://news.ycombinator.com/submit

**Title:** Show HN: Trij – Offline-first AI medical triage that runs 100% on-device

**First comment (post immediately after submitting):**

> Hi HN — I built Trij for the Gemma 4 Good Hackathon (Kaggle x Google DeepMind). It's a PWA that lets community health workers in remote areas assess wounds, rashes, and medical documents using on-device AI. No internet required, no patient data leaves the phone.
>
> **Technical architecture:**
> - **Inference:** WebLLM loads Gemma 4 E2B (~1.5B params, quantized) via WebGPU. Falls back to Ollama (local server) or demo mode if WebGPU isn't available.
> - **Storage:** Dexie.js on top of IndexedDB. All patient records and assessments stored locally. Background sync to Supabase when connectivity returns.
> - **Voice:** Web Speech API for both synthesis and recognition. Supports 7 languages. Voice-guided mode reads each step aloud and listens for spoken answers.
> - **Document analysis:** Same Gemma 4 model handles OCR + structured extraction for lab reports and prescriptions.
> - **Sync:** Custom queue with last-write-wins conflict resolution. Exponential backoff retry.
>
> **What I'd do differently:**
> - WebLLM model loading is slow on first visit (~30s for 1.5GB). A service worker preload would help.
> - The voice conversation flow needs more testing with actual CHWs in noisy environments.
> - I'd love to add offline map tiles for the supervisor view.
>
> **Stack:** React 19, TanStack Start (SSR), Vite, Tailwind v4, shadcn/ui, Dexie.js, Web Speech API, Supabase
>
> 🔗 https://trij.vercel.app
> 🐙 https://github.com/Mosss-OS/trij
> 🐦 https://x.com/Trij_app

**Hashtags to use in comments:** None on HN (no hashtags). Just plain text.

---

## Reddit

### r/opensource

**URL:** https://www.reddit.com/r/opensource/submit

**Title:** I built a free, open-source AI medical triage app that works completely offline — no cloud, no patient data transfer

**Body:**

Hey r/opensource,

I built Trij, a free and open-source AI medical triage PWA for community health workers in remote areas. It runs Google DeepMind's Gemma 4 entirely on-device — no internet, no cloud, no data leaving the phone.

**What it does:**
A community health worker can snap a photo of a wound, rash, skin condition, or lab report, and within seconds get:
- A condition classification
- Urgency level (Green = routine, Yellow = soon, Red = urgent)
- Confidence score (0-100%)
- Treatment recommendation
- Voice-guided follow-up questions

Everything runs on-device through WebGPU. When there's no internet (which is the norm in many rural clinics), it works exactly the same. When connectivity returns, records sync to a Supabase backend for supervisor review.

**Why open source?**
Healthcare tools in low-resource settings should be free, auditable, and customizable by the communities they serve. Trij is Apache 2.0.

**Stack:** React 19, TanStack Start, Vite, WebLLM + WebGPU, Dexie.js (IndexedDB), Web Speech API, Supabase

**Contributions welcome:** Bug fixes, UI improvements, language packs, real-world testing feedback — all of it helps.

🔗 https://trij.vercel.app
🐙 https://github.com/Mosss-OS/trij
🐦 https://x.com/Trij_app
📧 triij.app@gmail.com

**Tags/Flair:** Open Source Software, Health, AI

**Hashtags:** #OpenSource #AIforGood #GlobalHealth #MedTech #Healthcare

---

### r/medicine

**URL:** https://www.reddit.com/r/medicine/submit

**⚠️ Before posting:** You MUST set your user flair first or AutoMod will remove your post. On desktop, go to the r/medicine sidebar → "Community Options" → "User Flair Preview" → set a flair describing your role (e.g., "Solo Dev" or "Software Engineer"). On mobile (iOS), go to the subreddit main page → tap the three dots in the top-right → "Change user flair."

**Title:** I'm a solo dev who built a free offline AI triage tool for community health workers — looking for clinical feedback

**Body:**

Hi r/medicine,

I'm a software developer (not a clinician) who built a free, open-source AI triage app designed for community health workers in remote areas. Before you tear it apart — I genuinely want clinical feedback to make it better.

**The app:** Trij is a PWA that uses Google DeepMind's Gemma 4 (running on-device via WebGPU) to assess wounds, rashes, skin conditions, and medical documents. It works completely offline — no internet needed at the point of care.

**The workflow:**
1. CHW captures a photo of the affected area or document
2. AI analyzes locally and returns: condition, urgency (Green/Yellow/Red), confidence score, recommendation
3. Voice-guided follow-up questions in 7 languages
4. Assessment is saved locally and syncs to a supervisor dashboard when online
5. Referral PDFs can be generated and shared

**My concerns / what I need feedback on:**
- The urgency classification is based on visual features alone — no vitals, no history (except what the voice follow-up captures). Is this useful at all, or dangerously incomplete?
- Confidence threshold: currently auto-suggests referral below 70%. Does that seem right?
- The model sometimes hallucinates rare conditions. I've added differential lists with probabilities, but I'm not sure how helpful that is without clinical training.
- Liability: There's a disclaimer that this is not a diagnostic tool, just triage support. Is that sufficient?

It's completely free, open-source (Apache 2.0), no accounts needed for demo mode.

🔗 https://trij.vercel.app
🐙 https://github.com/Mosss-OS/trij
📧 triij.app@gmail.com (happy to take feedback privately too)

**Flair:** Advice, Clinical

**Hashtags:** #MedTech #AIinMedicine #GlobalHealth #Triage #CommunityHealth

---

### r/globalhealth

**URL:** https://www.reddit.com/r/globalhealth/submit

**Title:** Free offline AI triage tool for CHWs — looking for pilot partners in underserved regions

**Body:**

Hi r/globalhealth,

I've built a free, open-source AI medical triage PWA called Trij, designed specifically for community health workers operating in low-connectivity environments.

**The problem it solves:**
CHWs in remote areas often have to make triage decisions with limited training and no specialist backup. Sending photos to a distant doctor can take days. Trij puts AI-assisted triage in their pocket — completely offline.

**Key features:**
- On-device wound/rash/skin assessment via Gemma 4 (Google DeepMind)
- Medical document OCR (lab reports, prescriptions)
- Voice-guided assessments in 7 languages (English, French, Swahili, Hindi, Arabic, Portuguese, Spanish)
- Auto-generated referral PDFs with QR codes
- Supervisor dashboard with map view and analytics
- All data stays on-device until explicit sync (privacy-first)

**Technical:**
- Progressive Web App — no app store install needed, works on any modern smartphone
- AI runs on-device via WebGPU — zero cloud inference costs
- Offline storage via IndexedDB — full functionality without internet
- Background sync to Supabase when connectivity returns
- Open-source under Apache 2.0

**What I'm looking for:**
- Pilot partners — NGOs, community health programs, or clinics willing to test this in the field
- Clinical advisors who can help validate the triage outputs
- Translators for additional languages

🔗 https://trij.vercel.app
🐙 https://github.com/Mosss-OS/trij
🐦 https://x.com/Trij_app
📧 triij.app@gmail.com

**Flair:** Digital Health, Technology, Innovation

**Hashtags:** #GlobalHealth #DigitalHealth #CHW #CommunityHealth #AIforGood #HealthEquity #OpenSource

---

### r/publichealth

**URL:** https://www.reddit.com/r/publichealth/submit

**Title:** Free open-source AI triage app for CHWs — privacy-first, offline-first, built for low-resource settings

**Body:**

Cross-posting from r/globalhealth — thought this community might also find it relevant.

I built Trij, a free offline-first AI triage PWA for community health workers. It runs Google DeepMind's Gemma 4 entirely on-device. No internet. No cloud. No patient data leaving the phone.

**Why this matters for public health:**
- Many low- and middle-income countries have <1 physician per 10,000 people in rural areas
- CHWs are often the first and only point of care
- Smartphone penetration in these regions is high (>60%), but reliable internet is scarce
- AI-assisted triage can help CHWs make more consistent urgency decisions

**Privacy approach:**
- All inference runs on-device — no images ever uploaded
- Patient data stays in IndexedDB until CHW explicitly syncs
- Encrypted sync via Supabase with row-level security
- Consent captured per patient

The app is free, open-source (Apache 2.0). I'd love feedback from a public health perspective.

🔗 https://trij.vercel.app
🐙 https://github.com/Mosss-OS/trij
🐦 https://x.com/Trij_app
📧 triij.app@gmail.com

**Flair:** Technology, Innovation, Global Health

**Hashtags:** #PublicHealth #DigitalHealth #HealthEquity #CHW #AIforGood #OpenSource

---

## LinkedIn

**URL:** Post from your LinkedIn profile at https://linkedin.com/feed/

**Content:**

🚑 **I built a free AI medical triage app that works completely offline. No internet. No cloud. No patient data ever leaves the phone.**

Meet Trij — an open-source PWA for community health workers in remote areas.

📸 Snap a photo of a wound, rash, or lab report
🧠 Gemma 4 AI analyzes it on-device (via WebGPU)
🟢🟡🔟 Get urgency + recommendation in seconds
🎤 Voice-guided assessments in 7 languages
📄 Auto-generated referral PDFs with QR codes
🌍 Works offline — syncs when you're back online

Built with Google DeepMind's Gemma 4 for the Kaggle Gemma 4 Good Hackathon.

**Why I built this:**
Community health workers are the backbone of primary care in underserved regions. They deserve tools that work in the conditions they actually face — unreliable internet, varying literacy levels, limited specialist access. Trij addresses all three.

**The stack:**
React 19 • TanStack Start • Vite • WebLLM + WebGPU • Dexie.js • Web Speech API • Supabase

100% open-source under Apache 2.0. Contributions welcome — we need devs, designers, translators, and domain experts.

🔗 https://trij.vercel.app
🐙 https://github.com/Mosss-OS/trij
🐦 https://x.com/Trij_app
📧 triij.app@gmail.com

#AIforGood #GlobalHealth #OpenSource #Gemma4 #CommunityHealth #MedTech #DigitalHealth #HealthEquity #OfflineFirst #PWA #MachineLearning #PublicHealth #HealthcareInnovation #GoogleDeepMind #Kaggle

**Tag these accounts:** @GoogleDeepMind @Kaggle @Supabase @Vercel

---

## X / Twitter

**Bio (160 chars):**
> Free AI medical triage for community health workers 🏥 On-device, offline-first, open-source. Built w/ @GoogleDeepMind Gemma 4. Try it 👇 trij.vercel.app

### Launch Thread

**Post 1 (pinned):**
> 🚀 Trij is live!
>
> A free, open-source AI medical triage app for community health workers. Runs entirely on-device — no internet, no cloud, no patient data leaves the phone.
>
> Built with @GoogleDeepMind Gemma 4 for the @Kaggle Gemma 4 Good Hackathon.
>
> 🔗 trij.vercel.app
> 🐙 github.com/Mosss-OS/trij

**Post 2:**
> 📸 How it works:
>
> 1. Snap a photo of a wound, rash, or lab report
> 2. Gemma 4 analyzes on-device (WebGPU)
> 3. Get urgency (Green/Yellow/Red) + confidence score + recommendation
>
> All in <10 seconds. All offline. All private.

**Post 3:**
> 🎤 Voice-guided assessments in 7 languages:
> English, French, Swahili, Hindi, Arabic, Portuguese, Spanish
>
> The app reads each step aloud and listens for spoken answers. No literacy barrier.

**Post 4:**
> 🔄 Offline-first by design:
>
> - Full triage without internet
> - IndexedDB for local storage
> - Background sync to Supabase when online
> - Last-write-wins conflict resolution
>
> Works in a village, a plane, or a basement clinic.

**Post 5:**
> 📄 Medical document scanner built in:
>
> Snap a lab report or prescription → AI extracts key metrics → highlights abnormal values → plain-language explanation.
>
> No more struggling with handwritten or foreign-language documents.

**Post 6:**
> 👁️ Supervisor dashboard:
>
> Map view of all CHW assessments • Referral queue • Condition analytics • CSV export
>
> Know what's happening in your region in real-time.

**Post 7:**
> 🔒 Privacy-first:
>
> - All inference on-device — no images uploaded
> - Patient data stays local until explicit sync
> - Encrypted sync with row-level security
> - HIPAA-conscious design patterns
>
> Because healthcare data shouldn't be a product.

**Post 8:**
> 🤝 We're open-source (Apache 2.0) and looking for contributors!
>
> Need: UI polish • Language packs • Real-world testing • Clinical validation
>
> 🐙 github.com/Mosss-OS/trij
> 📧 triij.app@gmail.com

### Individual Posts (for daily content)

**Post — General launch:**
> Free AI medical triage that runs on your phone with zero internet. That's Trij.
>
> Built for community health workers who can't wait for a cloud server or a distant specialist.
>
> 🔗 trij.vercel.app
> 🐙 github.com/Mosss-OS/trij
>
> #AIforGood #GlobalHealth #OpenSource

**Post — The privacy angle:**
> "Patient data never leaves the device."
>
> That's not a marketing line. It's the architecture:
> - WebGPU runs Gemma 4 locally
> - No images are uploaded anywhere
> - Sync is encrypted and opt-in
>
> Built this way because trust is everything in healthcare.
>
> trij.vercel.app | github.com/Mosss-OS/trij

**Post — Call for contributors:**
> Trij is open-source and we'd love your help.
>
> Areas to contribute:
> 🧩 UI/UX improvements
> 🌍 Additional language packs
> 🧪 Clinical validation & testing
> 🐛 Bug fixes & edge cases
>
> Apache 2.0. PRs welcome.
>
> 🐙 github.com/Mosss-OS/trij
> 📧 triij.app@gmail.com

**Post — Tech stack flex:**
> The stack behind Trij:
>
> ⚛️ React 19 + TanStack Start
> ⚡ Vite + Tailwind v4
> 🧠 WebLLM + WebGPU (Gemma 4)
> 💾 Dexie.js (IndexedDB)
> 🎤 Web Speech API
> ☁️ Supabase (Auth, DB, Storage)
> 📱 PWA (installable on Android/iOS)
>
> All open-source. All free. All running on-device.
>
> github.com/Mosss-OS/trij

**Post — Video demo caption:**
> 30 seconds. One photo. Instant triage.
>
> This is Trij — free AI medical assessment that works without internet.
>
> Built for community health workers everywhere.
>
> 🔗 trij.vercel.app
> 🐙 github.com/Mosss-OS/trij
>
> #AIforGood #GlobalHealth #MedTech #DigitalHealth #Gemma4

**Hashtag bank (pick 2-3 per post max):**
#AIforGood #GlobalHealth #OpenSource #MedTech #DigitalHealth #HealthEquity #Gemma4 #OfflineFirst #CommunityHealth #PWA #MachineLearning #PublicHealth #HealthcareInnovation

---

## Facebook

**URL:** Post from your Facebook profile/page at https://facebook.com/

**Content (for a video post):**

**Caption:**

🚑 Free AI medical triage that works WITHOUT internet. Meet Trij.

I built this open-source app for community health workers in remote areas — the people who are often the first and only point of medical care for millions.

**How it works in 30 seconds:**
📸 Take a photo of a wound, rash, or lab report
🧠 AI analyzes it ON YOUR PHONE (no upload, no cloud)
🟢🟡🔟 Get urgency level + recommendation instantly
🎤 Voice-guided follow-ups in 7 languages
📄 Generate referral PDFs with QR codes
🔄 Works offline — syncs later

**Why this matters:**
- 1 billion+ people live in areas with <1 physician per 10,000
- Smartphone penetration is high, but reliable internet is rare
- CHWs make life-or-death triage decisions with limited support
- Trij gives them AI-assisted triage that respects their patients' privacy

**The tech:**
Google DeepMind's Gemma 4 runs entirely on-device via WebGPU. No patient data ever leaves the phone. Open-source under Apache 2.0.

**How you can help:**
1. Try it: trij.vercel.app
2. Star on GitHub: github.com/Mosss-OS/trij
3. Follow: x.com/Trij_app
4. Share this with someone in global health
5. Contribute — we need devs, designers, translators, and clinical advisors

📧 triij.app@gmail.com

#AIforGood #GlobalHealth #OpenSource #MedTech #DigitalHealth #CommunityHealth #HealthEquity #Gemma4 #OfflineFirst #GoogleDeepMind #HealthcareInnovation
