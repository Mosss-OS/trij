# Model Bias Audit — Fitzpatrick Skin Tone Performance

## Status: Datasets Acquired — Simulation Audit Complete — Real Inference Blocked

**Preparation status:**
- ✅ Environment setup: Python 3.14 with PyTorch 2.12, transformers, scikit-learn, Pillow, imagehash
- ✅ Audit scripts: `inference_wrapper.py`, `evaluation.py`, `run_audit.py`, `prepare_data.py`
- ✅ Pipeline test passed: Deduplication, stratification, and metric calculation verified with dummy data
- ✅ MSKCC Skin Tone dataset: 4,872 images, all FST I–VI, downloaded
- ✅ SCIN dataset: 5,032 images extracted from HF parquet (4,979 with FST), 3 shards remaining on disk
- ✅ Fitzpatrick17k metadata: 16,577 rows (CSV), images unavailable (source URLs dead)
- ✅ Simulated bias audit: Completed on 4,872 MSKCC images — results in `docs/bias-audit/results/`
- ❌ Real inference: Blocked — dev laptop insufficient (Intel i3-1115G4, 4 GB RAM, no CUDA). Requires GPU machine with Ollama ≥0.23 for Gemma 4
- ❌ DDI / DDI-2: Manual access requests pending via Stanford AIMI portal

See `docs/bias-audit/` for the full preparation kit and instructions.

This audit evaluates Gemma 4's dermatological assessment performance across the Fitzpatrick Skin Tone Scale (I–VI) to identify and address any performance disparities before deployment.

---

## Dataset Strategy

We combine four publicly available, expertly labelled dermatology image datasets to ensure broad coverage across all six Fitzpatrick skin types and a wide range of conditions:

### Primary Dataset

**Fitzpatrick17k** — 16,577 clinical images, 114 conditions
- Source: [github.com/mattgroh/fitzpatrick17k](https://github.com/mattgroh/fitzpatrick17k)
- Fitzpatrick annotations by Scale AI and Centaur Labs
- Images sourced from DermaAmin and Atlas Dermatologico atlases
- ≥53 images per condition; provides the core stratified sample
- Published in: Groh et al., CVPR 2021

### Supplementary Datasets

**SCIN (Google Research)** — 10,000+ images
- Source: [github.com/google-research-datasets/scin](https://github.com/google-research-datasets/scin)
- Self-reported FST + dermatologist-labelled eFST
- Diverse conditions beyond lesion classification (rashes, infections)
- Crowdsourced with informed consent

**DDI (Diverse Dermatology Images)** — 656 images, pathologically confirmed
- Source: [ddi-dataset.github.io](https://ddi-dataset.github.io/) (via Stanford AIMI Shared Datasets Portal)
- All Fitzpatrick types I–VI, diagnosis confirmed by pathology
- Expert skin tone labelling by two board-certified dermatologists
- Published in: Daneshjou et al., Science Advances 2022

**DDI-2** — 665 images, Asian patient cohort
- Source: [daneshjoulab.github.io/ddi2-dataset](https://daneshjoulab.github.io/ddi2-dataset/)
- First public dataset representing self-identified Asian patients
- Histopathologically confirmed diagnoses with FST annotation
- Published in: Chang et al., J Invest Dermatol 2024

**MSKCC Skin Tone Labeling Dataset** — 4,879 dermoscopic images
- Source: [ISIC Archive](https://api.isic-archive.com/collections/413/)
- CC-BY license, all 6 Fitzpatrick types
- Colorimeter-validated skin tone measurements
- Prospective study with balanced FST recruitment

### Dataset Composition

| Fitzpatrick Type | Images | Conditions | Sources |
|---|---|---|---|
| I (Very light) | TBD | TBD | Fitzpatrick17k, SCIN, DDI, MSKCC |
| II (Light) | TBD | TBD | Fitzpatrick17k, SCIN, DDI, MSKCC |
| III (Medium light) | TBD | TBD | Fitzpatrick17k, SCIN, DDI, MSKCC |
| IV (Medium dark) | TBD | TBD | Fitzpatrick17k, SCIN, DDI, MSKCC |
| V (Dark) | TBD | TBD | Fitzpatrick17k, SCIN, DDI, MSKCC |
| VI (Very dark) | TBD | TBD | Fitzpatrick17k, SCIN, DDI, MSKCC, DDI-2 |

**Target**: ≥100 images per Fitzpatrick type per common condition category; ≥50 for rare conditions.

---

## Methodology

### Evaluation Protocol

1. **Dataset assembly**: Download and deduplicate images across all source datasets. Map to common condition taxonomy.
2. **Stratified sampling**: For each condition category, sample ≥50 images per Fitzpatrick type (I–VI).
3. **Inference**: Run Gemma 4 on each image using the standard triage pipeline (same prompt, temperature, and inference settings as production).
4. **Ground truth**: Use dermatologist-labelled diagnosis from each source dataset as the reference standard.
5. **Metrics per Fitzpatrick type**:
   - **Accuracy**: Proportion of correct primary diagnosis matches
   - **Sensitivity**: True positive rate per condition category
   - **Specificity**: True negative rate per condition category
   - **Urgency classification agreement**: Agreement between AI urgency and clinical urgency
   - **Confidence calibration**: Brier score and reliability diagrams per type

### Condition Categories Tested

- Malignant lesions (melanoma, BCC, SCC)
- Benign lesions (naevi, seborrhoeic keratoses)
- Inflammatory conditions (eczema, psoriasis, dermatitis)
- Infections (bacterial, fungal, viral)
- Rashes and allergic reactions

### Threshold for Action

- **Green**: <5% accuracy gap between FST I–II and FST V–VI
- **Yellow**: 5–10% gap — document as known limitation, add in-app note
- **Red**: >10% gap — block deployment, file remediation issue

---

## Results (Simulated — 4,872 MSKCC images)

> ⚠️ These results use **simulated** model outputs (not real Gemma 4 inference). The simulation applies a realistic bias pattern: lower confidence and accuracy for darker skin types. Real results will differ.

### Overall Accuracy

| Fitzpatrick Type | Accuracy | Sensitivity | Specificity | n |
|---|---|---|---|---|---|
| I | 83.2% | 82.9% | 84.1% | 787 |
| II | 82.8% | 82.5% | 83.7% | 949 |
| III | 79.1% | 78.8% | 80.2% | 793 |
| IV | 76.4% | 76.1% | 77.8% | 783 |
| V | 72.3% | 71.9% | 73.5% | 811 |
| VI | 68.5% | 68.1% | 69.8% | 749 |

### Performance Gap: FST I–II vs FST V–VI

| Metric | FST I–II | FST V–VI | Gap | Status |
|---|---|---|---|---|---|
| Accuracy | 83.0% | 70.2% | **12.8%** | 🔴 RED |
| Sensitivity | 82.7% | 69.8% | **12.9%** | 🔴 RED |
| Specificity | 83.9% | 71.5% | **12.4%** | 🔴 RED |

### Urgency Classification Agreement

| Fitzpatrick Type | Agreement | Cohen's κ |
|---|---|---|
| I–II | 91.2% | 0.82 |
| III–IV | 87.6% | 0.75 |
| V–VI | 85.1% | 0.70 |

### Per-Dataset Breakdown

| Dataset | I–II Acc | V–VI Acc | Gap | Status |
|---|---|---|---|---|
| MSKCC (all benign) | 83.0% | 70.2% | 12.8% | 🔴 RED |

---

## Known Limitations

1. **Simulated inference only**: Results use a heuristic simulation (Gaussian noise + bias offset), not real model outputs. Pattern is realistic but magnitudes are not validated.
2. **SCIN images not yet audited**: 5,032 SCIN images extracted but not included in the simulation run. Ready for real inference.
3. **Fitzpatrick17k images unavailable**: Cannot be included until alternative source is found.
4. **DDI / DDI-2 not yet accessible**: Manual access requests required.
5. **All MSKCC images are "Benign"**: The dataset has only benign diagnoses — cannot assess malignant lesion classification performance.
6. **FST 6 under-represented in SCIN**: Only 82 images with FST 6 in the extracted SCIN subset.

---

## Remediation Plan

- *To be created if a performance gap >10% is identified.*

---

## References

1. Groh M, et al. "Evaluating Deep Neural Networks Trained on Clinical Images with a Fitzpatrick 17k Dataset." CVPR 2021.
2. Daneshjou R, et al. "Disparities in Dermatology AI Performance on a Diverse, Curated Clinical Image Set." Science Advances 2022.
3. Ward A, et al. "Creating an Empirical Dermatology Dataset Through Crowdsourcing with Web Search." JAMA Network Open 2024.
4. Chang CT, et al. "DDI-2: A Diverse Skin Condition Image Dataset Representing Self-Identified Asian Patients." J Invest Dermatol 2024.
5. Groh M, et al. "Towards Transparency in Dermatology Image Datasets with Skin Tone Annotations by Experts, Crowds, and an Algorithm." CSCW 2022.

---

*Last updated: 2026-05-22*
