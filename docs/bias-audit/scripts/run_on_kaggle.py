#!/usr/bin/env python3
"""
Kaggle Notebook: Fitzpatrick Skin Tone Bias Audit
Paste this into a Kaggle Notebook (GPU T4 x 2) and run.
URL: https://www.kaggle.com/code (create new notebook)
"""

# %% [markdown]
# # Trij Bias Audit — Fitzpatrick Skin Tone Performance
# 
# On-device AI medical triage model evaluation across skin types.
# Uses Florence-2-large (0.77B) — fits on free Kaggle T4 GPU.
# 
# ## Setup

# %%
!pip install -q pillow torch torchvision transformers datasets pandas numpy scikit-learn tqdm
import torch, os, json, warnings
import pandas as pd
import numpy as np
from PIL import Image
from tqdm import tqdm
from sklearn.metrics import accuracy_score, confusion_matrix, cohen_kappa_score
warnings.filterwarnings('ignore')
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")

# %% [markdown]
# ## 1. Load Datasets from Hugging Face

# %%
from datasets import load_dataset

ds = load_dataset("Mosss-os/trij-bias-audit-dataset", split="train")
print(f"Total images: {len(ds)}")
# Filter to images with FST labels
ds = ds.filter(lambda x: x.get("fitzpatrick_skin_type") is not None)
print(f"With FST labels: {len(ds)}")

fst_counts = {}
for i in range(len(ds)):
    fst = ds[i].get("fitzpatrick_skin_type")
    if fst is not None:
        fst_counts[fst] = fst_counts.get(fst, 0) + 1
print("FST distribution:", dict(sorted(fst_counts.items())))

# %% [markdown]
# ## 2. Load Florence-2-large

# %%
from transformers import AutoProcessor, AutoModelForCausalLM

device = "cuda" if torch.cuda.is_available() else "cpu"
model_id = "microsoft/Florence-2-large"

print("Loading Florence-2-large...")
processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_id, trust_remote_code=True, torch_dtype=torch.float16
).to(device)
print("Model loaded!")

# %% [markdown]
# ## 3. Inference Loop

# %%
TASK_PROMPT = "<OD>"  # Object detection prompt

def infer_florence(image):
    inputs = processor(text=TASK_PROMPT, images=image, return_tensors="pt").to(device)
    generated_ids = model.generate(
        input_ids=inputs["input_ids"],
        pixel_values=inputs["pixel_values"],
        max_new_tokens=1024,
        num_beams=3,
    )
    result = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    return result

# %%
# Run on a stratified sample (200 per FST = 1200 images)
MAX_PER_FST = 200
results = []
fst_groups = {}
for i in range(len(ds)):
    fst = ds[i].get("fitzpatrick_skin_type")
    if fst is None:
        continue
    if fst not in fst_groups:
        fst_groups[fst] = []
    if len(fst_groups[fst]) < MAX_PER_FST:
        fst_groups[fst].append(i)

sample_indices = [idx for group in fst_groups.values() for idx in group]
print(f"Running inference on {len(sample_indices)} images...")

for idx in tqdm(sample_indices, desc="Inferring"):
    item = ds[idx]
    image = item["image"]
    fst = item["fitzpatrick_skin_type"]
    condition = item.get("condition", "Unknown")
    
    try:
        pred = infer_florence(image)
        # Simplified parsing — adjust based on actual output format
        confidence = 75.0  # Placeholder; Florence-2 returns detections not confidence
        results.append({
            "fitzpatrick_skin_type": fst,
            "true_diagnosis": condition,
            "predicted_diagnosis": pred[:100],  # Truncate
            "confidence": confidence,
        })
    except Exception as e:
        print(f"Error on {idx}: {e}")

results_df = pd.DataFrame(results)
results_df.to_csv("inference_results.csv", index=False)
print(f"Done. {len(results_df)} results saved.")

# %% [markdown]
# ## 4. Compute Metrics

# %%
# Simplified: group by FST and compute stats
for fst in sorted(results_df["fitzpatrick_skin_type"].unique()):
    sub = results_df[results_df["fitzpatrick_skin_type"] == fst]
    n = len(sub)
    # Match accuracy: substring match on diagnosis keywords
    correct = sum(
        1 for _, r in sub.iterrows()
        if any(kw in r["predicted_diagnosis"].lower()
               for kw in r["true_diagnosis"].lower().split())
    )
    print(f"FST {fst}: n={n}, approx accuracy={correct/n:.3f}")

# %%
# Full metrics
from sklearn.metrics import accuracy_score

for fst in sorted(results_df["fitzpatrick_skin_type"].unique()):
    sub = results_df[results_df["fitzpatrick_skin_type"] == fst]
    print(f"FST {fst}: n={len(sub)}, mean conf={sub['confidence'].mean():.1f}")

# %% [markdown]
# ## 5. Gap Report
# 
# See `performance_gap_report.md` for the full report template.
# Run `python scripts/run_comprehensive_audit.py` locally with the CSV.
