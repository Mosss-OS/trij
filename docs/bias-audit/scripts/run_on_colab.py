#!/usr/bin/env python3
"""
Google Colab Notebook: Fitzpatrick Skin Tone Bias Audit
Paste into: https://colab.research.google.com (create new notebook)
Runtime -> Change runtime type -> T4 GPU
"""

# %% [markdown]
# # Trij Fitzpatrick Skin Tone Bias Audit
# ## Florence-2-base inference on SCIN + MSKCC
#
# **Before running:** Runtime → Change runtime type → **T4 GPU**
# Expect ~2-4 hours for ~1200 images.

# %%
!pip install -q pillow torch torchvision pandas numpy tqdm pyarrow transformers huggingface_hub

import torch, os, io, re, json, warnings, random
import pandas as pd
import numpy as np
from PIL import Image
from tqdm.notebook import tqdm
from pathlib import Path
import pyarrow.parquet as pq
import pyarrow as pa
from huggingface_hub import hf_hub_download, HfFileSystem
warnings.filterwarnings('ignore')

device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f'CUDA: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'GPU: {torch.cuda.get_device_name(0)}')
    free, total = torch.cuda.mem_get_info()
    print(f'VRAM: {free/1024**3:.1f} GB free / {total/1024**3:.1f} GB total')
else:
    raise RuntimeError('No GPU! Set Runtime -> Change runtime type -> T4 GPU')

# %%
SAMPLES_PER_FST = 100
CHECKPOINT_INTERVAL = 50
SCIN_SHARDS = range(5)
RESULTS_PATH = '/content/inference_results.csv'

# %% [markdown]
# ## 1. Load SCIN from google/scin (HuggingFace)

# %%
all_tables = []
for i in SCIN_SHARDS:
    path = f'data/train-{i:05d}-of-00026.parquet'
    local = hf_hub_download(repo_id='google/scin', filename=path, repo_type='dataset')
    table = pq.read_table(local, columns=[
        'case_id', 'fitzpatrick_skin_type',
        'dermatologist_fitzpatrick_skin_type_label_1',
        'dermatologist_fitzpatrick_skin_type_label_2',
        'dermatologist_fitzpatrick_skin_type_label_3',
        'related_category', 'image_1_path'
    ])
    all_tables.append(table)
    os.remove(local)
    print(f'Shard {i}: {table.num_rows} rows')

scin = pa.concat_tables(all_tables).to_pandas()
print(f'\nTotal SCIN: {len(scin)} rows')

# %%
def extract_fst(row):
    for col in ['dermatologist_fitzpatrick_skin_type_label_1',
                'dermatologist_fitzpatrick_skin_type_label_2',
                'dermatologist_fitzpatrick_skin_type_label_3',
                'fitzpatrick_skin_type']:
        val = row.get(col)
        if pd.notna(val) and isinstance(val, str):
            m = re.search(r'(\d)', val)
            if m:
                return int(m.group(1))
    return None

scin['fst'] = scin.apply(extract_fst, axis=1)
scin = scin.dropna(subset=['fst']).astype({'fst': int})
print(f'With FST: {len(scin)}')
print('Per-FST:', scin['fst'].value_counts().sort_index().to_dict())

# %%
def decode_img(img_data):
    try:
        if isinstance(img_data, dict):
            return Image.open(io.BytesIO(img_data['bytes'])).convert('RGB')
        return Image.open(io.BytesIO(bytes(img_data))).convert('RGB')
    except:
        return None

scin['image'] = scin['image_1_path'].apply(decode_img)
scin = scin.dropna(subset=['image'])
print(f'With images: {len(scin)}')

# %% [markdown]
# ## 2. Load MSKCC from Mosss-os/trij-bias-audit-dataset

# %%
HF_REPO = 'Mosss-os/trij-bias-audit-dataset'
fs = HfFileSystem()

local_csv = hf_hub_download(repo_id=HF_REPO, filename='data/mskcc/metadata.csv', repo_type='dataset')
mskcc = pd.read_csv(local_csv, skiprows=3)
print(f'MSKCC: {len(mskcc)} rows, columns: {list(mskcc.columns)}')

# %%
fst_map = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6}
mskcc['fst'] = mskcc['fitzpatrick_skin_type'].map(fst_map).astype(int)
print(f'With FST: {len(mskcc)}')
print('Per-FST:', mskcc['fst'].value_counts().sort_index().to_dict())

# %%
sampled = pd.concat([
    mskcc[mskcc['fst'] == fst].sample(n=SAMPLES_PER_FST, random_state=42)
    for fst in range(1, 7)
])

mskcc_images = {}
for _, row in tqdm(sampled.iterrows(), desc='Loading MSKCC'):
    iid = str(row['isic_id'])
    try:
        with fs.open(f'{HF_REPO}/data/mskcc/images/{iid}.jpg', 'rb') as f:
            mskcc_images[iid] = Image.open(io.BytesIO(f.read())).convert('RGB')
    except:
        pass

print(f'Loaded {len(mskcc_images)} MSKCC images')
mskcc_sampled = sampled[sampled['isic_id'].isin(mskcc_images.keys())].copy()

# %% [markdown]
# ## 3. Load Florence-2-base

# %%
from transformers import AutoProcessor, AutoModelForCausalLM
from transformers.configuration_utils import PretrainedConfig

def _safe_getattr(self, key):
    if key != 'attribute_map' and key in object.__getattribute__(self, 'attribute_map'):
        key = object.__getattribute__(self, 'attribute_map')[key]
    try:
        return object.__getattribute__(self, key)
    except AttributeError:
        if key == 'forced_bos_token_id':
            return None
        raise

PretrainedConfig.__getattribute__ = _safe_getattr

MODEL_ID = 'microsoft/Florence-2-base'
print(f'Loading {MODEL_ID}...')
processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID, trust_remote_code=True, torch_dtype=torch.float16
).to(device)
print('Loaded!')
free, total = torch.cuda.mem_get_info()
print(f'VRAM: {free/1024**3:.1f} GB free / {total/1024**3:.1f} GB total')

# %% [markdown]
# ## 4. Build balanced sample set (100 per FST per dataset)

# %%
samples = []
for fst in range(1, 7):
    n = min(SAMPLES_PER_FST, len(scin[scin['fst'] == fst]))
    for idx in scin[scin['fst'] == fst].sample(n=n, random_state=42).index:
        r = scin.loc[idx]
        samples.append({
            'image': r['image'], 'fst': int(r['fst']),
            'diagnosis': str(r.get('related_category', 'Unknown')),
            'source': 'scin'
        })
for iid, img in mskcc_images.items():
    row = mskcc_sampled[mskcc_sampled['isic_id'] == iid].iloc[0]
    samples.append({
        'image': img, 'fst': int(row['fst']),
        'diagnosis': str(row['diagnosis_1']),
        'source': 'mskcc'
    })
random.shuffle(samples)
print(f'{len(samples)} samples total')
print('Per-FST:', {f: sum(1 for s in samples if s['fst'] == f) for f in range(1, 7)})

# %%
def infer(image):
    inputs = processor(text='<OD>', images=image, return_tensors='pt').to(device)
    ids = model.generate(
        input_ids=inputs['input_ids'], pixel_values=inputs['pixel_values'],
        max_new_tokens=1024, num_beams=3
    )
    return processor.batch_decode(ids, skip_special_tokens=True)[0]

pred = infer(samples[0]['image'])
print(f'First inference OK. Pred: {pred[:80]}...')

# %% [markdown]
# ## 5. Run inference with checkpointing

# %%
results = []
completed = set()
if os.path.exists(RESULTS_PATH):
    existing = pd.read_csv(RESULTS_PATH)
    if len(existing):
        results = existing.to_dict('records')
        for r in results:
            completed.add(f'{r["fitzpatrick_skin_type"]}_{r["true_diagnosis"]}_{r["source"]}')
        print(f'Resumed from checkpoint: {len(results)} already done')

for i, s in enumerate(tqdm(samples, desc='Infer', initial=len(results), total=len(samples))):
    key = f'{s["fst"]}_{s["diagnosis"]}_{s["source"]}'
    if key in completed:
        continue
    try:
        pred = infer(s['image'])
        results.append({
            'fitzpatrick_skin_type': s['fst'],
            'true_diagnosis': s['diagnosis'],
            'predicted_diagnosis': pred[:200],
            'source': s['source'],
            'error': ''
        })
    except Exception as e:
        results.append({
            'fitzpatrick_skin_type': s['fst'],
            'true_diagnosis': s['diagnosis'],
            'predicted_diagnosis': '',
            'source': s['source'],
            'error': str(e)[:200]
        })
    if (i + 1) % CHECKPOINT_INTERVAL == 0:
        pd.DataFrame(results).to_csv(RESULTS_PATH, index=False)
        print(f'  Checkpoint: {len(results)}/{len(samples)}')

pd.DataFrame(results).to_csv(RESULTS_PATH, index=False)
print(f'Done: {len(results)} results -> {RESULTS_PATH}')

# %% [markdown]
# ## 6. Download results
# Run the cell below to download. Then run locally:
# ```
# python docs/bias-audit/scripts/run_comprehensive_audit.py --csv /path/to/inference_results.csv
# ```

# %%
from google.colab import files
files.download(RESULTS_PATH)

# %% [markdown]
# ## 7. Quick summary

# %%
df = pd.read_csv(RESULTS_PATH) if os.path.exists(RESULTS_PATH) else pd.DataFrame()
if len(df) == 0:
    print('No results!')
else:
    for fst in range(1, 7):
        sub = df[df['fitzpatrick_skin_type'] == fst]
        n = len(sub)
        if n == 0:
            continue
        ok = sub[sub['error'] == '']
        print(f'FST {fst}: n={n}, ok={len(ok)}, err={n - len(ok)}')
    print(f'\nTotal: {len(df)} results')
    print(f'Errors: {len(df[df["error"] != ""])}')
