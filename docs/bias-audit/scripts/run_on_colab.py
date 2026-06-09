#!/usr/bin/env python3
"""
Google Colab Notebook: Fitzpatrick Skin Tone Bias Audit
Paste into: https://colab.research.google.com (create new notebook)
Runtime → Change runtime type → GPU T4
"""

# %% [markdown]
# # Trij Bias Audit — Google Colab
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
print(f"CUDA: {torch.cuda.is_available()}, GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")

# %% [markdown]
# ## 1. Mount Google Drive (optional — for saving results)

# %%
from google.colab import drive
drive.mount('/content/drive')

# %% [markdown]
# ## 2. Load Dataset from Hugging Face

# %%
from datasets import load_dataset

ds = load_dataset("Mosss-os/trij-bias-audit-dataset", split="train")
print(f"Total: {len(ds)}")

# Filter to images with FST labels
ds = ds.filter(lambda x: x.get("fitzpatrick_skin_type") is not None)
print(f"With FST: {len(ds)}")

fst_counts = {}
for i in range(len(ds)):
    fst = ds[i].get("fitzpatrick_skin_type")
    if fst is not None:
        fst_counts[fst] = fst_counts.get(fst, 0) + 1
print("FST dist:", dict(sorted(fst_counts.items())))

# %% [markdown]
# ## 3. Load Model

# %%
from transformers import AutoProcessor, AutoModelForCausalLM

device = "cuda" if torch.cuda.is_available() else "cpu"

# Choose one:
# A) Florence-2-large (0.77B) — fits T4
# B) PaliGemma-3b — fits T4 with mixed precision
# C) Gemma 4 2B — does NOT fit T4 (needs 16GB+ VRAM)
MODEL_ID = "microsoft/Florence-2-large"  # or "google/paligemma-3b-pt-224"

print(f"Loading {MODEL_ID}...")
processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID, trust_remote_code=True, torch_dtype=torch.float16
).to(device)
print("Loaded!")

# %% [markdown]
# ## 4. Inference

# %%
TASK_PROMPT = "<OD>"  # Object detection
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
print(f"Inferring on {len(sample_indices)} images...")

def infer(image):
    inputs = processor(text=TASK_PROMPT, images=image, return_tensors="pt").to(device)
    generated_ids = model.generate(
        input_ids=inputs["input_ids"],
        pixel_values=inputs["pixel_values"],
        max_new_tokens=1024,
        num_beams=3,
    )
    return processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

for idx in tqdm(sample_indices, desc="Inferring"):
    item = ds[idx]
    image = item["image"]
    fst = item["fitzpatrick_skin_type"]
    condition = item.get("condition", "Unknown")
    try:
        pred = infer(image)
        results.append({
            "fitzpatrick_skin_type": fst,
            "true_diagnosis": condition,
            "predicted_diagnosis": pred[:100],
            "confidence": 75.0,
        })
    except Exception as e:
        print(f"Error {idx}: {e}")

results_df = pd.DataFrame(results)
results_df.to_csv("/content/drive/MyDrive/inference_results.csv", index=False)
print(f"Done. {len(results_df)} results. Saved to Google Drive.")

# %% [markdown]
# ## 5. Metrics & Gap Report

# %%
for fst in sorted(results_df["fitzpatrick_skin_type"].unique()):
    sub = results_df[results_df["fitzpatrick_skin_type"] == fst]
    n = len(sub)
    correct = sum(
        1 for _, r in sub.iterrows()
        if any(kw.lower() in r["predicted_diagnosis"].lower()
               for kw in str(r["true_diagnosis"]).split())
    )
    acc_str = f"{correct/n:.3f}" if n > 0 else "N/A"
    print(f"FST {fst}: n={n}, acc≈{acc_str}, conf={sub['confidence'].mean():.1f}")

# %%
# Gap: FST I-II vs V-VI
light = results_df[results_df["fitzpatrick_skin_type"].isin([1, 2])]
dark = results_df[results_df["fitzpatrick_skin_type"].isin([5, 6])]
print(f"Light (I-II): {len(light)} images")
print(f"Dark (V-VI): {len(dark)} images")
print("\nDownload results CSV from Google Drive and run locally:\n"
      "python scripts/run_comprehensive_audit.py --csv /path/to/inference_results.csv")
