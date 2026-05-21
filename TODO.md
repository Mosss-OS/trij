# Project Trij — TODOs & Issues

This document tracks bugs and missing features identified during testing.

## High Priority

- [ ] **Fix Language Toggle**: UI labels are hardcoded in English. Implement i18n system and update all components.
- [ ] **WebGPU Fallback**: The app fails "New Triage" and "Document Scanner" if WebGPU is unavailable. Implement a fallback or clear error message (Ollama integration might be the intended fallback).
- [ ] **Sync Failures**: Investigate why sync consistently shows "1 failed".

## Functional Missing Features (from SRS)

- [ ] **Voice-Guided Assessment (FR-03)**: Voice I/O is mentioned but not fully integrated into the triage flow.
- [ ] **Referral Slip Generation (FR-07)**: PDF generation for referrals needs verification.
- [ ] **Supervisor Analytics (FR-09)**: Real data integration for the dashboard.

## UI/UX Improvements

- [ ] **Dashboard Inconsistency**: Dashboard shows "Recent triage" while SRS says "Recent patients".
- [ ] **Offline Indicator**: Ensure the offline indicator is always visible as per NFR-03.
