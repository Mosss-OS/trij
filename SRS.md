# Software Requirements Specification (SRS)
## Project Trij — FieldMed Triage System

**Version**: 1.0
**Date**: May 12, 2026
**Prepared for**: Gemma 4 Good Hackathon (Kaggle + Google DeepMind)
**Track**: Health & Sciences / Global Resilience

---

## 1. Introduction

### 1.1 Purpose
Trij is a progressive web application that enables community health workers (CHWs) in remote, low-connectivity areas to perform AI-assisted medical triage using Google DeepMind's Gemma 4 models. It provides preliminary assessment of wounds, rashes, and medical documents through multimodal AI — entirely on-device, preserving patient privacy.

### 1.2 Scope
The system covers:
- Image-based triage assessment (wounds, rashes, skin conditions)
- Medical document analysis (lab reports, referral letters)
- Voice-guided assessment workflows in local languages
- Offline-first architecture with background sync
- Patient record management
- Confidence-scored recommendations with referral guidance

### 1.3 Definitions
| Term | Definition |
|---|---|
| CHW | Community Health Worker (primary user) |
| Triage | Preliminary assessment of medical urgency |
| Gemma 4 | Google DeepMind's open multimodal LLM family |
| PWA | Progressive Web Application |
| E2B/E4B | Gemma 4 edge-optimized model variants (2B / 4B params) |
| RAG | Retrieval-Augmented Generation |

---

## 2. User Roles

### 2.1 Community Health Worker (CHW)
- Conducts triage assessments
- Views patient history
- Manages offline patient records
- Receives referral recommendations

### 2.2 Supervisor / Clinic Admin
- Reviews CHW assessments
- Syncs data from field workers
- Manages referral outcomes
- Views analytics dashboard

### 2.3 Patient
- Minimal interaction (consent-based data subject)
- Receives referral slips (via CHW)

---

## 3. Functional Requirements

### FR-01: Image-Based Triage Assessment
| Item | Description |
|---|---|
| Input | Photo of wound, rash, or skin condition (phone camera or gallery) |
| Process | Gemma 4 vision analyzes image; model generates structured JSON assessment |
| Output | Condition classification, urgency level (Green/Yellow/Red), confidence score, possible conditions list |
| Constraints | Must work offline; inference runs on-device via E2B/E4B |

### FR-02: Medical Document Analysis
| Item | Description |
|---|---|
| Input | Photo of lab report, referral letter, or prescription |
| Process | Gemma 4 OCR + reasoning extracts key metrics and flags abnormalities |
| Output | Structured summary of findings, abnormal values highlighted, plain-language explanation |
| Constraints | Must handle handwritten text and low-quality photos |

### FR-03: Voice-Guided Assessment
| Item | Description |
|---|---|
| Input | Spoken answers in local language (Web Speech API) |
| Process | Gemma 4 processes audio transcription, generates follow-up questions via function calling |
| Output | Dynamic question flow adapted to patient responses |
| Constraints | Must support 140+ languages; works offline with cached language packs |

### FR-04: Patient Record Management
| Item | Description |
|---|---|
| Create | Register patient with minimal fields (ID, age, sex, location) |
| Read | View patient history across visits |
| Update | Add new assessments to patient timeline |
| Constraints | All data stored locally via IndexedDB; sync to Supabase when online |

### FR-05: Offline-First Operation
| Item | Description |
|---|---|
| Triage | Full assessment capability without internet |
| Storage | All records cached in IndexedDB |
| Sync | Background sync to Supabase when connectivity returns |
| Conflict | Last-write-wins with server timestamp reconciliation |

### FR-06: Confidence Scoring & Explanation
| Item | Description |
|---|---|
| Score | Every assessment includes 0-100 confidence score |
| Rationale | Brief explanation of key visual features used for assessment |
| Low-Conf | Auto-suggests "Refer to clinic" when confidence < 70 |

### FR-07: Referral Management
| Item | Description |
|---|---|
| Generate | Auto-generate referral slip PDF (image + assessment summary + QR) |
| Track | Mark referral as "sent", "received", "resolved" |
| Notify | Alert supervisor when new referrals created (when online) |

### FR-08: Multilingual Interface
| Item | Description |
|---|---|
| UI | App UI available in English, French, Swahili, Hindi, Portuguese, Arabic |
| Assessment | Voice and text I/O in user's chosen language |
| Reports | Generated reports in local language + English |

### FR-09: Supervisor Dashboard
| Item | Description |
|---|---|
| Map | Geolocated view of assessments in region |
| Queue | Pending referral queue |
| Analytics | Assessment volume, common conditions, sync status |
| Export | CSV export of anonymized assessment data |

---

## 4. Non-Functional Requirements

### NFR-01: Performance
| Metric | Target |
|---|---|
| Image inference time | < 10 seconds (E2B quantized) |
| App cold start | < 3 seconds |
| Voice response latency | < 2 seconds |
| Sync time (100 records) | < 30 seconds (on 3G) |

### NFR-02: Privacy & Security
- All PHI (Protected Health Information) stays on-device until explicit sync
- End-to-end encryption for synced data (Supabase row-level security)
- No patient data sent to external AI APIs
- Gemma 4 runs locally — no cloud inference
- HIPAA-compliant data handling patterns

### NFR-03: Reliability
- 100% functionality offline (triage, records, voice)
- Graceful degradation when storage exceeds 80%
- Automatic sync queue with retry + exponential backoff

### NFR-04: Compatibility
- Chrome / Firefox / Safari (latest 2 versions)
- Android Chrome (PWA installable)
- iOS Safari (PWA installable)
- Minimum 4GB RAM device
- Camera resolution ≥ 8MP

### NFR-05: Scalability
- Support up to 10,000 patients per deployment instance
- Support up to 500 CHWs per deployment region
- Supabase handles backend scaling

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client (Browser)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  React   │  │  WebLLM  │  │  Web Speech API  │   │
│  │  (Vite)  │  │ (Gemma4) │  │  (Voice I/O)     │   │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │             │                  │              │
│  ┌────▼─────────────▼──────────────────▼──────────┐  │
│  │           Service Worker Layer                   │  │
│  │  ┌─────────────┐  ┌────────────────────────┐   │  │
│  │  │  Cache API  │  │  Background Sync API   │   │  │
│  │  └─────────────┘  └───────────┬────────────┘   │  │
│  └────────────────────────────────┬────────────────┘  │
└───────────────────────────────────┼───────────────────┘
                                    │
            Online ┌────────────────┴────────────────┐
                   │                                 │
            ┌──────▼──────┐              ┌───────────▼───┐
            │  Supabase   │              │  IndexedDB    │
            │  (Cloud)    │◄────────────►│  (Local)      │
            │  - Auth     │   Sync Job   │  - Patients   │
            │  - Postgres │              │  - Assessments│
            │  - Storage  │              │  - PendingSync│
            │  - Edge Fns │              └───────────────┘
            └─────────────┘
```

---

## 6. Data Model

### Patients
```json
{
  "id": "uuid",
  "chw_id": "uuid",
  "identifier": "string (local ID)",
  "age_years": "number",
  "sex": "enum('M','F','other')",
  "location": "geojson point",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "last_sync": "timestamp"
}
```

### Assessments
```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "chw_id": "uuid",
  "images": ["string (base64 stored locally, URL when synced)"],
  "condition": "string",
  "confidence": "number (0-100)",
  "urgency": "enum('green','yellow','red')",
  "possible_conditions": [
    {"name": "string", "probability": "number"}
  ],
  "recommendation": "string",
  "voice_log": "string (transcript)",
  "language": "string",
  "referral_status": "enum('none','sent','received','resolved')",
  "created_at": "timestamp",
  "created_at_offline": "timestamp",
  "synced_at": "timestamp"
}
```

### CHW Profiles
```json
{
  "id": "uuid",
  "name": "string",
  "language": "string",
  "region": "string",
  "supervisor_id": "uuid",
  "device_id": "string",
  "last_sync": "timestamp"
}
```

---

## 7. API Endpoints (Supabase Edge Functions)

| Endpoint | Method | Purpose |
|---|---|---|
| `/sync/assessments` | POST | Batch upload assessments from offline queue |
| `/sync/patients` | POST | Batch upload new patients |
| `/sync/pull` | GET | Pull latest references, protocols, language packs |
| `/referrals` | GET | Supervisor view of referral queue |
| `/analytics/region` | GET | Aggregated analytics for supervisor dashboard |
| `/ai/download-model` | GET | Download latest Gemma 4 E2B model shard |
| `/ai/language-pack` | GET | Download voice/language pack for offline use |

---

## 8. UI/UX Requirements

### 8.1 Screen Map
1. **Login** — PIN-based (offline) + Supabase Auth (online)
2. **Dashboard** — Recent patients, quick triage button, sync status indicator
3. **New Triage** — Camera capture → analysis → result → patient linkage
4. **Patient Detail** — Visit timeline, condition history
5. **Document Scanner** — Photo capture → OCR → structured output
6. **Referral View** — Generated referral slip, status tracker
7. **Supervisor Dashboard** — Map, queue, analytics

### 8.2 Design Principles
- Large touch targets (rural users, varying tech literacy)
- High-contrast mode for outdoor use
- Minimal text input (voice + photo preferred)
- Single-thumb navigation
- Offline indicator always visible
- Language toggle always accessible

---

## 9. Assumptions & Constraints

- CHW devices have ≥ 4GB RAM and a camera
- Internet connectivity is intermittent (not always available)
- CHWs have basic literacy and smartphone familiarity
- Gemma 4 E2B/E4B models can be quantized to run in-browser via WebLLM
- Supabase free tier sufficient for pilot deployment
- Patient consent is obtained verbally per local practice

---

## 10. Glossary

| Term | Meaning |
|---|---|
| CHW | Community Health Worker |
| PHI | Protected Health Information |
| PWA | Progressive Web Application |
| RAG | Retrieval-Augmented Generation |
| MoE | Mixture of Experts (model architecture) |
| RLS | Row-Level Security (Supabase) |

---

*This SRS is a living document. Updates will be tracked via git commits.*
