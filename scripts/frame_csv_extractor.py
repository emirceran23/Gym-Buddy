import os
import sys
import csv
from typing import List

import cv2

from pose_detection import PoseDetector
from biceps_curl_counter import BicepsCurlCounter


VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".avi", ".m4v"}


def list_videos(folder: str) -> List[str]:
    files = []
    for name in os.listdir(folder):
        path = os.path.join(folder, name)
        if os.path.isfile(path) and os.path.splitext(name.lower())[1] in VIDEO_EXTS:
            files.append(path)
    files.sort()
    return files


def get_torso_angle(pose: PoseDetector, image_shape, side: str) -> float:
    if side == 'left':
        elbow = pose.get_landmark_position(13, image_shape)
        shoulder = pose.get_landmark_position(11, image_shape)
        hip = pose.get_landmark_position(23, image_shape)
    else:
        elbow = pose.get_landmark_position(14, image_shape)
        shoulder = pose.get_landmark_position(12, image_shape)
        hip = pose.get_landmark_position(24, image_shape)
    if None in [elbow, shoulder, hip]:
        return 999.0
    angle = pose.calculate_angle(elbow, shoulder, hip)
    return float(angle) if angle is not None else 999.0


def check_arm_alignment(pose: PoseDetector, image_shape, arm: str) -> bool:
    if arm == 'left':
        shoulder = pose.get_landmark_position(11, image_shape)
        elbow = pose.get_landmark_position(13, image_shape)
        hip = pose.get_landmark_position(23, image_shape)
    else:
        shoulder = pose.get_landmark_position(12, image_shape)
        elbow = pose.get_landmark_position(14, image_shape)
        hip = pose.get_landmark_position(24, image_shape)
    if None in [shoulder, elbow, hip]:
        return True
    elbow_x_offset = abs(elbow[0] - shoulder[0])#x ekenin shouldera olan mesafesi
    torso_height = abs(hip[1] - shoulder[1])#torso yuksekligi
    if torso_height == 0:
        return True
    max_deviation = torso_height * 0.15
    return elbow_x_offset < max_deviation


def extract_csv_for_video(video_path: str, output_dir: str) -> str:
    pose = PoseDetector()
    counter = BicepsCurlCounter()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    base = os.path.splitext(os.path.basename(video_path))[0]
    out_csv = os.path.join(output_dir, f"{base}__timeline.csv")

    rows: List[dict] = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1

        # Optional resize for consistent processing speed
        h, w = frame.shape[:2]
        max_dim = 1280
        if max(h, w) > max_dim:
            if w > h:
                new_w = max_dim
                new_h = int(h * (max_dim / w))
            else:
                new_h = max_dim
                new_w = int(w * (max_dim / h))
            frame = cv2.resize(frame, (new_w, new_h))

        # Pose detection (no drawing for speed)
        frame, _ = pose.detect_pose(frame, draw=False)

        left_arm_angle = right_arm_angle = None
        left_torso_angle = right_torso_angle = None
        left_alignment = right_alignment = True
        left_shoulder_x = right_shoulder_x = None
        left_torso_height = right_torso_height = None

        if pose.is_pose_detected():
            angles = pose.get_body_angles(frame.shape)
            left_arm_angle = angles.get('left_arm')
            right_arm_angle = angles.get('right_arm')
            left_torso_angle = get_torso_angle(pose, frame.shape, 'left')
            right_torso_angle = get_torso_angle(pose, frame.shape, 'right')
            left_alignment = check_arm_alignment(pose, frame.shape, 'left')
            right_alignment = check_arm_alignment(pose, frame.shape, 'right')
            
            # Get shoulder positions and torso height for drift normalization
            left_shoulder = pose.get_landmark_position(11, frame.shape)
            right_shoulder = pose.get_landmark_position(12, frame.shape)
            left_hip = pose.get_landmark_position(23, frame.shape)
            right_hip = pose.get_landmark_position(24, frame.shape)
            
            if left_shoulder is not None:
                left_shoulder_x = left_shoulder[0]
            if right_shoulder is not None:
                right_shoulder_x = right_shoulder[0]
            if left_shoulder is not None and left_hip is not None:
                left_torso_height = abs(left_hip[1] - left_shoulder[1])
            if right_shoulder is not None and right_hip is not None:
                right_torso_height = abs(right_hip[1] - right_shoulder[1])

            counter.update(left_arm_angle, right_arm_angle, left_alignment, right_alignment,
                           left_torso_angle, right_torso_angle)

        status = counter.get_status()
        t_sec = frame_idx / fps

        rows.append({
            "frame": frame_idx,
            "time_s": round(t_sec, 3),
            "left_cycle_index": status.get('left_cycle_index', 0),
            "right_cycle_index": status.get('right_cycle_index', 0),
            "left_state": status.get('left_state', 'unknown'),
            "right_state": status.get('right_state', 'unknown'),
            "left_angle_raw_deg": round(status.get('left_raw_angle'), 2) if status.get('left_raw_angle') is not None else "",
            "right_angle_raw_deg": round(status.get('right_raw_angle'), 2) if status.get('right_raw_angle') is not None else "",
            "left_angle_smoothed_deg": round(status.get('left_smoothed_angle'), 2) if status.get('left_smoothed_angle') is not None else "",
            "right_angle_smoothed_deg": round(status.get('right_smoothed_angle'), 2) if status.get('right_smoothed_angle') is not None else "",
            # Names aligned to rep_aggregator expectations
            "left_torso_angle_deg": round(left_torso_angle, 2) if left_torso_angle is not None else "",
            "right_torso_angle_deg": round(right_torso_angle, 2) if right_torso_angle is not None else "",
            "left_shoulder_x": round(left_shoulder_x, 2) if left_shoulder_x is not None else "",
            "right_shoulder_x": round(right_shoulder_x, 2) if right_shoulder_x is not None else "",
            "left_torso_height": round(left_torso_height, 2) if left_torso_height is not None else "",
            "right_torso_height": round(right_torso_height, 2) if right_torso_height is not None else "",
            "left_aligned": int(bool(left_alignment)),
            "right_aligned": int(bool(right_alignment)),
            "left_reps": status.get('left_reps', 0),
            "right_reps": status.get('right_reps', 0),
            "left_correct_reps": status.get('left_correct_reps', 0),
            "right_correct_reps": status.get('right_correct_reps', 0),
            "left_incorrect_reps": status.get('left_incorrect_reps', 0),
            "right_incorrect_reps": status.get('right_incorrect_reps', 0),
            "total_reps": status.get('total_reps', 0),
            "left_last_rep_reasons": '; '.join(status.get('left_last_rep_reasons', [])),
            "right_last_rep_reasons": '; '.join(status.get('right_last_rep_reasons', [])),
        })

    cap.release()

    if not rows:
        return out_csv

    fieldnames = list(rows[0].keys())
    with open(out_csv, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)

    return out_csv


def main(argv: List[str]) -> None:
    if len(argv) < 2:
        folder = input("Folder with videos: ").strip().strip('"')
    else:
        folder = argv[1]

    if not os.path.isdir(folder):
        print(f"Not a folder: {folder}")
        sys.exit(1)

    output_dir = os.path.abspath(folder)
    videos = list_videos(folder)
    if not videos:
        print("No videos found in folder.")
        sys.exit(0)

    print(f"Found {len(videos)} video(s). Extracting frame CSVs...")
    for i, vp in enumerate(videos, 1):
        try:
            out_csv = extract_csv_for_video(vp, output_dir)
            print(f"[{i}/{len(videos)}] Saved: {out_csv}")
        except Exception as e:
            print(f"[{i}/{len(videos)}] Error processing {vp}: {e}")


if __name__ == "__main__":
    main(sys.argv)


