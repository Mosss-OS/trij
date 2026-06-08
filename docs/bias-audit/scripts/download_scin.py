#!/usr/bin/env python3
"""
Script to download the SCIN (Skin Condition Image Network) dataset.
Source: https://github.com/google-research-datasets/scin
"""

import os
import requests
import zipfile
import tqdm
import json
import pandas as pd

def download_scin(output_dir):
    """Download and extract the SCIN dataset."""
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # SCIN dataset is available via Google Cloud Storage or direct download links from the GitHub repo.
    # According to the GitHub repository, the dataset can be downloaded from:
    # https://console.cloud.google.com/storage/binary/google-research-datasets/scin/
    # However, for simplicity, we note that the dataset consists of multiple parts.
    # We'll provide a placeholder and instruct the user to check the GitHub repository for the latest download links.
    
    print("Please download the SCIN dataset manually from:")
    print("https://github.com/google-research-datasets/scin")
    print("Follow the instructions in the repository to download the images and metadata.")
    print("Extract the contents into:", output_dir)
    print("The dataset should contain a directory of images and a metadata file (CSV or JSON).")
    
    # We return False to indicate that manual download is required.
    return False

if __name__ == "__main__":
    output_dir = "/home/moses/Desktop/trij/docs/bias-audit/data/scin"
    success = download_scin(output_dir)
    if not success:
        exit(1)