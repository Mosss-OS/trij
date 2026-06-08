"""
Utility functions for dataset preparation in the bias audit.
"""

import os
import pandas as pd
import numpy as np
from PIL import Image
import imagehash
from tqdm import tqdm
import shutil
from pathlib import Path
import hashlib

def combine_and_deduplicate(data_dir):
    """
    Combine metadata from all datasets and deduplicate images.
    
    Args:
        data_dir (Path or str): Directory containing the downloaded datasets.
        
    Returns:
        pd.DataFrame: Combined and deduplicated metadata.
    """
    data_dir = Path(data_dir)
    all_metadata = []
    
    # Define expected metadata files for each dataset
    dataset_info = {
        'fitzpatrick17k': {'metadata': 'fitzpatrick17k.csv', 'image_dir': 'images'},
        'scin': {'metadata': 'metadata.csv', 'image_dir': 'images'},  # Adjust based on actual structure
        'ddi': {'metadata': 'metadata.csv', 'image_dir': 'images'},
        'ddi2': {'metadata': 'metadata.csv', 'image_dir': 'images'},
        'mskcc': {'metadata': 'metadata.csv', 'image_dir': 'images'}
    }
    
    for dataset_name, info in dataset_info.items():
        dataset_path = data_dir / dataset_name
        metadata_path = dataset_path / info['metadata']
        image_dir = dataset_path / info['image_dir']
        
        if not metadata_path.exists():
            print(f"Warning: Metadata file not found for {dataset_name} at {metadata_path}")
            continue
            
        try:
            df = pd.read_csv(metadata_path)
            df['dataset'] = dataset_name
            all_metadata.append(df)
            print(f"Loaded {len(df)} records from {dataset_name}")
        except Exception as e:
            print(f"Error loading metadata for {dataset_name}: {e}")
    
    if not all_metadata:
        raise ValueError("No metadata files were loaded. Please check the dataset downloads.")
    
    combined = pd.concat(all_metadata, ignore_index=True)
    
    # Standardize columns: we expect at least 'image_path' or similar, and 'fitzpatrick_skin_type'
    # This will need to be adjusted based on the actual column names in each dataset.
    # For now, we assume the datasets have been preprocessed to have common column names.
    # In reality, we would need to map the columns from each dataset to a common schema.
    
    # Placeholder for column mapping - this would be dataset-specific
    # For the sake of this script, we assume the datasets already have:
    # - 'image_path': relative path to the image file within the dataset directory
    # - 'fitzpatrick_skin_type': integer from 1 to 6
    # - 'condition': the diagnosis or condition label
    
    # We'll create a column for the absolute image path
    combined['absolute_image_path'] = combined.apply(
        lambda row: data_dir / row['dataset'] / info['image_dir'] / row['image_path'] 
        if 'image_path' in row and pd.notnull(row['image_path']) else None, 
        axis=1
    )
    
    # Now deduplicate based on image content using perceptual hashing
    print("Starting deduplication based on image content...")
    # We'll store the hash of each image and keep the first occurrence
    hash_map = {}
    duplicates = []
    
    for idx, row in tqdm(combined.iterrows(), total=len(combined), desc="Processing images"):
        img_path = row['absolute_image_path']
        if img_path is None or not os.path.exists(img_path):
            duplicates.append(idx)
            continue
            
        try:
            with Image.open(img_path) as img:
                # Resize to a standard size for hashing to speed up and avoid issues with different sizes
                img = img.resize((256, 256))
                img_hash = imagehash.average_hash(img)
            if img_hash in hash_map:
                duplicates.append(idx)
            else:
                hash_map[img_hash] = idx
        except Exception as e:
            print(f"Could not process image {img_path}: {e}")
            duplicates.append(idx)
    
    # Remove duplicates
    deduplicated = combined.drop(index=duplicates).reset_index(drop=True)
    print(f"Removed {len(duplicates)} duplicate images. {len(deduplicated)} unique images remain.")
    
    return deduplicated

def stratify_dataset(metadata_df, output_dir, min_per_type_per_condition=50):
    """
    Stratify the dataset to ensure minimum number of images per Fitzpatrick type per condition.
    
    Args:
        metadata_df (pd.DataFrame): Metadata DataFrame with at least 'fitzpatrick_skin_type' and 'condition' columns.
        output_dir (Path or str): Directory to save the stratified dataset.
        min_per_type_per_condition (int): Minimum number of images desired per Fitzpatrick type per condition.
        
    Returns:
        dict: Dictionary mapping Fitzpatrick type to list of selected indices for each condition.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # We'll create a stratified sample by grouping by condition and Fitzpatrick type
    stratified_samples = {}
    
    # Get unique conditions and Fitzpatrick types
    conditions = metadata_df['condition'].unique()
    fitzpatrick_types = sorted(metadata_df['fitzpatrick_skin_type'].unique())
    
    for condition in conditions:
        condition_df = metadata_df[metadata_df['condition'] == condition]
        for fst in fitzpatrick_types:
            fst_df = condition_df[condition_df['fitzpatrick_skin_type'] == fst]
            n_available = len(fst_df)
            
            if n_available >= min_per_type_per_condition:
                # We have enough, so we can sample min_per_type_per_condition (or we could take all, but let's sample to avoid bias)
                # For simplicity, we'll take the first min_per_type_per_condition (or we could randomize)
                selected = fst_df.sample(n=min_per_type_per_condition, random_state=42)
            else:
                # Not enough, we take all available
                selected = fst_df
                print(f"Warning: Only {n_available} images available for condition '{condition}' and FST {fst}, which is less than the minimum {min_per_type_per_condition}.")
            
            # Store the selected indices
            if fst not in stratified_samples:
                stratified_samples[fst] = []
            stratified_samples[fst].extend(selected.index.tolist())
            
            # Save the selected subset for this condition and FST (optional, for inspection)
            condition_fst_dir = output_dir / f"condition_{condition}" / f"fst_{fst}"
            condition_fst_dir.mkdir(parents=True, exist_ok=True)
            selected.to_csv(condition_fst_dir / "metadata.csv", index=False)
            
            # Also copy the images
            for _, row in selected.iterrows():
                src_img_path = row['absolute_image_path']
                if src_img_path and os.path.exists(src_img_path):
                    dst_img_path = condition_fst_dir / os.path.basename(src_img_path)
                    shutil.copy2(src_img_path, dst_img_path)
    
    # Save the overall stratified metadata
    selected_indices = [index for indices in stratified_samples.values() for index in indices]
    stratified_metadata = metadata_df.loc[selected_indices]
    stratified_metadata.to_csv(output_dir / "stratified_metadata.csv", index=False)
    
    # Create a summary
    summary = []
    for fst in fitzpatrick_types:
        count = len(stratified_samples.get(fst, []))
        summary.append({"Fitzpatrick_Type": fst, "Image_Count": count})
    summary_df = pd.DataFrame(summary)
    summary_df.to_csv(output_dir / "stratification_summary.csv", index=False)
    
    print("Stratification complete. Summary saved to:", output_dir / "stratification_summary.csv")
    
    return stratified_samples

if __name__ == "__main__":
    # For testing purposes
    print("This script is intended to be imported. Please run master_prepare.py.")