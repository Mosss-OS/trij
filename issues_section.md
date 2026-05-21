
---

## Issue #1: Clinical Validation Framework

**Labels:** `priority: critical` `type: clinical-safety` `phase: 1`

### Description
Establish a structured clinical validation programme before any wider clinical deployment of Trij. The AI currently outputs assessments without any published sensitivity/specificity metrics.

### Acceptance Criteria
- [ ] Define a validation protocol (minimum 1,000 labelled cases per condition category)
- [ ] Partner with at least 2 licensed physicians or clinical institutions for case review
- [ ] Compute and publish sensitivity, specificity, PPV, NPV per condition category
- [ ] Publish validation results in a `CLINICAL_VALIDATION.md` in the repo
- [ ] Add a visible disclaimer in the app UI linking to validation status
- [ ] Create an ongoing validation pipeline for model updates

### Technical Notes
- Cases should be stratified by Fitzpatrick skin tone, age group, sex, and image quality
- Use Cohen's Kappa for inter-rater agreement between AI and clinician
- Store labelled validation dataset in a separate, access-controlled repository

### Dependencies
None — this is a prerequisite for production deployment.

---

## Issue #2: Differential Diagnosis Depth — Structured Output

**Labels:** `priority: high` `type: clinical-safety` `type: feature` `phase: 2`

### Description
The current AI output returns a `condition` string and a `possible_conditions` list. Expand this to a full structured differential diagnosis with supporting evidence and distinguishing features for each candidate.

### Acceptance Criteria
- [ ] Update `gemma-prompt.ts` system prompt to request structured differential diagnosis JSON
- [ ] New output schema:
```json
{
  "primary_diagnosis": {
    "name": "string",
    "confidence": 0.85,
    "supporting_features": ["erythema", "scaling"],
    "against_features": ["no vesicles"]
  },
  "differentials": [
    {
      "rank": 2,
      "name": "string",
      "confidence": 0.45,
      "distinguishing_questions": ["Is it itchy?"]
    }
  ]
}
```
- [ ] Update `types/` to reflect new schema
- [ ] Update Dexie schema (`db.ts`) for new assessment structure
- [ ] Update result UI screen to render differential list with confidence bars
- [ ] Update referral PDF to include differential diagnosis

### Technical Notes
- Prompt engineering in `gemma-prompt.ts` is the primary lever — test multiple prompt formulations
- Validate JSON schema output with Zod before storing

---

## Issue #3: Red Flag Symptom Detection — Hard-Coded Safety Rules

**Labels:** `priority: critical` `type: clinical-safety` `phase: 1`

### Description
Implement rule-based clinical red flag detection that fires **before or in parallel with** AI inference and can override the AI urgency classification to force Red/Emergency regardless of model confidence.

### Acceptance Criteria
- [ ] Create `lib/red-flags.ts` with a typed red flag rule engine
- [ ] Implement rules for (minimum set):
  - Signs of sepsis (fever + altered consciousness + rapid breathing)
  - Meningism indicators (stiff neck + fever + photophobia)
  - Obstetric emergencies (heavy vaginal bleeding, fitting in pregnancy)
  - Stroke signs (facial droop, arm weakness, speech slurring)
  - Severe dehydration (sunken eyes, no urine >6h, unable to drink)
  - Diabetic emergency indicators
  - Severe malnutrition with complications
- [ ] Rules fire on structured symptom input (see Issue #9) and vital signs (see Issue #8)
- [ ] When red flag fires: override urgency to `red`, show full-screen emergency alert, block normal result flow
- [ ] Emergency alert screen shows: condition suspected, immediate action required, nearest facility
- [ ] All red flag overrides are logged separately in the audit trail

### Technical Notes
- Rules must be configurable by supervisors for regional protocol differences
- Rules run synchronously before async AI inference
- Do NOT rely on the language model for red flag detection — deterministic rules only

---

## Issue #4: Wound Severity Grading — Clinical Scales Integration

**Labels:** `priority: high` `type: clinical-safety` `type: feature` `phase: 2`

### Description
When a wound is detected in an image assessment, automatically apply the appropriate clinical grading scale and include the graded score in the output.

### Acceptance Criteria
- [ ] Create `lib/clinical-scales.ts`
- [ ] Implement Wagner Scale (0–5) for diabetic foot ulcers with selection logic
- [ ] Implement Braden Scale inputs for pressure injury risk
- [ ] Implement Lund-Browder chart calculation for burns (% body surface area)
- [ ] AI result screen shows: scale used, grade, clinical interpretation, management guidance
- [ ] Scales stored in assessment record as `clinical_scale: { name, score, interpretation }`
- [ ] Offline — all scale logic is local, no network required

### Technical Notes
- Condition type detected by Gemma determines which scale to apply
- Braden requires user input (mobility, nutrition, moisture) — implement as quick input form
- All scales should reference their source guideline (WHO, NICE, etc.)

---

## Issue #5: Paediatric Assessment Pathways — IMCI Integration

**Labels:** `priority: critical` `type: clinical-safety` `phase: 1`

### Description
Build a dedicated paediatric triage pathway for patients under 5 years old, implementing WHO's Integrated Management of Childhood Illness (IMCI) assessment logic.

### Acceptance Criteria
- [ ] Age-gated pathway: if `age_years < 5`, offer IMCI pathway
- [ ] IMCI danger signs checklist: unable to drink/breastfeed, vomiting everything, convulsions, lethargic/unconscious
- [ ] Age-appropriate vital sign thresholds (respiratory rate norms for <2mo, 2-12mo, 1-5yr)
- [ ] MUAC measurement guidance with colour-coded result (Red <11.5cm, Yellow 11.5-12.5cm, Green >12.5cm)
- [ ] Fast breathing detection by age group
- [ ] Integrated malaria risk assessment (if region configured as endemic)
- [ ] Output produces IMCI classification (e.g., "Severe pneumonia", "Malaria with danger signs")
- [ ] Offline reference card: IMCI chart accessible without AI inference

### Technical Notes
- IMCI logic should be separate from the Gemma inference path — use deterministic decision tree
- Source: WHO IMCI chart booklet (2014) — rules are public domain
- MUAC input requires CHW to enter measurement; app provides visual guide

---

## Issue #6: Maternal Health Triage Module

**Labels:** `priority: critical` `type: clinical-safety` `phase: 1`

### Description
Add a dedicated maternal health assessment pathway covering antenatal, intrapartum, and postnatal danger signs, and neonatal assessment.

### Acceptance Criteria
- [ ] New route: `_app.maternal.tsx`
- [ ] Antenatal danger signs checklist: heavy bleeding, severe headache, blurred vision, fitting, reduced fetal movement, fever, difficulty breathing
- [ ] Gestational age input with fundal height guidance
- [ ] Postnatal danger signs: heavy bleeding, offensive discharge, fever, breast problems, neonatal danger signs
- [ ] Neonatal assessment: breathing, feeding, jaundice, temperature, umbilical cord
- [ ] All danger signs trigger Red urgency with specific referral guidance
- [ ] Referral slip template for obstetric emergencies includes key obstetric information
- [ ] Offline — all logic runs locally

### Technical Notes
- Pathway is independent of image AI — structured input only
- WHO Pregnancy, Childbirth, Postpartum and Newborn Care guidelines as reference
- Consider OSCE-style structured assessment format for CHW guidance

---

## Issue #7: Nutrition Assessment — MUAC & Malnutrition Indicators

**Labels:** `priority: high` `type: clinical-safety` `type: feature` `phase: 2`

### Description
Add structured nutrition assessment including MUAC measurement, oedema detection, and visual malnutrition indicators, integrated into both paediatric and adult pathways.

### Acceptance Criteria
- [ ] MUAC input field with inline measurement guide (illustrated)
- [ ] MUAC classification: SAM (<11.5cm child, <18.5cm adult), MAM (11.5-12.5cm), Normal
- [ ] Bilateral pitting oedema check (yes/no with confirmation guidance)
- [ ] Visual assessment prompts for: visible wasting, hair changes, skin changes
- [ ] MUAC result displayed with colour-coded band
- [ ] SAM classification triggers Red urgency + immediate referral
- [ ] Data stored in assessment as `nutrition: { muac_cm, oedema, classification }`
- [ ] Offline — no network required

---

## Issue #8: Vital Signs Input Module

**Labels:** `priority: critical` `type: clinical-safety` `phase: 1`

### Description
Create a structured vital signs input panel that accepts readings from the CHW and validates them against age-appropriate normal ranges, automatically escalating urgency when values are abnormal.

### Acceptance Criteria
- [ ] New component: `components/VitalSignsInput.tsx`
- [ ] Fields: temperature (°C/°F toggle), respiratory rate, pulse rate, blood pressure (systolic/diastolic), oxygen saturation (%)
- [ ] Age-stratified normal ranges built in (newborn, infant, child, adult, elderly)
- [ ] Out-of-range values highlighted red with clinical interpretation
- [ ] Urgency escalation logic: any critically abnormal vital sign → Red urgency override
- [ ] Vital signs stored in assessment record: `vital_signs: { temp, rr, hr, sbp, dbp, spo2, timestamp }`
- [ ] Fields are optional individually — CHW records what they have measured
- [ ] Offline — all validation runs locally

### Technical Notes
- Normal range thresholds from WHO and NICE paediatric references
- SpO2 < 92% = critical regardless of other findings
- Temperature > 38.5°C in infant <3 months = red flag

---

## Issue #9: Structured Symptom Checklist — System-Based

**Labels:** `priority: high` `type: clinical-safety` `type: feature` `phase: 2`

### Description
Supplement voice input with validated, system-based symptom checklists that CHWs can complete to ensure assessment completeness.

### Acceptance Criteria
- [ ] Checklists for: Respiratory, Gastrointestinal, Dermatological, Neurological, Musculoskeletal, Genitourinary, General/Systemic
- [ ] Each checklist has ≤12 items (cognitive load limit)
- [ ] System shown is context-aware: if AI detects skin condition, dermatological checklist is pre-selected
- [ ] Checklist responses passed as additional context to Gemma inference
- [ ] Selected symptoms stored in assessment: `symptoms: string[]`
- [ ] Offline — no network required
- [ ] Voice shortcut: CHW can speak "yes/no" responses to checklist items read aloud

---

## Issue #10: Model Uncertainty Quantification — Confidence Intervals

**Labels:** `priority: high` `type: clinical-safety` `type: feature` `phase: 2`

### Description
Replace the single `confidence` integer with calibrated uncertainty representation, distinguishing between image quality uncertainty and model knowledge uncertainty.

### Acceptance Criteria
- [ ] Update Gemma prompt to request uncertainty breakdown
- [ ] New confidence schema:
```json
{
  "confidence_point": 0.82,
  "confidence_interval": [0.74, 0.89],
  "uncertainty_source": "image_quality | model_knowledge | both",
  "uncertainty_reason": "string"
}
```
- [ ] UI shows confidence interval as a range bar, not a single number
- [ ] Low image quality uncertainty triggers re-capture prompt
- [ ] Low model knowledge uncertainty shows "Consult a clinician" message
- [ ] Documentation updated explaining what confidence means to CHWs

---

## Issue #11: AI Explainability — Visual Saliency Heatmap

**Labels:** `priority: high` `type: clinical-safety` `type: feature` `phase: 2`

### Description
Overlay a visual attention heatmap on the captured image showing which regions of the image most influenced the AI assessment.

### Acceptance Criteria
- [ ] Research and implement Grad-CAM or attention rollout for WebLLM vision models
- [ ] Heatmap overlay rendered on assessment result image
- [ ] Toggle button to show/hide heatmap
- [ ] Fallback: if heatmap unavailable, show text description of key visual features
- [ ] CHW can tap regions of the heatmap for explanation text
- [ ] Heatmap data stored in assessment record if feasible (compressed)

### Technical Notes
- WebLLM / Gemma 4 multimodal attention extraction approach needs research
- Alternative: prompt Gemma to describe the key visual features in structured JSON, then highlight those regions using bounding boxes

---

## Issue #12: Model Bias Audit — Fitzpatrick Skin Tone Performance

**Labels:** `priority: critical` `type: clinical-safety` `phase: 1`

### Description
Conduct a formal bias audit of Gemma 4's dermatological performance across the Fitzpatrick Skin Tone Scale (I–VI) and publish results. Address any significant performance gaps before deployment.

### Acceptance Criteria
- [ ] Assemble or source a labelled test dataset stratified by Fitzpatrick types I–VI
- [ ] Run assessment on ≥50 images per Fitzpatrick type per condition category
- [ ] Compute accuracy, sensitivity, specificity per type
- [ ] If performance gap > 10% between FST I-II vs FST V-VI: document as known limitation and add in-app warning
- [ ] Publish `BIAS_AUDIT.md` in repo with full methodology and results
- [ ] Add bias audit status to app transparency page
- [ ] Create GitHub issue for any identified performance gap with remediation plan

---

## Issue #13: Condition-Specific Clinical Protocol Cards

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Embed offline-accessible clinical protocol reference cards for the top 20 most commonly detected conditions.

### Acceptance Criteria
- [ ] Create `src/data/protocols/` directory with JSON protocol data
- [ ] Minimum 20 conditions: malaria, wound infection, cellulitis, scabies, ringworm, impetigo, pressure ulcer, diabetic foot, burn, contact dermatitis, abscess, tuberculosis (skin TB), chickenpox, measles, leprosy, leishmaniasis, onchocerciasis, lymphoedema, vitiligo, psoriasis
- [ ] Each protocol card: overview, key features, management steps, referral criteria, when to refer immediately
- [ ] Source: WHO guidelines, national ministry protocols
- [ ] Protocol cards accessible from assessment result screen ("Read more")
- [ ] Protocol cards accessible from a searchable offline library (new route: `_app.protocols.tsx`)
- [ ] All content licensed for redistribution

---

## Issue #14: Image Quality Validation Before Inference

**Labels:** `priority: high` `type: clinical-safety` `type: feature` `phase: 2`

### Description
Assess captured image quality before sending to Gemma and prompt the CHW to retake the photo if quality is insufficient.

### Acceptance Criteria
- [ ] Create `lib/image-quality.ts`
- [ ] Quality checks: blur detection (Laplacian variance), exposure (histogram analysis), minimum resolution
- [ ] Quality score 0–100 computed client-side in <500ms
- [ ] If score < 60: show rejection UI with specific reason ("Too blurry", "Too dark", "Too far away") and retake prompt
- [ ] If score 60–79: show warning with option to proceed or retake
- [ ] If score ≥ 80: proceed to inference
- [ ] Quality score stored in assessment metadata

### Technical Notes
- Use Canvas API for pixel-level analysis — no additional library required
- Laplacian blur detection: compute variance of Laplacian kernel on grayscale image

---

## Issue #15: Multi-Image Composite Assessment

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Allow CHWs to capture multiple images of the same wound/condition (different angles, lighting, close-up/wide) and send all images to Gemma for a composite assessment.

### Acceptance Criteria
- [ ] Camera UI supports capturing 2–6 images before triggering inference
- [ ] Images displayed as thumbnail strip with delete option
- [ ] All images passed to Gemma in a single inference call
- [ ] Gemma prompt updated to explain multi-image context
- [ ] Assessment record stores all images (base64 locally, URLs on sync)
- [ ] UI indicates "Multi-image assessment" on result screen

---

## Issue #16: Temporal Wound Progression Tracking

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Enable CHWs to compare a patient's current wound/condition images against previous visit images, with AI commentary on progression.

### Acceptance Criteria
- [ ] Patient detail screen shows image timeline for recurring conditions
- [ ] Side-by-side comparison view: current vs. previous visit
- [ ] New triage flow option: "Follow-up assessment" — loads previous images for comparison
- [ ] Gemma prompt includes previous image context for follow-up assessments
- [ ] AI output for follow-ups includes `progression: "improving | stable | deteriorating"` field
- [ ] Progression trend shown as icon/colour on patient timeline

---

## Issue #17: Antibiotic Stewardship Guardrails

**Labels:** `priority: critical` `type: clinical-safety` `phase: 1`

### Description
Add explicit antibiotic stewardship logic to prevent inappropriate antibiotic recommendations and include AMR education in relevant assessments.

### Acceptance Criteria
- [ ] AI prompt updated to: never recommend specific antibiotic names, always defer to local protocol
- [ ] When AI output contains antibiotic language: post-process to replace with "antibiotic therapy per local protocol"
- [ ] Viral vs bacterial distinction shown prominently in assessment (antibiotics not indicated for viral conditions)
- [ ] Add AMR warning card: shown whenever any antibiotic treatment is mentioned
- [ ] Create `lib/antibiotic-filter.ts` that post-processes Gemma output to strip non-protocol antibiotic recommendations
- [ ] Supervisor can configure local antibiotic protocol reference (displayed instead of generic guidance)

---

## Issue #18: Zoonotic & Outbreak Disease Detection Alerts

**Labels:** `priority: critical` `type: clinical-safety` `type: feature` `phase: 1`

### Description
Implement automatic supervisor alerting when conditions with outbreak potential are detected, even tentatively.

### Acceptance Criteria
- [ ] Create `lib/outbreak-flags.ts` with list of notifiable/outbreak-potential conditions
- [ ] Minimum: cholera, mpox, Lassa fever, measles, meningococcal meningitis, Ebola (rash phase), typhoid
- [ ] When any outbreak-potential condition appears in `possible_conditions` (any probability): create immediate supervisor alert
- [ ] Alert is queued even offline; syncs and notifies as priority-1 on next connection
- [ ] CHW sees: "This condition may require public health notification — contact supervisor"
- [ ] Supervisor dashboard shows outbreak alerts in dedicated red banner section
- [ ] False positive rate managed by including confidence threshold configuration

---

## Issue #19: Mental Health Screening — Brief Validated Tools

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Add optional validated mental health screening tools as add-ons to any assessment.

### Acceptance Criteria
- [ ] Implement PHQ-2 (depression screening, 2 questions)
- [ ] Implement GAD-2 (anxiety screening, 2 questions)
- [ ] Implement AUDIT-C (alcohol use, 3 questions)
- [ ] Screens accessible as optional add-on from any assessment or patient record
- [ ] Scoring and interpretation displayed with recommended action
- [ ] Results stored in assessment record: `mental_health_screens: { tool, score, date }`
- [ ] Referral guidance for positive screens included
- [ ] All screens available offline in all 6 supported languages

---

## Issue #20: Chronic Disease Management Pathways

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Add structured longitudinal monitoring pathways for the dominant chronic disease burden: hypertension, diabetes, and HIV/TB.

### Acceptance Criteria
- [ ] New route: `_app.chronic.tsx`
- [ ] Hypertension pathway: BP recording over time, medication adherence, lifestyle advice, escalation criteria
- [ ] Diabetes pathway: blood glucose recording, foot inspection (links to Wagner scale), HbA1c tracking, hypoglycaemia guidance
- [ ] HIV/TB: treatment adherence tracking, side effect monitoring, missed dose protocol
- [ ] Each pathway produces a structured monitoring record linked to patient profile
- [ ] Trend charts for key metrics (BP, glucose) shown on patient timeline
- [ ] Alert when values reach escalation threshold
- [ ] All offline

---

# SECTION 2 — Functional Requirements

---

## Issue #21: Offline Patient Search & Filtering

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Implement full-text search and multi-field filtering within the local IndexedDB store.

### Acceptance Criteria
- [ ] Search bar on patient list page with real-time results
- [ ] Full-text search across: patient identifier, name (if stored), condition history
- [ ] Filters: sex, age range, urgency level, date range, CHW (supervisor view), sync status
- [ ] Search results returned in <200ms on 1,000 patient dataset
- [ ] Search works fully offline
- [ ] "No results" state with helpful messaging

### Technical Notes
- Dexie.js supports compound indexes — use for filter combinations
- For full-text search, consider Dexie-fts or implement simple tokenisation on key fields

---

## Issue #22: Patient Deduplication Engine

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Detect and surface potential duplicate patient records to CHWs and supervisors for resolution.

### Acceptance Criteria
- [ ] Create `lib/deduplication.ts`
- [ ] Fuzzy matching on: identifier, age ± 2 years, sex, location (within 500m)
- [ ] Similarity score computed; records with score > 0.8 flagged as potential duplicates
- [ ] Supervisor dashboard: "Potential duplicates" section
- [ ] CHW and supervisor can merge duplicates: choose which record is primary, merge assessment history
- [ ] Merge creates audit trail
- [ ] Deduplication check runs on new patient creation and on sync

### Technical Notes
- Use Levenshtein distance for name/ID fuzzy matching
- Run deduplication as background task post-sync, not blocking UI

---

## Issue #23: Barcode / QR Code Patient ID Scanning

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Allow CHWs to scan a QR code or barcode on a national health card to instantly pull up a patient record, replacing manual ID entry.

### Acceptance Criteria
- [ ] QR/barcode scanning integrated in patient lookup flow
- [ ] Uses device camera via `jsQR` or `zxing-js/browser`
- [ ] Scan on new patient creation: pre-fills ID field from scanned code
- [ ] Scan on patient lookup: searches for matching patient record
- [ ] Works offline
- [ ] Fallback to manual entry if scan fails after 5 seconds
- [ ] Supported formats: QR Code, Code 128, Code 39 (common on health cards)

---

## Issue #24: Referral Outcome Tracking & Closed-Loop Feedback

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Add a workflow for recording what happened after a referral was made, creating a closed feedback loop.

### Acceptance Criteria
- [ ] Assessment referral status extended: `none → sent → received → attended → diagnosed → resolved | lost_to_followup`
- [ ] CHW can update referral status from patient record
- [ ] New fields on referral update: `facility_diagnosis`, `treatment_given`, `outcome_notes`
- [ ] Supervisor can update referral status from dashboard
- [ ] Patient timeline shows full referral journey
- [ ] Analytics: referral completion rate, time-to-attendance, diagnosis match rate (AI vs facility)
- [ ] All status updates stored offline and synced

---

## Issue #25: Follow-Up Scheduling with Local Notifications

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Allow CHWs to schedule follow-up reminders for specific patients with local push notifications.

### Acceptance Criteria
- [ ] "Schedule follow-up" button on every assessment result and patient record
- [ ] CHW sets: date, time, reason (free text or from preset list)
- [ ] Local notification fired at scheduled time even when app is closed (use service worker notification)
- [ ] Notification taps open directly to patient record
- [ ] Upcoming follow-ups shown on CHW dashboard
- [ ] Overdue follow-ups highlighted prominently
- [ ] Follow-up records stored in Dexie and synced to supervisor

### Technical Notes
- Use Push API + Service Worker for background notifications
- On iOS, notifications require the PWA to be installed — show install prompt when scheduling

---

## Issue #26: Batch Assessment Mode for Outreach Events

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Create a rapid-throughput mode for assessing multiple patients at a community outreach event.

### Acceptance Criteria
- [ ] New route: `_app.batch-triage.tsx`
- [ ] Supervisor can create a "Batch Session" (name, location, date, expected count)
- [ ] Streamlined per-patient flow: photo → auto-AI → quick confirm → next (target <30s per patient)
- [ ] Minimal required fields: age, sex, chief complaint — everything else optional
- [ ] Session summary at end: total assessed, urgency breakdown, referrals generated
- [ ] All records saved offline and linked to batch session
- [ ] Session exported as summary PDF for programme reporting

---

## Issue #27: Referral Letter Template Customisation

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Allow supervisors to configure referral letter templates with facility-specific branding and required fields.

### Acceptance Criteria
- [ ] Supervisor settings: referral template editor
- [ ] Configurable fields: facility name, facility address, facility code, logo (image upload), custom fields (up to 5)
- [ ] Digital signature capture: CHW can draw signature in app, embedded in PDF
- [ ] Template preview before saving
- [ ] Template stored offline and applied to all referral PDFs
- [ ] Multiple templates: supervisor can configure different templates for different referral destinations
- [ ] Template changes sync to all CHWs under the supervisor

---

## Issue #28: In-App Supervisor–CHW Messaging

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Enable asynchronous text messaging between CHWs and their supervisors, with ability to attach assessment records.

### Acceptance Criteria
- [ ] New route: `_app.messages.tsx`
- [ ] Thread-based messaging: one thread per CHW–supervisor pair
- [ ] Messages stored offline, synced when online
- [ ] Attachment: CHW can share an assessment record in a message
- [ ] Supervisor can reply with annotated assessment or freetext
- [ ] Unread message count badge in navigation
- [ ] Push notification for new messages (when online)
- [ ] Message history retained for 90 days

---

## Issue #29: Offline Drug Formulary Reference

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Embed an offline searchable national essential medicines list that CHWs can reference for dosing and indication information.

### Acceptance Criteria
- [ ] WHO Essential Medicines List (EML) integrated as offline JSON data
- [ ] Searchable by drug name (generic and trade), indication, condition
- [ ] Each entry: indication, standard dose, paediatric dose, contraindications, common side effects
- [ ] Accessible from assessment result screen ("Check drug reference") and standalone from navigation
- [ ] Supervisor can configure a regional/national formulary to override WHO EML
- [ ] Content licensed for redistribution (WHO EML is open access)

---

## Issue #30: Immunisation Records & Schedule Module

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Add a structured immunisation history and schedule module to the patient record.

### Acceptance Criteria
- [ ] New section in patient record: "Immunisations"
- [ ] Configurable schedule based on national programme (default: WHO EPI schedule)
- [ ] CHW can record: vaccine name, date given, batch number, site, administered by
- [ ] Schedule view shows: due, overdue, and completed vaccines for patient's age
- [ ] Overdue vaccines highlighted with reminder flag
- [ ] Mass immunisation event mode: rapid recording for multiple patients in sequence
- [ ] Data stored offline and synced

---

## Issue #31: Family / Household Linkage

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Allow patients to be linked as household members, enabling household-level health monitoring.

### Acceptance Criteria
- [ ] Household entity in data model: `households: { id, address, geolocation, head_name }`
- [ ] Patients can be assigned to a household during registration
- [ ] Household view: all members listed with recent assessment summaries
- [ ] Alert: when 2+ household members present with same condition within 14 days → generate household alert
- [ ] Supervisor map shows household-level clustering

---

## Issue #32: Intelligent Sync Prioritisation

**Labels:** `priority: high` `type: infrastructure` `phase: 2`

### Description
Prioritise sync order based on clinical urgency rather than chronological order.

### Acceptance Criteria
- [ ] Sync queue ordered by: (1) Red urgency assessments, (2) Referrals sent, (3) Outbreak flags, (4) New patients, (5) Routine assessments
- [ ] On very low bandwidth (measured <50kbps): send metadata only, defer image upload
- [ ] Sync sends critical records even if full sync would fail
- [ ] Sync log shows: records sent in this session, any failed items, retry schedule
- [ ] Supervisor receives Red urgency sync immediately when CHW connects

---

## Issue #33: Offline Clinical Protocol Library

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Create a standalone searchable offline library of clinical protocols, first aid guides, and condition fact sheets.

### Acceptance Criteria
- [ ] New route: `_app.library.tsx`
- [ ] Initial content: 50+ protocol and reference documents
- [ ] Search by condition name, symptom, or keyword
- [ ] Content tagged by: body system, condition type, patient group
- [ ] Supervisor can add custom protocols (PDF or structured text)
- [ ] All content cached in IndexedDB at install

---

## Issue #34: Assessment Correction & Amendment with Audit Trail

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Allow CHWs and supervisors to annotate, correct, or amend AI assessments with full audit trail.

### Acceptance Criteria
- [ ] "Amend Assessment" button on completed assessment (CHW: own records only; supervisor: all records)
- [ ] Editable fields: condition, urgency, recommendation, notes
- [ ] Original AI values preserved; amendment stored separately
- [ ] Reason for amendment required (free text)
- [ ] Amendment audit trail: `amendments: [{ field, original_value, new_value, amended_by, reason, timestamp }]`
- [ ] Amended assessments visually flagged in patient timeline
- [ ] Amendments synced to backend

---

## Issue #35: Batch PDF Report Export

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Allow supervisors to generate aggregated PDF reports covering multiple assessments, suitable for submission to district health offices.

### Acceptance Criteria
- [ ] Supervisor dashboard: "Generate Report" with date range and region filters
- [ ] Report sections: executive summary, assessment volume, condition breakdown, urgency distribution, referral outcomes, CHW activity
- [ ] Report uses programme branding (configured template)
- [ ] Output as PDF using existing PDF generation infrastructure
- [ ] Option to include or exclude identifiable patient data (anonymised mode)

---

## Issue #36: Biometric Patient Identification

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Integrate fingerprint or face recognition for patient identification in contexts where patients lack formal IDs.

### Acceptance Criteria
- [ ] WebAuthn-based biometric option on patient registration and lookup
- [ ] Fingerprint template stored encrypted on-device, not in Supabase
- [ ] Face recognition via device camera as fallback (uses ML Kit or similar)
- [ ] Biometric match returns matching patient record
- [ ] Privacy disclosure: biometric data never leaves device
- [ ] Works offline
- [ ] Configurable on/off by supervisor

---

## Issue #37: Optional Audio Recording of Consultations

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Allow optional recording of the full CHW-patient consultation for supervisor review and training.

### Acceptance Criteria
- [ ] "Record consultation" toggle in assessment flow (default off)
- [ ] Recording requires explicit patient consent step before starting
- [ ] Audio stored encrypted in IndexedDB
- [ ] Recording accessible to: CHW who created it, their supervisor
- [ ] Supervisor can use recordings for quality assurance and CHW training
- [ ] Auto-delete recordings after 30 days (configurable)
- [ ] Recording does not affect AI inference pipeline

---

## Issue #38: Geo-Fencing for Catchment Area Anomaly Alerts

**Labels:** `priority: low` `type: feature` `phase: 4`

### Description
Alert supervisors when assessments are submitted from outside a CHW's expected geographic catchment area.

### Acceptance Criteria
- [ ] Supervisor can define CHW catchment area polygon on map
- [ ] Assessment geolocation compared to catchment polygon on sync
- [ ] Out-of-area assessments flagged in supervisor dashboard with map view
- [ ] CHW can add note explaining reason for out-of-area assessment
- [ ] Configurable sensitivity (distance threshold before flagging)

---

## Issue #39: Supervisor Case Delegation & Task Tracking

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Allow supervisors to assign specific patient cases to CHWs for follow-up, with task tracking.

### Acceptance Criteria
- [ ] Supervisor can create task: assigned CHW, patient, action required, due date
- [ ] CHW receives task notification in their notification centre
- [ ] Task appears in CHW dashboard "My Tasks" section
- [ ] CHW marks task complete with notes
- [ ] Supervisor sees completion status on dashboard
- [ ] Overdue tasks escalated to supervisor alert

---

## Issue #40: Digital Patient Consent Management

**Labels:** `priority: critical` `type: clinical-safety` `type: feature` `phase: 1`

### Description
Implement a structured, auditable digital consent workflow replacing the assumed verbal consent.

### Acceptance Criteria
- [ ] Consent screen shown on every new patient registration
- [ ] Consent items clearly listed in patient's language: data collected, how used, who sees it, right to withdraw
- [ ] Consent capture methods: CHW verbal confirmation, thumbprint capture, drawn signature
- [ ] Consent record stored: `consent: { version, method, captured_at, captured_by }`
- [ ] Consent version tracked — if consent policy changes, re-consent workflow triggered
- [ ] CHW cannot complete assessment without recorded consent
- [ ] Patient can withdraw consent — triggers data deletion workflow
- [ ] Compliant with GDPR Article 7, Nigeria DPA, and HIPAA

---

# SECTION 3 — Non-Functional Requirements

---

## Issue #41: WebGPU Fallback Chain — WASM → CPU Inference

**Labels:** `priority: critical` `type: infrastructure` `phase: 1`

### Description
Implement a fallback chain so the app functions on devices without WebGPU support, which is the majority of budget Android phones in target regions.

### Acceptance Criteria
- [ ] Detect WebGPU support at app startup
- [ ] If WebGPU available: use WebLLM as current
- [ ] If no WebGPU: attempt WebAssembly WASM inference (use llama.cpp WASM build or similar)
- [ ] If WASM too slow (<5 tok/s): use CPU-only inference with quantised model
- [ ] Inference engine selection shown to user: "Running on: GPU / CPU"
- [ ] Performance expectations set per engine: "This may take 30–60 seconds on your device"
- [ ] Demo mode as final fallback (current) when no inference possible
- [ ] All fallbacks fully offline

### Technical Notes
- Test on: Samsung Galaxy A03 (1.6GHz, 3GB RAM) as minimum target device
- WASM options: llama.cpp compiled to WASM, MLC-LLM WASM target

---

## Issue #42: Resumable Model Download with Progress

**Labels:** `priority: critical` `type: infrastructure` `phase: 1`

### Description
Implement resumable, chunk-based model downloading with visible progress so CHWs can download the model on slow connections without losing progress on interruption.

### Acceptance Criteria
- [ ] Model download split into chunks (max 50MB each)
- [ ] Each chunk stored in IndexedDB as it downloads
- [ ] Download resumes from last successful chunk after interruption
- [ ] Progress bar shows: percentage, estimated time remaining, current download speed
- [ ] Pause and resume control
- [ ] Verify each chunk with SHA-256 checksum
- [ ] Model assembly and validation on completion
- [ ] Background download: user can navigate the app while model downloads in a service worker
- [ ] Download works on 2G (tested at 50kbps minimum)

---

## Issue #43: Model Version Management & Background Updates

**Labels:** `priority: high` `type: infrastructure` `phase: 2`

### Description
Implement a background model update system with activation control and rollback capability.

### Acceptance Criteria
- [ ] Version manifest endpoint returns: current model version, download URL, checksum, changelog
- [ ] App checks for model update on startup (when online)
- [ ] New model downloads silently in background using new resumable download system
- [ ] "Update ready" notification appears when download complete
- [ ] User activates update on next app launch (never interrupts active session)
- [ ] Previous model version retained for 7 days (rollback target)
- [ ] Manual rollback in settings if new model performs poorly
- [ ] Model version shown in settings and assessment records

---

## Issue #44: Inference Result Caching for Similar Images

**Labels:** `priority: medium` `type: performance` `phase: 3`

### Description
Cache inference results for visually similar images to avoid redundant inference on follow-up visits.

### Acceptance Criteria
- [ ] Compute perceptual hash (pHash) for each captured image
- [ ] Before inference: check cache for similar pHash (Hamming distance < 10)
- [ ] Cache hit: return cached result with timestamp, prompt CHW to confirm ("Similar to previous assessment from [date] — use that result?")
- [ ] Cache miss: run inference as normal
- [ ] Cache stored in IndexedDB with TTL of 30 days
- [ ] Cache size limit: 100 entries (LRU eviction)

---

## Issue #45: Storage Quota Management & Proactive Cleanup

**Labels:** `priority: high` `type: infrastructure` `phase: 2`

### Description
Implement proactive storage management to prevent data loss from storage exhaustion.

### Acceptance Criteria
- [ ] Storage usage indicator in settings (used / available)
- [ ] At 70%: subtle warning banner in settings
- [ ] At 80%: prominent warning on dashboard with "Manage Storage" button
- [ ] At 90%: block new assessments with mandatory cleanup prompt
- [ ] Cleanup options: delete synced images (keep text records), archive old records, delete records older than N days
- [ ] Auto-archive: synced records older than 90 days moved to compressed archive format
- [ ] Storage usage breakdown: model, images, patient records, cache
- [ ] All cleanup actions logged in audit trail

---

## Issue #46: App Bundle Optimisation — Target <500KB Initial Load

**Labels:** `priority: high` `type: performance` `phase: 2`

### Description
Reduce the initial JS bundle size to under 500KB to improve load times on slow mobile connections.

### Acceptance Criteria
- [ ] Audit current bundle composition using `rollup-plugin-visualizer`
- [ ] Implement route-based code splitting for all routes
- [ ] Lazy load: AI model loading, PDF generation, charts, map components
- [ ] Tree shake all dependencies — remove unused exports
- [ ] Compress all assets: Brotli for JS/CSS, WebP for images
- [ ] Measure: initial bundle < 500KB gzipped
- [ ] Lighthouse performance score > 85 on simulated 3G

---

## Issue #47: Battery Consumption Optimisation

**Labels:** `priority: high` `type: performance` `phase: 2`

### Description
Profile and optimise battery usage, particularly during WebGPU inference, and implement low-battery mode.

### Acceptance Criteria
- [ ] Profile battery drain during: model loading, inference, idle, sync
- [ ] Implement GPU buffer release immediately after inference completes
- [ ] Low battery mode (< 20%): defer non-critical sync, disable map refresh, reduce animation
- [ ] Low battery mode toggle in settings (manual override)
- [ ] Avoid holding WebGPU device lock between inference calls
- [ ] Battery status shown in settings with "Currently in low battery mode" indicator

---

## Issue #48: Per-Feature Performance Budgets & Instrumentation

**Labels:** `priority: medium` `type: performance` `phase: 2`

### Description
Define and instrument per-feature performance SLAs with automated regression detection.

### Acceptance Criteria
- [ ] Define performance budgets:
  - Image capture to preview: < 500ms
  - AI inference first token: < 2s
  - Patient list load: < 300ms
  - Patient record open: < 300ms
  - Referral PDF generation: < 3s
  - Sync status update: < 1s
- [ ] Instrument using `performance.mark()` / `performance.measure()`
- [ ] Metrics sent to monitoring backend (when online)
- [ ] CI performance test: fail build if any budget exceeded by > 20%
- [ ] Performance dashboard in supervisor analytics

---

## Issue #49: WebGPU Memory Pressure Handling

**Labels:** `priority: high` `type: infrastructure` `phase: 2`

### Description
Implement explicit GPU memory management to prevent OOM crashes on memory-constrained devices.

### Acceptance Criteria
- [ ] Monitor `navigator.deviceMemory` and available GPU memory
- [ ] Release all WebGPU buffers immediately after each inference
- [ ] Listen to `navigator.hardwareConcurrency` to calibrate concurrent operations
- [ ] On memory pressure event: unload model, show "Reloading AI..." message, reload
- [ ] Implement model unload/reload cycle with < 5s recovery time
- [ ] On repeated OOM: suggest switching to demo mode or lower-parameter model variant
- [ ] Memory usage shown in debug/settings screen

---

## Issue #50: Sync Conflict Resolution — Three-Way Merge

**Labels:** `priority: high` `type: infrastructure` `phase: 2`

### Description
Replace last-write-wins conflict resolution with a proper three-way merge strategy.

### Acceptance Criteria
- [ ] Conflict detection: compare `updated_at` timestamp and field-level checksums between local and server versions
- [ ] Auto-merge: non-conflicting field changes merged silently
- [ ] Conflict flagged: when same field changed in both local and server version
- [ ] Supervisor conflict resolution UI: shows both versions, allows field-by-field resolution
- [ ] Resolution audit trail: `conflict_resolution: { field, local_value, server_value, chosen_value, resolved_by }`
- [ ] Unresolved conflicts shown in supervisor dashboard

---

## Issue #51: WCAG 2.2 AA Accessibility Compliance

**Labels:** `priority: high` `type: ux` `phase: 2`

### Description
Audit and remediate the app to meet WCAG 2.2 Level AA accessibility standards.

### Acceptance Criteria
- [ ] Run automated audit: axe-core, Lighthouse accessibility
- [ ] Fix all critical violations (colour contrast, missing labels, keyboard traps)
- [ ] Touch target minimum: 44×44px for all interactive elements
- [ ] Screen reader support: NVDA + Chrome on Android tested
- [ ] Focus management: proper focus flow in modals and route transitions
- [ ] All images have descriptive alt text
- [ ] ARIA landmarks on all major sections
- [ ] Captions/transcripts for any audio content
- [ ] Existing Playwright a11y tests passing at AA level

---

## Issue #52: Low-Light Camera Preprocessing

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Implement client-side image preprocessing to improve quality of images captured in low-light conditions.

### Acceptance Criteria
- [ ] Preprocessing pipeline in `lib/image-processing.ts`
- [ ] Techniques: adaptive histogram equalisation (CLAHE), bilateral denoising, contrast enhancement
- [ ] Preprocessing runs on Canvas API — no additional library
- [ ] Before/after preview shown to CHW before AI inference
- [ ] Processing time < 1s for 8MP image
- [ ] "Image enhanced" indicator on result
- [ ] CHW can toggle preprocessing on/off
- [ ] Enhancement metadata stored in assessment record

---

## Issue #53: Network Quality Detection & Adaptive Sync

**Labels:** `priority: high` `type: infrastructure` `phase: 2`

### Description
Detect connection quality and adapt sync behaviour accordingly.

### Acceptance Criteria
- [ ] Measure connection quality: use `navigator.connection` + live throughput test
- [ ] Connection tiers: WiFi, 4G, 3G, 2G, offline
- [ ] WiFi/4G: full sync including images
- [ ] 3G: compress images before upload, sync text data first
- [ ] 2G: metadata only sync, queue images for WiFi
- [ ] Sync UI shows: current connection tier, estimated upload time
- [ ] User can override automatic behaviour in settings
- [ ] Image compression: 85% JPEG quality for 3G, 60% for 2G, original for WiFi

---

## Issue #54: End-to-End Test Suite — Critical Medical Workflows

**Labels:** `priority: high` `type: testing` `phase: 2`

### Description
Build a comprehensive Playwright E2E test suite covering all critical clinical workflows.

### Acceptance Criteria
- [ ] Test scenarios (minimum):
  - New patient registration → triage → save offline
  - Offline triage with no network
  - Referral generation and PDF download
  - Sync from offline to online
  - Supervisor dashboard data load
  - Red flag detection and emergency alert
  - IMCI paediatric assessment pathway
  - Model loading and inference (with mock model in CI)
- [ ] Tests run in CI on every pull request
- [ ] Tests pass on Chromium, Firefox, WebKit
- [ ] Test results reported in GitHub Actions summary
- [ ] Coverage report generated

---

## Issue #55: Sync Infrastructure Load Testing

**Labels:** `priority: high` `type: testing` `phase: 2`

### Description
Load test the Supabase sync infrastructure against realistic CHW burst patterns.

### Acceptance Criteria
- [ ] Load test scenario: 500 CHWs simultaneously POSTing 50 assessments each
- [ ] Measure: p50, p95, p99 response times; error rate; Supabase connection pool behaviour
- [ ] Define acceptable thresholds: p99 < 5s, error rate < 0.1%
- [ ] Identify and remediate any bottlenecks
- [ ] Document infrastructure scaling requirements for 500-CHW deployment
- [ ] Consider Supabase Pro tier vs. self-hosted for production

---

## Issue #56: Structured Error Logging & Remote Monitoring

**Labels:** `priority: high` `type: infrastructure` `phase: 2`

### Description
Implement structured remote error logging to enable diagnosis of field failures.

### Acceptance Criteria
- [ ] Integrate Sentry (or equivalent open-source: GlitchTip)
- [ ] Error context includes: app version, model version, device info, action being performed, route
- [ ] PHI scrubber: strip any patient data before sending to Sentry
- [ ] Errors queued offline and sent when online
- [ ] Critical errors (AI inference failure, sync failure, storage exhaustion): alert supervisor
- [ ] Error dashboard in supervisor analytics
- [ ] Privacy disclosure: error reports collected, what data is included

---

## Issue #57: Localisation Quality Assurance — Medical Terminology

**Labels:** `priority: critical` `type: clinical-safety` `phase: 1`

### Description
Conduct native speaker medical review of all 6 supported languages to ensure clinical terminology accuracy.

### Acceptance Criteria
- [ ] Engage native speaker medical reviewers for: French, Swahili, Hindi, Portuguese, Arabic
- [ ] Review scope: all UI strings with medical meaning, AI prompt translations, assessment output translations
- [ ] Document review findings in `docs/localisation-review/`
- [ ] Remediate all identified errors
- [ ] Establish contribution process for ongoing translation review (see Issue #113)
- [ ] Add language quality rating to app transparency documentation

---

## Issue #58: Cold Start Performance on Budget Android Devices

**Labels:** `priority: high` `type: performance` `phase: 2`

### Description
Profile and optimise app cold start time on a $80–$100 Android device (Samsung Galaxy A-series equivalent).

### Acceptance Criteria
- [ ] Define target test device: Samsung Galaxy A03 or equivalent (Octa-core 1.6GHz, 3GB RAM, Android 11)
- [ ] Measure baseline cold start time (app install to dashboard)
- [ ] Target: < 3s cold start (excluding model load)
- [ ] Identify and fix top 3 cold start bottlenecks
- [ ] Defer all non-critical initialisation to after first render
- [ ] Add automated cold start performance test in CI

---

## Issue #59: PWA Install Prompt Optimisation

**Labels:** `priority: medium` `type: ux` `phase: 3`

### Description
Optimise the PWA install prompt timing and copy to maximise install conversion rate.

### Acceptance Criteria
- [ ] Remove or delay any install prompt shown before first successful triage
- [ ] Show contextual install prompt after first successful triage: "Install Trij for faster access and offline use"
- [ ] Install prompt is dismissible and doesn't appear more than once per 7 days
- [ ] Track install conversion rate in analytics
- [ ] iOS-specific install guide (iOS requires manual "Add to Home Screen")
- [ ] Installation step included in onboarding tutorial

---

## Issue #60: Data Integrity Checksums for Medical Records

**Labels:** `priority: high` `type: infrastructure` `phase: 2`

### Description
Add cryptographic checksums to all stored medical records to detect data corruption.

### Acceptance Criteria
- [ ] SHA-256 checksum computed for every patient record and assessment on write
- [ ] Checksum stored alongside record in IndexedDB
- [ ] Checksum verified on every record read
- [ ] Corruption detected: record flagged as `integrity: corrupted`, supervisor alerted
- [ ] Integrity verification report available in supervisor dashboard
- [ ] Checksums included in sync payload and verified server-side
- [ ] Recovery: supervisor can restore from last known good sync

---

# SECTION 4 — Security & Regulatory Compliance

---

## Issue #61: On-Device Data Encryption at Rest

**Labels:** `priority: critical` `type: security` `phase: 1`

### Description
Encrypt all IndexedDB data using AES-256 with a key derived from the CHW's PIN.

### Acceptance Criteria
- [ ] Key derivation: PBKDF2 with 100,000 iterations, SHA-256, random salt per device
- [ ] AES-256-GCM encryption for all patient and assessment records
- [ ] Encryption key derived from PIN and stored only in SessionStorage (cleared on lock)
- [ ] All data reads/writes go through `lib/encrypted-db.ts` wrapper
- [ ] Unencrypted data never written to IndexedDB (verified by test)
- [ ] Key destroyed on: app lock, timeout, device loss wipe
- [ ] Performance: encryption adds < 100ms overhead per record operation
- [ ] Migration: encrypt existing unencrypted records on first upgrade

### Technical Notes
- Use Web Crypto API — no external library
- Test that data is unreadable via DevTools without correct PIN

---

## Issue #62: Biometric Authentication via WebAuthn

**Labels:** `priority: high` `type: security` `phase: 2`

### Description
Add fingerprint / face unlock as an alternative to PIN authentication using device secure enclave via WebAuthn.

### Acceptance Criteria
- [ ] WebAuthn registration flow in onboarding settings
- [ ] Biometric unlock on app open and after timeout
- [ ] Fallback to PIN if biometric fails 3 times
- [ ] Biometric credential stored in device secure enclave (not in app storage)
- [ ] Works on Android (fingerprint sensor) and iOS (Face ID / Touch ID)
- [ ] Setting to enable/disable biometric auth

---

## Issue #63: Session Timeout & Automatic Screen Lock

**Labels:** `priority: high` `type: security` `phase: 2`

### Description
Implement automatic screen lock after configurable inactivity period.

### Acceptance Criteria
- [ ] Default lock timeout: 5 minutes of inactivity
- [ ] Supervisor can configure timeout: 1, 5, 10, 30 minutes, or never
- [ ] Lock screen shows: app logo only — no patient data visible
- [ ] Re-authentication: PIN or biometric
- [ ] Active assessment is preserved (not discarded) on lock — resumes after unlock
- [ ] Lock triggers immediately on: home button press, screen off
- [ ] Emergency call-out: even when locked, offline indicator visible

---

## Issue #64: Audit Trail for All PHI Data Access

**Labels:** `priority: critical` `type: security` `phase: 1`

### Description
Log every read, write, and delete action on patient records with a tamper-evident audit trail.

### Acceptance Criteria
- [ ] Audit log schema: `{ id, timestamp, user_id, action, resource_type, resource_id, ip_if_online }`
- [ ] Actions logged: create, read, update, delete, export, share, sync
- [ ] Audit log stored in separate Dexie store, not modifiable by app logic
- [ ] Audit log synced to Supabase (append-only table, no update/delete permissions)
- [ ] Supervisor can view audit log filtered by CHW, date, resource
- [ ] Audit log retained for minimum 6 years (configurable)
- [ ] Audit log export available as CSV

---

## Issue #65: Fine-Grained Role-Based Access Control

**Labels:** `priority: high` `type: security` `phase: 2`

### Description
Document and implement the full RBAC matrix for all data access permissions.

### Acceptance Criteria
- [ ] Define and document RBAC matrix:
  | Role | Own patients | Other CHW patients | Aggregate data | Config |
  |------|-------------|-------------------|---------------|--------|
  | CHW | Full access | No access | None | Personal only |
  | Supervisor | Read + amend | Read only (their team) | Team aggregate | Team config |
  | Admin | Read only | Read only | Full region | Full config |
- [ ] Implement all rules in Supabase RLS policies
- [ ] Implement frontend guards matching backend rules
- [ ] Write integration tests verifying each role boundary
- [ ] Document RBAC matrix in `docs/security/RBAC.md`

---

## Issue #66: Sync Transport Security Hardening

**Labels:** `priority: high` `type: security` `phase: 2`

### Description
Harden all network communications beyond standard HTTPS.

### Acceptance Criteria
- [ ] Enforce TLS 1.3 minimum on all Supabase calls
- [ ] Implement certificate pinning for Supabase endpoint
- [ ] HSTS header configured on all responses
- [ ] Reject connections where certificate validation fails
- [ ] Subresource Integrity (SRI) hashes on all CDN-loaded scripts
- [ ] Content Security Policy header blocking inline scripts and unknown origins
- [ ] All implemented and verified with securityheaders.com score A+

---

## Issue #67: Patient Anonymisation with k-Anonymity for Analytics

**Labels:** `priority: critical` `type: security` `phase: 1`

### Description
Ensure all analytics exports and supervisor views satisfy k-anonymity (k≥5) to prevent re-identification.

### Acceptance Criteria
- [ ] Implement k-anonymity check on all data export operations
- [ ] Any cohort with < 5 patients: suppress or generalise geographic/demographic attributes
- [ ] Analytics aggregations use generalised age groups (not exact ages), generalised location (sub-region not village)
- [ ] CSV export: strip direct identifiers, apply k-anonymity check
- [ ] Document anonymisation methodology in `docs/privacy/ANONYMISATION.md`
- [ ] Supervisor analytics dashboard applies same k-anonymity rules

---

## Issue #68: Vulnerability Disclosure Policy & SECURITY.md

**Labels:** `priority: medium` `type: security` `phase: 3`

### Description
Establish a responsible disclosure policy for security vulnerabilities.

### Acceptance Criteria
- [ ] Create `SECURITY.md` in repo root with: supported versions, how to report, expected response timeline, what to include in report
- [ ] Create `security@trij.app` or equivalent contact
- [ ] Configure GitHub private vulnerability reporting (Settings → Security → Private reporting)
- [ ] Document response SLA: acknowledge within 48h, patch critical within 7 days
- [ ] Create initial CVE tracking process

---

## Issue #69: Automated Dependency Security Scanning

**Labels:** `priority: high` `type: security` `phase: 2`

### Description
Integrate automated dependency vulnerability scanning into CI/CD.

### Acceptance Criteria
- [ ] Enable GitHub Dependabot for npm dependencies
- [ ] Configure Dependabot to auto-create PRs for security patches
- [ ] Integrate `npm audit` in CI pipeline — fail on high/critical CVEs
- [ ] Weekly scheduled dependency scan
- [ ] Snyk integration (free tier) for additional detection
- [ ] Document dependency update policy in `CONTRIBUTING.md`

---

## Issue #70: Regulatory Compliance Documentation

**Labels:** `priority: critical` `type: clinical-safety` `phase: 1`

### Description
Prepare and publish a regulatory compliance matrix mapping app features to applicable legal frameworks.

### Acceptance Criteria
- [ ] Create `docs/compliance/` directory
- [ ] HIPAA Technical Safeguards compliance matrix
- [ ] GDPR Article 25 (Privacy by Design) assessment
- [ ] Nigeria Data Protection Act (DPA) compliance assessment
- [ ] India DPDP Act 2023 compliance assessment
- [ ] WHO SMART Guidelines alignment assessment
- [ ] Each item: requirement, how Trij meets it, gaps and remediation plan
- [ ] Publish as `COMPLIANCE.md` linked from README

---

## Issue #71: Third-Party Penetration Test

**Labels:** `priority: high` `type: security` `phase: 2`

### Description
Commission an independent penetration test before any institutional deployment.

### Acceptance Criteria
- [ ] Scope defined: PWA frontend, Supabase backend, sync protocol, service worker
- [ ] Engage independent security firm (or responsible researcher programme)
- [ ] Test includes: OWASP Top 10, PHI exfiltration attempts, offline data access, sync manipulation
- [ ] All Critical and High findings remediated before deployment
- [ ] Publish sanitised test summary in `docs/security/PENTEST.md`
- [ ] Schedule annual re-test

---

## Issue #72: Remote Device Wipe Protocol

**Labels:** `priority: high` `type: security` `phase: 2`

### Description
Implement supervisor-triggered remote wipe of all local PHI from a lost or stolen device.

### Acceptance Criteria
- [ ] Supervisor dashboard: "Revoke Device" per registered device
- [ ] On revoke: Supabase marks device token as revoked
- [ ] Next time app connects: receives revocation signal, deletes all IndexedDB data, clears model cache, signs out
- [ ] App shows "This device has been remotely deactivated" screen after wipe
- [ ] Wipe is irreversible
- [ ] Wipe event logged in audit trail
- [ ] If device is offline: revocation queued, executes on next connection

---

# SECTION 5 — User Experience & Accessibility

---

## Issue #73: Interactive Offline Onboarding Tutorial

**Labels:** `priority: high` `type: ux` `phase: 2`

### Description
Build an interactive onboarding tutorial that walks new CHWs through a simulated triage using sample data.

### Acceptance Criteria
- [ ] Tutorial triggered on first login
- [ ] Steps: (1) Take a sample photo, (2) View AI assessment, (3) Complete voice follow-up, (4) Save patient, (5) Generate referral
- [ ] All tutorial steps use pre-loaded sample images and mock AI responses — no inference required
- [ ] Each step has: illustrated instruction, action prompt, success confirmation
- [ ] Tutorial completable in < 5 minutes
- [ ] Skippable but re-accessible from settings "Retake Tutorial"
- [ ] Completable fully offline
- [ ] Tutorial progress tracked; supervisor can see which CHWs have completed it

---

## Issue #74: Offline Help Centre with Illustrated Guides

**Labels:** `priority: high` `type: ux` `phase: 2`

### Description
Create a comprehensive offline help centre accessible from within the app.

### Acceptance Criteria
- [ ] New route: `_app.help.tsx`
- [ ] Sections: Getting Started, Taking Photos, Using Voice, Managing Patients, Referrals, Syncing Data, Troubleshooting
- [ ] Each article: text explanation + illustrated screenshots
- [ ] Search by keyword
- [ ] All content cached at install (< 5MB total)
- [ ] Available in all 6 supported languages
- [ ] "?" help button accessible from every screen (contextual — links to relevant help article)

---

## Issue #75: Customisable Dashboard Widgets

**Labels:** `priority: medium` `type: ux` `phase: 3`

### Description
Allow CHWs to customise which information and shortcuts appear on their dashboard.

### Acceptance Criteria
- [ ] Dashboard enters "customise mode" via long-press or edit button
- [ ] Available widgets: Recent Patients, Today's Follow-Ups, Sync Status, Outbreak Alerts, Quick Stats, Quick Triage button
- [ ] Drag-to-reorder widgets
- [ ] Show/hide individual widgets
- [ ] Layout saved to local profile
- [ ] Default layout configurable by supervisor
- [ ] Works on both mobile and tablet layouts

---

## Issue #76: High-Contrast Sunlight-Readable Mode

**Labels:** `priority: high` `type: ux` `phase: 2`

### Description
Implement a dedicated display mode optimised for bright outdoor sunlight.

### Acceptance Criteria
- [ ] Toggle in settings: "Sunlight Mode"
- [ ] Sunlight mode: maximum contrast (pure black on pure white), increased font size (+2pt), thicker borders, no shadows
- [ ] Auto-detect via ambient light sensor (`AmbientLightSensor` API) if available
- [ ] Mode persists across sessions
- [ ] All screens tested and readable in simulated high-ambient-light conditions
- [ ] Urgency colours remain clearly distinguishable: red, yellow, green pass contrast check in sunlight mode

---

## Issue #77: Haptic Feedback for Urgency Levels

**Labels:** `priority: medium` `type: ux` `phase: 3`

### Description
Use device vibration patterns to communicate urgency levels without requiring the CHW to look at the screen.

### Acceptance Criteria
- [ ] Green: 1 short pulse (100ms)
- [ ] Yellow: 2 pulses (100ms on, 100ms off, 100ms on)
- [ ] Red: long sustained vibration (500ms) + 2 short pulses
- [ ] Vibration fired when assessment result appears
- [ ] Red flag / emergency: continuous SOS-pattern vibration until CHW taps screen
- [ ] Vibration toggle in settings (default on)
- [ ] Uses `navigator.vibrate()` API

---

## Issue #78: Simplified Field Mode — 3-Screen CHW Interface

**Labels:** `priority: high` `type: ux` `phase: 2`

### Description
Create an ultra-simplified interface mode reducing the CHW experience to three core screens.

### Acceptance Criteria
- [ ] "Field Mode" toggle in settings (supervisor can enforce for all CHWs)
- [ ] Field Mode screens: (1) Camera, (2) Result + Save, (3) Patient list
- [ ] All other navigation hidden
- [ ] Back to full mode: require supervisor PIN to exit field mode
- [ ] Field Mode still supports: voice follow-up, urgent alerts, offline sync indicator
- [ ] Designed for one-handed, glove-capable operation
- [ ] Larger text and touch targets than standard mode

---

## Issue #79: Step-by-Step Progress Indicator in Triage Flow

**Labels:** `priority: high` `type: ux` `phase: 2`

### Description
Add a clear progress indicator throughout the triage flow so CHWs always know where they are in the process.

### Acceptance Criteria
- [ ] Step indicator shows throughout triage: Step 1/4: Capture, Step 2/4: Analyse, Step 3/4: Interview, Step 4/4: Save & Refer
- [ ] Each step shown as: labelled circle (completed = filled, current = outlined + pulsing, upcoming = grey)
- [ ] During AI inference: animated progress with estimated time remaining
- [ ] Step indicator visible without scrolling on all screen sizes
- [ ] Screen reader: step announced as "Step 2 of 4: AI Analysis in progress"

---

## Issue #80: Full Back Navigation & Undo Throughout

**Labels:** `priority: high` `type: ux` `phase: 2`

### Description
Ensure consistent back navigation and undo capability at every step of every flow.

### Acceptance Criteria
- [ ] Every screen has a functional back/cancel button
- [ ] Android hardware back button handled correctly throughout
- [ ] Discarding in-progress assessment: confirmation dialog with "Save as draft" option
- [ ] Triage result: CHW can go back and retake photo without losing assessment context
- [ ] Accidental patient deletion: confirm dialog + 5-second undo toast
- [ ] Draft assessments saved automatically every 30 seconds
- [ ] Draft assessments recoverable from dashboard

---

## Issue #81: Rich Offline Status Communication Panel

**Labels:** `priority: medium` `type: ux` `phase: 3`

### Description
Replace the simple offline indicator with a rich status panel explaining what is and isn't available.

### Acceptance Criteria
- [ ] Tap offline indicator → opens status panel
- [ ] Status panel shows:
  - Connection status + type (WiFi, 3G, etc.)
  - Features available offline (full list with checkmarks)
  - Sync queue: N records pending, last synced X minutes ago
  - Estimated sync time when online ("~2 minutes to sync")
  - "Sync now" button (when online)
- [ ] Status panel accessible from every screen

---

## Issue #82: Optional Patient Photo for Record Identification

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Allow CHWs to optionally capture a patient face photo for visual identification on return visits.

### Acceptance Criteria
- [ ] Optional "Add patient photo" step in registration
- [ ] Face photo displayed on patient record and patient list
- [ ] Photo stored encrypted, locally only (never synced to backend)
- [ ] Explicit consent step before capturing: "This photo stays on your device only"
- [ ] Photo deletable by CHW at any time
- [ ] Fallback avatar (initials) when no photo

---

## Issue #83: Tablet & Desktop Layout Optimisation

**Labels:** `priority: medium` `type: ux` `phase: 3`

### Description
Optimise the supervisor dashboard and patient records for tablet and desktop screens.

### Acceptance Criteria
- [ ] Breakpoints: mobile (<768px), tablet (768–1280px), desktop (>1280px)
- [ ] Tablet: two-column layout for patient list + detail view
- [ ] Desktop: three-column layout with sidebar navigation, main content, context panel
- [ ] Supervisor dashboard: side-by-side map + queue on tablet
- [ ] Keyboard navigation: full Tab navigation throughout on desktop
- [ ] Tested on: iPad (Safari), Android tablet (Chrome), 1280px desktop (Chrome)

---

## Issue #84: In-App Notification Centre for CHWs

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Create a notification centre for CHWs showing referral updates, messages, follow-up reminders, and sync status.

### Acceptance Criteria
- [ ] Bell icon in navigation with unread count badge
- [ ] Notification types: referral status update, supervisor message, overdue follow-up, sync complete, new protocol available, app update ready
- [ ] Notifications stored offline
- [ ] Tap notification → navigate to relevant record or screen
- [ ] Mark as read / mark all as read
- [ ] Notification preferences in settings (which types to receive)
- [ ] Notifications retained for 30 days

---

## Issue #85: Graceful AI Failure Communication

**Labels:** `priority: high` `type: ux` `phase: 2`

### Description
Replace generic error messages with clear, actionable guidance when AI inference fails.

### Acceptance Criteria
- [ ] Define failure states: model not loaded, inference timeout, OOM, image processing error
- [ ] Each failure state has specific message + recovery action:
  - Model not loaded: "AI assistant not ready. [Load AI] — or [Proceed without AI]"
  - Inference timeout: "Analysis is taking longer than expected. [Retry] [Use demo mode]"
  - OOM: "Not enough memory. Close other apps and [Try again]"
- [ ] Fallback guidance when AI unavailable: "Without AI analysis, refer all Red/Yellow signs to clinic"
- [ ] Manual assessment mode: CHW can complete assessment without AI by selecting from condition list
- [ ] Failure rate tracked in error monitoring

---

# SECTION 6 — Supervisor, Analytics & Programme Management

---

## Issue #86: Real-Time Outbreak Detection Dashboard

**Labels:** `priority: critical` `type: feature` `phase: 1`

### Description
Implement automated geographic and temporal clustering on the supervisor map to detect potential outbreaks.

### Acceptance Criteria
- [ ] Clustering algorithm: DBSCAN on geolocation + condition + date
- [ ] Alert threshold: 3+ same-condition assessments within 5km radius within 7 days
- [ ] Outbreak alert: supervisor notified immediately when threshold crossed
- [ ] Map overlay: outbreak cluster shown as pulsing red circle with condition name
- [ ] Alert detail: condition, case count, geographic centroid, earliest case date, list of affected patients
- [ ] One-click: alert ministry of health template message (supervisor can edit before sending)
- [ ] False positive suppression: known seasonal conditions configurable

---

## Issue #87: CHW Performance Analytics Dashboard

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Provide supervisors with per-CHW performance analytics to enable targeted supervision.

### Acceptance Criteria
- [ ] Per-CHW metrics: assessments/day (7-day trend), referral rate, referral completion rate, AI override rate (CHW changed AI assessment), sync frequency
- [ ] Comparison view: CHW vs. team average
- [ ] Trend lines for all metrics
- [ ] Anomaly detection: flag CHWs with unusually high or low activity
- [ ] Performance report exportable as PDF per CHW
- [ ] All analytics computed from synced data in Supabase
- [ ] Privacy: CHWs cannot see each other's performance metrics

---

## Issue #88: Predictive Seasonal Demand Forecasting

**Labels:** `priority: medium` `type: feature` `phase: 4`

### Description
Use historical assessment data to predict periods of high demand and alert supervisors proactively.

### Acceptance Criteria
- [ ] Collect ≥6 months of assessment history before enabling
- [ ] Time-series forecasting per condition category per region
- [ ] 4-week forecast shown in supervisor dashboard
- [ ] Alert: "Malaria cases expected to increase 40% in your region in 3 weeks — consider increasing CHW capacity"
- [ ] Forecast accuracy tracked and displayed
- [ ] Configurable alert thresholds

---

## Issue #89: DHIS2 Integration

**Labels:** `priority: critical` `type: infrastructure` `phase: 3`

### Description
Build a DHIS2 export adaptor to enable automated reporting to national health information systems.

### Acceptance Criteria
- [ ] Create `lib/dhis2-export.ts`
- [ ] Map Trij data elements to DHIS2 standard data elements (per WHO SMART Guidelines)
- [ ] Configurable DHIS2 organisation unit mapping (Trij region → DHIS2 org unit)
- [ ] Configurable DHIS2 data set and period
- [ ] Automated monthly report generation in DHIS2 format
- [ ] Manual export trigger in supervisor dashboard
- [ ] Export validation: check completeness before submission
- [ ] Document setup guide in `docs/integrations/DHIS2.md`

---

## Issue #90: Supervisor Mobile View Optimisation

**Labels:** `priority: high` `type: ux` `phase: 2`

### Description
Create a mobile-optimised supervisor experience for managing the team while in the field.

### Acceptance Criteria
- [ ] Mobile supervisor home: pending referrals count, active alerts, team sync status at a glance
- [ ] One-tap referral acknowledgement from mobile
- [ ] Quick message to CHW from notification
- [ ] Map view on mobile: large touch targets, simplified clustering
- [ ] Offline: supervisor can view last-synced data offline
- [ ] Optimised for single-hand use on 5–6 inch screen

---

## Issue #91: Analytics Export — Power BI & Tableau Compatible

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Provide analytics data export in formats compatible with Power BI and Tableau.

### Acceptance Criteria
- [ ] Export format: CSV with consistent schema, and OData feed endpoint
- [ ] Pre-built Power BI template file (`.pbix`) with standard Trij dashboards
- [ ] Pre-built Tableau workbook (`.twbx`) with standard Trij dashboards
- [ ] Data dictionary documenting all exported fields
- [ ] Anonymisation applied to all exports (k-anonymity, see Issue #67)
- [ ] API key authentication for OData feed

---

## Issue #92: Supervisor-Managed Cascade Training Mode

**Labels:** `priority: high` `type: feature` `phase: 3`

### Description
Build a training mode allowing supervisors to push case studies to CHW devices for in-app learning.

### Acceptance Criteria
- [ ] Supervisor can create training cases: image + correct assessment + learning points
- [ ] Cases assigned to individual CHWs or whole team
- [ ] CHW receives notification of new training case
- [ ] CHW completes case: views image, submits their assessment, then sees correct answer + explanation
- [ ] CHW score tracked: % correct over time
- [ ] Supervisor sees team completion rates and average scores
- [ ] Real anonymised cases can be converted to training cases with one click

---

## Issue #93: Supply Chain Stockout Reporting

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Allow CHWs to report medicine and supply stockouts, triggering procurement alerts.

### Acceptance Criteria
- [ ] New screen in navigation: "Report Supplies"
- [ ] CHW selects items from configured supply list and marks as low/out of stock
- [ ] Report queued offline and synced to supervisor
- [ ] Supervisor receives stockout alert by item and CHW location
- [ ] Supervisor can mark items as "Reorder placed" with expected delivery date
- [ ] CHW receives notification when reorder is placed
- [ ] Supply shortage trends shown in supervisor analytics

---

## Issue #94: Community Health Coverage Mapping

**Labels:** `priority: medium` `type: feature` `phase: 3`

### Description
Enable supervisors to visualise CHW catchment areas and identify geographic coverage gaps.

### Acceptance Criteria
- [ ] Supervisor can draw catchment polygon per CHW on the map
- [ ] Coverage heat map: areas with no CHW coverage shown
- [ ] Population data overlay (if available from national census data)
- [ ] "Coverage score" per region: % population within X km of a CHW
- [ ] Gap analysis report: highest-priority uncovered areas
- [ ] Map exports as image for programme reporting

---

## Issue #95: Programme Configuration Admin Console

**Labels:** `priority: high` `type: feature` `phase: 3`

### Description
Build a web-based admin console for programme managers to configure Trij for their context.

### Acceptance Criteria
- [ ] Web app (separate from CHW PWA): `admin.trij.app` or equivalent
- [ ] Configurable: CHW roles and regions, referral destinations and contact details, clinical protocol version, language settings, outbreak alert thresholds, supply list, immunisation schedule
- [ ] Change history: all configuration changes logged with author and timestamp
- [ ] Export configuration as JSON for backup
- [ ] Import configuration from JSON (for new deployments)
- [ ] Role: Programme Manager (above Supervisor, below System Admin)

---

# SECTION 7 — Transformative New Features

---

## Issue #96: Asynchronous Telemedicine Consultation Module

**Labels:** `priority: high` `type: feature` `phase: 3`

### Description
When online, enable CHWs to initiate a structured asynchronous consultation request to a remote clinician.

### Acceptance Criteria
- [ ] "Request consultation" button on any assessment
- [ ] Consultation request packages: assessment data, images, voice transcript, CHW notes
- [ ] Consultation sent to a configured pool of remote clinicians via Supabase
- [ ] Remote clinician (web interface) views case, responds with advice within configurable SLA (default 4h)
- [ ] CHW notified of clinician response
- [ ] Response attached to patient record
- [ ] Consultation audit trail
- [ ] Offline: consultation request queued until online

---

## Issue #97: Community Disease Surveillance Network

**Labels:** `priority: high` `type: feature` `phase: 4`

### Description
Aggregate anonymised assessment data across CHW networks to power a community-level disease surveillance system.

### Acceptance Criteria
- [ ] Opt-in at programme level: programme manager consents to anonymised data contribution
- [ ] Data contributed: condition, date, geohash (100km resolution), patient demographics (age group, sex)
- [ ] No individual identifiers contributed
- [ ] National/regional surveillance dashboard showing:
  - Condition incidence by region over time
  - Outbreak alerts (cross-programme)
  - Seasonal trend analysis
- [ ] Data shared with national health ministry via DHIS2 (see Issue #89)
- [ ] Participation certificate for contributing programmes

---

## Issue #98: Offline AI Clinical Tutor Chatbot

**Labels:** `priority: high` `type: feature` `phase: 3`

### Description
Embed an offline AI tutor that answers CHW clinical questions and provides protocol guidance.

### Acceptance Criteria
- [ ] Small offline model (target < 200MB) for Q&A — separate from assessment model
- [ ] CHW can ask: "What does cellulitis look like?", "When should I refer a burn?", "What are signs of meningitis?"
- [ ] Model fine-tuned on WHO clinical guidelines, IMCI, CHW training materials
- [ ] Answers include: brief explanation, key warning signs, recommended action
- [ ] Fallback to protocol library search if model unavailable
- [ ] Conversation history saved per session
- [ ] Model downloads separately from assessment model (optional feature)

---

## Issue #99: Camera-Based Vital Signs Estimation (rPPG)

**Labels:** `priority: medium` `type: feature` `phase: 4`

### Description
Prototype camera-based remote photoplethysmography (rPPG) for contactless heart rate estimation.

### Acceptance Criteria
- [ ] Research and implement a validated rPPG algorithm (e.g., CHROM, POS method)
- [ ] Use front or rear camera for 30-second video capture
- [ ] Extract heart rate estimate from facial or skin region
- [ ] Display: estimated HR with confidence interval
- [ ] Validate against pulse oximeter readings in pilot test (target MAE < 5 bpm)
- [ ] Clearly labelled as "Experimental — requires clinical validation"
- [ ] Runs offline using WebAssembly

---

## Issue #100: Bluetooth Medical Device Integration

**Labels:** `priority: high` `type: feature` `phase: 3`

### Description
Integrate with common Bluetooth medical devices to auto-populate vital signs.

### Acceptance Criteria
- [ ] Supported devices (minimum): Bluetooth pulse oximeter, Bluetooth thermometer
- [ ] Device scanning and pairing in settings
- [ ] Auto-populate vital signs fields when device reading taken
- [ ] Web Bluetooth API used (Chrome on Android)
- [ ] Supported devices list in documentation
- [ ] Manual entry always available as fallback
- [ ] Device compatibility tested on: ChoiceMMed, Jumper, CONTEC pulse oximeters (common in target regions)

---

## Issue #101: FHIR R4-Compliant API

**Labels:** `priority: high` `type: infrastructure` `phase: 3`

### Description
Build a FHIR R4-compliant REST API layer to enable EHR system integration.

### Acceptance Criteria
- [ ] FHIR R4 resources implemented: Patient, Observation, DiagnosticReport, ServiceRequest (Referral), Condition
- [ ] Map Trij data model to FHIR resources
- [ ] FHIR endpoint: `https://api.trij.app/fhir/R4/`
- [ ] Authentication: SMART on FHIR OAuth2
- [ ] Read and write support for all resources
- [ ] Validated with FHIR validator
- [ ] Integration guide for OpenMRS, DHIS2, and ODK
- [ ] API documentation published at `docs/fhir/`

---

## Issue #102: Federated Learning for Privacy-Preserving Model Improvement

**Labels:** `priority: medium` `type: infrastructure` `phase: 4`

### Description
Implement privacy-preserving federated learning so the model improves from real-world usage without patient data leaving the device.

### Acceptance Criteria
- [ ] Opt-in at programme level with explicit consent
- [ ] Client: compute gradient updates locally on user-labelled assessments
- [ ] Differential privacy: add calibrated noise to gradient updates before transmission
- [ ] Aggregation server: federated averaging of updates from all participating devices
- [ ] New model weights deployed via model update system (Issue #43)
- [ ] No raw data, no images, no records ever leave device
- [ ] Privacy budget tracked and displayed per device
- [ ] Published technical paper describing the FL implementation

---

## Issue #103: Patient Digital Health Passport

**Labels:** `priority: medium` `type: feature` `phase: 4`

### Description
Enable patients to receive a portable summary of their health record as a QR code or NFC tag.

### Acceptance Criteria
- [ ] "Generate Health Passport" button on patient record
- [ ] Passport contains: patient demographics, condition history, current medications, immunisation history, allergies, blood group
- [ ] Encoded as: QR code (scannable by any QR reader) + NFC tag (if device supports)
- [ ] Encrypted with patient's unique key — readable by any Trij instance with patient consent
- [ ] Patient receives printed passport on next facility visit
- [ ] Passport standard based on SMART Health Cards specification
- [ ] Offline generation

---

## Issue #104: Automated Donor Report Generation

**Labels:** `priority: medium` `type: feature` `phase: 4`

### Description
Generate automated periodic programme reports in donor-required formats.

### Acceptance Criteria
- [ ] Report templates: WHO HMIS, PEPFAR reporting, Global Fund, USAID standard format
- [ ] Configurable reporting period: monthly, quarterly, annually
- [ ] Auto-generation on schedule or manual trigger
- [ ] Report sections: programme summary, reach metrics, health outcomes, CHW performance, data quality
- [ ] One-click generation — no manual data compilation
- [ ] Export as PDF and Excel
- [ ] Template customisation for programme-specific donor requirements

---

## Issue #105: SMS Fallback Sync for Areas Without Data Connectivity

**Labels:** `priority: medium` `type: infrastructure` `phase: 4`

### Description
Implement SMS-based sync for CHWs in areas with GSM coverage but no data connectivity.

### Acceptance Criteria
- [ ] SMS gateway integration (Twilio, Africa's Talking, or similar)
- [ ] SMS sync encodes critical record data as compressed, encrypted SMS payload
- [ ] Support multi-part SMS (concatenated SMS for larger records)
- [ ] Supervisor receives SMS sync records and processes them into Supabase
- [ ] Priority: Red urgency assessments and referrals over routine records
- [ ] Text-only data (no images via SMS)
- [ ] End-to-end encrypted SMS payloads

---

## Issue #106: Pictogram-Based UI for Low-Literacy CHWs

**Labels:** `priority: high` `type: ux` `phase: 3`

### Description
Develop a pictogram-driven alternative UI where all core functions can be completed without reading text.

### Acceptance Criteria
- [ ] "Pictogram Mode" toggle in settings (supervisor can set as default)
- [ ] All navigation uses: icon + single word maximum
- [ ] Assessment result: urgency shown as colour + universally understood symbol (traffic light, +/!/!!)
- [ ] Condition names accompanied by illustrated condition images
- [ ] Referral action: illustrated referral slip symbol
- [ ] Vital sign inputs: illustrated body diagrams for measurement location guidance
- [ ] Validated with literacy-diverse CHW group in user research
- [ ] Icons comply with ISO 7010 medical safety symbols where applicable

---

## Issue #107: Drone Supply Logistics Integration

**Labels:** `priority: low` `type: feature` `phase: 4`

### Description
Partner with medical drone logistics providers to enable emergency supply requests from within the app.

### Acceptance Criteria
- [ ] Integration with at least one drone logistics provider API (Zipline, Swoop Aero, etc.)
- [ ] CHW can request: blood products, vaccines, emergency medications
- [ ] Request requires supervisor approval (one-tap)
- [ ] Real-time delivery tracking in app
- [ ] Request limited to configured critical supplies
- [ ] Request triggers automated clinical justification form
- [ ] Available only in regions where drone service operates

---

## Issue #108: CHW Well-Being & Burnout Monitoring

**Labels:** `priority: medium` `type: feature` `phase: 4`

### Description
Add a brief well-being check-in for CHWs to monitor burnout and flag those needing support.

### Acceptance Criteria
- [ ] Weekly 3-question well-being check-in (WHO-5 adapted for CHW context)
- [ ] Check-in appears non-intrusively after work session ends
- [ ] Completely optional — skippable, never blocks app access
- [ ] Results visible only to supervisor and CHW
- [ ] Trend alert to supervisor: CHW well-being score declining over 2+ weeks
- [ ] Resources: supervisor can attach support resources, peer contacts
- [ ] Anonymous aggregate well-being score for programme reporting

---

## Issue #109: WHO Child Growth Standards — Z-Score Calculator

**Labels:** `priority: high` `type: clinical-safety` `type: feature` `phase: 2`

### Description
Implement WHO Child Growth Standard calculations with Z-scores for full nutritional status assessment.

### Acceptance Criteria
- [ ] Input fields: weight (kg), height (cm), age (months), sex
- [ ] Calculate: Weight-for-Age Z-score (WAZ), Height-for-Age Z-score (HAZ), Weight-for-Height Z-score (WHZ), BMI-for-age
- [ ] WHO growth chart reference data embedded offline (WHO 2006 standards)
- [ ] Classification: SAM (WHZ < -3), MAM (-3 to -2), Normal (> -2)
- [ ] Plotted on growth chart visual (patient's position shown)
- [ ] Z-score trajectory over time if historical measurements available
- [ ] SAM classification triggers Red urgency + therapeutic feeding protocol card

---

## Issue #110: Epidemic Scenario Planning Tool

**Labels:** `priority: low` `type: feature` `phase: 4`

### Description
Provide supervisor-level scenario modelling showing projected caseloads under different intervention scenarios.

### Acceptance Criteria
- [ ] Basic compartmental model (SIR) seeded with real local case data
- [ ] User can adjust: intervention timing, coverage, effectiveness
- [ ] Scenarios: no intervention, contact tracing, mass drug administration, vaccination
- [ ] Output: projected cases over 8 weeks per scenario
- [ ] Visualised as interactive chart
- [ ] Clearly labelled as modelling tool — includes uncertainty range
- [ ] Export scenario comparison as PDF

---

## Issue #111: Language-Specific Fine-Tuned Model Variants

**Labels:** `priority: high` `type: feature` `phase: 3`

### Description
Support switching between language-specific fine-tuned model variants for improved clinical reasoning in local languages.

### Acceptance Criteria
- [ ] Model selection in settings: "Language Model" dropdown
- [ ] Initial variants: English, French, Swahili (top 3 deployment languages)
- [ ] Model manifest includes language-specific model shards
- [ ] Language model downloaded on demand (separate from primary model)
- [ ] Assessment results localised by selected model
- [ ] Performance comparison documented: English model vs. language-specific
- [ ] Model swapping without app restart

---

## Issue #112: Anonymised Case-Based Learning Library

**Labels:** `priority: medium` `type: feature` `phase: 4`

### Description
Build a curated library of real-world anonymised case studies from Trij deployments for CHW training.

### Acceptance Criteria
- [ ] Supervisor can nominate a completed assessment as a case study
- [ ] Anonymisation step: strip all identifiers, blur face in image
- [ ] Case study includes: image, assessment, correct classification, learning points
- [ ] Approved cases added to shared library (opt-in per programme)
- [ ] Library searchable by condition, urgency, patient group
- [ ] CHWs can browse and self-study
- [ ] Cases downloadable for offline use

---

## Issue #113: Community Contribution Portal for Protocols & Translations

**Labels:** `priority: medium` `type: dx` `phase: 4`

### Description
Build a structured process for clinicians, translators, and developers to contribute protocol content and translations.

### Acceptance Criteria
- [ ] GitHub-based contribution workflow documented in `CONTRIBUTING.md`
- [ ] Structured templates for: new protocol submission, translation correction, new language addition
- [ ] Review process: clinical content reviewed by at least one licensed clinician before merge
- [ ] Translation review: native speaker + medical terminology check required
- [ ] Contributor credit in release notes
- [ ] Automated CI check: new protocol files pass JSON schema validation
- [ ] Monthly community call announced in repository

---

## Issue #114: AI Assessment Quality Feedback Loop

**Labels:** `priority: high` `type: feature` `phase: 2`

### Description
Allow CHWs and supervisors to rate AI assessments, building a structured feedback dataset.

### Acceptance Criteria
- [ ] Rating prompt shown after each assessment: "Was this assessment accurate?" [Correct] [Partially] [Incorrect]
- [ ] If Incorrect/Partially: follow-up "What was the actual diagnosis?" (free text or dropdown)
- [ ] Ratings stored in assessment record: `ai_feedback: { rating, actual_condition, rated_by, rated_at }`
- [ ] Feedback synced to backend
- [ ] Supervisor analytics: AI accuracy rate per condition, per region, per model version
- [ ] Feedback dataset used for model fine-tuning / federated learning (Issue #102)
- [ ] Monthly feedback report generated for development team

---

## Issue #115: Thermal Camera Attachment Support (FLIR ONE)

**Labels:** `priority: low` `type: feature` `phase: 4`

### Description
Explore and prototype integration with affordable thermal camera attachments for wound assessment and fever screening.

### Acceptance Criteria
- [ ] Research FLIR ONE SDK (iOS and Android)
- [ ] Prototype: capture thermal image from FLIR ONE attachment
- [ ] Pass thermal image alongside RGB image to Gemma for composite analysis
- [ ] Thermal use cases: fever detection (face temperature), wound inflammation mapping, circulation assessment
- [ ] Calibration: temperature reading validated against reference thermometer
- [ ] Feature clearly marked as "Requires FLIR ONE attachment (~$200)"
- [ ] SDK integration documented

---

## Issue #116: Predictive CHW Dispatch Recommendation

**Labels:** `priority: medium` `type: feature` `phase: 4`

### Description
Suggest daily visit priorities for CHWs based on predictive models of disease burden and patient risk.

### Acceptance Criteria
- [ ] Algorithm considers: overdue follow-ups (highest priority), historical disease hotspots, seasonal risk patterns, patient chronic disease risk scores
- [ ] Daily suggestion presented on CHW dashboard: "Suggested priority visits today"
- [ ] 3–5 suggested visits with rationale (e.g., "Patient A: wound follow-up overdue 2 days")
- [ ] CHW can accept, reorder, or dismiss suggestions
- [ ] Dispatch outcomes tracked to improve algorithm
- [ ] Offline capable

---

## Issue #117: National Health ID System Integration

**Labels:** `priority: high` `type: infrastructure` `phase: 3`

### Description
Integrate with national health identification systems to link Trij records to official patient records.

### Acceptance Criteria
- [ ] Module-based integration: configurable per deployment country
- [ ] Initial implementations: Nigeria NHIA, India Ayushman Bharat (ABHA)
- [ ] Patient registration: optional national ID lookup/verification
- [ ] Trij assessment records linkable to national health ID
- [ ] Sync: when record synced, national ID included in FHIR resource
- [ ] Privacy: national ID stored encrypted on-device
- [ ] Fallback: national ID integration optional, app fully functional without it

---

## Issue #118: Structured Prescription & Treatment Plan Generation

**Labels:** `priority: medium` `type: feature` `phase: 4`

### Description
Generate structured treatment plans and, where CHWs have prescribing authority, generate prescriptions within scope.

### Acceptance Criteria
- [ ] Treatment plan template: condition, recommended treatment, dosage, duration, monitoring, follow-up schedule
- [ ] Prescription mode (optional, requires supervisor to enable): structured prescription form with drug, dose, route, duration, prescriber details
- [ ] Prescription scoped to: CHW's authorised drug list (configurable by supervisor per national regulations)
- [ ] Out-of-scope drugs: blocked with "Refer to prescribing clinician" message
- [ ] Prescription output: QR-coded printable format OR digital prescription token
- [ ] All prescriptions logged in audit trail with prescriber ID

---

## Issue #119: React Native Wrapper for Play Store Distribution

**Labels:** `priority: high` `type: infrastructure` `phase: 3`

### Description
Develop a React Native wrapper to distribute Trij as a native Android app via Google Play Store.

### Acceptance Criteria
- [ ] React Native shell using `react-native-webview` embedding existing PWA
- [ ] Native Android APIs used: camera, file system, background sync, push notifications (FCM)
- [ ] Play Store listing: app icon, screenshots, description, privacy policy
- [ ] APK size < 30MB (model downloaded separately)
- [ ] Background sync runs as Android foreground service
- [ ] Auto-update via Play Store
- [ ] iOS App Store submission (second phase — AltStore / TestFlight initially)
- [ ] Native app performance indistinguishable from PWA

---

## Issue #120: Real-Time Programme Impact Dashboard

**Labels:** `priority: medium` `type: feature` `phase: 4`

### Description
Build a public-facing (and internal) impact dashboard showing real-time programme metrics.

### Acceptance Criteria
- [ ] Metrics displayed: total patients assessed, conditions detected, referrals made and completed, CHWs active, geographic reach (countries/regions), time saved vs. no-AI baseline
- [ ] Real-time updates from Supabase (with appropriate anonymisation)
- [ ] Shareable link for donor reports
- [ ] Embeddable widget for programme websites
- [ ] Historical trend view (last 30 days, 90 days, 1 year)
- [ ] Programme-level private view: more detail including condition breakdown
- [ ] Public view: aggregated only, fully anonymised

---

*End of Issues Document — 120 GitHub Issues for Trij FieldMed Triage System*

*Generated: May 2026 | Based on SRS v1.0, application review at trij.vercel.app, and repository analysis at github.com/Mosss-OS/trij*
