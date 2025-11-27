import os
import sys
import csv
from typing import Dict, List, Tuple

import cv2
import numpy as np

from pose_detection import PoseDetector


VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".m4v"}


def list_videos(folder: str) -> List[str]:
    files = []
    for name in os.listdir(folder):
        p = os.path.join(folder, name)
        if os.path.isfile(p) and os.path.splitext(name.lower())[1] in VIDEO_EXTS:
            files.append(p)
    files.sort()
    return files


def get_torso_angle_elbow_shoulder_hip(pose: PoseDetector, image_shape, side: str) -> float:
    if side == 'left':
        elbow = pose.get_landmark_position(13, image_shape)
        shoulder = pose.get_landmark_position(11, image_shape)
        hip = pose.get_landmark_position(23, image_shape)
    else:
        elbow = pose.get_landmark_position(14, image_shape)
        shoulder = pose.get_landmark_position(12, image_shape)
        hip = pose.get_landmark_position(24, image_shape)
    if None in [elbow, shoulder, hip]:
        return np.nan
    angle = pose.calculate_angle(elbow, shoulder, hip)
    return float(angle) if angle is not None else np.nan


def process_video(video_path: str, frame_stride: int = 1, max_dim: int = 1280) -> Dict[str, float]:
    pose = PoseDetector()
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    frame_idx = 0
    mins = {
        'left_arm': np.inf,
        'right_arm': np.inf,
        'left_torso': np.inf,
        'right_torso': np.inf,
    }
    maxs = {
        'left_arm': -np.inf,
        'right_arm': -np.inf,
        'left_torso': -np.inf,
        'right_torso': -np.inf,
    }

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        if frame_stride > 1 and (frame_idx - 1) % frame_stride != 0:
            continue

        # Resize for speed/consistency
        h, w = frame.shape[:2]
        if max(h, w) > max_dim:
            if w > h:
                new_w = max_dim
                new_h = int(h * (max_dim / w))
            else:
                new_h = max_dim
                new_w = int(w * (max_dim / h))
            frame = cv2.resize(frame, (new_w, new_h))

        frame, _ = pose.detect_pose(frame, draw=False)
        if not pose.is_pose_detected():
            continue

        angles = pose.get_body_angles(frame.shape)
        left_arm = angles.get('left_arm')
        right_arm = angles.get('right_arm')
        left_torso = get_torso_angle_elbow_shoulder_hip(pose, frame.shape, 'left')
        right_torso = get_torso_angle_elbow_shoulder_hip(pose, frame.shape, 'right')

        # Update mins/maxs if finite
        for key, val in (
            ('left_arm', left_arm), ('right_arm', right_arm),
            ('left_torso', left_torso), ('right_torso', right_torso),
        ):
            if val is None or not np.isfinite(val):
                continue
            mins[key] = min(mins[key], float(val))
            maxs[key] = max(maxs[key], float(val))

    cap.release()
    # Convert infs to NaNs if never updated
    for k in list(mins.keys()):
        if not np.isfinite(mins[k]):
            mins[k] = np.nan
        if not np.isfinite(maxs[k]):
            maxs[k] = np.nan

    return {
        'video': os.path.basename(video_path),
        **{f"min_{k}": mins[k] for k in mins},
        **{f"max_{k}": maxs[k] for k in maxs},
    }


def aggregate_thresholds(rows: List[Dict[str, float]]) -> Dict[str, float]:
    # Compute per-metric threshold as mean of mins and mean of maxs
    out: Dict[str, float] = {}
    keys = ['left_arm', 'right_arm', 'left_torso', 'right_torso']
    for k in keys:
        mins = np.array([r.get(f"min_{k}") for r in rows], dtype=float)
        maxs = np.array([r.get(f"max_{k}") for r in rows], dtype=float)
        mins = mins[np.isfinite(mins)]
        maxs = maxs[np.isfinite(maxs)]
        out[f"{k}_min_mean"] = float(np.nanmean(mins)) if mins.size else np.nan
        out[f"{k}_max_mean"] = float(np.nanmean(maxs)) if maxs.size else np.nan
        # Combined threshold suggestion (simple midpoint between global means)
        if mins.size and maxs.size:
            out[f"{k}_mid_threshold"] = float((out[f"{k}_min_mean"] + out[f"{k}_max_mean"]) / 2.0)
        else:
            out[f"{k}_mid_threshold"] = np.nan
    # Global arm thresholds (pool left/right)
    arm_min = np.nanmean([out.get('left_arm_min_mean'), out.get('right_arm_min_mean')])
    arm_max = np.nanmean([out.get('left_arm_max_mean'), out.get('right_arm_max_mean')])
    out['arm_up_threshold_suggested'] = float(arm_min) if np.isfinite(arm_min) else np.nan
    out['arm_down_threshold_suggested'] = float(arm_max) if np.isfinite(arm_max) else np.nan
    # Torso threshold suggested (lower is better)
    torso_min = np.nanmean([out.get('left_torso_min_mean'), out.get('right_torso_min_mean')])
    out['torso_threshold_suggested'] = float(torso_min) if np.isfinite(torso_min) else np.nan
    return out


def main(argv: List[str]) -> None:
    if len(argv) < 2:
        print("Usage: python angle_threshold_finder.py <folder_with_videos> [frame_stride] [output_csv]")
        sys.exit(1)

    folder = argv[1]
    frame_stride = int(argv[2]) if len(argv) > 2 else 1
    output_csv = argv[3] if len(argv) > 3 else os.path.join(folder, "angle_thresholds_summary.csv")

    videos = list_videos(folder)
    if not videos:
        print("No videos found.")
        sys.exit(0)

    print(f"Found {len(videos)} video(s). Processing with frame_stride={frame_stride}...")
    per_video: List[Dict[str, float]] = []
    for i, vp in enumerate(videos, 1):
        try:
            stats = process_video(vp, frame_stride=frame_stride)
            per_video.append(stats)
            print(f"[{i}/{len(videos)}] {os.path.basename(vp)}  mins/maxs collected")
        except Exception as e:
            print(f"[{i}/{len(videos)}] Error: {vp} -> {e}")

    # Aggregate thresholds
    agg = aggregate_thresholds(per_video)

    # Write CSV with per-video metrics and overall thresholds
    fieldnames = list(per_video[0].keys()) if per_video else []
    agg_rows = [{"video": "__AGGREGATE__", **agg}]
    # Align aggregate keys to same field order by union
    all_fields = set(fieldnames) | set(agg_rows[0].keys())
    field_order = ["video"] + sorted(all_fields - {"video"})
    os.makedirs(os.path.dirname(output_csv) or ".", exist_ok=True)
    # Use UTF-8 with BOM for Excel-friendly Unicode on Windows
    with open(output_csv, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=field_order)
        writer.writeheader()
        for r in per_video:
            writer.writerow(r)
        writer.writerow(agg_rows[0])

    print("\nSuggested thresholds:")
    print(f"  Arm UP threshold (mean of mins):   {agg.get('arm_up_threshold_suggested'):.2f}°")
    print(f"  Arm DOWN threshold (mean of maxs): {agg.get('arm_down_threshold_suggested'):.2f}°")
    print(f"  Torso angle threshold (mean mins): {agg.get('torso_threshold_suggested'):.2f}°")
    print(f"Summary saved: {output_csv}")


if __name__ == "__main__":
    main(sys.argv)


