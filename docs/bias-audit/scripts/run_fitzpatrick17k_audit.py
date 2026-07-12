#!/usr/bin/env python3
"""Run a quick bias audit on Fitzpatrick17k only (no MSKCC/SCIN dependency)."""

import os, sys, json, time, re, logging, base64, io
from pathlib import Path
import pandas as pd
import numpy as np
from tqdm import tqdm

sys.path.append(str(Path(__file__).parent))
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE = Path('/home/moses/Desktop/trij/docs/bias-audit')
DATA = BASE / 'data'
RESULTS = BASE / 'results'
RESULTS.mkdir(exist_ok=True)


def load_fitzpatrick17k():
    meta_path = DATA / 'fitzpatrick17k/fitzpatrick17k_metadata.csv'
    if not meta_path.exists():
        logger.error('Fitzpatrick17k metadata not found')
        sys.exit(1)
    df = pd.read_csv(meta_path)
    df = df[df['fitzpatrick_skin_type'].between(1, 6)].copy()
    logger.info(f'Loaded {len(df)} Fitzpatrick17k images')
    return df[['image_id', 'abs_path', 'fitzpatrick_skin_type', 'condition', 'dataset']]


def simulate_inference(dataset):
    np.random.seed(42)
    results = []
    for _, row in tqdm(dataset.iterrows(), total=len(dataset), desc='Simulating'):
        fst = int(row['fitzpatrick_skin_type'])
        if fst <= 2:
            correct = np.random.random() > 0.08
            conf = np.random.normal(88, 5)
        elif fst <= 4:
            correct = np.random.random() > 0.12
            conf = np.random.normal(82, 7)
        else:
            correct = np.random.random() > 0.20
            conf = np.random.normal(72, 10)
        results.append({
            'fitzpatrick_skin_type': fst,
            'true_diagnosis': str(row.get('condition', 'Unknown')),
            'true_urgency': 'YELLOW',
            'predicted_diagnosis': str(row['condition']) if correct else 'Unknown',
            'predicted_urgency': 'YELLOW' if np.random.random() > 0.1 else 'RED',
            'confidence': max(0, min(100, conf)),
        })
    return pd.DataFrame(results)


def calculate_metrics(df):
    from sklearn.metrics import accuracy_score, confusion_matrix, cohen_kappa_score, brier_score_loss
    metrics = []
    for fst in sorted(df['fitzpatrick_skin_type'].unique()):
        sub = df[df['fitzpatrick_skin_type'] == fst]
        n = len(sub)
        acc = accuracy_score(sub['true_diagnosis'], sub['predicted_diagnosis'])
        conditions = sorted(set(sub['true_diagnosis']) | set(sub['predicted_diagnosis']))
        sensitivities, specificities = [], []
        for cond in conditions:
            y_true = (sub['true_diagnosis'] == cond).astype(int)
            y_pred = (sub['predicted_diagnosis'] == cond).astype(int)
            cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
            if cm.shape == (2, 2):
                tn, fp, fn, tp = cm.ravel()
                sensitivities.append(tp / (tp + fn) if (tp + fn) > 0 else 0.0)
                specificities.append(tn / (tn + fp) if (tn + fp) > 0 else 0.0)
        urg_acc = accuracy_score(sub['true_urgency'], sub['predicted_urgency'])
        kappa = cohen_kappa_score(sub['true_diagnosis'], sub['predicted_diagnosis'])
        correct = (sub['true_diagnosis'] == sub['predicted_diagnosis']).astype(int)
        brier = brier_score_loss(correct, sub['confidence'] / 100.0)
        metrics.append({
            'fitzpatrick_type': fst, 'n': n, 'accuracy': acc,
            'sensitivity': np.mean(sensitivities) if sensitivities else 0,
            'specificity': np.mean(specificities) if specificities else 0,
            'urgency_agreement': urg_acc, 'cohen_kappa': kappa, 'brier_score': brier
        })
    return pd.DataFrame(metrics).set_index('fitzpatrick_type')


def calculate_gap(metrics):
    light = metrics[metrics.index.isin([1, 2])]
    dark = metrics[metrics.index.isin([5, 6])]
    if light.empty or dark.empty:
        return {'error': 'Insufficient data for gap analysis'}
    results = {}
    for metric in ['accuracy', 'sensitivity', 'specificity', 'urgency_agreement']:
        if metric not in metrics.columns:
            continue
        gap = light[metric].mean() - dark[metric].mean()
        status = 'GREEN' if gap < 0.05 else ('YELLOW' if gap < 0.10 else 'RED')
        results[metric] = {
            'light_mean': float(light[metric].mean()),
            'dark_mean': float(dark[metric].mean()),
            'gap': float(gap),
            'status': status
        }
    return results


def main():
    logger.info('=== Trij Bias Audit — Fitzpatrick17k Only ===')

    # Check if GPU is available for real inference
    try:
        import torch
        has_gpu = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if has_gpu else 'none'
    except:
        has_gpu = False
        gpu_name = 'none'

    logger.info(f'CUDA available: {has_gpu} ({gpu_name})')
    logger.info(f'CPU count: {os.cpu_count()}')
    logger.info(f'RAM: {os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES") / 1e9:.1f} GB')

    # Load data
    df = load_fitzpatrick17k()
    logger.info(f'FST distribution:\n{df["fitzpatrick_skin_type"].value_counts().sort_index().to_string()}')
    logger.info(f'Conditions: {df["condition"].nunique()}')

    # Simulate (replace with real inference if GPU available)
    logger.info('Running simulated inference...')
    results = simulate_inference(df)

    results_path = RESULTS / 'inference_results.csv'
    results.to_csv(results_path, index=False)
    logger.info(f'Results saved to {results_path}')

    # Metrics
    metrics = calculate_metrics(results)
    metrics.to_csv(RESULTS / 'metrics.csv')
    logger.info(f'Metrics:\n{metrics.to_string()}')

    # Gap analysis
    gap = calculate_gap(metrics)
    statuses = [v['status'] for v in gap.values() if isinstance(v, dict) and 'status' in v]
    overall = 'GREEN'
    if 'RED' in statuses:
        overall = 'RED — Block deployment'
    elif 'YELLOW' in statuses:
        overall = 'YELLOW — Document limitations'

    print('\n' + '=' * 60)
    print('PERFORMANCE GAP: FST I-II vs FST V-VI')
    print('=' * 60)
    for metric, data in gap.items():
        if 'error' in data:
            print(f'  {metric}: {data["error"]}')
            continue
        print(f'  {metric.replace("_", " ").title()}:')
        print(f'    Light (I-II): {data["light_mean"]:.3f}')
        print(f'    Dark (V-VI):  {data["dark_mean"]:.3f}')
        print(f'    Gap:          {data["gap"]:.3f}')
        print(f'    Status:       {data["status"]}')
    print(f'\n  OVERALL: {overall}')
    print(f'\n  Dataset: Fitzpatrick17k ({len(df)} images with FST 1-6)')

    # Summary JSON
    summary = {
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'total_samples': len(results),
        'simulated': True,
        'dataset': 'fitzpatrick17k',
        'metrics': {k: {sk: sv for sk, sv in v.items() if sk != 'status'} for k, v in gap.items()},
        'overall_status': overall
    }
    with open(RESULTS / 'audit_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    logger.info('Audit complete!')


if __name__ == '__main__':
    main()
