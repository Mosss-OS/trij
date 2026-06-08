"""
Functions for calculating bias audit metrics and generating reports.
"""

import pandas as pd
import numpy as np
from sklearn.metrics import (
    accuracy_score, confusion_matrix, cohen_kappa_score,
    brier_score_loss, roc_auc_score
)
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

def calculate_metrics_per_fst(
    df: pd.DataFrame,
    fst_column: str = "fitzpatrick_skin_type",
    true_column: str = "true_diagnosis",
    pred_column: str = "predicted_diagnosis",
    urgency_true: str = "true_urgency",
    urgency_pred: str = "predicted_urgency",
    confidence_column: str = "confidence"
) -> pd.DataFrame:
    """
    Calculate accuracy, sensitivity, specificity, and other metrics per Fitzpatrick skin type.
    
    Args:
        df: DataFrame with ground truth and predictions.
        fst_column: Column containing Fitzpatrick skin type (1-6).
        true_column: Column with ground truth diagnosis.
        pred_column: Column with predicted diagnosis.
        urgency_true: Column with ground truth urgency.
        urgency_pred: Column with predicted urgency.
        confidence_column: Column with confidence scores.
        
    Returns:
        DataFrame with metrics per Fitzpatrick skin type.
    """
    metrics_rows = []
    
    for fst in sorted(df[fst_column].unique()):
        subset = df[df[fst_column] == fst]
        n = len(subset)
        
        if n == 0:
            continue
        
        # Accuracy
        accuracy = accuracy_score(subset[true_column], subset[pred_column])
        
        # Sensitivity and Specificity per condition (macro average)
        conditions = sorted(set(subset[true_column].unique()) | set(subset[pred_column].unique()))
        sensitivities = []
        specificities = []
        for condition in conditions:
            y_true = (subset[true_column] == condition).astype(int)
            y_pred = (subset[pred_column] == condition).astype(int)
            cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
            if cm.shape == (2, 2):
                tn, fp, fn, tp = cm.ravel()
                sensitivities.append(tp / (tp + fn) if (tp + fn) > 0 else 0.0)
                specificities.append(tn / (tn + fp) if (tn + fp) > 0 else 0.0)
        
        mean_sensitivity = np.mean(sensitivities) if sensitivities else 0.0
        mean_specificity = np.mean(specificities) if specificities else 0.0
        
        # Urgency classification agreement
        if urgency_true in df.columns and urgency_pred in df.columns:
            urgency_agreement = accuracy_score(
                subset[urgency_true], subset[urgency_pred]
            )
        else:
            urgency_agreement = np.nan
        
        # Cohen's Kappa (inter-rater agreement)
        kappa = cohen_kappa_score(subset[true_column], subset[pred_column])
        
        # Confidence calibration (Brier score)
        if confidence_column in df.columns:
            # Convert confidence to probability for the correct class
            # This is a simplified version; in practice we'd need probabilities per class
            brier = brier_score_loss(
                (subset[true_column] == subset[pred_column]).astype(int),
                subset[confidence_column] / 100.0
            )
        else:
            brier = np.nan
        
        metrics_rows.append({
            "fitzpatrick_type": fst,
            "n": n,
            "accuracy": accuracy,
            "sensitivity": mean_sensitivity,
            "specificity": mean_specificity,
            "urgency_agreement": urgency_agreement,
            "cohen_kappa": kappa,
            "brier_score": brier
        })
    
    return pd.DataFrame(metrics_rows).set_index("fitzpatrick_type")

def calculate_performance_gap(
    metrics_df: pd.DataFrame,
    fst_light: List[int] = [1, 2],
    fst_dark: List[int] = [5, 6]
) -> Dict:
    """
    Calculate performance gap between light (I-II) and dark (V-VI) skin types.
    
    Returns dict with gap analysis and status per metric.
    """
    light = metrics_df[metrics_df.index.isin(fst_light)]
    dark = metrics_df[metrics_df.index.isin(fst_dark)]
    
    if light.empty or dark.empty:
        return {"error": "Insufficient data for gap analysis"}
    
    results = {}
    metrics = ["accuracy", "sensitivity", "specificity", "urgency_agreement"]
    
    for metric in metrics:
        if metric not in metrics_df.columns:
            continue
        light_mean = light[metric].mean()
        dark_mean = dark[metric].mean()
        gap = light_mean - dark_mean
        
        if gap < 0.05:
            status = "GREEN"
        elif gap < 0.10:
            status = "YELLOW"
        else:
            status = "RED"
        
        results[metric] = {
            "light_mean": light_mean,
            "dark_mean": dark_mean,
            "gap": gap,
            "status": status
        }
    
    return results

def generate_performance_gap_report(gap_results: Dict) -> str:
    """Generate a formatted text report of performance gap analysis."""
    lines = ["## Performance Gap Report: FST I-II vs FST V-VI", ""]
    
    for metric, data in gap_results.items():
        if "error" in data:
            lines.append(f"Error: {data['error']}")
            continue
        lines.append(f"### {metric.replace('_', ' ').title()}")
        lines.append(f"  Light (I-II): {data['light_mean']:.3f}")
        lines.append(f"  Dark (V-VI):  {data['dark_mean']:.3f}")
        lines.append(f"  Gap:          {data['gap']:.3f}")
        lines.append(f"  Status:       {data['status']}")
        lines.append("")
    
    return "\n".join(lines)

def update_audit_results(metrics_df: pd.DataFrame, gap_report_path: str):
    """Update or create the bias audit results in BIAS_AUDIT.md format."""
    logger.info("Updating audit results...")
    # In a full implementation, this would update the BIAS_AUDIT.md file
    # For now, save to CSV and generate report
    metrics_df.to_csv("/home/moses/Desktop/trij/docs/bias-audit/results/metrics.csv")
    gap_results = calculate_performance_gap(metrics_df)
    report = generate_performance_gap_report(gap_results)
    with open(gap_report_path, "w") as f:
        f.write(report)
    logger.info(f"Results saved. Gap report written to {gap_report_path}")
    return gap_results