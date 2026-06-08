#!/usr/bin/env python3
"""
Script to prepare the bias audit dataset (download, combine, deduplicate, stratify).
This version does not require PyTorch and focuses on data preparation only.
"""

import os
import sys
import argparse
import logging
from pathlib import Path
import pandas as pd

# Add the scripts directory to the path so we can import our modules
sys.path.append(str(Path(__file__).parent))

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler("data_preparation.log"),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def check_dependencies(logger):
    """Check if required packages are installed (excluding torch)."""
    required_packages = [
        'Pillow', 'pandas', 'numpy', 'scikit-learn', 'tqdm', 'imagehash', 'requests'
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
        logger.info("All required packages (except torch) are installed.")
        return True

def manual_download_instructions(logger):
    """Print instructions for manually downloading datasets."""
    logger.info("="*60)
    logger.info("MANUAL DOWNLOAD INSTRUCTIONS")
    logger.info("="*60)
    logger.info("Please download the following datasets and place them in the specified directories:")
    logger.info("")
    logger.info("1. Fitzpatrick17k")
    logger.info("   URL: https://github.com/mattgroh/fitzpatrick17k")
    logger.info("   Location: /home/moses/Desktop/trij/docs/bias-audit/data/fitzpatrick17k/")
    logger.info("   Expected contents: CSV file and image directory")
    logger.info("")
    logger.info("2. SCIN (Skin Condition Image Network)")
    logger.info("   URL: https://github.com/google-research-datasets/scin")
    logger.info("   Location: /home/moses/Desktop/trij/docs/bias-audit/data/scin/")
    logger.info("   Expected contents: Images and metadata")
    logger.info("")
    logger.info("3. DDI (Diverse Dermatology Images)")
    logger.info("   URL: https://ddi-dataset.github.io/ (via Stanford AIMI Shared Datasets Portal)")
    logger.info("   Location: /home/moses/Desktop/trij/docs/bias-audit/data/ddi/")
    logger.info("   Expected contents: Images and metadata (after access request)")
    logger.info("")
    logger.info("4. DDI-2")
    logger.info("   URL: https://daneshjoulab.github.io/ddi2-dataset/")
    logger.info("   Location: /home/moses/Desktop/trij/docs/bias-audit/data/ddi2/")
    logger.info("   Expected contents: Images and metadata")
    logger.info("")
    logger.info("5. MSKCC Skin Tone Labeling Dataset")
    logger.info("   URL: https://api.isic-archive.com/collections/413/")
    logger.info("   Location: /home/moses/Desktop/trij/docs/bias-audit/data/mskcc/")
    logger.info("   Expected contents: Images and metadata")
    logger.info("")
    logger.info("After downloading, run this script again.")
    logger.info("="*60)

def check_dataset_exists(dataset_name, data_dir):
    """Check if a dataset appears to be present."""
    dataset_path = Path(data_dir) / dataset_name
    if not dataset_path.exists():
        return False
    
    # Check for at least one file in the directory
    if any(dataset_path.iterdir()):
        return True
    return False

def main():
    logger = setup_logging()
    logger.info("Starting bias audit dataset preparation (data only)...")
    
    parser = argparse.ArgumentParser(description="Prepare bias audit dataset for Fitzpatrick skin tone evaluation (data preparation only).")
    parser.add_argument("--skip-check", action="store_true", help="Skip dependency check")
    parser.add_argument("--output-dir", type=str, default="/home/moses/Desktop/trij/docs/bias-audit/data/processed", 
                        help="Directory to save the processed dataset")
    args = parser.parse_args()
    
    # Check dependencies unless skipped
    if not args.skip_check:
        if not check_dependencies(logger):
            sys.exit(1)
    
    # Define paths
    base_data_dir = Path("/home/moses/Desktop/trij/docs/bias-audit/data")
    base_data_dir.mkdir(exist_ok=True)
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Check for datasets
    datasets = {
        'fitzpatrick17k': "Fitzpatrick17k",
        'scin': "SCIN",
        'ddi': "DDI",
        'ddi2': "DDI-2",
        'mskcc': "MSKCC"
    }
    
    missing_datasets = []
    for dataset_key, dataset_name in datasets.items():
        if not check_dataset_exists(dataset_key, base_data_dir):
            missing_datasets.append(dataset_name)
            logger.warning(f"Dataset {dataset_name} not found in {base_data_dir / dataset_key}")
    
    if missing_datasets:
        logger.warning(f"The following datasets are missing: {', '.join(missing_datasets)}")
        manual_download_instructions(logger)
        logger.info("Proceeding with available datasets for combination and stratification...")
        # We'll continue but note that the results may be incomplete
    
    # Import dataset utilities
    try:
        from dataset_utils import combine_and_deduplicate, stratify_dataset
    except ImportError as e:
        logger.error(f"Failed to import dataset utilities: {e}")
        sys.exit(1)
    
    # Step 1: Combine and deduplicate datasets
    logger.info("Step 1: Combining and deduplicating datasets...")
    try:
        combined_metadata = combine_and_deduplicate(base_data_dir)
        logger.info(f"Combined dataset has {len(combined_metadata)} records.")
        
        # Save combined metadata
        combined_metadata_path = output_dir / "combined_metadata.csv"
        combined_metadata.to_csv(combined_metadata_path, index=False)
        logger.info(f"Combined metadata saved to {combined_metadata_path}")
    except Exception as e:
        logger.error(f"Failed to combine and deduplicate datasets: {e}")
        sys.exit(1)
    
    # Step 2: Stratify the dataset
    logger.info("Step 2: Stratifying dataset for bias audit...")
    try:
        stratified_samples = stratify_dataset(
            combined_metadata, 
            output_dir=output_dir, 
            min_per_type_per_condition=50
        )
        logger.info("Stratification complete.")
        
        # Print summary
        total_samples = sum(len(indices) for indices in stratified_samples.values())
        logger.info(f"Total samples in stratified dataset: {total_samples}")
        
        for fst in sorted(stratified_samples.keys()):
            count = len(stratified_samples[fst])
            logger.info(f"  Fitzpatrick Type {fst}: {count} samples")
            
    except Exception as e:
        logger.error(f"Failed to stratify dataset: {e}")
        sys.exit(1)
    
    logger.info("Bias audit dataset preparation completed successfully!")
    logger.info(f"Processed data is available in: {output_dir}")
    logger.info("Next steps:")
    logger.info("  1. Ensure all required datasets are downloaded (see instructions above if any were missing)")
    logger.info("  2. Re-run this script to include all datasets")
    logger.info("  3. Once PyTorch is installed, run the audit with: python scripts/run_audit.py")

if __name__ == "__main__":
    main()