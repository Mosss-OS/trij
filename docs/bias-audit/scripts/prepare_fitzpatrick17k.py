#!/usr/bin/env python3
"""Generate metadata CSV for the Fitzpatrick17k renamed dataset.

Walks the extracted Categorized_AbbrvName directory,
parses FST labels from filenames, and produces a metadata CSV
compatible with the bias audit runner.
"""

import os, re, sys
from pathlib import Path
import pandas as pd

BASE = Path('/home/moses/Desktop/trij/docs/bias-audit/data/fitzpatrick17k')
IMG_DIR = BASE / 'Categorized_AbbrvName'
OUT = BASE / 'fitzpatrick17k_metadata.csv'

# FST regex: _f(\d+)_
FST_RE = re.compile(r'_f(\d+)_')

def main():
    rows = []
    if not IMG_DIR.exists():
        print(f"Image directory not found: {IMG_DIR}", file=sys.stderr)
        sys.exit(1)

    for cond_dir in sorted(IMG_DIR.iterdir()):
        if not cond_dir.is_dir():
            continue
        # condition abbreviation from directory name (strip count suffix)
        cond_name = cond_dir.name
        for img_path in sorted(cond_dir.iterdir()):
            if not img_path.name.lower().endswith('.jpg'):
                continue
            m = FST_RE.search(img_path.name)
            if not m:
                continue
            fst = int(m.group(1))
            # Map f0 → -1 (unknown), valid: 1-6
            if fst == 0:
                fst = -1
            rows.append({
                'image_id': img_path.stem,
                'abs_path': str(img_path.resolve()),
                'fitzpatrick_skin_type': fst,
                'condition': cond_name,
                'dataset': 'fitzpatrick17k',
            })

    df = pd.DataFrame(rows)
    df.to_csv(OUT, index=False)
    print(f"Saved {len(df)} rows to {OUT}")

    # Summary
    print(f"\nImages with valid FST (1-6): {len(df[df['fitzpatrick_skin_type'] >= 1])}")
    print(f"Images with unknown FST (0/-1): {len(df[df['fitzpatrick_skin_type'] < 1])}")
    print(f"\nFST distribution:")
    print(df['fitzpatrick_skin_type'].value_counts().sort_index().to_string())
    print(f"\nUnique conditions: {df['condition'].nunique()}")

if __name__ == '__main__':
    main()
