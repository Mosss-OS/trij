# Regulatory Compliance Matrix

This document maps Trij's current implementation against applicable legal and clinical frameworks.
It serves as both a compliance self-assessment and a remediation roadmap.

**Last updated:** 2026-05-22  
**Review cadence:** Quarterly or upon material feature changes

---

## Table of Contents

1. [HIPAA Technical Safeguards (US)](#1-hipaa-technical-safeguards)
2. [GDPR Article 25 — Privacy by Design (EU)](#2-gdpr-article-25--privacy-by-design)
3. [Nigeria Data Protection Act 2023](#3-nigeria-data-protection-act-2023)
4. [India Digital Personal Data Protection Act 2023](#4-india-digital-personal-data-protection-act-2023)
5. [WHO SMART Guidelines](#5-who-smart-guidelines)
6. [Remediation Roadmap](#6-remediation-roadmap)

---

## 1. HIPAA Technical Safeguards

Reference: 45 CFR § 164.312 — Security Standards for the Protection of Electronic Protected Health Information (ePHI).

| Requirement | 45 CFR § | How Trij Meets It | Gaps | Remediation Plan |
|---|---|---|---|---|
| **Unique User Identification** | 164.312(a)(2)(i) | Supabase Auth (email/password), offline PIN (PBKDF2, 600k iterations), WebAuthn biometrics. | Offline PIN auth does not enforce password complexity. | Enforce minimum PIN length (6 digits) and rate-limit attempts server-side for online accounts. |
| **Emergency Access Procedure** | 164.312(a)(2)(ii) | Supervisor codes allow CHW account linking; offline PIN bypasses Supabase when network unavailable. | No documented emergency break-glass procedure for locked accounts. | Add supervisor-override unlock flow documented in operations manual. |
| **Automatic Logoff** | 164.312(a)(2)(iii) | Configurable inactivity lock (1/5/10/30 min) via `useInactivityLock`; locks screen with PIN/biometric re-auth. | No server-side session timeout enforcement for Supabase sessions. | Add session TTL to Supabase auth settings (default 24h). |
| **Encryption and Decryption** | 164.312(a)(2)(iv) | AES-256-GCM via `src/lib/crypto.ts` for patient identifiers and assessment fields. Key derived from PIN (PBKDF2, 600k iterations). | Encryption is user-toggleable, not enforced. | Make encryption-on-by-default; require opt-out with warning. |
| **Audit Controls** | 164.312(b) | 11 audit event types logged to IndexedDB and synced to Supabase `audit_logs` table. RLS policies: CHW insert own, supervisor read, admin all. Viewer at `_app.audit.tsx`. | Audit logs include IP and user-agent (potential PII). No retention limit. | Add configurable retention period (default 90 days) with auto-purge. Hash IP address after 30 days. |
| **Integrity Controls** | 164.312(c)(1) | SHA-256 chunk verification in resumable download (`src/lib/resumable-download.ts`). E2E sync with conflict detection and three-way merge. | No checksum verification on stored assessment data at rest. | Add integrity check on assessment read with automatic re-sync on mismatch. |
| **Person or Entity Authentication** | 164.312(d) | Supabase Auth, PBKDF2 PIN, WebAuthn biometric (platform authenticator). Session persisted in localStorage with auto-refresh. | Biometric is optional and platform-dependent. | Enforce multi-factor (PIN + biometric) for supervisor/admin roles. |
| **Transmission Security** | 164.312(e)(1) | All client-server communication over HTTPS/TLS (Supabase). Data sync via encrypted channel. | No implemented. | Verify TLS 1.2+ minimum on deployment. Document in deployment checklist. |

**Overall HIPAA assessment:** Partial compliance. Core technical safeguards are implemented but encryption should be default-on and retention policies need formalisation.

---

## 2. GDPR Article 25 — Privacy by Design

Reference: Regulation (EU) 2016/679 Article 25 — Data protection by design and by default.

| Requirement | How Trij Meets It | Gaps | Remediation Plan |
|---|---|---|---|
| **Data minimisation** | On-device AI inference — images never leave the device. Only structured, anonymised data (k≥5) is synced. | Telemetry/data-collection calls not audited for minimisation. | Audit all outbound requests; remove any unnecessary data fields. |
| **Purpose limitation** | Consent per patient (`ConsentCapture.tsx`) with 4 disclosure items (data collected, usage, sharing, right to withdraw). Policy version tracked (`CONSENT_POLICY_VERSION`). | No granular opt-in per purpose category. | Add purpose-specific checkboxes (diagnosis, analytics, research, training). |
| **Storage limitation** | IndexedDB schema with no built-in retention policy. Sync queue retains data until acknowledged by server. | No automated data deletion/archival. | Add data retention rules by record type (assessment 7yr, audit log 90d, sync queue 30d). |
| **Accuracy** | Assessments include timestamp, CHW ID, and consent record for traceability. | No mechanism for data subjects to correct inaccuracies. | Add patient data correction request workflow in supervisor dashboard. |
| **Confidentiality & integrity** | AES-256-GCM encryption, RBAC (3 roles + RLS), audit logging. k-anonymity on exports. | Encryption is user-toggleable. | Default-on encryption; document encryption state in assessment metadata. |
| **Accountability** | Audit events track who accessed what and when. RLS prevents unauthorised access. | No Data Protection Impact Assessment (DPIA) document. | Create DPIA and link from this document. |
| **Data subject access request (DSAR)** | Patients can request data via CHW who can retrieve from IndexedDB. | No automated DSAR workflow; no right-to-erasure mechanism. | Add "Request my data" and "Delete my data" flows in patient portal. |
| **Privacy by default** | Cloud fallback is opt-in (`cloudFallbackConsent`). Default engine is on-device WebLLM. | Some settings default to less-private options (e.g., encryption off). | Ensure all privacy-relevant settings default to most private option. |
| **Data Protection Officer (DPO)** | Not applicable (organisation size < 250 employees, non-systematic monitoring). | No DPO contact information published. | Add DPO contact section if organisation grows or processing scales. |

**Overall GDPR assessment:** Strong privacy-by-design foundation. Remediation items are procedural (DPIA, DSAR workflow, retention policy) rather than architectural.

---

## 3. Nigeria Data Protection Act 2023

Reference: Nigeria Data Protection Act 2023 (NDPA).

| Requirement | How Trij Meets It | Gaps | Remediation Plan |
|---|---|---|---|
| **Lawful processing — consent** | Explicit consent captured per patient via `ConsentCapture` with method tracking (verbal/thumbprint/signature/voice). | No consent withdrawal mechanism in UI. | Add "Withdraw consent" option in patient record view. |
| **Data localisation** | Primary processing is on-device. Supabase instance location configurable. | Default Supabase instance region not documented. | Document default region; provide deployment option for Nigeria-based Supabase. |
| **Data Security** | AES-256-GCM, RBAC, audit logging, PIN/biometric auth, k-anonymity. | Same encryption-default-off gap. | Encryption on by default. |
| **Data Processor obligations** | Supabase is the only third-party processor. Data Processing Agreement (DPA) available via Supabase. | DPA not reviewed or linked from app. | Review and link Supabase DPA in settings/privacy section. |
| **Breach notification** | Error logging captures app errors. | No formal breach detection or notification procedure. | Document breach response plan; add automatic notification to supervisor on anomalous access patterns. |
| **Data Subject Rights** | Access via CHW retrieval. | No portability or erasure workflow. | Add data export (JSON/CSV) and deletion request flows. |
| **Registration with NDPC** | Not applicable for open-source software — applies to data controllers. | Deployment organisations must register. | Add deployment guide section on NDPC registration requirements. |
| **Cross-border transfer** | Anonymised data only (k≥5). | Adequacy decision not verified for Supabase region. | Restrict Supabase deployment to Nigeria region or verify adequacy. |

**Overall NDPA assessment:** Strong alignment with data localisation and security requirements. Procedural gaps in breach notification and data subject rights.

---

## 4. India Digital Personal Data Protection Act 2023

Reference: DPDP Act 2023 (India).

| Requirement | How Trij Meets It | Gaps | Remediation Plan |
|---|---|---|---|
| **Consent** | Explicit consent per patient with notice of data collected, usage, and sharing. | No consent notice in Hindi or other Indian languages (app supports Hindi). | Ensure consent text translated and reviewed for all supported languages (see Issue #57). |
| **Consent Manager** | Not applicable — Trij is data processor/fiduciary, not a consent manager platform. | | N/A |
| **Data Principal rights** | Access via CHW. | No erasure, correction, or portability in UI. | Same DSAR workflow as GDPR. |
| **Data localisation** | On-device processing with configurable Sync server. | Sync server region not defaulted to India. | Add India region deployment guide. |
| **Data Protection Officer** | DPO contact not published. | Add DPO contact. | Covered in GDPR remediation. |
| **Data breach notification** | No breach detection procedure. | Covered in NDPA remediation. | Same breach notification plan. |
| **Children's data** | App is designed for CHW use, not direct child access. Medical assessments can involve minors. | No parental consent flow for minors. | Add guardian consent capture when patient is a minor (age < 18). |
| **Data retention** | No automated retention. | Add retention policy. | Covered in GDPR remediation. |
| **Penalties** | N/A — compliance reduces risk. | | Ongoing. |

**Overall DPDP Act assessment:** Most requirements mirror GDPR/NDPA. Key addition is guardian consent for minors and Hindi-translated consent text.

---

## 5. WHO SMART Guidelines

Reference: WHO SMART (Standards-based, Machine-readable, Adaptive, Requirements-based, and Testable) Guidelines.

| Requirement | How Trij Meets It | Gaps | Remediation Plan |
|---|---|---|---|
| **FHIR alignment** | Assessment data model includes structured fields (condition, urgency, vitals, IMCI classification). | Not using FHIR resources (Patient, Observation, Condition). | Map assessment data to FHIR R4 profiles (`Patient`, `Observation`, `Condition`, `ClinicalImpression`). |
| **Clinical decision support** | Rule-based red flags (`red-flags.ts`), IMCI (`imci.ts`), maternal assessment (`maternal.ts`), vital signs thresholds (`vital-signs.ts`). | Rules not published in a machine-readable format (e.g., CQL, JSON). | Export clinical rules as HL7 CQL or JSON Logic for external validation. |
| **ICD-11 / ICD-10 mapping** | Conditions mapped to clinical categories in `groupCondition()`. | No standard ICD-11 codes attached to assessments. | Add ICD-11 code field to Assessment type; map `groupCondition` output to ICD-11 codes. |
| **Interoperability** | JSON export with structured data. Sync via Supabase REST API. | No FHIR API endpoint. | Add FHIR R4 API gateway (optional, deployment-specific). |
| **Open-source** | Apache 2.0 license. Source available at https://github.com/Mosss-OS/trij. | | N/A |
| **Adaptive** | Configurable confidence threshold, local antibiotic protocol, language. | Clinical logic is hard-coded (by design for safety). | Consider adding configurable rule JSON files for deployment-specific adaptations. |
| **Testable** | TypeScript with static typing. CI pipeline. | No automated clinical validation test suite. | Add regression test suite with known clinical scenarios (see Issue #1). |

**Overall WHO SMART assessment:** Strong alignment with open-source and adaptable principles. FHIR and ICD-11 mapping are the largest gaps.

---

## 6. Remediation Roadmap

Prioritised by impact and effort:

| Priority | Item | Frameworks | Effort | Target |
|---|---|---|---|---|
| P0 | Encryption on by default | HIPAA, GDPR, NDPA | Small | Next release |
| P0 | Data retention policy and auto-purge | HIPAA, GDPR, NDPA, DPDP | Medium | Next release |
| P1 | DSAR workflow (access, erase, portability) | GDPR, NDPA, DPDP | Medium | Q3 2026 |
| P1 | Guardian consent for minors | DPDP | Small | Q3 2026 |
| P1 | Breach notification procedure | HIPAA, NDPA, DPDP | Small (doc) | Q3 2026 |
| P2 | FHIR R4 API gateway | WHO SMART | Large | Q4 2026 |
| P2 | ICD-11 code mapping | WHO SMART | Medium | Q4 2026 |
| P2 | Clinical rule export (CQL/JSON) | WHO SMART | Medium | Q4 2026 |
| P2 | DPIA document | GDPR | Small (doc) | Q4 2026 |
| P3 | Hindi consent text translation | DPDP | Small | Language review cycle |
| P3 | India/Nigeria Supabase deployment guide | NDPA, DPDP | Small (doc) | Q1 2027 |
| P3 | Multi-factor auth for supervisor roles | HIPAA | Medium | Q1 2027 |

---

## References

- HIPAA Security Rule: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C
- GDPR Article 25: https://gdpr.eu/article-25-data-protection-by-design/
- Nigeria Data Protection Act 2023: https://ndpc.gov.ng/
- India DPDP Act 2023: https://www.meity.gov.in/digital-personal-data-protection-act-2023
- WHO SMART Guidelines: https://www.who.int/teams/digital-health-and-innovation/smart-guidelines
- Supabase DPA: https://supabase.com/support/dpa

---

_This document is a living assessment and should be reviewed quarterly and on any material feature change._
