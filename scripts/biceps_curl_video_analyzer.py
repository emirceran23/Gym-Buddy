import cv2
import os
import csv
import math
import numpy as np
from pose_detection import PoseDetector
from biceps_curl_counter import BicepsCurlCounter

class BicepsCurlVideoAnalyzer:
    """
    Analyze MP4 video for biceps curl reps using pose detection.
    Also produces:
      - annotated video with overlays (landmarks, angles, rep counts, warnings)
      - CSV timeline (frame-by-frame metrics)
      - printed summary + rep event table
    """
    def __init__(self, video_path, visualize=True, output_dir=None, fourcc="mp4v"):
        self.video_path = video_path
        self.pose_detector = PoseDetector()
        self.rep_counter = BicepsCurlCounter()
        self.frame_count = 0
        self.fps = 0
        self.duration = 0
        self.visualize = visualize
        self.output_dir = output_dir or os.path.dirname(os.path.abspath(video_path))
        self.fourcc = fourcc

        # runtime/bookkeeping
        self._timeline_rows = []     # per-frame row dicts for CSV
        self._events = []            # discrete rep events for table
        self._last_left_reps = 0
        self._last_right_reps = 0
        self._video_writer = None
        self._out_path_video = None
        self._out_path_csv = None

    def analyze(self):
        cap = cv2.VideoCapture(self.video_path)
        if not cap.isOpened():
            print(f"Error: Could not open video file {self.video_path}")
            return

        self.frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        self.fps = cap.get(cv2.CAP_PROP_FPS)
        self.duration = self.frame_count / self.fps if self.fps else 0

        base = os.path.splitext(os.path.basename(self.video_path))[0]
        self._out_path_video = os.path.join(self.output_dir, f"{base}__annotated.mp4")
        self._out_path_csv = os.path.join(self.output_dir, f"{base}__timeline.csv")

        print(f"Video loaded: {self.video_path}")
        print(f"Frames: {self.frame_count}, FPS: {self.fps:.2f}, Duration: {self.duration:.1f}s")
        frame_idx = 0

        # Prepare writer lazily after we know frame size (post-resize)
        writer_ready = False

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1

            # Resize for consistency and performance
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

            # Pose detection (ask PoseDetector to draw if it can)
            draw_pose = self.visualize
            frame, results = self.pose_detector.detect_pose(frame, draw=draw_pose)

            left_arm_angle = right_arm_angle = None
            left_torso_angle = right_torso_angle = None
            left_alignment = right_alignment = True

            if self.pose_detector.is_pose_detected():
                angles = self.pose_detector.get_body_angles(frame.shape)
                left_arm_angle = angles.get('left_arm')
                right_arm_angle = angles.get('right_arm')
                
                # Calculate torso angles (deviation from vertical)
                left_torso_angle = self._get_torso_angle(frame.shape, 'left')
                right_torso_angle = self._get_torso_angle(frame.shape, 'right')

                left_alignment = self._check_arm_alignment(frame.shape, 'left')
                right_alignment = self._check_arm_alignment(frame.shape, 'right')

                # Update rep counter
                self.rep_counter.update(left_arm_angle, right_arm_angle, left_alignment, right_alignment, left_torso_angle, right_torso_angle)

            status = self.rep_counter.get_status()
            left_reps = status.get('left_reps', 0)
            right_reps = status.get('right_reps', 0)
            total_reps = status.get('total_reps', 0)

            # Detect rep events (count increments)
            t_sec = frame_idx / self.fps if self.fps else 0
            if left_reps > self._last_left_reps:
                self._events.append({
                    "time_s": t_sec, "frame": frame_idx, "arm": "left",
                    "angle": left_arm_angle, "aligned": left_alignment, "count": left_reps
                })
            if right_reps > self._last_right_reps:
                self._events.append({
                    "time_s": t_sec, "frame": frame_idx, "arm": "right",
                    "angle": right_arm_angle, "aligned": right_alignment, "count": right_reps
                })
            self._last_left_reps, self._last_right_reps = left_reps, right_reps

            # Overlay visualization
            if self.visualize:
                self._draw_overlay(
                    frame=frame,
                    frame_idx=frame_idx,
                    fps=self.fps,
                    left_angle=left_arm_angle,
                    right_angle=right_arm_angle,
                    left_aligned=left_alignment,
                    right_aligned=right_alignment,
                    status=status
                )

                # Initialize writer once, from actual frame shape
                if not writer_ready:
                    h, w = frame.shape[:2]
                    fourcc = cv2.VideoWriter_fourcc(*self.fourcc)
                    self._video_writer = cv2.VideoWriter(self._out_path_video, fourcc, self.fps if self.fps else 30.0, (w, h))
                    writer_ready = True

                self._video_writer.write(frame)

            # Save timeline row with both raw and smoothed angles
            self._timeline_rows.append({
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
                "left_torso_arm_angle_deg": round(left_torso_angle, 2) if left_torso_angle is not None else "",
                "right_torso_arm_angle_deg": round(right_torso_angle, 2) if right_torso_angle is not None else "",
                "left_aligned": int(bool(left_alignment)),
                "right_aligned": int(bool(right_alignment)),
                "left_reps": status.get('left_reps', 0),
                "right_reps": status.get('right_reps', 0),
                "left_correct_reps": status.get('left_correct_reps', 0),
                "right_correct_reps": status.get('right_correct_reps', 0),
                "left_incorrect_reps": status.get('left_incorrect_reps', 0),
                "right_incorrect_reps": status.get('right_incorrect_reps', 0),
                "total_reps": total_reps,
                "left_last_rep_reasons": '; '.join(status.get('left_last_rep_reasons', [])),
                "right_last_rep_reasons": '; '.join(status.get('right_last_rep_reasons', []))
            })

            # Optional console progress (every ~1s)
            if self.fps and frame_idx % int(self.fps) == 0:
                print(f"Processed {frame_idx}/{self.frame_count} frames...")

        cap.release()
        if self._video_writer is not None:
            self._video_writer.release()

        self._write_csv()
        self._show_summary()

    # ---- helpers ----

    def _get_torso_angle(self, image_shape, side):
        """
        Torso angle: angle at shoulder between elbow-shoulder-hip.
        Should be < 30° for correct form (elbow stays close to body).
        side: 'left' veya 'right'
        """
        if side == 'left':
            elbow = self.pose_detector.get_landmark_position(13, image_shape)    # LEFT_ELBOW
            shoulder = self.pose_detector.get_landmark_position(11, image_shape) # LEFT_SHOULDER
            hip = self.pose_detector.get_landmark_position(23, image_shape)      # LEFT_HIP
        else:
            elbow = self.pose_detector.get_landmark_position(14, image_shape)     # RIGHT_ELBOW
            shoulder = self.pose_detector.get_landmark_position(12, image_shape) # RIGHT_SHOULDER
            hip = self.pose_detector.get_landmark_position(24, image_shape)       # RIGHT_HIP

        if None in [elbow, shoulder, hip]:
            return 999.0  # Invalid - return high value to mark as violation

        # Calculate angle at shoulder: elbow-shoulder-hip
        angle = self.pose_detector.calculate_angle(elbow, shoulder, hip)
        return float(angle) if angle is not None else 999.0
    
    def _check_arm_alignment(self, image_shape, arm):
        # Copied from BicepsCurlTracker for consistency
        if arm == 'left':
            shoulder = self.pose_detector.get_landmark_position(11, image_shape)
            elbow = self.pose_detector.get_landmark_position(13, image_shape)
            hip = self.pose_detector.get_landmark_position(23, image_shape)
        else:
            shoulder = self.pose_detector.get_landmark_position(12, image_shape)
            elbow = self.pose_detector.get_landmark_position(14, image_shape)
            hip = self.pose_detector.get_landmark_position(24, image_shape)

        if None in [shoulder, elbow, hip]:
            return True
        elbow_x_offset = abs(elbow[0] - shoulder[0])
        torso_height = abs(hip[1] - shoulder[1])
        if torso_height == 0:
            return True
        max_deviation = torso_height * 0.15
        is_aligned = elbow_x_offset < max_deviation
        return is_aligned

    def _draw_overlay(self, frame, frame_idx, fps,
                      left_angle, right_angle,
                      left_aligned, right_aligned,
                      status):
        h, w = frame.shape[:2]

        # Panel background
        cv2.rectangle(frame, (10, 10), (w - 10, 120), (0, 0, 0), thickness=-1)
        cv2.addWeighted(frame[10:120, 10:w-10], 0.6, np.zeros_like(frame[10:120, 10:w-10]), 0.4, 0, frame[10:120, 10:w-10])

        # Header
        cv2.putText(frame, "Biceps Curl Analyzer", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255,255,255), 2, cv2.LINE_AA)

        # Time/progress
        t = frame_idx / fps if fps else 0
        cv2.putText(frame, f"Time: {t:6.2f}s  Frame: {frame_idx}", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (220,220,220), 2, cv2.LINE_AA)

        # Counts
        total_reps = status.get('total_reps', 0)
        left_reps = status.get('left_reps', 0)
        right_reps = status.get('right_reps', 0)
        left_correct_reps = status.get('left_correct_reps', 0)
        right_correct_reps = status.get('right_correct_reps', 0)

        cv2.putText(frame, f"Total: {total_reps}", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,255), 2, cv2.LINE_AA)
        cv2.putText(frame, f"L: {left_reps} ({left_correct_reps})", (180, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0) if left_aligned else (0,140,0), 2, cv2.LINE_AA)
        cv2.putText(frame, f"R: {right_reps} ({right_correct_reps})", (320, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,200,255) if right_aligned else (0,120,160), 2, cv2.LINE_AA)

        # Angle badges
        la = f"{left_angle:.0f}°" if left_angle is not None else "--"
        ra = f"{right_angle:.0f}°" if right_angle is not None else "--"
        self._badge(frame, (w-210, 35), f"L angle: {la}", ok=left_aligned)
        self._badge(frame, (w-210, 85), f"R angle: {ra}", ok=right_aligned)

        # Optional angle arcs near elbows if landmarks available
        self._draw_angle_arc(frame, arm="left", angle_deg=left_angle, color_ok=left_aligned)
        self._draw_angle_arc(frame, arm="right", angle_deg=right_angle, color_ok=right_aligned)

        # Alignment warnings
        if not left_aligned:
            self._warning(frame, (20, h-60), "Keep left elbow closer to your side")
        if not right_aligned:
            self._warning(frame, (20, h-25), "Keep right elbow closer to your side")

    def _badge(self, frame, origin, text, ok=True):
        x, y = origin
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        pad = 8
        bg = (30, 90, 30) if ok else (90, 30, 30)
        cv2.rectangle(frame, (x-6, y-22), (x + tw + pad, y + 8), bg, -1)
        cv2.putText(frame, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2, cv2.LINE_AA)

    def _warning(self, frame, origin, text):
        x, y = origin
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
        cv2.rectangle(frame, (x-6, y-th-10), (x + tw + 10, y + 10), (0,0,0), -1)
        cv2.putText(frame, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0,255,255), 2, cv2.LINE_AA)

    def _draw_angle_arc(self, frame, arm, angle_deg, color_ok=True):
        """Draw a small arc near the elbow with the current elbow angle."""
        if angle_deg is None:
            return
        # Landmarks: shoulder-elbow-wrist triplets using Mediapipe indices
        lm = {
            "left":  {"shoulder":11, "elbow":13, "wrist":15},
            "right": {"shoulder":12, "elbow":14, "wrist":16},
        }[arm]
        elbow = self.pose_detector.get_landmark_position(lm["elbow"], frame.shape)
        shoulder = self.pose_detector.get_landmark_position(lm["shoulder"], frame.shape)
        wrist = self.pose_detector.get_landmark_position(lm["wrist"], frame.shape)
        if None in [elbow, shoulder, wrist]:
            return

        ex, ey = map(int, elbow)
        radius = 40
        # color: greenish if aligned, reddish if not
        color = (80, 220, 80) if color_ok else (50, 50, 255)

        # Compute directions for arc start/end using vectors
        v1 = np.array([shoulder[0]-elbow[0], shoulder[1]-elbow[1]])
        v2 = np.array([wrist[0]-elbow[0], wrist[1]-elbow[1]])
        # angles in degrees for cv2.ellipse (swap sign for screen y-axis)
        def vec_angle(v):
            return -math.degrees(math.atan2(v[1], v[0]))
        a1, a2 = vec_angle(v1), vec_angle(v2)

        # normalize span direction
        start_angle = int(min(a1, a2))
        end_angle = int(max(a1, a2))
        if end_angle - start_angle > 180:
            start_angle, end_angle = end_angle, start_angle + 360

        cv2.ellipse(frame, (ex, ey), (radius, radius), 0, start_angle, end_angle, color, 2)
        cv2.putText(frame, f"{int(round(angle_deg))}" + "°", (ex+10, ey-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)

    def _write_csv(self):
        if not self._timeline_rows:
            return
        fieldnames = list(self._timeline_rows[0].keys())
        with open(self._out_path_csv, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in self._timeline_rows:
                writer.writerow(row)

    def _show_summary(self):
        status = self.rep_counter.get_status()
        print("\n" + "="*60)
        print("BICEPS CURL VIDEO ANALYSIS SUMMARY")
        print("="*60)
        print(f"Total Reps: {status.get('total_reps', 0)}")
        print(f"  Correct Reps: {status.get('left_correct_reps', 0) + status.get('right_correct_reps', 0)}")
        print(f"  Incorrect Reps: {status.get('left_incorrect_reps', 0) + status.get('right_incorrect_reps', 0)}")
        print(f"Left Arm:  {status.get('left_reps', 0)} reps ({status.get('left_correct_reps', 0)} correct, {status.get('left_incorrect_reps', 0)} incorrect)")
        print(f"Right Arm: {status.get('right_reps', 0)} reps ({status.get('right_correct_reps', 0)} correct, {status.get('right_incorrect_reps', 0)} incorrect)")
        print(f"Duration:  {self.duration:.1f} seconds")
        print("-"*60)
        print("Rep events (when counts changed):")
        if not self._events:
            print("  (no discrete rep events detected)")
        else:
            for e in self._events:
                print(f"  t={e['time_s']:.2f}s  frame={e['frame']:>5}  {e['arm'].upper()}  count={e['count']}  angle≈{e['angle']:.0f}°  aligned={bool(e['aligned'])}")
        print("-"*60)
        if self.visualize:
            print(f"Annotated video: {self._out_path_video}")
        print(f"Timeline CSV:    {self._out_path_csv}")
        print("="*60)

    def get_results_dict(self):
        """
        Return analysis results as a dictionary for JSON API response
        """
        status = self.rep_counter.get_status()
        
        # Compute total correct and incorrect reps
        total_correct = status.get('left_correct_reps', 0) + status.get('right_correct_reps', 0)
        total_incorrect = status.get('left_incorrect_reps', 0) + status.get('right_incorrect_reps', 0)
        
        # Gather form feedback from last rep reasons
        form_feedback = []
        if status.get('left_last_rep_reasons'):
            form_feedback.extend([f"Left: {reason}" for reason in status['left_last_rep_reasons']])
        if status.get('right_last_rep_reasons'):
            form_feedback.extend([f"Right: {reason}" for reason in status['right_last_rep_reasons']])
        
        return {
            'totalReps': status.get('total_reps', 0),
            'correctReps': total_correct,
            'incorrectReps': total_incorrect,
            'leftReps': status.get('left_reps', 0),
            'rightReps': status.get('right_reps', 0),
            'leftCorrectReps': status.get('left_correct_reps', 0),
            'rightCorrectReps': status.get('right_correct_reps', 0),
            'leftIncorrectReps': status.get('left_incorrect_reps', 0),
            'rightIncorrectReps': status.get('right_incorrect_reps', 0),
            'formFeedback': form_feedback,
            'timeline': self._timeline_rows,  # Full frame-by-frame data
            'duration': round(self.duration, 2),
            'fps': round(self.fps, 2),
            'frameCount': self.frame_count,
        }

