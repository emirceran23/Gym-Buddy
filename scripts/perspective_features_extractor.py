import os
import sys
import csv
from typing import List, Dict

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


def angle_to_vertical(p1, p2) -> float:
    """Angle (deg) between vector p2-p1 and image vertical axis (0 when vertical)."""
    if p1 is None or p2 is None:
        return np.nan
    vx, vy = (p2[0] - p1[0]), (p2[1] - p1[1])
    # Vertical axis vector (0,-1) in image coords
    dot = (vx * 0) + (vy * -1)
    norm_v = np.hypot(vx, vy)
    if norm_v == 0:
        return np.nan
    cosang = dot / norm_v
    cosang = np.clip(cosang, -1.0, 1.0)
    ang = np.degrees(np.arccos(cosang))
    return float(ang)


def extract_features_for_video(video_path: str, frame_stride: int = 3, max_dim: int = 1280) -> Dict:
    pose = PoseDetector()
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    frame_idx = 0
    # Collect per-frame values to aggregate by median later
    shoulder_widths = []
    torso_heights = []
    left_verticality = []
    right_verticality = []
    left_ratio = []  # forearm/upperarm
    right_ratio = []

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frame_idx += 1
        if frame_stride > 1 and (frame_idx - 1) % frame_stride != 0:
            continue

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

        # Landmarks
        ls = pose.get_landmark_position(11, frame.shape)  # left shoulder
        rs = pose.get_landmark_position(12, frame.shape)  # right shoulder
        le = pose.get_landmark_position(13, frame.shape)
        re = pose.get_landmark_position(14, frame.shape)
        lw = pose.get_landmark_position(15, frame.shape)
        rw = pose.get_landmark_position(16, frame.shape)
        lh = pose.get_landmark_position(23, frame.shape)
        rh = pose.get_landmark_position(24, frame.shape)

        # Shoulder width
        if ls is not None and rs is not None:
            shoulder_widths.append(abs(rs[0] - ls[0]))

        # Torso height (mean of sides when present)
        side_heights = []
        if ls is not None and lh is not None:
            side_heights.append(abs(lh[1] - ls[1]))
        if rs is not None and rh is not None:
            side_heights.append(abs(rh[1] - rs[1]))
        if side_heights:
            torso_heights.append(float(np.mean(side_heights)))

        # Arm verticality
        left_verticality.append(angle_to_vertical(ls, le))
        right_verticality.append(angle_to_vertical(rs, re))

        # Segment lengths and ratio
        def seg_len(a, b):
            if a is None or b is None:
                return np.nan
            return float(np.hypot(a[0] - b[0], a[1] - b[1]))

        la = seg_len(ls, le)
        lf = seg_len(le, lw)
        ra = seg_len(rs, re)
        rf = seg_len(re, rw)
        if np.isfinite(lf) and np.isfinite(la) and la > 0:
            left_ratio.append(lf / la)
        if np.isfinite(rf) and np.isfinite(ra) and ra > 0:
            right_ratio.append(rf / ra)

    cap.release()

    # Aggregate using medians (robust)
    def med(x):
        arr = np.array([v for v in x if np.isfinite(v)], dtype=float)
        return float(np.median(arr)) if arr.size else np.nan

    shoulder_w = med(shoulder_widths)
    torso_h = med(torso_heights)
    width_to_height = float(shoulder_w / torso_h) if np.isfinite(shoulder_w) and np.isfinite(torso_h) and torso_h > 0 else np.nan

    return {
        "video": os.path.basename(video_path),
        "shoulder_width_px_med": shoulder_w,
        "torso_height_px_med": torso_h,
        "width_to_height_med": width_to_height,
        "left_arm_verticality_deg_med": med(left_verticality),
        "right_arm_verticality_deg_med": med(right_verticality),
        "left_forearm_upperarm_ratio_med": med(left_ratio),
        "right_forearm_upperarm_ratio_med": med(right_ratio),
    }


def main(argv: List[str]) -> None:
    if len(argv) < 2:
        print("Usage: python scripts/perspective_features_extractor.py <folder_with_videos> [frame_stride] [output_csv]")
        sys.exit(1)

    folder = argv[1]
    frame_stride = int(argv[2]) if len(argv) > 2 else 3
    out_csv = argv[3] if len(argv) > 3 else os.path.join(folder, "perspective_features.csv")

    videos = list_videos(folder)
    if not videos:
        print("No videos found.")
        sys.exit(0)

    rows: List[Dict] = []
    for i, vp in enumerate(videos, 1):
        try:
            r = extract_features_for_video(vp, frame_stride=frame_stride)
            rows.append(r)
            print(f"[{i}/{len(videos)}] {os.path.basename(vp)} features extracted")
        except Exception as e:
            print(f"[{i}/{len(videos)}] ERROR {vp}: {e}")

    if not rows:
        print("No features extracted.")
        sys.exit(0)

    os.makedirs(os.path.dirname(out_csv) or ".", exist_ok=True)
    with open(out_csv, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        for r in rows:
            writer.writerow(r)

    print(f"Saved features: {out_csv}")


if __name__ == "__main__":
    main(sys.argv)


