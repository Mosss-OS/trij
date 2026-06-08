#!/usr/bin/env python3
"""
Script to download the Fitzpatrick17k dataset.
Source: https://github.com/mattgroh/fitzpatrick17k
"""

import os
import requests
import zipfile
import tqdm
import math

def download_file_from_google_drive(id, destination):
    """Download a file from Google Drive given the file ID."""
    URL = "https://drive.google.com/uc?export=download"
    session = requests.Session()
    response = session.get(URL, params={'id': id}, stream=True)
    token = get_confirm_token(response)
    if token:
        params = {'id': id, 'confirm': token}
        response = session.get(URL, params=params, stream=True)
    save_response_content(response, destination)

def get_confirm_token(response):
    """Extract the confirmation token from the response cookies."""
    for key, value in response.cookies.items():
        if key.startswith('download_warning'):
            return value
    return None

def save_response_content(response, destination):
    """Save the response content to a file with a progress bar."""
    CHUNK_SIZE = 32768
    total_size = int(response.headers.get('content-length', 0))
    with open(destination, "wb") as f, tqdm.tqdm(
        desc=destination,
        total=total_size,
        unit='B',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for chunk in response.iter_content(CHUNK_SIZE):
            if chunk:
                f.write(chunk)
                bar.update(len(chunk))

def download_fitzpatrick17k(output_dir):
    """Download and extract the Fitzpatrick17k dataset."""
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Google Drive file ID for the Fitzpatrick17k dataset (zip file)
    # Note: This ID is for the zip file containing the dataset.
    # As of the time of writing, the dataset is available at:
    # https://drive.google.com/file/d/157YnlRQE2-HpDfyRV9aVjwUccVxYdsJd/view?usp=sharing
    # The direct download link uses the ID: 157YnlRQE2-HpDfyRV9aVjwUccVxYdsJd
    file_id = "157YnlRQE2-HpDfyRV9aVjwUccVxYdsJd"
    zip_path = os.path.join(output_dir, "fitzpatrick17k.zip")
    
    print(f"Downloading Fitzpatrick17k dataset to {zip_path}...")
    try:
        download_file_from_google_drive(file_id, zip_path)
    except Exception as e:
        print(f"Failed to download from Google Drive: {e}")
        print("Please download the dataset manually from:")
        print("https://github.com/mattgroh/fitzpatrick17k")
        print("Extract the contents into:", output_dir)
        return False
    
    # Extract the zip file
    print("Extracting the dataset...")
    with zipfile.ZipFile(zip_path, 'r') zip_ref:
        zip_ref.extractall(output_dir)
    
    # Remove the zip file to save space
    os.remove(zip_path)
    print(f"Dataset extracted and ready in {output_dir}")
    return True

if __name__ == "__main__":
    output_dir = "/home/moses/Desktop/trij/docs/bias-audit/data/fitzpatrick17k"
    success = download_fitzpatrick17k(output_dir)
    if not success:
        exit(1)