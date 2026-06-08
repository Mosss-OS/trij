# Localisation Review — Medical Terminology

## Overview

This document defines the methodology for reviewing Trij's 6 non-English language packs for clinical terminology accuracy. Medical mistranslation can lead to incorrect assessment interpretation, so all languages must undergo structured clinician-native-speaker review before production deployment.

---

## Review Scope

| Area | Examples | Priority |
|---|---|---|
| **UI strings with medical meaning** | Clinical scale labels, IMCI terms, maternal danger signs, red flag descriptions, medication names | Critical |
| **AI prompt translations** | System prompts used in `gemma-prompt.ts` that guide the AI model's clinical reasoning | Critical |
| **Assessment output translations** | Condition names, urgency labels, confidence descriptions, referral recommendations | High |
| **Voice guidance scripts** | Interview questions, follow-up prompts, result readouts | High |
| **Consent & disclaimer text** | Consent items, disclaimer notices, privacy disclosures | Critical |
| **Patient-facing text** | Referral slips, patient education panel content, SMS templates | Medium |

---

## Review Process

### Step 1: Native Speaker Medical Reviewer Qualification

Each reviewer must be:
- A **native speaker** of the target language
- A **licensed clinician** (MD, RN, or equivalent) or supervised by one
- Familiar with community health terminology in the target region

### Step 2: Review Checklist

For each string in scope, the reviewer assesses:

| Criterion | Rating | Notes |
|---|---|---|
| **Clinical accuracy** | ✅ Correct / ⚠️ Ambiguous / ❌ Incorrect | Does the translation convey the correct medical meaning? |
| **Terminology consistency** | ✅ Consistent / ⚠️ Inconsistent / ❌ Wrong term | Is the same medical term used consistently across the app? |
| **Cultural appropriateness** | ✅ Appropriate / ⚠️ Problematic / ❌ Offensive | Would a CHW in the target region find this natural? |
| **Tone & clarity** | ✅ Clear / ⚠️ Confusing / ❌ Misleading | Is the CHW likely to understand the intended meaning? |
| **Locale specificity** | ✅ Correct / ⚠️ Regional variant / ❌ Wrong dialect | Uses the specific regional variety (e.g., Brazilian Portuguese vs. European) |

### Step 3: Remediation

1. Each `❌` finding is logged in `FINDINGS_{LOCALE}.md`
2. Corrections are applied to `src/lib/i18n.ts`
3. Re-reviewed by the same reviewer within 2 weeks
4. All `⚠️` findings are reviewed for potential upgrade to `❌` or downgrade to `✅`

### Step 4: Final Language Quality Rating

After remediation, each language receives a rating:

| Rating | Definition |
|---|---|
| **Certified** | All critical/high strings reviewed and corrected. No `❌` findings remain. |
| **Conditional** | Critical strings reviewed. Some high/medium strings pending. Suitable for pilot. |
| **Draft** | Not yet reviewed. Available for testing but not for patient care. |

---

## Current Status

| Language | Locale | Reviewer | Clinical Accuracy | Translated Coverage | Overall Rating |
|---|---|---|---|---|---|
| English | en-US | — | Reviewed | 100% | Certified |
| French | fr-FR | — | Pending | 44% | Conditional |
| Swahili | sw-KE | — | Pending | 44% | Conditional |
| Hindi | hi-IN | — | Pending | 44% | Conditional |
| Portuguese | pt-BR | — | Pending | 44% | Conditional |
| Arabic | ar-SA | — | Pending | 44% | Conditional |
| Spanish | es-ES | — | Pending | 44% | Conditional |
| Pidgin | pcm | — | Pending | 13% | Draft |
| Yoruba | yo | — | Pending | 12% | Draft |
| Hausa | ha | — | Pending | 12% | Draft |
| Igbo | ig | — | Pending | 12% | Draft |

> **Runtime coverage** (all UI keys present via English fallback): 100% for all locales.  
> **Translated coverage** (keys with actual translation, not English fallback): listed above.  
> Missing keys are auto-filled with the English source text at startup via `fillMissingTranslations()` in `src/lib/i18n.ts`.  
> **Next milestone:** Engage native speaker clinician reviewers and begin Step 2 for each non-English locale.

---

## Ongoing Review Process

See the [Translation Contributions](/CONTRIBUTING.md#translation-contributions) section in CONTRIBUTING.md for:

- Language eligibility requirements
- Translation quality assurance checklist
- Submission templates
- Clinical attestation requirements
- Automated validation checks

---

## References

- ISO 17100:2015 — Translation Services Requirements
- WHO Guidelines on Translation of Health Information
- MSF Translation Guide for Medical Content
