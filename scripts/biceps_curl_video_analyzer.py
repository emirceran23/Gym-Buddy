import cv2
import os
import csv
import math
import numpy as np
import joblib
import pandas as pd
from pathlib import Path
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
    def __init__(self, video_path, visualize=True, output_dir=None, fourcc="mp4v", progress_callback=None):
        self.video_path = video_path
        self.pose_detector = PoseDetector()
        self.rep_counter = BicepsCurlCounter()
        self.frame_count = 0
        self.fps = 0
        self.duration = 0
        self.visualize = visualize
        self.output_dir = output_dir or os.path.dirname(os.path.abspath(video_path))
        self.fourcc = fourcc
        self.progress_callback = progress_callback  # Callback for progress updates

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
            left_elbow_alignment_angle = right_elbow_alignment_angle = None
            left_true_torso_angle = right_true_torso_angle = None
            left_alignment = right_alignment = True

            if self.pose_detector.is_pose_detected():
                angles = self.pose_detector.get_body_angles(frame.shape)
                left_arm_angle = angles.get('left_arm')
                right_arm_angle = angles.get('right_arm')
                
                # Get arm visibility status with depth filtering
                visibility_status = self.pose_detector.get_arms_visibility_with_depth(
                    min_confidence=self.rep_counter.min_landmark_confidence,
                    depth_threshold=self.rep_counter.depth_threshold,
                    depth_filter_enabled=self.rep_counter.depth_filter_enabled
                )
                
                left_arm_visible = visibility_status['left']['visible']
                right_arm_visible = visibility_status['right']['visible']
                left_confidence = visibility_status['left']['confidence']
                right_confidence = visibility_status['right']['confidence']
                left_depth = visibility_status['left']['depth']
                right_depth = visibility_status['right']['depth']
                
                # Calculate elbow alignment angles (elbow-shoulder-hip, measures arm position relative to torso)
                left_elbow_alignment_angle = self._get_elbow_alignment_angle(frame.shape, 'left')
                right_elbow_alignment_angle = self._get_elbow_alignment_angle(frame.shape, 'right')
                
                # Calculate true torso angles (hip-shoulder-vertical, measures actual body stability)
                left_true_torso_angle = self._get_true_torso_angle(frame.shape, 'left')
                right_true_torso_angle = self._get_true_torso_angle(frame.shape, 'right')

                left_alignment = self._check_arm_alignment(frame.shape, 'left')
                right_alignment = self._check_arm_alignment(frame.shape, 'right')

                # Update rep counter with visibility info (still using elbow alignment angle for form checks)
                self.rep_counter.update(
                    left_arm_angle, right_arm_angle, 
                    left_alignment, right_alignment, 
                    left_elbow_alignment_angle, right_elbow_alignment_angle,
                    left_arm_visible=left_arm_visible,
                    right_arm_visible=right_arm_visible,
                    left_confidence=left_confidence,
                    right_confidence=right_confidence
                )

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
                "left_elbow_alignment_angle_deg": round(left_elbow_alignment_angle, 2) if left_elbow_alignment_angle is not None else "",
                "right_elbow_alignment_angle_deg": round(right_elbow_alignment_angle, 2) if right_elbow_alignment_angle is not None else "",
                "left_true_torso_angle_deg": round(left_true_torso_angle, 2) if left_true_torso_angle is not None else "",
                "right_true_torso_angle_deg": round(right_true_torso_angle, 2) if right_true_torso_angle is not None else "",
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

            # Progress reporting (every frame or every ~1s)
            if self.progress_callback:
                # Report progress on every frame for real-time updates
                self.progress_callback(frame_idx, self.frame_count)
            elif self.fps and frame_idx % int(self.fps) == 0:
                # Fallback to console logging if no callback
                print(f"Processed {frame_idx}/{self.frame_count} frames...")

        cap.release()
        if self._video_writer is not None:
            self._video_writer.release()

        self._write_csv()
        self._show_summary()

    # ---- helpers ----

    def _get_elbow_alignment_angle(self, image_shape, side):
        """
        Elbow alignment angle: angle at shoulder between elbow-shoulder-hip.
        Measures how far the elbow is from the torso.
        Should be < 30° for correct form (elbow stays close to body).
        side: 'left' or 'right'
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
    
    def _get_true_torso_angle(self, image_shape, side):
        """
        True torso stability angle: angle between hip-shoulder line and vertical.
        Measures how upright the body is (important for exercise classification).
        Should be < 20° for standing exercises like biceps curls.
        For pushups/planks, this would be 60-90° (body horizontal).
        side: 'left' or 'right'
        """
        if side == 'left':
            shoulder = self.pose_detector.get_landmark_position(11, image_shape)  # LEFT_SHOULDER
            hip = self.pose_detector.get_landmark_position(23, image_shape)       # LEFT_HIP
        else:
            shoulder = self.pose_detector.get_landmark_position(12, image_shape)  # RIGHT_SHOULDER
            hip = self.pose_detector.get_landmark_position(24, image_shape)        # RIGHT_HIP
        
        if None in [shoulder, hip]:
            return 999.0  # Invalid - return high value
        
        # Create a vertical reference point (same x as shoulder, but y above)
        # The vertical is straight up from the shoulder
        vertical_point = (shoulder[0], shoulder[1] - 100)  # 100 pixels up
        
        # Calculate angle at shoulder: vertical-shoulder-hip
        # This gives us the deviation from vertical
        angle = self.pose_detector.calculate_angle(vertical_point, shoulder, hip)
        
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
        cv2.rectangle(frame, (10, 10), (w - 10, 150), (0, 0, 0), thickness=-1)
        cv2.addWeighted(frame[10:150, 10:w-10], 0.6, np.zeros_like(frame[10:150, 10:w-10]), 0.4, 0, frame[10:150, 10:w-10])

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

        # Arm visibility and depth info
        left_visible = status.get('left_arm_visible', True)
        right_visible = status.get('right_arm_visible', True)
        left_conf = status.get('left_avg_confidence', 1.0)
        right_conf = status.get('right_avg_confidence', 1.0)
        
        # Show which arms are being analyzed
        analyzed_text = ""
        if left_visible and right_visible:
            analyzed_text = "Analyzing: BOTH ARMS"
            analyzed_color = (0, 255, 0)
        elif left_visible:
            analyzed_text = "Analyzing: LEFT ARM ONLY"
            analyzed_color = (0, 165, 255)
        elif right_visible:
            analyzed_text = "Analyzing: RIGHT ARM ONLY"
            analyzed_color = (0, 165, 255)
        else:
            analyzed_text = "Analyzing: NEITHER ARM"
            analyzed_color = (0, 0, 255)
        
        cv2.putText(frame, analyzed_text, (20, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, analyzed_color, 2, cv2.LINE_AA)

        # Angle badges with visibility indicators
        la = f"{left_angle:.0f}°" if left_angle is not None else "--"
        ra = f"{right_angle:.0f}°" if right_angle is not None else "--"
        
        # Add visibility indicator to angle badges
        if not left_visible:
            la = f"{la} [HIDDEN]"
        if not right_visible:
            ra = f"{ra} [HIDDEN]"
            
        self._badge(frame, (w-270, 35), f"L: {la}", ok=left_aligned and left_visible)
        self._badge(frame, (w-270, 85), f"R: {ra}", ok=right_aligned and right_visible)

        # Optional angle arcs near elbows if landmarks available
        if left_visible:
            self._draw_angle_arc(frame, arm="left", angle_deg=left_angle, color_ok=left_aligned)
        if right_visible:
            self._draw_angle_arc(frame, arm="right", angle_deg=right_angle, color_ok=right_aligned)

        # Alignment warnings (only for visible arms)
        warning_y = h - 80
        if left_visible and not left_aligned:
            self._warning(frame, (20, warning_y), "Keep left elbow closer to your side")
            warning_y += 35
        if right_visible and not right_aligned:
            self._warning(frame, (20, warning_y), "Keep right elbow closer to your side")
        
        # Visibility warnings for occluded arms
        vis_msg_left = status.get('left_visibility_message', '')
        vis_msg_right = status.get('right_visibility_message', '')
        if vis_msg_left:
            self._warning(frame, (20, warning_y), vis_msg_left)
            warning_y += 35
        if vis_msg_right:
            self._warning(frame, (20, warning_y), vis_msg_right)

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
        
        # --- ML-based Form Score (using cached timeline data) ---
        form_score = None
        form_label = None
        try:
            form_score, form_label = self._compute_ml_form_score()
        except Exception as e:
            print(f"⚠️ ML form prediction failed: {e}")
        
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
            'formScore': round(form_score, 1) if form_score is not None else None,
            'formLabel': form_label,
            'timeline': self._timeline_rows,  # Full frame-by-frame data
            'duration': round(self.duration, 2),
            'fps': round(self.fps, 2),
            'frameCount': self.frame_count,
        }
    
    def _compute_ml_form_score(self):
        """
        Compute ML-based form score from cached timeline data.
        Uses the augmented model (17 features) without re-processing the video.
        
        Returns:
            tuple: (form_score, form_label) or (None, None) on error
        """
        if not self._timeline_rows:
            print("⚠️ No timeline data available for ML scoring")
            return None, None
        
        # Convert timeline rows to DataFrame for feature extraction
        df = pd.DataFrame(self._timeline_rows)
        
        # Extract raw angle data from timeline
        left_angles = pd.to_numeric(df['left_angle_smoothed_deg'], errors='coerce').dropna().tolist()
        right_angles = pd.to_numeric(df['right_angle_smoothed_deg'], errors='coerce').dropna().tolist()
        left_torso = pd.to_numeric(df['left_true_torso_angle_deg'], errors='coerce').dropna().tolist()
        right_torso = pd.to_numeric(df['right_true_torso_angle_deg'], errors='coerce').dropna().tolist()
        
        # Need minimum frames for reliable feature extraction
        min_frames = 10
        if len(left_angles) < min_frames and len(right_angles) < min_frames:
            print(f"⚠️ Insufficient angle data for ML scoring (left: {len(left_angles)}, right: {len(right_angles)})")
            return None, None
        
        # --- Extract 17 features for the augmented model ---
        features = {}
        
        # Elbow angle features (left)
        if len(left_angles) >= min_frames:
            features['elbow_left_min'] = np.min(left_angles)
            features['elbow_left_max'] = np.max(left_angles)
            features['elbow_left_range'] = features['elbow_left_max'] - features['elbow_left_min']
            features['elbow_left_mean'] = np.mean(left_angles)
            features['elbow_left_std'] = np.std(left_angles)
        else:
            # Use right arm data as fallback
            features['elbow_left_min'] = np.min(right_angles) if right_angles else 0
            features['elbow_left_max'] = np.max(right_angles) if right_angles else 0
            features['elbow_left_range'] = features['elbow_left_max'] - features['elbow_left_min']
            features['elbow_left_mean'] = np.mean(right_angles) if right_angles else 0
            features['elbow_left_std'] = np.std(right_angles) if right_angles else 0
        
        # Elbow angle features (right)
        if len(right_angles) >= min_frames:
            features['elbow_right_min'] = np.min(right_angles)
            features['elbow_right_max'] = np.max(right_angles)
            features['elbow_right_range'] = features['elbow_right_max'] - features['elbow_right_min']
            features['elbow_right_mean'] = np.mean(right_angles)
            features['elbow_right_std'] = np.std(right_angles)
        else:
            # Use left arm data as fallback
            features['elbow_right_min'] = np.min(left_angles) if left_angles else 0
            features['elbow_right_max'] = np.max(left_angles) if left_angles else 0
            features['elbow_right_range'] = features['elbow_right_max'] - features['elbow_right_min']
            features['elbow_right_mean'] = np.mean(left_angles) if left_angles else 0
            features['elbow_right_std'] = np.std(left_angles) if left_angles else 0
        
        # Shoulder Y stability (using aligned data from timeline)
        left_aligned = df['left_aligned'].tolist()
        right_aligned = df['right_aligned'].tolist()
        
        # Approximate shoulder stability from alignment variation
        # Higher variation in alignment = less stable shoulders
        features['shoulder_left_y_std'] = np.std(left_aligned) if left_aligned else 0
        features['shoulder_right_y_std'] = np.std(right_aligned) if right_aligned else 0
        
        # Torso angle features
        torso_angles = left_torso + right_torso if left_torso or right_torso else [0]
        # Filter out invalid values (999.0 was used for invalid)
        torso_angles = [a for a in torso_angles if a < 900]
        if not torso_angles:
            torso_angles = [0]
        
        features['torso_angle_min'] = np.min(torso_angles)
        features['torso_angle_max'] = np.max(torso_angles)
        features['torso_angle_range'] = features['torso_angle_max'] - features['torso_angle_min']
        features['torso_angle_mean'] = np.mean(torso_angles)
        features['torso_angle_std'] = np.std(torso_angles)
        
        # --- Load the augmented model and predict ---
        script_dir = Path(__file__).parent
        model_path = script_dir.parent / 'model_training' / 'biceps_curl_rf_augmented.joblib'
        
        if not model_path.exists():
            print(f"⚠️ Model not found: {model_path}")
            return None, None
        
        model = joblib.load(model_path)
        
        # Feature columns in order expected by augmented model
        feature_columns = [
            'elbow_left_min', 'elbow_left_max', 'elbow_left_range', 'elbow_left_mean', 'elbow_left_std',
            'elbow_right_min', 'elbow_right_max', 'elbow_right_range', 'elbow_right_mean', 'elbow_right_std',
            'shoulder_left_y_std', 'shoulder_right_y_std',
            'torso_angle_min', 'torso_angle_max', 'torso_angle_range', 'torso_angle_mean', 'torso_angle_std'
        ]
        
        # Build feature vector
        X = pd.DataFrame([features])[feature_columns]
        X = X.fillna(0)
        
        # Make prediction
        prediction = model.predict(X)[0]
        probabilities = model.predict_proba(X)[0]
        
        form_score = float(probabilities[1]) * 100  # Good form probability as percentage
        form_label = 'Good Form ✅' if prediction == 1 else 'Bad Form ❌'
        
        print(f"✅ ML Form Score: {form_score:.1f}% ({form_label})")
        
        return form_score, form_label
