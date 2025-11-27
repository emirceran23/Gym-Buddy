import os
import sys
import json
from typing import List

import numpy as np
import pandas as pd


def _read_csv_robust(path: str) -> pd.DataFrame:
    for enc in ["utf-8", "utf-8-sig", "cp1254", "latin1"]:
        try:
            return pd.read_csv(path, encoding=enc)
        except UnicodeDecodeError:
            continue
    return pd.read_csv(path, encoding="latin1")


def fit_thresholds(features_csv: str, minsmaxs_csv: str, k_buckets: int = 2) -> dict:
    feats = _read_csv_robust(features_csv)
    minsmaxs = _read_csv_robust(minsmaxs_csv)

    # Align key column name to 'video'
    if 'video' not in minsmaxs.columns:
        # angle_threshold_finder uses 'video'
        pass

    df = pd.merge(minsmaxs, feats, on='video', how='inner')
    if df.empty:
        raise ValueError("No overlap between features and mins/maxs.")

    key = 'width_to_height_med'
    x = pd.to_numeric(df[key], errors='coerce')
    valid = df[x.notna()].copy()
    if valid.empty:
        raise ValueError("No valid width_to_height_med values.")

    # For 2-class case: compute single split threshold at median
    if k_buckets == 2:
        split_threshold = float(np.nanmedian(valid[key]))
        edges = np.array([float(np.nanmin(valid[key])), split_threshold, float(np.nanmax(valid[key]))])
    else:
        # Generic K-quantiles
        qs = np.linspace(0, 1, k_buckets + 1)
        edges = np.quantile(valid[key], qs)
        for i in range(1, len(edges)):
            if edges[i] <= edges[i-1]:
                edges[i] = edges[i-1] + 1e-6

    buckets = []
    class_names = ["sideway", "frontal"] if k_buckets == 2 else [f"bucket_{i}" for i in range(k_buckets)]
    for b in range(k_buckets):
        lo, hi = edges[b], edges[b+1]
        # Inclusive on upper bound only for last bucket to avoid double-count
        if b < k_buckets - 1:
            sel = valid[(valid[key] >= lo) & (valid[key] < hi)]
        else:
            sel = valid[(valid[key] >= lo) & (valid[key] <= hi)]
        if sel.empty:
            thresholds = {
                "name": class_names[b],
                "arm_up": float('nan'),
                "arm_down": float('nan'),
                "torso": float('nan'),
                "count": 0,
                "range": [float(lo), float(hi)],
            }
        else:
            # Pool left/right for arms
            mins_arm = pd.concat([
                pd.to_numeric(sel.get('min_left_arm'), errors='coerce'),
                pd.to_numeric(sel.get('min_right_arm'), errors='coerce')
            ], axis=0)
            maxs_arm = pd.concat([
                pd.to_numeric(sel.get('max_left_arm'), errors='coerce'),
                pd.to_numeric(sel.get('max_right_arm'), errors='coerce')
            ], axis=0)
            mins_torso = pd.concat([
                pd.to_numeric(sel.get('min_left_torso'), errors='coerce'),
                pd.to_numeric(sel.get('min_right_torso'), errors='coerce')
            ], axis=0)

            arm_up = float(np.nanmean(mins_arm)) if mins_arm.notna().any() else float('nan')
            arm_down = float(np.nanmean(maxs_arm)) if maxs_arm.notna().any() else float('nan')
            torso = float(np.nanmean(mins_torso)) if mins_torso.notna().any() else float('nan')

            thresholds = {
                "name": class_names[b],
                "arm_up": arm_up,
                "arm_down": arm_down,
                "torso": torso,
                "count": int(len(sel)),
                "range": [float(lo), float(hi)],
            }
        buckets.append(thresholds)

    # Global fallback
    global_arm_up = float(np.nanmean(pd.concat([
        pd.to_numeric(valid.get('min_left_arm'), errors='coerce'),
        pd.to_numeric(valid.get('min_right_arm'), errors='coerce')
    ], axis=0)))
    global_arm_down = float(np.nanmean(pd.concat([
        pd.to_numeric(valid.get('max_left_arm'), errors='coerce'),
        pd.to_numeric(valid.get('max_right_arm'), errors='coerce')
    ], axis=0)))
    global_torso = float(np.nanmean(pd.concat([
        pd.to_numeric(valid.get('min_left_torso'), errors='coerce'),
        pd.to_numeric(valid.get('min_right_torso'), errors='coerce')
    ], axis=0)))

    model = {
        "feature": key,
        "buckets": buckets,
        "global": {
            "arm_up": global_arm_up,
            "arm_down": global_arm_down,
            "torso": global_torso,
        }
    }
    if k_buckets == 2:
        model["split_threshold"] = float(edges[1])
        model["class_names"] = class_names
    return model


def main(argv: List[str]) -> None:
    if len(argv) < 3:
        print("Usage: python scripts/perspective_threshold_fitter.py <features_csv> <minsmaxs_csv> [k_buckets] [out_json]")
        sys.exit(1)

    features_csv = argv[1]
    minsmaxs_csv = argv[2]
    k = int(argv[3]) if len(argv) > 3 else 2
    out_json = argv[4] if len(argv) > 4 else os.path.join(os.path.dirname(features_csv) or ".", "thresholds_perspective.json")

    model = fit_thresholds(features_csv, minsmaxs_csv, k_buckets=k)

    os.makedirs(os.path.dirname(out_json) or ".", exist_ok=True)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(model, f, indent=2)

    print(f"Saved perspective thresholds: {out_json}")


if __name__ == "__main__":
    main(sys.argv)


