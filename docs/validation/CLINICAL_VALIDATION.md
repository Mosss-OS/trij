# Clinical Validation Protocol for Trij

## Overview
This document outlines the clinical validation protocol for the Trij AI medical triage assistant. The validation aims to establish sensitivity, specificity, positive predictive value (PPV), and negative predictive value (NPV) metrics for the AI's assessments across various medical conditions.

## Validation Objectives
1. Establish baseline performance metrics for Trij's AI assessments
2. Validate performance across diverse patient populations (age, sex, skin tone)
3. Identify areas for improvement in the AI model
4. Provide evidence-based confidence metrics for clinical decision-making
5. Ensure patient safety through rigorous validation

## Validation Design

### Study Population
- Minimum 1,000 labelled cases per condition category
- Stratified sampling to ensure representation across:
  - Fitzpatrick skin tones I-VI
  - Age groups (infant, child, adult, elderly)
  - Biological sex
  - Image quality assessments (poor, fair, good, excellent)

### Case Selection Criteria
Cases will be selected to represent:
- Common conditions detectable by Trij
- Rare but critical conditions requiring urgent referral
- Conditions with similar presentations requiring differential diagnosis
- Borderline cases that challenge diagnostic certainty

### Data Collection
1. Image capture following Trij's standard operating procedures
2. Expert annotation by licensed physicians
3. Collection of relevant clinical metadata (age, sex, presenting symptoms)
4. Storage in access-controlled repository with proper de-identification

## Validation Metrics

### Primary Metrics
For each condition category, we will calculate:
- **Sensitivity (True Positive Rate)**: TP / (TP + FN)
- **Specificity (True Negative Rate)**: TN / (TN + FP)
- **Positive Predictive Value (PPV)**: TP / (TP + FP)
- **Negative Predictive Value (NPV)**: TN / (TN + FN)
- **Accuracy**: (TP + TN) / (TP + TN + FP + FN)

Where:
- TP = True Positives (AI correctly identifies condition)
- FP = False Positives (AI incorrectly identifies condition)
- TN = True Negatives (AI correctly identifies absence of condition)
- FN = False Negatives (AI fails to identify present condition)

### Secondary Metrics
- Cohen's Kappa for inter-rater agreement between AI and clinicians
- Confidence calibration analysis
- Error analysis by condition type and patient demographics

## Implementation Timeline

### Phase 1: Protocol Development (Weeks 1-2)
- Finalize case definition criteria
- Establish physician partnership agreements
- Develop data collection instruments
- Create training materials for data collectors

### Phase 2: Data Collection (Weeks 3-10)
- Collect minimum 1,000 cases per condition category
- Ensure proper stratification across demographics
- Perform double-blind expert review for quality assurance
- Regular monitoring of data quality and completeness

### Phase 3: Analysis and Reporting (Weeks 11-12)
- Statistical analysis of validation metrics
- Subgroup analysis by demographic factors
- Preparation of validation report
- Peer review of findings

## Ethical Considerations
- All data collection will follow local IRB/ethics committee guidelines
- Informed consent will be obtained from all participants (or guardians)
- Data will be de-identified and stored securely
- Right to withdraw from the study at any time without penalty
- Minimal risk procedure involving only image capture and anonymized data

## Quality Assurance
- Regular audits of data collection procedures
- Inter-rater reliability checks for expert annotations
- Blind review of a subset of cases
- Calibration sessions for physician reviewers
- Secure data storage with access controls

## Expected Outcomes
1. Published validation metrics for each condition category
2. Identification of performance gaps requiring model improvement
3. Evidence-based recommendations for clinical use
4. Foundation for ongoing validation as model evolves
5. Increased confidence in Trij's safety and efficacy

## References
- Standards for Reporting Diagnostic Accuracy Studies (STARD)
- TRIPOD Statement for prediction models
- FDA Guidance on Clinical Decision Support Software
- WHO guidelines for digital health validation

---
*Protocol Version: 1.0*
*Last Updated: $(date)*