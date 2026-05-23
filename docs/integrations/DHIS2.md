# DHIS2 Integration Guide

## Overview

Trij can export aggregated assessment data to **DHIS2** (District Health Information System 2) — the national health information system used in over 70 countries.

The integration maps Trij's structured assessment data to DHIS2 data elements for automated monthly reporting.

---

## Architecture

```
Trij App (on-device)
  │
  ├─ Assessments stored in IndexedDB
  │
  └─ Supervisor Dashboard
       │
       ├─ CSV Export (k-anonymised)
       │
       └─ DHIS2 Export
            │
            POST /api/dataValueSets
            │
            ▼
         DHIS2 Instance
```

---

## Configuration

### 1. DHIS2 Instance Requirements

- DHIS2 v2.38+
- API access enabled for the integration user
- A **Data Set** with the appropriate data elements created (see below)
- An **Organisation Unit** mapped to your deployment region

### 2. Data Elements to Create in DHIS2

Create the following data elements in your DHIS2 instance, then note their UIDs:

| Data Element Name | ID Constant in Trij | Description |
|---|---|---|
| Trij — Total Assessments | `DE_TOTAL_ASSESSMENTS` | Total number of triage assessments |
| Trij — Urgency: Red | `DE_ASSESSMENTS_RED` | Assessments flagged urgent |
| Trij — Urgency: Yellow | `DE_ASSESSMENTS_YELLOW` | Assessments flagged observation |
| Trij — Urgency: Green | `DE_ASSESSMENTS_GREEN` | Assessments flagged routine |
| Trij — Dermatology | `DE_COND_DERMATOLOGY` | Skin/wound/rash conditions |
| Trij — Respiratory | `DE_COND_RESPIRATORY` | Respiratory conditions |
| Trij — Fever | `DE_COND_FEVER` | Fever/infectious conditions |
| Trij — Gastrointestinal | `DE_COND_GI` | GI/diarrhoea conditions |
| Trij — Neurological | `DE_COND_NEURO` | Neurological conditions |
| Trij — Malnutrition | `DE_COND_MALNUTRITION` | Nutritional conditions |
| Trij — Eye & Ear | `DE_COND_EYE_EAR` | Ophthalmic/ENT conditions |
| Trij — Musculoskeletal | `DE_COND_MSK` | MSK conditions |
| Trij — Patients Under 5 | `DE_PATIENTS_UNDER5` | Assessments for children <5y |
| Trij — Patients 5–17 | `DE_PATIENTS_5_17` | Assessments for 5–17y |
| Trij — Patients 18–59 | `DE_PATIENTS_18_59` | Assessments for 18–59y |
| Trij — Patients 60+ | `DE_PATIENTS_60_PLUS` | Assessments for 60y+ |
| Trij — Referrals Advised | `DE_REFERRALS_ADVISED` | Assessments where referral was advised |
| Trij — Referrals Completed | `DE_REFERRALS_COMPLETED` | Referrals with completed feedback |
| Trij — Red Flag Triggers | `DE_RED_FLAG_TRIGGERS` | Assessments with red flag symptoms |
| Trij — Follow-ups Scheduled | `DE_FOLLOWUPS_SCHEDULED` | Follow-up appointments set |
| Trij — Follow-ups Completed | `DE_FOLLOWUPS_COMPLETED` | Follow-ups marked done |

### 3. Configure in Trij

The DHIS2 export is triggered from the **Supervisor Dashboard**. Before first use, configure:

1. **DHIS2 API URL** — e.g. `https://dhis2.yourorg.org/api`
2. **Username / Password** — A DHIS2 API user with data write permissions
3. **Organisation Unit** — The DHIS2 org unit ID (e.g. `ImspTQPwCqd`)
4. **Data Set ID** — The data set UID (e.g. `BfMAe6Itzgt`)
5. **Period** — Auto-set to current month (`yyyyMM`), configurable for historical data

> **Security Note:** DHIS2 credentials are stored in the supervisor's browser localStorage. For production deployments, configure a backend proxy or use OAuth2.

---

## Usage

### Manual Export (Supervisor Dashboard)

1. Open the **Supervisor Dashboard**
2. Click **"Export to DHIS2"**
3. Configure the DHIS2 connection if not already set
4. Review the validation summary
5. Confirm submission

### Automated Monthly Reports

For automated monthly reporting, deploy the export trigger as a scheduled task:

```bash
# Example: cron job to run the export on the 1st of each month
0 9 1 * * curl -X POST https://trij-api.yourorg.com/cron/dhis2-export
```

This requires a backend API endpoint that reads from Supabase and pushes to DHIS2 (see `src/lib/dhis2-export.ts` for the core logic).

---

## Data Mapping Details

### Period Format

DHIS2 uses `yyyyMM` period format (e.g. `202601` for January 2026).

### Org Unit Mapping

Map each Trij deployment region to a DHIS2 organisation unit. The mapping is stored at `lib/dhis2-export.ts` in the `Dhis2OrgUnitMapping` interface.

### WHO SMART Guidelines Alignment

The data element mapping follows the WHO SMART Guidelines for community health information systems, ensuring compatibility with national HMIS frameworks.

---

## Troubleshooting

| Issue | Likely Cause | Solution |
|---|---|---|
| `401 Unauthorized` | Incorrect credentials | Verify DHIS2 API username/password |
| `409 Conflict` | Data already exists for period/orgUnit | Use a different period or delete existing data in DHIS2 |
| `0 assessments` | No data in current period | Check assessment dates; use a different period filter |
| Validation warnings | Urgency data missing | Ensure assessments have urgency set |

---

## References

- [DHIS2 API Documentation](https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/data-value-sets.html)
- [WHO SMART Guidelines](https://www.who.int/teams/digital-health-and-innovation/smart-guidelines)
- [DHIS2 Data Set Management](https://docs.dhis2.org/en/manage/using-dhis2-for-data-management/maintenance.html)
