# Trij Bias Audit Dataset

Combined dermatology dataset for **Fitzpatrick skin tone bias auditing** of on-device AI triage models.

## Datasets Included

| Subset | Images | FST Labels | License |
|--------|--------|------------|---------|
| **MSKCC Skin Tone** (ISIC) | 4,872 | ✓ Fitzpatrick I–VI | CC-BY |
| **SCIN** (Google Research) | 5,032 | ✓ Dermatologist FST (4,979) | [SCIN License](./LICENSE) |
| **Fitzpatrick17k** | — (CSV only) | ✓ Scale/Centaur | CC BY-NC-SA |

### MSKCC Skin Tone Labeling Dataset
- Source: Memorial Sloan Kettering Cancer Center / ISIC Archive
- 4,872 dermoscopic/clinical images with Fitzpatrick skin type labels
- License: Creative Commons Attribution (CC-BY)
- Citation: `ISIC_7094998, ISIC_3212180, ...` — MSKCC via ISIC Archive

### SCIN (Skin Condition Image Network)
- Source: Google Research — [github.com/google-research-datasets/scin](https://github.com/google-research-datasets/scin)
- 5,032 volunteer-contributed images (4,979 with dermatologist FST labels)
- Extracted from Hugging Face `google/scin` parquet shards (26 shards; 20/26 on disk)
- Includes self-reported Fitzpatrick skin type, dermatologist-evaluated FST, and Monk Skin Tone labels
- License: SCIN Data Use License (see [LICENSE](./LICENSE))

### Fitzpatrick17k (Metadata Only)
- Source: [mattgroh/fitzpatrick17k](https://github.com/mattgroh/fitzpatrick17k)
- 16,577 clinical images from DermaAmin and Atlas Dermatologico
- Labels: 114 skin conditions + Fitzpatrick skin type (I–VI)
- **Images not included** — original URLs are broken; fill out the [request form](https://forms.gle/4fS35Kg8x9pkG2Bn9)

## Purpose

Fairness evaluation of dermatology AI models across Fitzpatrick skin types.
This dataset was compiled for the [Trij](https://github.com/Mosss-OS/trij) project's bias audit pipeline.

## Usage

```python
from datasets import load_dataset

# Load combined dataset
ds = load_dataset("Mosss-os/trij-bias-audit-dataset", split="train")
```

Or download raw files from the `data/` directory.

## Bias Audit Pipeline

See the `scripts/` directory for:
- `prepare_data.py` — combine, deduplicate, stratify
- `run_audit.py` — full audit pipeline
- `evaluation.py` — per-FST metrics
- `inference_wrapper.py` — Gemma 4 inference wrapper

## Citations

```bibtex
@inproceedings{groh2021evaluating,
  title={Evaluating deep neural networks trained on clinical images in dermatology with the fitzpatrick 17k dataset},
  author={Groh, Matthew and Harris, Caleb and Soenksen, Luis and Lau, Felix and Han, Rachel and Kim, Aerin and Koochek, Arash and Badri, Omar},
  booktitle={Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition},
  pages={1820--1828},
  year={2021}
}
@misc{scin2024,
  title={SCIN: Skin Condition Image Network},
  author={Google Research},
  year={2024},
  url={https://github.com/google-research-datasets/scin}
}
```

## License

The combined dataset follows the licenses of its constituent datasets:
- MSKCC: [CC-BY](https://creativecommons.org/licenses/by/4.0/)
- SCIN: [SCIN Data Use License](https://github.com/google-research-datasets/scin/blob/main/LICENSE)
- Fitzpatrick17k: [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/)
