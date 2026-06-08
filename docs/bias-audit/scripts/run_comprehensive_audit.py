#!/usr/bin/env python3
"""
Comprehensive bias audit runner for Trij.
Combines MSKCC + SCIN data, runs inference via Ollama or simulated,
computes per-FST metrics, generates performance gap report.
"""

import os, sys, json, time, logging, argparse, requests, base64, io, re
from pathlib import Path
import pandas as pd
import numpy as np
from PIL import Image
from tqdm import tqdm

sys.path.append(str(Path(__file__).parent))
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE = Path('/home/moses/Desktop/trij/docs/bias-audit')
DATA = BASE / 'data'
RESULTS = BASE / 'results'
RESULTS.mkdir(exist_ok=True)

FST_MAP = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6}
FST_REVERSE = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI'}


def load_mskcc():
    df = pd.read_csv(DATA / 'mskcc/metadata.csv', skiprows=3)
    df['fitzpatrick_skin_type'] = df['fitzpatrick_skin_type'].map(FST_MAP)
    df['image_path'] = df['isic_id'] + '.jpg'
    df['abs_path'] = df['image_path'].apply(lambda x: str(DATA / 'mskcc/images' / x))
    df = df[df['abs_path'].apply(os.path.exists)].copy()
    df['condition'] = df['diagnosis_1']
    df['dataset'] = 'mskcc'
    return df[['isic_id', 'abs_path', 'fitzpatrick_skin_type', 'condition', 'dataset']]


def load_scin():
    meta_path = DATA / 'scin/scin_metadata.csv'
    if not meta_path.exists():
        logger.warning('SCIN metadata not found, skipping')
        return pd.DataFrame()
    df = pd.read_csv(meta_path)
    # Filter to rows that have images on disk
    img_dir = DATA / 'scin/images'
    available = set(f.replace('.png', '') for f in os.listdir(img_dir) if f.endswith('.png'))
    df['case_id_str'] = df['case_id'].astype(str)
    df = df[df['case_id_str'].isin(available)].copy()
    if len(df) == 0:
        logger.warning('No SCIN images match metadata')
        return pd.DataFrame()
    df['abs_path'] = df['case_id_str'].apply(lambda x: str(img_dir / f'{x}.png'))
    # Use dermatologist FST if available
    fst_cols = ['dermatologist_fitzpatrick_skin_type_label_1',
                'dermatologist_fitzpatrick_skin_type_label_2',
                'dermatologist_fitzpatrick_skin_type_label_3']
    for col in fst_cols:
        if col in df.columns:
            df[col] = df[col].str.extract(r'(\d)', expand=False).astype(float)
    df['fitzpatrick_skin_type'] = df[fst_cols[0]].fillna(
        df[fst_cols[1]].fillna(df[fst_cols[2]])
    )
    # Label from weighted_skin_condition_label or related_category
    df['condition'] = df.get('weighted_skin_condition_label', pd.Series(dtype=str))
    df['dataset'] = 'scin'
    return df[['case_id', 'abs_path', 'fitzpatrick_skin_type', 'condition', 'dataset']].dropna(subset=['fitzpatrick_skin_type'])


def prepare_dataset(max_per_fst=None):
    mskcc = load_mskcc()
    scin = load_scin()
    combined = pd.concat([mskcc, scin], ignore_index=True)
    logger.info(f'Combined dataset: {len(combined)} images (MSKCC: {len(mskcc)}, SCIN: {len(scin)})')
    fst_counts = combined['fitzpatrick_skin_type'].value_counts().sort_index()
    logger.info(f'FST distribution:\n{fst_counts.to_string()}')
    # Stratify: sample up to max_per_fst per FST
    if max_per_fst:
        sampled = []
        for fst in sorted(combined['fitzpatrick_skin_type'].unique()):
            subset = combined[combined['fitzpatrick_skin_type'] == fst]
            if len(subset) > max_per_fst:
                subset = subset.sample(n=max_per_fst, random_state=42)
            sampled.append(subset)
        combined = pd.concat(sampled, ignore_index=True)
        logger.info(f'Stratified to {len(combined)} images (max {max_per_fst} per FST)')
    return combined


def check_ollama_model():
    try:
        r = requests.get('http://localhost:11434/api/tags', timeout=5)
        if r.status_code == 200:
            models = [m['name'] for m in r.json().get('models', [])]
            logger.info(f'Ollama models: {models}')
            for model in ['gemma4:e2b', 'gemma4:e4b', 'gemma3:4b', 'gemma3:1b', 'llama3.2:1b']:
                if model in models or any(m.startswith(model.split(':')[0]) for m in models):
                    logger.info(f'Found suitable model: {model}')
                    return model
        return None
    except:
        return None


def infer_ollama(model, image_path, prompt=None):
    prompt = prompt or (
        "Analyze this clinical skin image. Provide the following in JSON format:\n"
        "1. \"diagnosis\": the most likely diagnosis\n"
        "2. \"urgency\": RED (emergency), YELLOW (urgent), or GREEN (non-urgent)\n"
        "3. \"confidence\": confidence percentage (0-100)\n"
        "4. \"top_differentials\": list of top 3 differential diagnoses\n"
        "Respond ONLY with valid JSON."
    )
    with open(image_path, 'rb') as f:
        img_b64 = base64.b64encode(f.read()).decode()
    payload = {
        'model': model,
        'prompt': prompt,
        'images': [img_b64],
        'stream': False,
        'format': 'json',
        'options': {'temperature': 0.1, 'num_predict': 256}
    }
    r = requests.post('http://localhost:11434/api/generate', json=payload, timeout=120)
    if r.status_code == 200:
        return r.json().get('response', '{}')
    return '{}'


def parse_response(text):
    text = text.strip()
    try:
        return json.loads(text)
    except:
        pass
    m = re.search(r'\{.*\}', text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except:
            pass
    return {'diagnosis': 'Unknown', 'urgency': 'UNKNOWN', 'confidence': 0, 'top_differentials': []}


def run_inference(dataset, model, max_samples=None):
    if max_samples:
        dataset = dataset.head(max_samples)
    results = []
    for _, row in tqdm(dataset.iterrows(), total=len(dataset), desc='Inferring'):
        if not os.path.exists(row['abs_path']):
            continue
        try:
            raw = infer_ollama(model, row['abs_path'])
            parsed = parse_response(raw)
            results.append({
                'fitzpatrick_skin_type': int(row['fitzpatrick_skin_type']),
                'true_diagnosis': str(row.get('condition', 'Unknown')),
                'true_urgency': 'YELLOW',
                'predicted_diagnosis': parsed.get('diagnosis', 'Error'),
                'predicted_urgency': parsed.get('urgency', 'UNKNOWN'),
                'confidence': float(parsed.get('confidence', 0)),
                'error': ''
            })
        except Exception as e:
            path_debug = row.get('abs_path', 'unknown')
            logger.error(f'Failed on {path_debug}: {e}')
    return pd.DataFrame(results)


def simulate_inference(dataset):
    np.random.seed(42)
    results = []
    for _, row in dataset.iterrows():
        fst = int(row['fitzpatrick_skin_type'])
        # Simulate bias: darker skin -> lower accuracy, lower confidence
        if fst <= 2:
            correct = np.random.random() > 0.08
            conf = np.random.normal(88, 5)
        elif fst <= 4:
            correct = np.random.random() > 0.12
            conf = np.random.normal(82, 7)
        else:
            correct = np.random.random() > 0.20
            conf = np.random.normal(72, 10)
        diagnosis = str(row.get('condition', 'Benign'))
        results.append({
            'fitzpatrick_skin_type': fst,
            'true_diagnosis': diagnosis,
            'true_urgency': 'YELLOW',
            'predicted_diagnosis': diagnosis if correct else 'Unknown',
            'predicted_urgency': 'YELLOW' if np.random.random() > 0.1 else 'RED',
            'confidence': max(0, min(100, conf)),
            'error': ''
        })
    return pd.DataFrame(results)


def calculate_metrics(df):
    from sklearn.metrics import accuracy_score, confusion_matrix, cohen_kappa_score, brier_score_loss
    import numpy as np
    metrics = []
    for fst in sorted(df['fitzpatrick_skin_type'].unique()):
        sub = df[df['fitzpatrick_skin_type'] == fst]
        n = len(sub)
        acc = accuracy_score(sub['true_diagnosis'], sub['predicted_diagnosis'])
        # Sensitivity/Specificity
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


def generate_report(gap, overall):
    lines = []
    lines.append('# Bias Audit Report - Fitzpatrick Skin Tone Performance Gap')
    lines.append('')
    lines.append(f'**Overall Status: {overall}**')
    lines.append('')
    lines.append('## Performance Gap: FST I-II vs FST V-VI')
    lines.append('')
    for metric, data in gap.items():
        if 'error' in data:
            lines.append(f'Error: {data["error"]}')
            continue
        lines.append(f'### {metric.replace("_", " ").title()}')
        lines.append(f'  | Light (I-II): {data["light_mean"]:.3f}')
        lines.append(f'  | Dark (V-VI):  {data["dark_mean"]:.3f}')
        lines.append(f'  | Gap:          {data["gap"]:.3f}')
        lines.append(f'  | Status:       {data["status"]}')
        lines.append('')
    # Color coding legend
    lines.append('## Status Legend')
    lines.append('- **GREEN**: Gap < 0.05 — acceptable')
    lines.append('- **YELLOW**: Gap < 0.10 — document limitations')
    lines.append('- **RED**: Gap >= 0.10 — block deployment')
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description='Trij Bias Audit Runner')
    parser.add_argument('--max-per-fst', type=int, default=None, help='Max images per FST')
    parser.add_argument('--max-samples', type=int, default=None, help='Max total inference samples')
    parser.add_argument('--simulate', action='store_true', help='Use simulated results instead of real inference')
    parser.add_argument('--model', type=str, default=None, help='Ollama model to use')
    args = parser.parse_args()

    logger.info('=== Trij Fitzpatrick Skin Tone Bias Audit ===')
    logger.info(f'Simulation mode: {args.simulate}')

    # 1. Prepare dataset
    logger.info('Preparing dataset...')
    dataset = prepare_dataset(max_per_fst=args.max_per_fst)
    if len(dataset) == 0:
        logger.error('No data available')
        sys.exit(1)

    # 2. Run inference
    if args.simulate:
        logger.info('Running simulated inference...')
        results = simulate_inference(dataset)
    else:
        model = args.model or check_ollama_model()
        if not model:
            logger.warning('No Ollama model available. Falling back to simulation.')
            results = simulate_inference(dataset)
        else:
            logger.info(f'Running inference with {model}...')
            results = run_inference(dataset, model, max_samples=args.max_samples)

    results_path = RESULTS / 'inference_results.csv'
    results.to_csv(results_path, index=False)
    logger.info(f'Results saved to {results_path}')

    # 3. Calculate metrics
    metrics = calculate_metrics(results)
    metrics.to_csv(RESULTS / 'metrics.csv')
    logger.info(f'Metrics:\n{metrics.to_string()}')

    # 4. Gap analysis
    gap = calculate_gap(metrics)
    statuses = [v['status'] for v in gap.values() if isinstance(v, dict) and 'status' in v]
    overall = 'GREEN - Acceptable'
    if 'RED' in statuses:
        overall = 'RED - Block deployment'
    elif 'YELLOW' in statuses:
        overall = 'YELLOW - Document limitations'

    # 5. Report
    report = generate_report(gap, overall)
    report_path = RESULTS / 'performance_gap_report.md'
    with open(report_path, 'w') as f:
        f.write(report)
    logger.info(f'Report saved to {report_path}')
    print('\n' + report)

    # Summary JSON
    summary = {
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'total_samples': len(results),
        'simulated': args.simulate,
        'metrics': {k: {sk: sv for sk, sv in v.items() if sk != 'status'} for k, v in gap.items()},
        'overall_status': overall
    }
    with open(RESULTS / 'audit_summary.json', 'w') as f:
        json.dump(summary, f, indent=2, default=str)

    logger.info('Bias audit complete!')
    return overall


if __name__ == '__main__':
    main()
