# Bias Audit Report - Fitzpatrick Skin Tone Performance Gap

**Overall Status: RED - Block deployment**

## Performance Gap: FST I-II vs FST V-VI

### Accuracy
  | Light (I-II): 0.921
  | Dark (V-VI):  0.793
  | Gap:          0.128
  | Status:       RED

### Sensitivity
  | Light (I-II): 0.461
  | Dark (V-VI):  0.397
  | Gap:          0.064
  | Status:       YELLOW

### Specificity
  | Light (I-II): 0.461
  | Dark (V-VI):  0.397
  | Gap:          0.064
  | Status:       YELLOW

### Urgency Agreement
  | Light (I-II): 0.891
  | Dark (V-VI):  0.904
  | Gap:          -0.013
  | Status:       GREEN

## Status Legend
- **GREEN**: Gap < 0.05 — acceptable
- **YELLOW**: Gap < 0.10 — document limitations
- **RED**: Gap >= 0.10 — block deployment