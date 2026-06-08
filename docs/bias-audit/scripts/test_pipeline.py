#!/usr/bin/env python3
"""
End-to-end test of the bias audit pipeline using dummy data.
Creates synthetic images and metadata, runs dedup + stratification, then tests evaluation.
"""

import os
import sys
import json
import tempfile
import shutil
import numpy as np
import pandas as pd
from PIL import Image
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

def create_dummy_dataset(tmp_dir: Path):
    """Create a dummy dataset in expected directory structure."""
    data_dir = tmp_dir / "data"
    ds_dir = data_dir / "fitzpatrick17k"
    image_dir = ds_dir / "images"
    image_dir.mkdir(parents=True, exist_ok=True)
    
    records = []
    np.random.seed(42)
    for fst in [1, 2, 3, 4, 5, 6]:
        for condition in ["Cellulitis", "Eczema", "Psoriasis"]:
            for i in range(5):
                img_path = image_dir / f"fst_{fst}_{condition}_{i}.png"
                # Create random noise images for guaranteed uniqueness
                arr = np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)
                Image.fromarray(arr).save(img_path)
                records.append({
                    "image_path": str(img_path.name),
                    "condition": condition,
                    "fitzpatrick_skin_type": fst,
                    "urgency": "YELLOW",
                })
    
    metadata = pd.DataFrame(records)
    metadata.to_csv(ds_dir / "fitzpatrick17k.csv", index=False)
    print(f"Created dummy dataset with {len(records)} images at {ds_dir}")
    return data_dir

def test_dedup_and_stratify(data_dir: Path):
    """Test the combination and stratification logic."""
    from dataset_utils import combine_and_deduplicate, stratify_dataset
    
    print("\n--- Testing Deduplication ---")
    combined = combine_and_deduplicate(data_dir)
    assert len(combined) == 90, f"Expected 90 unique images, got {len(combined)}"
    print(f"PASS: Deduplication returned {len(combined)} images")
    
    print("\n--- Testing Stratification ---")
    output_dir = data_dir / "processed"
    stratified = stratify_dataset(combined, output_dir=output_dir, min_per_type_per_condition=3)
    
    total = sum(len(indices) for indices in stratified.values())
    print(f"Stratified dataset: {total} samples across {len(stratified)} FST groups")
    
    # Check that each FST has the minimum samples
    for fst, indices in stratified.items():
        count = len(indices)
        print(f"  FST {fst}: {count} samples")
        assert count >= 3, f"FST {fst} has only {count} samples, need at least 3"
    print("PASS: Stratification complete")
    return output_dir

def test_evaluation():
    """Test the evaluation metrics with synthetic results."""
    from evaluation import (
        calculate_metrics_per_fst,
        calculate_performance_gap,
        generate_performance_gap_report
    )
    import pandas as pd
    
    print("\n--- Testing Evaluation Metrics ---")
    
    # Create synthetic results
    np.random.seed(42)
    records = []
    for fst in range(1, 7):
        for _ in range(10):
            correct = np.random.random() > (0.1 if fst <= 2 else 0.2)  # Light better than dark
            records.append({
                "fitzpatrick_skin_type": fst,
                "true_diagnosis": "Cellulitis",
                "predicted_diagnosis": "Cellulitis" if correct else "Eczema",
                "true_urgency": "YELLOW",
                "predicted_urgency": "YELLOW" if correct else "RED",
                "confidence": 85.0 if correct else 60.0
            })
    
    df = pd.DataFrame(records)
    
    # Calculate metrics
    metrics_df = calculate_metrics_per_fst(df)
    print("Metrics per FST:")
    print(metrics_df.to_string())
    
    # Calculate gap
    gap = calculate_performance_gap(metrics_df)
    print("\nPerformance Gap:")
    for metric, data in gap.items():
        if "status" in data:
            print(f"  {metric}: gap={data['gap']:.3f}, status={data['status']}")
    
    # Generate report
    report = generate_performance_gap_report(gap)
    print(f"\nReport:\n{report}")
    
    print("PASS: Evaluation metrics working")
    return gap

def test_inference_wrapper():
    """Test the inference wrapper loads correctly (without downloading huge models)."""
    from inference_wrapper import GemmaInferenceWrapper
    
    print("\n--- Testing Inference Wrapper ---")
    wrapper = GemmaInferenceWrapper(model_name="google/gemma-4-2b")
    print(f"Initialized wrapper for {wrapper.model_name}")
    print(f"Device: {wrapper.device}")
    print("PASS: Inference wrapper initialized (model not loaded to save time)")
    return True

def main():
    print("=" * 60)
    print("BIAS AUDIT PIPELINE TEST")
    print("=" * 60)
    
    # Create temporary directory for test data
    tmp_dir = Path(tempfile.mkdtemp(prefix="bias_audit_test_"))
    print(f"Working in {tmp_dir}")
    
    try:
        # Run tests
        data_dir = create_dummy_dataset(tmp_dir)
        output_dir = test_dedup_and_stratify(data_dir)
        gap = test_evaluation()
        test_inference_wrapper()
        
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED")
        print("=" * 60)
        print("\nThe bias audit pipeline is ready:")
        print("  1. Prepare data: python scripts/prepare_data.py")
        print("  2. Run audit:    python scripts/run_audit.py")
        print("  3. Results in:   docs/bias-audit/results/")
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Cleanup
        shutil.rmtree(tmp_dir)
        print(f"\nCleaned up {tmp_dir}")

if __name__ == "__main__":
    main()