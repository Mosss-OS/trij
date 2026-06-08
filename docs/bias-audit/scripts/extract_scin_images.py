#!/usr/bin/env python3
"""
Extract SCIN images from HF parquet files and save to disk.
Streams each parquet one at a time to minimize disk usage.
"""

import os, sys, json, time, logging, base64
from pathlib import Path
import pandas as pd
from tqdm import tqdm
from huggingface_hub import hf_hub_download

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE = Path('/home/moses/Desktop/trij/docs/bias-audit/data/scin')
OUT_IMAGES = BASE / 'images_extracted'
OUT_METADATA = BASE / 'scin_metadata_extracted.csv'
TMP_DIR = Path('/tmp/scin_extract')
TMP_DIR.mkdir(parents=True, exist_ok=True)

def extract_images():
    # List all parquet files from HF
    shard_count = 26
    all_records = []
    total_extracted = 0
    
    for i in range(shard_count):
        fname = f'train-{i:05d}-of-00026.parquet'
        hf_path = f'data/{fname}'
        tmp_pq = TMP_DIR / fname
        
        # Download (will be cached)
        logger.info(f'[{i+1}/{shard_count}] Downloading {fname}...')
        t0 = time.time()
        local_path = hf_hub_download(
            repo_id='google/scin',
            filename=hf_path,
            repo_type='dataset',
            local_dir=str(TMP_DIR),
            local_dir_use_symlinks=False
        )
        dl_time = time.time() - t0
        size_mb = os.path.getsize(local_path) / 1024 / 1024
        logger.info(f'  Downloaded {size_mb:.0f} MB in {dl_time:.0f}s')
        
        # Read the parquet (image column only)
        import pyarrow.parquet as pq
        table = pq.read_table(local_path, columns=[
            'case_id', 'fitzpatrick_skin_type',
            'dermatologist_fitzpatrick_skin_type_label_1',
            'dermatologist_fitzpatrick_skin_type_label_2',
            'dermatologist_fitzpatrick_skin_type_label_3',
            'related_category',
            'dermatologist_skin_condition_on_label_name',
            'weighted_skin_condition_label',
            'image_1_path', 'image_2_path', 'image_3_path'
        ])
        df = table.to_pandas()
        
        # Extract the first available image for each row
        images_col = table.column('image_1_path')
        for chunk_idx in range(len(images_col.chunks)):
            chunk = images_col.chunks[chunk_idx]
            bytes_arr = chunk.field('bytes')
            path_arr = chunk.field('path')
            
            start_row = chunk_idx * len(chunk)
            for row_idx in range(len(chunk)):
                abs_idx = start_row + row_idx
                if abs_idx >= len(df):
                    break
                    
                img_bytes = bytes_arr[row_idx].as_py()
                img_path = path_arr[row_idx].as_py()
                
                if img_bytes is None or len(img_bytes) < 100:
                    continue
                
                case_id = df.iloc[abs_idx]['case_id']
                fst_self = df.iloc[abs_idx].get('fitzpatrick_skin_type', None)
                fst_derm1 = df.iloc[abs_idx].get('dermatologist_fitzpatrick_skin_type_label_1', None)
                fst_derm2 = df.iloc[abs_idx].get('dermatologist_fitzpatrick_skin_type_label_2', None)
                fst_derm3 = df.iloc[abs_idx].get('dermatologist_fitzpatrick_skin_type_label_3', None)
                condition = df.iloc[abs_idx].get('related_category', None)
                
                # Determine FST: prefer dermatologist labels, fall back to self-reported
                fst = fst_derm1 if pd.notna(fst_derm1) else (fst_derm2 if pd.notna(fst_derm2) else (fst_derm3 if pd.notna(fst_derm3) else fst_self))
                
                # Extract FST number from string like 'FST3' -> 3
                fst_num = None
                if pd.notna(fst) and isinstance(fst, str):
                    import re
                    m = re.search(r'(\d)', fst)
                    if m:
                        fst_num = int(m.group(1))
                
                # Save image
                safe_name = f'{case_id}.png'
                out_path = OUT_IMAGES / safe_name
                OUT_IMAGES.mkdir(parents=True, exist_ok=True)
                with open(out_path, 'wb') as f:
                    f.write(img_bytes)
                
                all_records.append({
                    'case_id': case_id,
                    'fitzpatrick_skin_type': fst_num,
                    'fst_self_reported': fst_self if pd.notna(fst_self) else None,
                    'fst_dermatologist_1': fst_derm1 if pd.notna(fst_derm1) else None,
                    'fst_dermatologist_2': fst_derm2 if pd.notna(fst_derm2) else None,
                    'fst_dermatologist_3': fst_derm3 if pd.notna(fst_derm3) else None,
                    'condition': condition if pd.notna(condition) else None,
                    'image_filename': safe_name,
                    'absolute_image_path': str(out_path),
                    'parquet_file': fname
                })
                total_extracted += 1
                
                if total_extracted % 100 == 0:
                    logger.info(f'  Extracted {total_extracted} images so far...')
        
        # Clean up parquet file to save space
        os.remove(local_path)
        logger.info(f'  Removed temp parquet, {total_extracted} total images extracted')
    
    # Save metadata
    meta_df = pd.DataFrame(all_records)
    meta_df.to_csv(OUT_METADATA, index=False)
    logger.info(f'Extraction complete: {total_extracted} images')
    logger.info(f'Metadata saved to {OUT_METADATA}')
    
    # Summary
    if not meta_df.empty:
        logger.info(f'Images with FST: {meta_df.fitzpatrick_skin_type.notna().sum()}')
        logger.info(f'Images with condition: {meta_df.condition.notna().sum()}')
        if meta_df.fitzpatrick_skin_type.notna().any():
            logger.info(f'FST distribution:\n{meta_df.fitzpatrick_skin_type.value_counts().sort_index().to_string()}')
    
    return meta_df

if __name__ == '__main__':
    extract_images()
