#!/usr/bin/env python3
"""
Script to download the DDI (Diverse Dermatology Images) dataset.
Source: https://ddi-dataset.github.io/ (via Stanford AIMI Shared Datasets Portal)
"""

import os
import requests
import zipfile
import tqdm

def download_ddi(output_dir):
    """Download and extract the DDI dataset."""
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # DDI dataset is available via the Stanford AIMI Shared Datasets Portal.
    # According to the GitHub repository, we need to request access.
    # We'll provide instructions for manual download.
    
    print("Please download the DDI dataset manually from:")
    print("https://ddi-dataset.github.io/")
    print("Follow the instructions to request access via the Stanford AIMI Shared Datasets Portal.")
    print("Once access is granted, download the dataset and extract the contents into:", output_dir)
    print("The dataset should contain a directory of images and a metadata file (CSV).")
    
    # We return False to indicate that manual download is required.
    return False

if __name__ == "__main__":
    output_dir = "/home/moses/Desktop/trij/docs/bias-audit/data/ddi"
    success = download_ddi(output_dir)
    if not success:
        exit(1)