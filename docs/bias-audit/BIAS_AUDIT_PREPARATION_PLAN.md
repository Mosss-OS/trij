# Bias Audit Preparation Plan

## Objective
Prepare for execution of the Fitzpatrick skin tone bias audit as defined in BIAS_AUDIT.md. This includes dataset assembly, tooling setup, and evaluation protocol readiness.

## Prerequisites
- Review BIAS_AUDIT.md for methodology and thresholds
- Ensure we have compute resources for running Gemma 4 inference on thousands of images
- Prepare storage for downloaded datasets (estimated 20-30GB)

## Preparation Steps

### 1. Dataset Assembly Strategy
We will create scripts to:
- Download the four core datasets:
  1. Fitzpatrick17k (16,577 images)
  2. SCIN (Google Research) (~10,000+ images)
  3. DDI (Stanford AIMI) (656 images)
  4. DDI-2 (665 images)
  5. MSKCC Skin Tone Labeling Dataset (4,879 images)
- Deduplicate images based on perceptual hashing or URL/source tracking
- Map dataset-specific condition labels to a common taxonomy aligned with Trij's assessment categories
- Stratify samples to ensure ≥50 images per Fitzpatrick type per condition category (target ≥100 for common conditions)

### 2. Tooling and Environment Setup
- Create a dedicated Python environment for the audit
- Install required libraries:
  - torch, transformers (for Gemma 4 inference)
  - PIL/Pillow (image processing)
  - pandas, numpy (data handling)
  - scikit-learn (metrics calculation)
  - tqdm (progress bars)
  - hashimage or imagehash (deduplication)
- Prepare inference wrapper that mimics Trij's triage pipeline:
  - Same prompt structure
  - Same temperature and inference settings
  - Same image preprocessing (if any) as used in production

### 3. Evaluation Protocol Readiness
- Create scripts to:
  1. Load stratified sample
  2. Run Gemma 4 inference on each image (batch processing for efficiency)
  3. Parse AI output to extract:
     - Primary diagnosis
     - Urgency level (RED/YELLOW/GREEN)
     - Confidence score
  4. Compare against ground truth labels from source datasets
  5. Calculate metrics per Fitzpatrick type:
     - Accuracy, sensitivity, specificity
     - Urgency classification agreement
     - Confidence calibration (Brier score, reliability diagrams)
  6. Generate stratified reports and visualizations
- Prepare Jupyter notebook for exploratory analysis and documentation

### 4. Threshold Definition and Reporting
- Define the accuracy gap calculation between FST I-II and FST V-VI
- Prepare automated status determination (Green/Yellow/Red) per BIAS_AUDIT.md thresholds
- Create template for updating BIAS_AUDIT.md with results
- Plan for remediation if Red threshold is triggered (>10% gap)

### 5. Timeline
- Week 1: Environment setup, dataset download scripts
- Week 2: Dataset assembly, deduplication, stratification
- Week 3: Inference pipeline development and testing
- Week 4: Full audit execution, analysis, reporting
- Week 5: Remediation planning (if needed) and documentation updates

## Deliverables
1. Prepared dataset (stratified sample ready for inference)
2. Inference and evaluation scripts
3. Audit execution results (populated BIAS_AUDIT.md tables)
4. Remediation plan (if thresholds exceeded)
5. Updated BIAS_AUDIT.md with results and known limitations

## Risks and Mitigations
- **Risk**: Dataset download failures or access issues
  - **Mitigation**: Have backup sources, verify downloads with checksums where available
- **Risk**: Gemma 4 inference computational requirements
  - **Mitigation**: Use batch processing, consider quantization if needed, ensure adequate GPU/CPU resources
- **Risk**: Label mapping inconsistencies between datasets
  - **Mitigation**: Create detailed mapping dictionary, manual verification of sample mappings
- **Risk**: Inference output parsing variations
  - **Mitigation**: Develop robust parsing with fallback mechanisms, validate on known samples

## Next Immediate Actions
1. Create directory structure for bias audit work
2. Write dataset download and verification scripts
3. Set up Python environment with required dependencies
4. Begin downloading datasets (starting with smaller ones for testing)

---
*This plan will be executed sequentially, with progress tracked against the timeline.*