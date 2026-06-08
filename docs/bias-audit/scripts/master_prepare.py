#!/usr/bin/env python3
"""
Master script to prepare the bias audit dataset.
This script orchestrates the downloading, deduplication, and stratification of the datasets.
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Add the scripts directory to the path so we can import our modules
sys.path.append(str(Path(__file__).parent))

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler("bias_audit_preparation.log"),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def check_dependencies(logger):
    """Check if required packages are installed."""
    required_packages = [
        'torch', 'transformers', 'Pillow', 'pandas', 'numpy', 
        'scikit-learn', 'tqdm', 'imagehash', 'requests'
    ]
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        logger.error(f"Missing packages: {missing}")
        logger.error("Please install them using: pip install -r scripts/requirements.txt")
        return False
    else:
        logger.info("All required packages are installed.")
        return True

def main():
    logger = setup_logging()
    logger.info("Starting bias audit dataset preparation...")
    
    parser = argparse.ArgumentParser(description="Prepare bias audit dataset for Fitzpatrick skin tone evaluation.")
    parser.add_argument("--skip-download", action="store_true", help="Skip downloading datasets (assumes they are already present)")
    parser.add_argument("--skip-dedup", action="store_true", help="Skip deduplication step")
    parser.add_argument("--skip-stratify", action="store_true", help="Skip stratification step")
    parser.add_argument("--output-dir", type=str, default="/home/moses/Desktop/trij/docs/bias-audit/data/processed", 
                        help="Directory to save the processed dataset")
    args = parser.parse_args()
    
    # Check dependencies
    if not check_dependencies(logger):
        sys.exit(1)
    
    # Define paths
    data_dir = Path("/home/moses/Desktop/trij/docs/bias-audit/data")
    data_dir.mkdir(exist_ok=True)
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Download datasets (if not skipped)
    if not args.skip_download:
        logger.info("Step 1: Downloading datasets...")
        # We'll call individual download scripts
        from download_fitzpatrick17k import download_fitzpatrick17k
        from download_scin import download_scin
        from download_ddi import download_ddi
        from download_ddi2 import download_ddi2
        from download_mskcc import download_mskcc
        
        download_fitzpatrick17k(data_dir / "fitzpatrick17k")
        download_scin(data_dir / "scin")
        download_ddi(data_dir / "ddi")
        download_ddi2(data_dir / "ddi2")
        download_mskcc(data_dir / "mskcc")
    else:
        logger.info("Skipping download step.")
    
    # Step 2: Deduplicate and combine datasets (if not skipped)
    if not args.skip_dedup:
        logger.info("Step 2: Deduplicating and combining datasets...")
        # We'll write a function to do this
        from dataset_utils import combine_and_deduplicate
        combined_data = combine_and_deduplicate(data_dir)
        # Save the combined dataset metadata
        combined_data.to_csv(output_dir / "combined_metadata.csv", index=False)
        logger.info(f"Combined dataset saved to {output_dir / 'combined_metadata.csv'}")
    else:
        logger.info("Skipping deduplication step.")
    
    # Step 3: Stratify the dataset (if not skipped)
    if not args.skip_stratify:
        logger.info("Step 3: Stratifying dataset for bias audit...")
        from dataset_utils stratify_dataset
        stratified_samples = stratify_dataset(
            combined_data, 
            output_dir=stratified_dir, 
            min_per_type_per_condition=50
        )
        logger.info(f"Stratified samples saved to {output_dir / 'stratified'}")
    else:
        logger.info("Skipping stratification step.")
    
    logger.info("Bias audit dataset preparation completed.")

if __name__ == "__main__":
    main()