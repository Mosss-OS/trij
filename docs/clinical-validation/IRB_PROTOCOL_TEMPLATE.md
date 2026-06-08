# IRB Protocol Template for Trij Clinical Validation Study

## Protocol Title
Validation of AI-Assisted Triage Assessments in Community Health Worker Settings

## Principal Investigator
[To be filled by site - typically site lead clinician or research coordinator]

## Co-Investigators
[To be filled by site]

## Study Sponsor
Trij Health Technologies (or appropriate legal entity)

## Study Dates
- **Protocol Date:** [Date]
- **Anticipated Start Date:** [Date]
- **Anticipated Completion Date:** [Date]
- **Total Duration:** [e.g., 12 months]

## 1. Background and Rationale
Trij is an offline-first mobile application designed to assist Community Health Workers (CHWs) in conducting health assessments using AI-powered image analysis and clinical decision support. The application captures patient images and structured clinical inputs to generate preliminary triage assessments and urgency recommendations.

While Trij has undergone internal testing and development, prospective clinical validation against clinician-adjudicated ground truth is necessary to establish its diagnostic accuracy, particularly across diverse populations and device types. This validation study aims to:
1. Measure sensitivity, specificity, PPV, and NPV of Trij's AI assessments per condition category
2. Evaluate performance across demographic subgroups (Fitzpatrick skin tone, age, sex)
3. Assess urgency classification accuracy and inter-rater agreement with clinicians
4. Inform potential regulatory pathways and clinical implementation guidelines

## 2. Objectives

### Primary Objective
To determine the diagnostic accuracy of Trij's AI-assisted triage assessments compared to clinician-adjudicated ground truth diagnoses.

### Secondary Objectives
- To evaluate sensitivity, specificity, PPV, and NPV for each target condition category
- To assess performance across Fitzpatrick skin tone strata (I-VI)
- To evaluate urgency classification (RED/YELLOW/GREEN) accuracy
- To measure inter-rater agreement (Cohen's Kappa) between AI and clinician reviewers
- To determine the proportion of cases where the true diagnosis appears in the AI's top-3 differential

## 3. Study Design
This is a prospective, multi-site, observational validation study. De-identified assessment data collected during routine CHW use of Trij will be reviewed by a panel of licensed physicians to establish ground truth diagnoses. The AI-generated assessments will be compared against this ground truth.

## 4. Study Population

### Inclusion Criteria
- Patients assessed by CHWs using the Trij application during the study period
- Patients (or legally authorized representatives) who provide informed consent for their de-identified assessment data to be used in the validation study
- Assessments that include at least one clinical image (when clinically indicated by the assessment protocol)
- Assessments belonging to one of the target condition categories:
  - Dermatological (wounds, rashes, infections)
  - Respiratory (pneumonia, bronchitis, COPD)
  - Fever/Infectious (malaria, typhoid, UTI)
  - Gastrointestinal (diarrhoea, dehydration)
  - Neurological (stroke, meningitis, neuropathy)
  - Nutritional (SAM, MAM, obesity)
  - Eye/Ear (conjunctivitis, otitis media)
  - Musculoskeletal (fracture, sprain)

### Exclusion Criteria
- Patients who decline consent for data use in validation
- Assessments without sufficient clinical information for ground truth determination (as judged by the clinician panel)
- Duplicate assessments of the same patient encounter (only the first will be included)
- Assessments where technical failure prevents image capture or AI processing (these will be logged but not included in validation sample)

### Sample Size
Target enrollment: 6,000 assessments total across all condition categories, with minimum per-category targets as defined in the Clinical Validation Framework.

## 5. Study Procedures

### 5.1 Routine CHW Workflow
CHWs will continue to use Trij as part of their normal duties. When conducting an assessment:
1. CHW opens Trij application
2. CHW collects patient history and vital signs through structured interface
3. CHW captures clinical images as prompted by the assessment flow
4. CHW submits the assessment to receive AI-generated triage results
5. CHW proceeds with clinical decision-making and patient management per local guidelines

### 5.2 Consent Process
1. After completing the assessment, CHW approaches the patient (or guardian) to request permission to use the de-identified assessment data for research purposes
2. CHW reads the informed consent statement in the local language
3. If consent is given, CHW records consent in the application (digital signature or verbal confirmation logged)
4. If consent is declined, no data leaves the device for research purposes (though the assessment remains available for clinical care)
5. Consent process is documented in the application metadata

### 5.3 Data Collection and De-identification
For consented cases:
1. At the end of each day, the application flags consented assessments for upload
2. When online, the application transmits only the minimum necessary data:
   - De-identified assessment findings (structured data: vitals, symptoms, AI results)
   - Clinical images (with all metadata stripped)
   - Timestamp and device anonymized ID
   - Consent flag
3. No personally identifiable information (name, ID, exact location, etc.) is transmitted
4. Data is encrypted in transit and at rest on secure study servers

### 5.4 Ground Truth Determination
1. De-identified assessment batches are securely transmitted to the clinician review panel
2. Each case is reviewed independently by ≥2 licensed physicians blinded to the AI assessment
3. Reviewers provide:
   - Primary diagnosis (using ICD-10 codes where applicable)
   - Urgency level (RED/YELLOW/GREEN based on local triage guidelines)
   - Confidence level (scale 1-5)
   - Key supporting findings
4. Where reviewers disagree, a third senior clinician adjudicates
5. Ground truth is defined as the majority/adjudicated clinician opinion, supplemented by:
   - Available laboratory results (culture, PCR, rapid tests)
   - Available imaging reports (X-ray, ultrasound)
   - Histopathology where applicable
   - Clinical response to treatment at follow-up (when available)

### 5.5 Data Analysis
1. AI assessments and clinician ground truth are matched by anonymized case ID
2. For each condition category, calculate:
   - Sensitivity, specificity, PPV, NPV
   - AUC-ROC (where probability scores available)
3. Stratify analyses by:
   - Fitzpatrick skin tone (I-II, III-IV, V-VI)
   - Age group (0-4, 5-17, 18-59, 60+)
   - Sex (Male, Female, Other)
   - Image quality (Good/Acceptable/Poor as rated by validateImageQuality())
   - Device class (Budget/Mid-range/Premium)
4. Calculate inter-rater agreement (Cohen's Kappa) between AI and each clinician reviewer
5. Assess urgency classification accuracy and top-3 differential inclusion rate

## 6. Risks and Benefits

### Potential Risks
- **Minimal risk:** The study involves no intervention beyond routine care. The primary risk is potential breach of confidentiality.
- **Mitigation:** Strict de-identification protocols, encrypted data transfer, secure storage, limited access to study team only. No personal identifiers leave the collection device.
- **Risk of incorrect diagnosis:** The AI assessment is provided as decision support only; CHWs retain full clinical responsibility for patient care decisions per local guidelines.

### Potential Benefits
- **To participants:** No direct benefit to individual patients whose data is used.
- **To CHWs/sites:** Contribution to scientific knowledge that may improve future versions of the tool. Sites may receive aggregate performance feedback.
- **To society:** Generation of evidence on AI-assisted triage tools for low-resource settings, potentially informing broader adoption and guidance documents.

## 7. Confidentiality and Data Security
- All assessment data is de-identified at point of capture on the CHW device
- No personal identifiers (names, IDs, addresses, phone numbers) are collected or transmitted
- Images have all EXIF/metadata stripped before transmission
- Data is encrypted during transmission (TLS 1.3) and at rest (AES-256)
- Secure study servers are hosted in [Specify location - e.g., GDPR-compliant region]
- Access limited to study PI, co-investigators, and designated data manager
- Data will be retained for [X] years post-study for analysis verification, then securely deleted
- All clinician reviewers sign confidentiality agreements

## 8. Compensation
- Participants (patients): No compensation provided for data use (de-identified, minimal risk)
- CHWs: No additional compensation; use of Trij remains free for clinical work
- Clinician reviewers: [Specify if any honorarium provided - e.g., "Modest honorarium of $X per hour for review time" or "Review considered part of professional duties, no additional compensation"]
- Sites: No payment for data provision; potential benefits include performance feedback and collaboration acknowledgment

## 9. Voluntary Participation
- Participation is entirely voluntary
- Declining consent has no impact on patient care or CHW-worker relationship
- Consent can be withdrawn at any time by contacting the site PI; already-de-identified data in the analysis set may not be retrievable but will not be used for future analyses
- No penalty for withdrawal

## 10. Informed Consent Process
- Consent obtained by CHWs after assessment completion, before any data leaves device
- Consent script available in local languages (translations validated by site staff)
- Consent documented digitally in application (timestamp, user ID, consent flag)
- Copy of consent form available for participants to retain
- Opportunity for questions provided before consent

## 11. Data Management Plan
- **Collection:** Via Trij application with automatic daily upload when online
- **Storage:** Secure encrypted servers with access logs
- **Backup:** Encrypted backups maintained for disaster recovery
- **Access:** Role-based access control (PI, co-investigators, data manager)
- **Sharing:** De-identified datasets may be shared with regulatory bodies or for secondary analysis under additional IRB review
- **Retention:** [Specify period, e.g., 5 years] post-publication, then secure deletion
- **Identifiers:** Only study-specific anonymized IDs used; no link to personal identifiers maintained

## 12. Study Oversight
- **Local Oversight:** Site PI responsible for protocol adherence, consent process, and local safety monitoring
- **Regular Reviews:** Monthly progress reports to site leadership
- **Adverse Events:** While minimal risk anticipated, any concerns will be reported to local IRB per standard procedures
- **Protocol Modifications:** Any changes require IRB amendment approval

## 13. Dissemination of Results
- Aggregate results will be shared with participating sites
- Findings will be submitted for presentation at scientific conferences
- Manuscript targeting peer-reviewed journal (e.g., Lancet Global Health, JAMA Network Open, NPJ Digital Medicine)
- Authorship will follow ICMJE guidelines; site investigators and CHW leads eligible for authorship based on contribution
- Pre-print server posting prior to journal submission
- No individual patient data will be published

## 14. References
[To be completed by site - typically includes]
- Trij Application Documentation
- Clinical Validation Framework (separate document)
- STARD 2015 Guidelines
- WHO Ethical Standards for Research
- FDA Guidance on Clinical Decision Support Software
- CONSORT-AI Extension

## Appendices
- Appendix A: Informed Consent Form (templates in local languages)
- Appendix B: Clinician Reviewer Agreement and Confidentiality Form
- Appendix C: Data Use Agreement Template (between site and sponsor)
- Appendix D: Assessment Data Dictionary and Structure
- Appendix E: Image De-identification Protocol
- Appendix E: Site-Specific Contacts and Responsibilities

---
*This template must be adapted by each participating site to reflect local regulations, institutional requirements, and study team details. Sites should consult their local IRB/ethics committee for specific submission requirements.*