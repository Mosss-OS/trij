# Anonymisation Methodology — k-Anonymity for Analytics

This document describes how Trij protects patient privacy in all analytics exports and supervisor dashboard views.

## k-Anonymity Principle

All analytics exports and aggregations satisfy **k-anonymity with k ≥ 5**: any cohort of fewer than 5 patients is suppressed or generalised so that no individual can be re-identified.

## Implementation

### Source: `src/lib/anonymisation.ts`

| Function | Purpose |
|---|---|
| `generaliseAge(age)` | Converts exact age to WHO-standard age bands (0–4, 5–9, …, 60+) |
| `generaliseLocation(location)` | Strips village-level precision; retains only sub-region or higher |
| `generaliseLatLng(lat, lng)` | Rounds GPS coordinates to 1 decimal place (~11km grid) |
| `kAnonymityCheck(cohort, k=5)` | Returns empty array if cohort < k; otherwise passes through |
| `meetsThreshold(count, k=5)` | Boolean check for display/export decisions |
| `stripIdentifiers(record)` | Redacts known PII keys (`identifier`, `name`, `phone`, `email`, `address`) |
| `groupCondition(condition)` | Maps specific diagnoses to broad categories for aggregation |
| `anonymiseAssessments(assessments)` | Full pipeline: strips IDs, generalises, groups |
| `aggregateCounts(assessments)` | Counts anonymised records by (date, condition, urgency, age, location) quintuples |

### What Is Protected

- **Direct identifiers** (`patient.identifier`, CHW name/ID, device ID): redacted in all exports
- **Exact age**: replaced with age bands (e.g. "20-29")
- **Village-level location**: generalised to sub-region; GPS coordinates rounded to ~11km precision
- **Rare conditions** (< 5 occurrences): grouped into broader categories or suppressed
- **Small cohorts** (< 5 patients in any aggregate bucket): suppressed entirely

### Affected Views

| View | Anonymisation Applied |
|---|---|
| CSV Export (All Assessments) | Identifiers stripped, ages generalised, conditions grouped, small cohorts suppressed |
| CSV Export (Conditions) | Conditions grouped into clinical categories; < 5 occurrences suppressed |
| CSV Export (CHW Performance) | CHW identifiers redacted |
| Analytics — Condition Charts | Conditions grouped; categories < 5 occurrences excluded |
| Analytics — Daily Trend | Already aggregate (date + count); no identifiers exposed |
| Analytics — CHW Performance | CHW IDs displayed as truncated hashes (first 8 chars) |
| Supervisor Map | Locations shown at CHW level only (no patient pins) |

### Data Flow

```
Raw Assessments
  ↓ stripIdentifiers()
  ↓ generaliseAge()
  ↓ generaliseLocation()
  ↓ groupCondition()
Anonymised Records
  ↓ aggregateCounts()
  ↓ kAnonymityCheck(k=5)
Exported CSV / Dashboard Chart
```

## Version History

- **2026-05-22**: Initial implementation per Issue #67
