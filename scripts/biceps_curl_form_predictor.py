"""
Biceps Curl Form Predictor
===========================
This script uses the trained RandomForest model to predict whether biceps curl form is correct or incorrect.

Features:
- Loads the pre-trained model
- Extracts features from videos using MediaPipe Pose
- Predicts form quality (good/bad)
- Provides confidence scores and detailed metrics

Usage:
    python biceps_curl_form_predictor.py --video path/to/video.mp4
    python biceps_curl_form_predictor.py --video path/to/video.mp4 --model custom_model.joblib
"""

import os
import sys
import argparse
import cv2
import numpy as np
import pandas as pd
import joblib
import mediapipe as mp
from pathlib import Path


class BicepsCurlFormPredictor:
    """Predicts biceps curl form quality using a trained RandomForest model."""
    
    def __init__(self, model_path=None):
        """
        Initialize the predictor.
        
        Args:
            model_path (str, optional): Path to the trained model. 
                If None, uses the default model in ../models/
        """
        # Initialize MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Load the model
        if model_path is None:
            # Default to the augmented model in the models directory
            script_dir = Path(__file__).parent
            model_path = script_dir.parent / 'models' / 'biceps_curl_rf_augmented.joblib'
        
        self.model_path = Path(model_path)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {self.model_path}")
        
        print(f"Loading model from: {self.model_path}")
        self.model = joblib.load(self.model_path)
        print(f"✅ Model loaded successfully!")
        
        # Expected feature columns (from the augmented model)
        # Uses 17 separate left/right features for better generalization
        # IMPORTANT: Order must match exactly what was used during training!
        self.feature_columns = [
            'elbow_left_min',
            'elbow_left_max',
            'elbow_left_range',
            'elbow_left_mean',
            'elbow_left_std',
            'elbow_right_min',
            'elbow_right_max',
            'elbow_right_range',
            'elbow_right_mean',
            'elbow_right_std',
            'shoulder_left_y_std',
            'shoulder_right_y_std',
            'torso_angle_min',
            'torso_angle_max',
            'torso_angle_range',
            'torso_angle_mean',
            'torso_angle_std'
        ]
    
    @staticmethod
    def calculate_angle(point_a, point_b, point_c):
        """
        Calculate the angle between three points.
        
        Args:
            point_a: First point (tuple or array: x, y or x, y, z)
            point_b: Vertex point (angle is measured here)
            point_c: Last point
        
        Returns:
            float: Angle in degrees (0-180)
        """
        a = np.array(point_a)
        b = np.array(point_b)
        c = np.array(point_c)
        
        # Calculate vectors
        ba = a - b
        bc = c - b
        
        # Calculate angle using cosine formula
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
        
        # Clip to prevent numerical errors
        cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
        
        # Convert from radians to degrees
        angle = np.degrees(np.arccos(cosine_angle))
        
        return angle
    
    @staticmethod
    def calculate_vertical_angle(shoulder, hip):
        """
        Calculate the angle of the shoulder-hip line relative to vertical axis (torso angle).
        
        Args:
            shoulder: Shoulder coordinates (x, y)
            hip: Hip coordinates (x, y)
        
        Returns:
            float: Torso angle in degrees
        """
        # Vertical reference point (directly above shoulder)
        vertical_point = (shoulder[0], shoulder[1] - 1.0)
        
        return BicepsCurlFormPredictor.calculate_angle(vertical_point, shoulder, hip)
    
    def extract_features_from_video(self, video_path, frame_skip=2, max_frames=None, min_frames=10):
        """
        Extract features from a biceps curl video.
        
        Args:
            video_path (str): Path to video file
            frame_skip (int): Process every Nth frame (for performance)
            max_frames (int, optional): Maximum frames to process (None = all)
            min_frames (int): Minimum frames required (returns None if less)
        
        Returns:
            dict: Feature dictionary or None (if error)
        """
        # Open video
        cap = cv2.VideoCapture(str(video_path))
        
        if not cap.isOpened():
            print(f"⚠️ Could not open video: {video_path}")
            return None
        
        # Video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if fps <= 0:
            fps = 30.0  # Default FPS
        
        # Frame-based measurements
        elbow_left_angles = []
        elbow_right_angles = []
        
        shoulder_left_x = []
        shoulder_left_y = []
        shoulder_right_x = []
        shoulder_right_y = []
        
        shoulder_left_angles = []  # Shoulder angle (elbow-shoulder-hip)
        shoulder_right_angles = []
        
        torso_angles = []  # Torso angle (relative to vertical)
        
        frame_count = 0
        processed_frames = 0
        
        # Landmark indices
        LEFT_SHOULDER = self.mp_pose.PoseLandmark.LEFT_SHOULDER.value
        LEFT_ELBOW = self.mp_pose.PoseLandmark.LEFT_ELBOW.value
        LEFT_WRIST = self.mp_pose.PoseLandmark.LEFT_WRIST.value
        LEFT_HIP = self.mp_pose.PoseLandmark.LEFT_HIP.value
        
        RIGHT_SHOULDER = self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value
        RIGHT_ELBOW = self.mp_pose.PoseLandmark.RIGHT_ELBOW.value
        RIGHT_WRIST = self.mp_pose.PoseLandmark.RIGHT_WRIST.value
        RIGHT_HIP = self.mp_pose.PoseLandmark.RIGHT_HIP.value
        
        with self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as pose:
            
            while cap.isOpened():
                ret, frame = cap.read()
                
                if not ret:
                    break
                
                frame_count += 1
                
                # Apply frame skip
                if frame_count % frame_skip != 0:
                    continue
                
                # Check max frames
                if max_frames and processed_frames >= max_frames:
                    break
                
                # Convert to RGB (MediaPipe expects RGB)
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Pose detection
                results = pose.process(frame_rgb)
                
                if results.pose_landmarks:
                    landmarks = results.pose_landmarks.landmark
                    
                    # Get landmark coordinates
                    # Left side
                    l_shoulder = [landmarks[LEFT_SHOULDER].x, landmarks[LEFT_SHOULDER].y]
                    l_elbow = [landmarks[LEFT_ELBOW].x, landmarks[LEFT_ELBOW].y]
                    l_wrist = [landmarks[LEFT_WRIST].x, landmarks[LEFT_WRIST].y]
                    l_hip = [landmarks[LEFT_HIP].x, landmarks[LEFT_HIP].y]
                    
                    # Right side
                    r_shoulder = [landmarks[RIGHT_SHOULDER].x, landmarks[RIGHT_SHOULDER].y]
                    r_elbow = [landmarks[RIGHT_ELBOW].x, landmarks[RIGHT_ELBOW].y]
                    r_wrist = [landmarks[RIGHT_WRIST].x, landmarks[RIGHT_WRIST].y]
                    r_hip = [landmarks[RIGHT_HIP].x, landmarks[RIGHT_HIP].y]
                    
                    # === ELBOW ANGLES ===
                    left_elbow_angle = self.calculate_angle(l_shoulder, l_elbow, l_wrist)
                    elbow_left_angles.append(left_elbow_angle)
                    
                    right_elbow_angle = self.calculate_angle(r_shoulder, r_elbow, r_wrist)
                    elbow_right_angles.append(right_elbow_angle)
                    
                    # === SHOULDER COORDINATES ===
                    shoulder_left_x.append(landmarks[LEFT_SHOULDER].x)
                    shoulder_left_y.append(landmarks[LEFT_SHOULDER].y)
                    shoulder_right_x.append(landmarks[RIGHT_SHOULDER].x)
                    shoulder_right_y.append(landmarks[RIGHT_SHOULDER].y)
                    
                    # === SHOULDER ANGLES (elbow-shoulder-hip) ===
                    left_shoulder_angle = self.calculate_angle(l_elbow, l_shoulder, l_hip)
                    shoulder_left_angles.append(left_shoulder_angle)
                    
                    right_shoulder_angle = self.calculate_angle(r_elbow, r_shoulder, r_hip)
                    shoulder_right_angles.append(right_shoulder_angle)
                    
                    # === TORSO ANGLE ===
                    mid_shoulder = [
                        (l_shoulder[0] + r_shoulder[0]) / 2,
                        (l_shoulder[1] + r_shoulder[1]) / 2
                    ]
                    mid_hip = [
                        (l_hip[0] + r_hip[0]) / 2,
                        (l_hip[1] + r_hip[1]) / 2
                    ]
                    
                    torso_angle = self.calculate_vertical_angle(mid_shoulder, mid_hip)
                    torso_angles.append(torso_angle)
                    
                    processed_frames += 1
        
        cap.release()
        
        # Check minimum frames
        if processed_frames < min_frames:
            print(f"⚠️ Insufficient frames ({processed_frames}): {video_path}")
            return None
        
        # === CALCULATE FEATURES ===
        features = {}
        
        # --- Video duration ---
        features['video_duration'] = total_frames / fps
        features['processed_frames'] = processed_frames
        
        # --- Elbow Angle Features ---
        # Left elbow
        features['elbow_left_min'] = np.min(elbow_left_angles)
        features['elbow_left_max'] = np.max(elbow_left_angles)
        features['elbow_left_range'] = features['elbow_left_max'] - features['elbow_left_min']
        features['elbow_left_mean'] = np.mean(elbow_left_angles)
        features['elbow_left_std'] = np.std(elbow_left_angles)
        
        # Right elbow
        features['elbow_right_min'] = np.min(elbow_right_angles)
        features['elbow_right_max'] = np.max(elbow_right_angles)
        features['elbow_right_range'] = features['elbow_right_max'] - features['elbow_right_min']
        features['elbow_right_mean'] = np.mean(elbow_right_angles)
        features['elbow_right_std'] = np.std(elbow_right_angles)
        
        # Elbow symmetry
        elbow_diffs = np.abs(np.array(elbow_left_angles) - np.array(elbow_right_angles))
        features['elbow_lr_diff_mean'] = np.mean(elbow_diffs)
        features['elbow_lr_diff_max'] = np.max(elbow_diffs)
        
        # --- Shoulder Stability Features ---
        features['shoulder_left_x_std'] = np.std(shoulder_left_x)
        features['shoulder_left_y_std'] = np.std(shoulder_left_y)
        features['shoulder_right_x_std'] = np.std(shoulder_right_x)
        features['shoulder_right_y_std'] = np.std(shoulder_right_y)
        
        # Shoulder angle features
        features['shoulder_left_angle_min'] = np.min(shoulder_left_angles)
        features['shoulder_left_angle_max'] = np.max(shoulder_left_angles)
        features['shoulder_left_angle_range'] = features['shoulder_left_angle_max'] - features['shoulder_left_angle_min']
        features['shoulder_left_angle_std'] = np.std(shoulder_left_angles)
        
        features['shoulder_right_angle_min'] = np.min(shoulder_right_angles)
        features['shoulder_right_angle_max'] = np.max(shoulder_right_angles)
        features['shoulder_right_angle_range'] = features['shoulder_right_angle_max'] - features['shoulder_right_angle_min']
        features['shoulder_right_angle_std'] = np.std(shoulder_right_angles)
        
        # Shoulder symmetry
        shoulder_angle_diffs = np.abs(np.array(shoulder_left_angles) - np.array(shoulder_right_angles))
        features['shoulder_lr_diff_mean'] = np.mean(shoulder_angle_diffs)
        
        # --- Torso Stability Features ---
        features['torso_angle_mean'] = np.mean(torso_angles)
        features['torso_angle_std'] = np.std(torso_angles)
        features['torso_angle_range'] = np.max(torso_angles) - np.min(torso_angles)
        features['torso_angle_min'] = np.min(torso_angles)
        features['torso_angle_max'] = np.max(torso_angles)
        
        # --- Angular Velocity Features (Kinematics) ---
        # Left elbow angular velocity (frame-based derivative)
        elbow_left_vel = np.diff(elbow_left_angles)
        features['elbow_left_ang_vel_max'] = np.max(np.abs(elbow_left_vel)) if len(elbow_left_vel) > 0 else 0
        features['elbow_left_ang_vel_std'] = np.std(elbow_left_vel) if len(elbow_left_vel) > 0 else 0
        features['elbow_left_ang_vel_mean'] = np.mean(np.abs(elbow_left_vel)) if len(elbow_left_vel) > 0 else 0
        
        # Right elbow angular velocity
        elbow_right_vel = np.diff(elbow_right_angles)
        features['elbow_right_ang_vel_max'] = np.max(np.abs(elbow_right_vel)) if len(elbow_right_vel) > 0 else 0
        features['elbow_right_ang_vel_std'] = np.std(elbow_right_vel) if len(elbow_right_vel) > 0 else 0
        features['elbow_right_ang_vel_mean'] = np.mean(np.abs(elbow_right_vel)) if len(elbow_right_vel) > 0 else 0
        
        # --- Symmetric/Averaged Features (for symmetric_mean model) ---
        # These features average left and right measurements
        features['elbow_min_mean'] = (features['elbow_left_min'] + features['elbow_right_min']) / 2
        features['elbow_max_mean'] = (features['elbow_left_max'] + features['elbow_right_max']) / 2
        features['elbow_range_mean'] = (features['elbow_left_range'] + features['elbow_right_range']) / 2
        features['elbow_mean_mean'] = (features['elbow_left_mean'] + features['elbow_right_mean']) / 2
        features['elbow_std_mean'] = (features['elbow_left_std'] + features['elbow_right_std']) / 2
        features['shoulder_y_std_mean'] = (features['shoulder_left_y_std'] + features['shoulder_right_y_std']) / 2
        
        return features
    
    def predict(self, video_path, frame_skip=2):
        """
        Predict biceps curl form quality for a video.
        
        Args:
            video_path (str): Path to video file
            frame_skip (int): Process every Nth frame (for performance)
        
        Returns:
            dict: Prediction results including label, confidence, and metrics
        """
        print(f"\n🎬 Analyzing video: {Path(video_path).name}")
        print("-" * 60)
        
        # Extract features
        features = self.extract_features_from_video(
            video_path=video_path,
            frame_skip=frame_skip,
            max_frames=None,
            min_frames=5
        )
        
        if features is None:
            print("❌ Could not extract features from video!")
            return None
        
        # Convert to DataFrame (in the order the model expects)
        X = pd.DataFrame([features])[self.feature_columns]
        
        # Handle NaN values
        X = X.fillna(0)
        
        # Make prediction
        prediction = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        # Prepare results
        result = {
            'prediction': int(prediction),
            'label': 'Good Form ✅' if prediction == 1 else 'Bad Form ❌',
            'confidence_good': float(probabilities[1]),
            'confidence_bad': float(probabilities[0]),
            'features': features
        }
        
        # Print results
        print(f"\n📊 PREDICTION RESULTS:")
        print(f"   ➤ Form Quality: {result['label']}")
        print(f"   ➤ Good Form Probability: {result['confidence_good']*100:.1f}%")
        print(f"   ➤ Bad Form Probability: {result['confidence_bad']*100:.1f}%")
        
        # Print important metrics
        print(f"\n📈 KEY METRICS:")
        print(f"   ➤ Left Elbow ROM: {features['elbow_left_range']:.1f}°")
        print(f"   ➤ Right Elbow ROM: {features['elbow_right_range']:.1f}°")
        print(f"   ➤ Torso Angle (avg): {features['torso_angle_mean']:.1f}°")
        print(f"   ➤ Shoulder Stability (std): {features['shoulder_left_y_std']:.4f}")
        print(f"   ➤ Processed Frames: {int(features['processed_frames'])}")
        print(f"   ➤ Video Duration: {features['video_duration']:.2f}s")
        
        return result
    
    def predict_batch(self, video_paths, frame_skip=2):
        """
        Predict form quality for multiple videos.
        
        Args:
            video_paths (list): List of video file paths
            frame_skip (int): Process every Nth frame
        
        Returns:
            list: List of prediction results
        """
        results = []
        
        print(f"\n🎯 Processing {len(video_paths)} videos...")
        print("=" * 60)
        
        for i, video_path in enumerate(video_paths, 1):
            print(f"\n[{i}/{len(video_paths)}] Processing: {Path(video_path).name}")
            result = self.predict(video_path, frame_skip=frame_skip)
            
            if result:
                results.append({
                    'video_path': str(video_path),
                    'video_name': Path(video_path).name,
                    **result
                })
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 BATCH PREDICTION SUMMARY")
        print("=" * 60)
        
        if results:
            good_count = sum(1 for r in results if r['prediction'] == 1)
            bad_count = len(results) - good_count
            
            print(f"Total Videos: {len(results)}")
            print(f"Good Form: {good_count} ({good_count/len(results)*100:.1f}%)")
            print(f"Bad Form: {bad_count} ({bad_count/len(results)*100:.1f}%)")
        else:
            print("No videos were successfully processed.")
        
        return results


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description='Predict biceps curl form quality using a trained RandomForest model.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Predict single video
  python biceps_curl_form_predictor.py --video biceps_curl.mp4
  
  # Predict with custom model
  python biceps_curl_form_predictor.py --video biceps_curl.mp4 --model custom_model.joblib
  
  # Predict multiple videos
  python biceps_curl_form_predictor.py --video video1.mp4 video2.mp4 video3.mp4
  
  # Faster processing (skip more frames)
  python biceps_curl_form_predictor.py --video biceps_curl.mp4 --frame-skip 4
        """
    )
    
    parser.add_argument(
        '--video', '-v',
        nargs='+',
        required=True,
        help='Path to video file(s) to analyze'
    )
    
    parser.add_argument(
        '--model', '-m',
        default=None,
        help='Path to trained model (default: ../models/biceps_curl_rf_model_no_duration_newest.joblib)'
    )
    
    parser.add_argument(
        '--frame-skip', '-f',
        type=int,
        default=2,
        help='Process every Nth frame (default: 2, higher = faster but less accurate)'
    )
    
    parser.add_argument(
        '--output', '-o',
        default=None,
        help='Output CSV file to save results (optional)'
    )
    
    args = parser.parse_args()
    
    try:
        # Initialize predictor
        predictor = BicepsCurlFormPredictor(model_path=args.model)
        
        # Process videos
        if len(args.video) == 1:
            # Single video
            result = predictor.predict(args.video[0], frame_skip=args.frame_skip)
            
            if result and args.output:
                df = pd.DataFrame([{
                    'video_path': args.video[0],
                    'video_name': Path(args.video[0]).name,
                    **result
                }])
                df.to_csv(args.output, index=False)
                print(f"\n💾 Results saved to: {args.output}")
        else:
            # Multiple videos
            results = predictor.predict_batch(args.video, frame_skip=args.frame_skip)
            
            if results and args.output:
                df = pd.DataFrame(results)
                df.to_csv(args.output, index=False)
                print(f"\n💾 Results saved to: {args.output}")
    
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
