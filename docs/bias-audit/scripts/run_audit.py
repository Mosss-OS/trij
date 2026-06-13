#!/usr/bin/env python3
"""
Main bias audit execution script.
Loads stratified dataset, runs Gemma 4 inference, computes metrics, generates reports.
"""

import os
import sys
import json
import logging
import argparse
import pandas as pd
from pathlib import Path
from tqdm import tqdm
from typing import Optional

sys.path.append(str(Path(__file__).parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler("bias_audit_run.log")]
)
logger = logging.getLogger(__name__)

def load_stratified_dataset(data_path: Path) -> pd.DataFrame:
    """Load the stratified dataset metadata."""
    metadata_path = data_path / "stratified_metadata.csv"
    if metadata_path.exists():
        df = pd.read_csv(metadata_path)
        logger.info(f"Loaded {len(df)} samples from {metadata_path}")
        return df
    else:
        # Check for combined metadata
        combined_path = data_path / "combined_metadata.csv"
        if combined_path.exists():
            df = pd.read_csv(combined_path)
            logger.info(f"Loaded {len(df)} combined samples from {combined_path}")
            return df
        raise FileNotFoundError(
            f"No metadata found in {data_path}. "
            "Please run prepare_data.py first."
        )

def run_inference_on_dataset(
    df: pd.DataFrame,
    inference_wrapper,
    batch_size: int = 1,
    max_samples: Optional[int] = None
) -> pd.DataFrame:
    """Run inference on all images in the dataset."""
    if max_samples:
        df = df.head(max_samples).copy()
        logger.info(f"Limiting to {max_samples} samples for testing.")
    
    results = []
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Running inference"):
        img_path = row.get("absolute_image_path")
        if not img_path or not os.path.exists(img_path):
            logger.warning(f"Image not found: {img_path}, skipping.")
            continue
        
        try:
            result = inference_wrapper.infer(
                img_path,
                fitzpatrick_type=row.get("fitzpatrick_skin_type", None)
            )
            results.append({
                "index": idx,
                "true_diagnosis": row.get("condition", "Unknown"),
                "true_urgency": row.get("urgency", "UNKNOWN"),
                "true_fitzpatrick": row.get("fitzpatrick_skin_type", 0),
                "predicted_diagnosis": result.get("diagnosis", "Error"),
                "predicted_urgency": result.get("urgency", "UNKNOWN"),
                "confidence": result.get("confidence", 0.0),
                "top_differentials": json.dumps(result.get("top_differentials", [])),
                "error": result.get("error", "")
            })
        except Exception as e:
            logger.error(f"Error processing {img_path}: {e}")
    
    results_df = pd.DataFrame(results)
    logger.info(f"Inference complete. Processed {len(results_df)} samples.")
    return results_df

def main():
    parser = argparse.ArgumentParser(
        description="Run the Fitzpatrick skin tone bias audit."
    )
    parser.add_argument(
        "--model-name",
        type=str,
        default="google/gemma-4-2b",
        help="HuggingFace model name (default: google/gemma-4-2b)"
    )
    parser.add_argument(
        "--data-path",
        type=str,
        default="/home/moses/Desktop/trij/docs/bias-audit/data/processed",
        help="Path to processed data directory"
    )
    parser.add_argument(
        "--max-samples",
        type=int,
        default=None,
        help="Maximum number of samples to process (for testing)"
    )
    parser.add_argument(
        "--skip-inference",
        action="store_true",
        help="Skip inference and only analyze existing results"
    )
    parser.add_argument(
        "--results-file",
        type=str,
        default="/home/moses/Desktop/trij/docs/bias-audit/results/inference_results.csv",
        help="Path to existing inference results CSV (used with --skip-inference)"
    )
    args = parser.parse_args()
    
    data_path = Path(args.data_path)
    results_dir = Path("/home/moses/Desktop/trij/docs/bias-audit/results")
    results_dir.mkdir(exist_ok=True)
    
    # Load dataset
    logger.info("Loading dataset...")
    dataset = load_stratified_dataset(data_path)
    
    # Run inference or load existing results
    if args.skip_inference:
        results_path = Path(args.results_file)
        if results_path.exists():
            results_df = pd.read_csv(results_path)
            logger.info(f"Loaded {len(results_df)} existing results from {results_path}")
        else:
            logger.error(f"Results file not found: {results_path}")
            sys.exit(1)
    else:
        logger.info(f"Initializing inference engine with model: {args.model_name}")
        from inference_wrapper import get_inference_engine
        engine = get_inference_engine(model_name=args.model_name)
        
        logger.info("Running inference...")
        results_df = run_inference_on_dataset(
            dataset, engine, max_samples=args.max_samples
        )
        
        # Save results
        results_path = results_dir / "inference_results.csv"
        results_df.to_csv(results_path, index=False)
        logger.info(f"Results saved to {results_path}")
    
    if results_df.empty:
        logger.error("No results to analyze.")
        sys.exit(1)
    
    # Calculate metrics
    logger.info("Calculating metrics...")
    from evaluation import (
        calculate_metrics_per_fst,
        calculate_performance_gap,
        update_audit_results
    )
    
    metrics_df = calculate_metrics_per_fst(results_df)
    
    # Save metrics
    metrics_path = results_dir / "metrics.csv"
    metrics_df.to_csv(metrics_path)
    logger.info(f"Metrics saved to {metrics_path}")
    print("\n--- Metrics per Fitzpatrick Type ---")
    print(metrics_df.to_string())
    
    # Calculate performance gap
    gap_results = calculate_performance_gap(metrics_df)
    
    # Generate gap report
    from evaluation import generate_performance_gap_report
    gap_report = generate_performance_gap_report(gap_results)
    gap_report_path = results_dir / "performance_gap_report.md"
    with open(gap_report_path, "w") as f:
        f.write(gap_report)
    logger.info(f"Gap report saved to {gap_report_path}")
    print("\n--- Performance Gap Report ---")
    print(gap_report)
    
    # Determine overall status
    statuses = [data["status"] for metric, data in gap_results.items() if "status" in data]
    if "RED" in statuses:
        overall_status = "RED - Block deployment"
    elif "YELLOW" in statuses:
        overall_status = "YELLOW - Document limitations"
    else:
        overall_status = "GREEN - Acceptable"
    
    print(f"\n--- Overall Status: {overall_status} ---")
    
    # Save summary
    summary = {
        "total_samples": len(results_df),
        "model": args.model_name,
        "metrics": {metric: {k: v for k, v in data.items() if k != "status"} for metric, data in gap_results.items()},
        "overall_status": overall_status
    }
    with open(results_dir / "audit_summary.json", "w") as f:
        json.dump(summary, f, indent=2, default=str)
    
    logger.info("Bias audit run completed.")

if __name__ == "__main__":
    main()