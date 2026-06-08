#!/usr/bin/env python3
"""
Script to download the MSKCC Skin Tone Labeling Dataset.
Source: https://api.isic-archive.com/collections/413/
"""

import os

def download_mskcc(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    print("Please download the MSKCC Skin Tone Labeling Dataset manually from:")
    print("  https://api.isic-archive.com/collections/413/")
    print("The dataset is available via the ISIC Archive under CC-BY license.")
    print(f"Extract the contents into: {output_dir}")
    print("Expected contents: images/ and metadata.csv with Fitzpatrick annotations.")

if __name__ == "__main__":
    download_mskcc("/home/moses/Desktop/trij/docs/bias-audit/data/mskcc")