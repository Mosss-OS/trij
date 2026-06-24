# Project Trij — TODOs & Issues

This document tracks bugs and missing features identified during testing.

## High Priority

- [x] **Fix Language Toggle**: UI labels are hardcoded in English. i18n system implemented and most components updated. Some edge cases remain in ClinicalScaleDisplay, AiFailureOverlay, CameraCapture, TutorialOverlay, and QrScanner.
- [x] **WebGPU Fallback**: Added `loadEngineWithFallback` to Document Scanner (triage already had it). Fallback chain: webllm → ollama → cloud → demo.
- [x] **Sync Failures**: Fixed auto-retry loop in SyncStatus component. Added pending count refresh after sync. Items respect exponential backoff via `nextRetryAt`.
- [x] **Biometric Auth**: Fixed encryption key not being cached on biometric unlock. Added credential-derived key wrapping.
- [x] **WhatsApp Share**: Added WhatsApp share button in triage result view.
- [x] **Offline Indicator**: Made more prominent with amber styling when offline.

## Functional Missing Features (from SRS)

- [ ] **Voice-Guided Assessment (FR-03)**: Voice I/O is mentioned but not fully integrated into the triage flow.
- [ ] **Referral Slip Generation (FR-07)**: PDF generation for referrals needs verification.
- [ ] **Supervisor Analytics (FR-09)**: Real data integration for the dashboard.

## UI/UX Improvements

- [x] **Dashboard Inconsistency**: Dashboard already uses `t("recentTriage")` which displays "Recent patients" — match SRS.
- [x] **Offline Indicator**: Already visible in AppHeader (shown on every page). Styling enhanced for offline state.
