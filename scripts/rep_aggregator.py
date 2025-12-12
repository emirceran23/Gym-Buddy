import os
import sys
from typing import List, Dict, Optional, Tuple

import numpy as np
import pandas as pd


def _coerce_numeric(series: pd.Series) -> pd.Series:
    """Coerce a CSV column that may include empty strings into float with NaNs."""
    return pd.to_numeric(series, errors="coerce")


def _winsorize_series(s: pd.Series, lower_q: float = 0.01, upper_q: float = 0.99) -> pd.Series:
    """Winsorize a numeric series at given quantiles, preserving NaNs."""
    s_num = pd.to_numeric(s, errors="coerce")
    if s_num.notna().sum() == 0:
        return s_num
    lo = s_num.quantile(lower_q)
    hi = s_num.quantile(upper_q)
    return s_num.clip(lower=lo, upper=hi)


def _mad_robust_z(s: pd.Series) -> pd.Series:
    """Robust z-score using MAD: (x - median) / (1.4826 * MAD)."""
    s_num = pd.to_numeric(s, errors="coerce")
    if s_num.notna().sum() == 0:
        return s_num
    med = s_num.median()
    mad = (s_num - med).abs().median()
    denom = 1.4826 * mad if mad and mad > 0 else (s_num.std(ddof=0) or 1.0)
    return (s_num - med) / denom


def _logit_transform(p: pd.Series, eps: float = 1e-6) -> pd.Series:
    p = pd.to_numeric(p, errors="coerce")
    p = p.clip(lower=0.0, upper=1.0)
    return np.log((p + eps) / (1.0 - p + eps))


def _detect_reps_for_arm(df: pd.DataFrame,
                         arm_prefix: str,
                         torso_threshold_deg: float = 30.0,
                         epsilon: float = 1e-6) -> List[Dict]:
    """
    Detect ordered reps for one arm using down → transition → up → transition → down.
    Returns a list of rep-level dicts with computed metrics.
    """
    state_col = f"{arm_prefix}_state"
    angle_raw_col = f"{arm_prefix}_angle_raw_deg"
    aligned_col = f"{arm_prefix}_aligned"
    torso_col = f"{arm_prefix}_torso_angle_deg"
    shoulder_x_col = f"{arm_prefix}_shoulder_x"
    torso_height_col = f"{arm_prefix}_torso_height"

    # Prepare series
    time_s = _coerce_numeric(df.get("time_s", pd.Series(index=df.index, dtype=float)))
    states = df[state_col].astype(str).fillna("unknown").values
    angle_raw = _coerce_numeric(df.get(angle_raw_col, pd.Series(index=df.index, dtype=float))).values
    aligned = _coerce_numeric(df.get(aligned_col, pd.Series(index=df.index, dtype=float))).fillna(1).astype(int).values
    torso = _coerce_numeric(df.get(torso_col, pd.Series(index=df.index, dtype=float))).values

    # For torso violation percentage, compute rolling 3-frame average over entire sequence
    torso_series = pd.Series(torso)
    torso_rolling_avg = torso_series.rolling(window=3, min_periods=3).mean().values
    torso_violation_mask = torso_rolling_avg > torso_threshold_deg

    reps: List[Dict] = []

    i = 0
    n = len(df)
    while i < n - 1:
        # Look for leaving DOWN: current down and next not down
        if states[i] == "down" and states[i + 1] in ("transition", "up"):
            start_idx = i

            # Find first UP after start
            j = i + 1
            first_up_idx: Optional[int] = None
            while j < n and states[j] != "down":
                if states[j] == "up" and first_up_idx is None:
                    first_up_idx = j
                # After seeing an UP, look for a transition then a down to close
                j += 1

            # If we exited loop because we hit a down, j points to first down after leaving down
            if j < n and states[j] == "down":
                end_idx = j
            else:
                # No closing down; incomplete cycle
                i += 1
                continue

            # Validate ordered sequence: must have reached up, and there must be a transition between up and final down
            if first_up_idx is None:
                i = end_idx  # Skip ahead to after this segment
                continue

            had_transition_after_up = any(s == "transition" for s in states[first_up_idx:end_idx])
            if not had_transition_after_up:
                i = end_idx
                continue

            # Window for this rep [start_idx, end_idx]
            idx_slice = slice(start_idx, end_idx + 1)
            window_len = end_idx - start_idx + 1
            if window_len <= 1:
                i = end_idx
                continue

            # Metrics
            angles_win = angle_raw[idx_slice]
            times_win = time_s[idx_slice]
            aligned_win = aligned[idx_slice]
            torso_violation_win = torso_violation_mask[idx_slice]
            lost_pose_mask = np.isnan(angles_win)
            
            # Shoulder drift calculation (normalized by body scale)
            shoulder_x = _coerce_numeric(df.get(shoulder_x_col, pd.Series(index=df.index, dtype=float))).values
            torso_height = _coerce_numeric(df.get(torso_height_col, pd.Series(index=df.index, dtype=float))).values
            if shoulder_x is not None and len(shoulder_x) > 0 and torso_height is not None and len(torso_height) > 0:
                shoulder_x_win = shoulder_x[idx_slice]
                torso_height_win = torso_height[idx_slice]
                valid_mask = ~(np.isnan(shoulder_x_win) | np.isnan(torso_height_win) | (torso_height_win <= 0))
                if np.sum(valid_mask) > 1:
                    valid_x = shoulder_x_win[valid_mask]
                    valid_h = torso_height_win[valid_mask]
                    # Normalize x drift by torso height to be scale-invariant
                    x_normalized = valid_x / valid_h
                    drift_px = float(np.std(x_normalized))
                else:
                    drift_px = float("nan")
            else:
                drift_px = float("nan")

            # ROM
            finite_angles = angles_win[~np.isnan(angles_win)]
            if finite_angles.size:
                rom_deg = float(np.nanmax(finite_angles) - np.nanmin(finite_angles))
            else:
                rom_deg = float("nan")

            # Tempo up: from leaving down (start_idx) to first_up_idx
            tempo_up_s = float(time_s[first_up_idx] - time_s[start_idx]) if first_up_idx is not None else float("nan")
            # Tempo down: from last up (use last occurrence between start and end) to end_idx
            up_indices = np.where(states[start_idx:end_idx + 1] == "up")[0]
            if up_indices.size:
                last_up_idx = start_idx + int(up_indices[-1])
                tempo_down_s = float(time_s[end_idx] - time_s[last_up_idx])
            else:
                tempo_down_s = float("nan")

            tempo_asymmetry = float(
                abs((tempo_up_s if np.isfinite(tempo_up_s) else 0.0) - (tempo_down_s if np.isfinite(tempo_down_s) else 0.0)) /
                ((tempo_up_s if np.isfinite(tempo_up_s) else 0.0) + (tempo_down_s if np.isfinite(tempo_down_s) else 0.0) + epsilon)
            )

            # Roughness: RMS of first differences of angle
            diffs = np.diff(finite_angles) if finite_angles.size > 1 else np.array([])
            roughness = float(np.sqrt(np.mean(diffs ** 2))) if diffs.size else float("nan")

            # Percentages
            torso_violation_pct = float(np.nanmean(torso_violation_win.astype(float))) if window_len else float("nan")
            align_off_pct = float(np.mean((aligned_win == 0).astype(float))) if window_len else float("nan")
            lost_pose_pct = float(np.mean(lost_pose_mask.astype(float))) if window_len else float("nan")

            # Mean FPS in window
            duration = float(time_s[end_idx] - time_s[start_idx])
            mean_fps = float((window_len - 1) / max(duration, epsilon)) if duration > 0 else float("nan")

            reps.append({
                "arm": arm_prefix,
                "rep_start_time": float(time_s[start_idx]),
                "rep_end_time": float(time_s[end_idx]),
                "rom_deg": rom_deg,
                "torso_violation_pct": torso_violation_pct,
                "align_off_pct": align_off_pct,
                "tempo_up_s": tempo_up_s,
                "tempo_down_s": tempo_down_s,
                "tempo_asymmetry": tempo_asymmetry,
                "roughness": roughness,
                "lost_pose_pct": lost_pose_pct,
                "mean_fps": mean_fps,
                "shoulder_drift_px": drift_px,
            })

            # Advance index to end of this rep to avoid overlapping detection
            i = end_idx
        i += 1

    return reps


def _read_csv_robust(csv_path: str) -> pd.DataFrame:
    """Read CSV with tolerant encoding fallbacks and line handling."""
    encodings = ["utf-8", "utf-8-sig", "cp1254", "latin1"]
    last_err = None
    for enc in encodings:
        try:
            return pd.read_csv(csv_path, encoding=enc, engine="python", on_bad_lines="skip")
        except UnicodeDecodeError as e:
            last_err = e
            continue
    # final fallback
    return pd.read_csv(csv_path, encoding="latin1", engine="python", on_bad_lines="skip")


def extract_reps_from_csv(csv_path: str,
                          output_path: Optional[str] = None,
                          video_id: Optional[str] = None,
                          athlete_id: Optional[str] = None,
                          torso_threshold_deg: float = 30.0) -> str:
    """
    Load frame-level CSV, compute rep-level features, and save to Parquet.
    Returns the output file path.
    """
    df = _read_csv_robust(csv_path)

    # Normalize expected columns if missing
    for col in [
        "left_state", "right_state",
        "left_angle_raw_deg", "right_angle_raw_deg",
        "left_torso_angle_deg", "right_torso_angle_deg",
        "left_aligned", "right_aligned",
        "time_s",
    ]:
        if col not in df.columns:
            df[col] = np.nan

    left_reps = _detect_reps_for_arm(df, "left", torso_threshold_deg=torso_threshold_deg)
    right_reps = _detect_reps_for_arm(df, "right", torso_threshold_deg=torso_threshold_deg)

    reps = left_reps + right_reps
    reps_df = pd.DataFrame(reps)

    if reps_df.empty:
        # Create an empty schema to save
        reps_df = pd.DataFrame(columns=[
            "arm", "rep_start_time", "rep_end_time", "rom_deg", "torso_violation_pct",
            "align_off_pct", "tempo_up_s", "tempo_down_s", "tempo_asymmetry",
            "roughness", "lost_pose_pct", "mean_fps", "shoulder_drift_px",
            "video_id", "athlete_id",
        ])

    # Attach metadata
    if video_id is None:
        video_id = os.path.splitext(os.path.basename(csv_path))[0]
    reps_df["video_id"] = video_id
    reps_df["athlete_id"] = athlete_id if athlete_id is not None else ""

    # Feature transformations (winsorize -> transform -> robust z), then keep only compact feature set
    num_cols = [
        "rom_deg", "torso_violation_pct", "align_off_pct",
        "tempo_up_s", "tempo_down_s", "tempo_asymmetry",
        "roughness", "lost_pose_pct", "mean_fps", "shoulder_drift_px",
    ]
    # Winsorize first
    for c in num_cols:
        if c in reps_df.columns:
            reps_df[c] = _winsorize_series(reps_df[c])

    # Proportion transforms -> logit
    def logit_z(col: str) -> pd.Series:
        if col in reps_df.columns:
            return _mad_robust_z(_logit_transform(reps_df[col]))
        return pd.Series([np.nan] * len(reps_df))

    # Positive skew transforms -> log1p then robust z
    def log1p_z(col: str) -> pd.Series:
        if col in reps_df.columns:
            v = pd.to_numeric(reps_df[col], errors="coerce").clip(lower=0)
            return _mad_robust_z(np.log1p(v))
        return pd.Series([np.nan] * len(reps_df))

    # Create compact feature set
    reps_df["rom_deg_z"] = log1p_z("rom_deg")  # ROM often skewed; log1p+MAD z
    # rom deficit
    if "rom_deg" in reps_df.columns:
        rom = pd.to_numeric(reps_df["rom_deg"], errors="coerce")
        reps_df["rom_deficit"] = ((120.0 - rom).clip(lower=0) / 120.0).clip(lower=0, upper=1)

    reps_df["torso_violation_pct_logit_z"] = logit_z("torso_violation_pct")
    reps_df["align_off_pct_logit_z"] = logit_z("align_off_pct")
    reps_df["tempo_asymmetry_logit_z"] = logit_z("tempo_asymmetry")
    reps_df["tempo_up_s_log1p_z"] = log1p_z("tempo_up_s")
    reps_df["tempo_down_s_log1p_z"] = log1p_z("tempo_down_s")
    reps_df["roughness_log1p_z"] = log1p_z("roughness")

    # Shoulder drift normalization (if raw present). Without body scale, keep NaN.
    if "shoulder_drift_px" in reps_df.columns:
        reps_df["shoulder_drift_norm_log1p_z"] = log1p_z("shoulder_drift_px")
    else:
        reps_df["shoulder_drift_norm_log1p_z"] = np.nan

    # lost pose -> binary any
    if "lost_pose_pct" in reps_df.columns:
        reps_df["lost_pose_any"] = (pd.to_numeric(reps_df["lost_pose_pct"], errors="coerce") > 0).astype(float)
    else:
        reps_df["lost_pose_any"] = np.nan

    # Optional: total tempo and speeds
    if set(["tempo_up_s", "tempo_down_s"]).issubset(reps_df.columns):
        tempo_up = pd.to_numeric(reps_df["tempo_up_s"], errors="coerce")
        tempo_down = pd.to_numeric(reps_df["tempo_down_s"], errors="coerce")
        tempo_total = tempo_up + tempo_down
        reps_df["tempo_total_log1p_z"] = _mad_robust_z(np.log1p(tempo_total.clip(lower=0)))
        if "rom_deg" in reps_df.columns:
            rom = pd.to_numeric(reps_df["rom_deg"], errors="coerce")
            speed_up = rom / (tempo_up.replace(0, np.nan))
            speed_down = rom / (tempo_down.replace(0, np.nan))
            reps_df["speed_up_log1p_z"] = _mad_robust_z(np.log1p(speed_up.clip(lower=0)))
            reps_df["speed_down_log1p_z"] = _mad_robust_z(np.log1p(speed_down.clip(lower=0)))

    # mean_fps -> binary flag; drop potential z columns for fps
    if "mean_fps" in reps_df.columns:
        fps = pd.to_numeric(reps_df["mean_fps"], errors="coerce")
        target = fps.median() if fps.notna().any() else 30.0
        reps_df["fps_ok"] = ((fps - target).abs() <= 0.5).astype(float)

    # Keep only minimal feature set + identifiers
    keep_cols = [
        "arm", "video_id", "athlete_id", "rep_start_time", "rep_end_time",
        "rom_deg_z", "rom_deficit",
        "torso_violation_pct_logit_z", "align_off_pct_logit_z", "tempo_asymmetry_logit_z",
        "tempo_up_s_log1p_z", "tempo_down_s_log1p_z", "roughness_log1p_z",
        "shoulder_drift_norm_log1p_z", "lost_pose_any", "tempo_total_log1p_z",
        "speed_up_log1p_z", "speed_down_log1p_z", "fps_ok",
    ]
    for c in list(reps_df.columns):
        if c not in keep_cols:
            del reps_df[c]

    # Output path
    if output_path is None:
        os.makedirs("interim", exist_ok=True)
        output_path = os.path.join("interim", "reps.parquet")

    # Save parquet (fallback to CSV if parquet engine missing)
    try:
        reps_df.to_parquet(output_path, index=False)
        return output_path
    except Exception:
        alt_path = os.path.splitext(output_path)[0] + ".csv"
        reps_df.to_csv(alt_path, index=False)
        return alt_path


def main(argv: List[str]) -> None:
    if len(argv) < 2:
        print("Usage: python rep_aggregator.py <frame_level_csv> [output_path] [video_id] [athlete_id]")
        sys.exit(1)

    csv_path = argv[1]
    output_path = argv[2] if len(argv) > 2 else None
    video_id = argv[3] if len(argv) > 3 else None
    athlete_id = argv[4] if len(argv) > 4 else None

    out = extract_reps_from_csv(csv_path, output_path=output_path, video_id=video_id, athlete_id=athlete_id)
    print(f"Rep-level data saved: {out}")


if __name__ == "__main__":
    main(sys.argv)


