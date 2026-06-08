#!/usr/bin/env python3
"""
Script to download the DDI-2 dataset (Asian patient cohort).
Source: https://daneshjoulab.github.io/ddi2-dataset/
"""

import os

def download_ddi2(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    print("Please download the DDI-2 dataset manually from:")
    print("  https://daneshjoulab.github.io/ddi2-dataset/")
    print("The dataset is hosted on GitHub and available as a single archive.")
    print(f"Extract the contents into: {output_dir}")
    print("Expected contents: images/ directory and metadata.csv")

if __name__ == "__main__":
    download_ddi2("/home/moses/Desktop/trij/docs/bias-audit/data/ddi2")