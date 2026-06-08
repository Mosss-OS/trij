# Bias Audit Preparation — Fitzpatrick Skin Tone Performance

This directory contains the preparation materials and scripts for executing the Fitzpatrick skin tone bias audit as defined in [BIAS_AUDIT.md](../BIAS_AUDIT.md).

## Directory Structure
```
bias-audit/
├── BIAS_AUDIT_PREPARATION_PLAN.md   # This plan
├── scripts/                         # Python scripts for dataset preparation and evaluation
├── data/                            # Will contain downloaded datasets
│   ├── fitzpatrick17k/
│   ├── scin/
│   ├── ddi/
│   ├── ddi2/
│   └── mskcc/
├── results/                         # Will contain audit results (metrics, plots, etc.)
└── env/                             # Python virtual environment (created by setup)
```

## Prerequisites
- Python 3.8 or higher
- Git LFS (for downloading some datasets)
- Approximately 20-30 GB of free disk space for the datasets
- (Optional) GPU for faster inference, but CPU-only is supported

## Setup Instructions

### 1. Create and Activate Virtual Environment
```bash
cd /home/moses/Desktop/trij/docs/bias-audit
python3 -m venv env
source env/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r scripts/requirements.txt
```

### 3. Download Datasets
Some datasets require manual download due to access restrictions. Follow the instructions in each download script.

#### Fitzpatrick17k
```bash
python scripts/download_fitzpatrick17k.py
```
This script will attempt to download from Google Drive. If it fails, please download manually from:
https://github.com/mattgroh/fitzpatrick17k
Extract the contents into `data/fitzpatrick17k/`

#### SCIN
```bash
python scripts/download_scin.py
```
Please follow the instructions printed by the script to download from:
https://github.com/google-research-datasets/scin

#### DDI
```bash
python scripts/download_ddi.py
```
Please follow the instructions printed by the script to request access via:
https://ddi-dataset.github.io/ (Stanford AIMI Shared Datasets Portal)

#### DDI-2
```bash
python scripts/download_ddi2.py
```
Please follow the instructions printed by the script to download from:
https://daneshjoulab.github.io/ddi2-dataset/

#### MSKCC Skin Tone Labeling Dataset
```bash
python scripts/download_mskcc.py
```
Please follow the instructions printed by the script to download from the ISIC Archive:
https://api.isic-archive.com/collections/413/

### 4. Prepare the Dataset
Once all datasets are downloaded, run the preparation script:
```bash
python scripts/master_prepare.py
```
This script will:
1. Check for duplicates across datasets
2. Map condition labels to a common taxonomy
3. Stratify the dataset to ensure ≥50 images per Fitzpatrick type per condition category (target ≥100 for common conditions)
4. Save the stratified sample to `data/processed/`

### 5. Run the Bias Audit
After preparing the dataset, run the evaluation:
```bash
python scripts/run_audit.py
```
This script will:
1. Load the stratified sample
2. Run Gemma 4 inference on each image (using the same prompt and settings as Trij's triage pipeline)
3. Compare AI outputs against ground truth labels
4. Calculate metrics per Fitzpatrick type (accuracy, sensitivity, specificity, urgency agreement, confidence calibration)
5. Generate reports and update BIAS_AUDIT.md with results

### 6. Review Results
Check the updated BIAS_AUDIT.md for the results and any known limitations.
If the performance gap between FST I-II and FST V-VI exceeds 10%, a remediation plan will be needed.

## Scripts Overview

### Download Scripts
- `download_fitzpatrick17k.py`: Attempts to download via Google Drive, falls back to manual instructions
- `download_scin.py`: Provides instructions for downloading SCIN
- `download_ddi.py`: Provides instructions for requesting access to DDI
- `download_ddi2.py`: Provides instructions for downloading DDI-2
- `download_mskcc.py`: Provides instructions for downloading MSKCC dataset

### Preparation Scripts
- `master_prepare.py`: Orchestrates the entire preparation process (download, dedup, stratify)
- `dataset_utils.py`: Contains helper functions for combining, deduplicating, and stratifying datasets

### Audit Scripts
- `run_audit.py`: Main audit execution script
- `inference_wrapper.py`: Wrapper for Gemma 4 inference that matches Trij's triage pipeline
- `evaluation.py`: Functions for calculating metrics and generating reports

## Expected Outputs
- `data/processed/combined_metadata.csv`: Metadata for all downloaded and deduplicated images
- `data/processed/stratified/`: Directory containing the stratified sample split by Fitzpatrick type
- `results/metrics.csv`: Calculated metrics per Fitzpatrick type and condition category
- `results/plots/`: Reliability diagrams, confusion matrices, etc.
- Updated BIAS_AUDIT.md with results tables and status

## Notes
- The audit is designed to run on a CPU-only environment, but GPU will significantly speed up inference.
- The stratified sample size will depend on the available data, but we aim for ≥50 images per Fitzpatrick type per condition category.
- All personally identifiable information is already removed from these public datasets; no additional de-identification is needed.
- If you encounter issues with dataset downloads, please check the respective repository for the most current access instructions.

## Troubleshooting
- **Out of memory during inference**: Try reducing the batch size in `inference_wrapper.py` or use CPU-only mode.
- **Missing dependencies**: Ensure you have activated the virtual environment and run `pip install -r scripts/requirements.txt`
- **Dataset download failures**: Check your internet connection and verify the repository links are still valid (some may have moved).
- **PyTorch installation issues**: If installing PyTorch times out due to network issues, try:
  1. Using a different time of day when network traffic is lower
  2. Installing from a local mirror if available
  3. Using the CPU-only PyTorch wheel from https://download.pytorch.org/whl/cpu/torch.html
  4. As a last resort, consider using a cloud-based GPU instance for the inference step

## License
The datasets used in this audit are subject to their respective licenses. Please review the license terms for each dataset before use.

## References
See BIAS_AUDIT.md for the full list of references.