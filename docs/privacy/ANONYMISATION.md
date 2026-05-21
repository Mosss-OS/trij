# Anonymisation Methodology

## k-Anonymity

All analytics exports and supervisor dashboard aggregations enforce k-anonymity with a minimum k=5. This prevents re-identification of individuals from aggregate datasets.

## Quasi-Identifiers

The following quasi-identifiers are generalised:

| Identifier | Generalisation | Example |
|---|---|---|
| Age | Age band (0-4, 5-14, 15-24, 25-34, 35-44, 45-54, 55-64, 65+) | 27 → 25-34 |
| Sex | Male / Female / Other | — |
| District | District-level only (no village) | "Bamako-Central" |

## Rules

1. **Age bands** — Exact ages are never exported or shown in analytics. All aggregations use age bands.
2. **Location** — Only district-level geography is used. Village/neighbourhood is never included.
3. **Suppression** — Any cohort with fewer than k=5 records has its identifying attributes suppressed (labelled `[redacted]`).
4. **CSV exports** — Direct identifiers (name, national ID, phone number) are never included in export files.

## Implementation

- `src/lib/anonymize.ts` — `anonymize()`, `satisfiesKAnonymity()`, `suppressViolatingRecords()`
- Applied in supervisor analytics tab (k-badge + cohort suppression)
- Applied in all CSV export functions
- Minimum k value: 5 (configurable per deployment)
