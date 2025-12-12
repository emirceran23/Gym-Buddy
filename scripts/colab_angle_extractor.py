"""
Google Colab Video Angle Extractor
This script extracts body angles from videos using MediaPipe Pose detection.
Can be used in Google Colab to analyze multiple videos and export angle data to CSV.

Features:
- Extracts arm angles (biceps curl angle)
- Extracts torso stability angles
- Extracts true torso angles (uprightness)
- Exports frame-by-frame data to CSV
- Processes multiple videos in batch
- Works in Google Colab environment

Usage in Colab:
1. Upload videos to Colab
2. Install required packages
3. Run this script to extract angles from all videos
"""

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
import os
from pathlib import Path
import math
from typing import Optional, Tuple, Dict, List


class MediaPipeAngleExtractor:
    """Extract body angles from videos using MediaPipe Pose"""
    
    def __init__(self):
        """Initialize MediaPipe Pose detector"""
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        
    def calculate_angle(self, point1: Tuple[float, float], 
                       point2: Tuple[float, float], 
                       point3: Tuple[float, float]) -> Optional[float]:
        """
        Calculate angle at point2 formed by three points.
        
        Args:
            point1: First point (x, y)
            point2: Vertex point (x, y)
            point3: Third point (x, y)
            
        Returns:
            Angle in degrees (0-180)
        """
        if None in [point1, point2, point3]:
            return None
            
        # Convert to numpy arrays
        p1 = np.array(point1)
        p2 = np.array(point2)
        p3 = np.array(point3)
        
        # Calculate vectors
        v1 = p1 - p2
        v2 = p3 - p2
        
        # Calculate angle using dot product
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
        cos_angle = np.clip(cos_angle, -1.0, 1.0)  # Numerical stability
        angle = np.arccos(cos_angle)
        
        return np.degrees(angle)
    
    def get_landmark_coords(self, landmarks, landmark_id: int, 
                           image_width: int, image_height: int) -> Optional[Tuple[float, float]]:
        """
        Get landmark coordinates in pixel space.
        
        Args:
            landmarks: MediaPipe pose landmarks
            landmark_id: MediaPipe landmark ID
            image_width: Image width in pixels
            image_height: Image height in pixels
            
        Returns:
            (x, y) coordinates or None if landmark not visible
        """
        if not landmarks:
            return None
            
        landmark = landmarks.landmark[landmark_id]
        
        # Check visibility
        if landmark.visibility < 0.5:
            return None
            
        # Convert normalized coordinates to pixels
        x = landmark.x * image_width
        y = landmark.y * image_height
        
        return (x, y)
    
    def extract_angles_from_frame(self, frame: np.ndarray, landmarks) -> Dict[str, Optional[float]]:
        """
        Extract all relevant angles from a single frame.
        
        Returns dict with:
            - left_arm_angle: Left biceps curl angle
            - right_arm_angle: Right biceps curl angle
            - left_elbow_alignment: Elbow-shoulder-hip angle (left)
            - right_elbow_alignment: Elbow-shoulder-hip angle (right)
            - left_true_torso: Hip-shoulder-vertical angle (left)
            - right_true_torso: Hip-shoulder-vertical angle (right)
            - left_shoulder_angle: Shoulder flexion/extension angle (left)
            - right_shoulder_angle: Shoulder flexion/extension angle (right)
        """
        h, w = frame.shape[:2]
        angles = {}
        
        if not landmarks:
            return {
                'left_arm_angle': None,
                'right_arm_angle': None,
                'left_elbow_alignment': None,
                'right_elbow_alignment': None,
                'left_true_torso': None,
                'right_true_torso': None,
                'left_shoulder_angle': None,
                'right_shoulder_angle': None,
            }
        
        # MediaPipe landmark IDs
        # Left side: shoulder=11, elbow=13, wrist=15, hip=23
        # Right side: shoulder=12, elbow=14, wrist=16, hip=24
        
        # LEFT ARM ANGLE (biceps curl angle: shoulder-elbow-wrist)
        left_shoulder = self.get_landmark_coords(landmarks, 11, w, h)
        left_elbow = self.get_landmark_coords(landmarks, 13, w, h)
        left_wrist = self.get_landmark_coords(landmarks, 15, w, h)
        angles['left_arm_angle'] = self.calculate_angle(left_shoulder, left_elbow, left_wrist)
        
        # RIGHT ARM ANGLE (biceps curl angle: shoulder-elbow-wrist)
        right_shoulder = self.get_landmark_coords(landmarks, 12, w, h)
        right_elbow = self.get_landmark_coords(landmarks, 14, w, h)
        right_wrist = self.get_landmark_coords(landmarks, 16, w, h)
        angles['right_arm_angle'] = self.calculate_angle(right_shoulder, right_elbow, right_wrist)
        
        # ELBOW ALIGNMENT ANGLES (elbow-shoulder-hip)
        left_hip = self.get_landmark_coords(landmarks, 23, w, h)
        angles['left_elbow_alignment'] = self.calculate_angle(left_elbow, left_shoulder, left_hip)
        
        right_hip = self.get_landmark_coords(landmarks, 24, w, h)
        angles['right_elbow_alignment'] = self.calculate_angle(right_elbow, right_shoulder, right_hip)
        
        # TRUE TORSO ANGLES (hip-shoulder-vertical)
        if left_shoulder and left_hip:
            # Create vertical reference point
            vertical_left = (left_shoulder[0], left_shoulder[1] - 100)
            angles['left_true_torso'] = self.calculate_angle(vertical_left, left_shoulder, left_hip)
        else:
            angles['left_true_torso'] = None
            
        if right_shoulder and right_hip:
            vertical_right = (right_shoulder[0], right_shoulder[1] - 100)
            angles['right_true_torso'] = self.calculate_angle(vertical_right, right_shoulder, right_hip)
        else:
            angles['right_true_torso'] = None
        
        # SHOULDER ANGLES (shoulder extension: hip-shoulder-elbow)
        angles['left_shoulder_angle'] = self.calculate_angle(left_hip, left_shoulder, left_elbow)
        angles['right_shoulder_angle'] = self.calculate_angle(right_hip, right_shoulder, right_elbow)
        
        return angles
    
    def process_video(self, video_path: str, output_csv_path: str, 
                     visualize: bool = False, output_video_path: str = None) -> pd.DataFrame:
        """
        Process a video and extract angles frame-by-frame.
        
        Args:
            video_path: Path to input video
            output_csv_path: Path to save CSV output
            visualize: If True, create annotated video
            output_video_path: Path to save annotated video (if visualize=True)
            
        Returns:
            DataFrame with all extracted angles
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Processing: {video_path}")
        print(f"  Frames: {frame_count}, FPS: {fps:.2f}, Resolution: {width}x{height}")
        
        # Prepare video writer if visualization requested
        video_writer = None
        if visualize and output_video_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(output_video_path, fourcc, fps, (width, height))
        
        # Store results
        results = []
        frame_idx = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_idx += 1
            
            # Convert to RGB for MediaPipe
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Process with MediaPipe
            pose_results = self.pose.process(frame_rgb)
            
            # Extract angles
            angles = self.extract_angles_from_frame(frame, pose_results.pose_landmarks)
            
            # Add frame metadata
            time_sec = frame_idx / fps if fps > 0 else 0
            row = {
                'frame': frame_idx,
                'time_s': round(time_sec, 3),
                **{k: round(v, 2) if v is not None else None for k, v in angles.items()}
            }
            results.append(row)
            
            # Draw visualization if requested
            if visualize and video_writer:
                if pose_results.pose_landmarks:
                    # Draw pose landmarks
                    self.mp_drawing.draw_landmarks(
                        frame, 
                        pose_results.pose_landmarks,
                        self.mp_pose.POSE_CONNECTIONS,
                        self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                        self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2)
                    )
                    
                    # Draw angle text overlays
                    y_offset = 30
                    if angles['left_arm_angle'] is not None:
                        cv2.putText(frame, f"L Arm: {angles['left_arm_angle']:.0f}deg", 
                                  (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                        y_offset += 30
                    if angles['right_arm_angle'] is not None:
                        cv2.putText(frame, f"R Arm: {angles['right_arm_angle']:.0f}deg", 
                                  (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                        y_offset += 30
                    if angles['left_true_torso'] is not None:
                        cv2.putText(frame, f"L Torso: {angles['left_true_torso']:.0f}deg", 
                                  (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
                        y_offset += 30
                    if angles['right_true_torso'] is not None:
                        cv2.putText(frame, f"R Torso: {angles['right_true_torso']:.0f}deg", 
                                  (10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)
                
                video_writer.write(frame)
            
            # Progress update
            if frame_idx % 30 == 0:
                progress = (frame_idx / frame_count) * 100
                print(f"  Progress: {progress:.1f}% ({frame_idx}/{frame_count} frames)")
        
        cap.release()
        if video_writer:
            video_writer.release()
        
        # Convert to DataFrame and save
        df = pd.DataFrame(results)
        df.to_csv(output_csv_path, index=False)
        
        print(f"✓ Saved CSV: {output_csv_path}")
        if visualize and output_video_path:
            print(f"✓ Saved video: {output_video_path}")
        
        return df


def batch_process_videos(input_folder: str, output_folder: str, 
                         visualize: bool = False,
                         video_extensions: List[str] = ['.mp4', '.avi', '.mov', '.MOV']):
    """
    Process all videos in a folder and extract angles.
    
    Args:
        input_folder: Folder containing input videos
        output_folder: Folder to save CSV files (and videos if visualize=True)
        visualize: If True, create annotated videos
        video_extensions: List of video file extensions to process
    """
    # Create output folder
    os.makedirs(output_folder, exist_ok=True)
    if visualize:
        os.makedirs(os.path.join(output_folder, 'videos'), exist_ok=True)
    
    # Find all video files
    video_files = []
    for ext in video_extensions:
        video_files.extend(list(Path(input_folder).glob(f'*{ext}')))
    
    if not video_files:
        print(f"No video files found in {input_folder}")
        return
    
    print(f"\n{'='*70}")
    print(f"BATCH VIDEO ANGLE EXTRACTION")
    print(f"{'='*70}")
    print(f"Input folder: {input_folder}")
    print(f"Output folder: {output_folder}")
    print(f"Found {len(video_files)} videos")
    print(f"Visualization: {'ON' if visualize else 'OFF'}")
    print(f"{'='*70}\n")
    
    # Initialize extractor
    extractor = MediaPipeAngleExtractor()
    
    # Process each video
    successful = 0
    failed = 0
    
    for idx, video_path in enumerate(video_files, 1):
        print(f"\n[{idx}/{len(video_files)}] Processing: {video_path.name}")
        print("-" * 70)
        
        try:
            # Prepare output paths
            base_name = video_path.stem
            output_csv = os.path.join(output_folder, f"{base_name}_angles.csv")
            output_video = os.path.join(output_folder, 'videos', f"{base_name}_annotated.mp4") if visualize else None
            
            # Process video
            df = extractor.process_video(
                str(video_path),
                output_csv,
                visualize=visualize,
                output_video_path=output_video
            )
            
            print(f"✓ Success! Extracted {len(df)} frames")
            successful += 1
            
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            failed += 1
    
    # Summary
    print(f"\n{'='*70}")
    print(f"BATCH PROCESSING COMPLETE")
    print(f"{'='*70}")
    print(f"Total videos: {len(video_files)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Success rate: {(successful/len(video_files)*100):.1f}%")
    print(f"{'='*70}\n")


# ===== GOOGLE COLAB SETUP =====
def setup_colab():
    """
    Installation commands for Google Colab.
    Run this first in Colab!
    """
    installation_commands = """
# Run these commands in Google Colab:

# Install MediaPipe
!pip install mediapipe

# Install OpenCV (usually pre-installed in Colab)
!pip install opencv-python

# For uploading files from local computer
from google.colab import files
uploaded = files.upload()  # This will open file selector

# Or mount Google Drive to access videos
from google.colab import drive
drive.mount('/content/drive')
"""
    print(installation_commands)


# ===== USAGE EXAMPLES =====
def example_single_video():
    """Example: Process a single video"""
    extractor = MediaPipeAngleExtractor()
    
    video_path = "my_video.mp4"
    output_csv = "angles.csv"
    output_video = "annotated_video.mp4"
    
    df = extractor.process_video(
        video_path, 
        output_csv,
        visualize=True,
        output_video_path=output_video
    )
    
    print(f"\nExtracted angles from {len(df)} frames")
    print("\nFirst few rows:")
    print(df.head())
    
    # Display statistics
    print("\nAngle statistics:")
    print(df.describe())


def example_batch_processing():
    """Example: Process all videos in a folder"""
    batch_process_videos(
        input_folder="/content/videos",  # Your video folder
        output_folder="/content/output",  # Output folder
        visualize=True  # Set to False for faster processing
    )


def example_colab_usage():
    """Example workflow for Google Colab"""
    print("""
# GOOGLE COLAB USAGE EXAMPLE
# ==========================

# 1. Install dependencies
!pip install mediapipe opencv-python

# 2. Upload your video or mount Google Drive
from google.colab import files
uploaded = files.upload()

# 3. Process single video
from colab_angle_extractor import MediaPipeAngleExtractor

extractor = MediaPipeAngleExtractor()
df = extractor.process_video(
    'my_biceps_curl.mp4',
    'angles.csv',
    visualize=True,
    output_video_path='annotated.mp4'
)

# 4. View results
import pandas as pd
print(df.head())
print(df.describe())

# 5. Download results
from google.colab import files
files.download('angles.csv')
files.download('annotated.mp4')

# 6. Or process multiple videos in batch
from colab_angle_extractor import batch_process_videos

batch_process_videos(
    input_folder='/content/videos',
    output_folder='/content/output',
    visualize=True
)
""")


if __name__ == "__main__":
    # Print setup instructions
    print("\n" + "="*70)
    print("GOOGLE COLAB VIDEO ANGLE EXTRACTOR")
    print("="*70)
    print("\nThis script extracts body angles from videos using MediaPipe.")
    print("\nUSAGE OPTIONS:")
    print("  1. Process single video: example_single_video()")
    print("  2. Batch process videos: example_batch_processing()")
    print("  3. Google Colab setup: setup_colab()")
    print("  4. Colab usage guide: example_colab_usage()")
    print("\n" + "="*70 + "\n")
    
    # Uncomment one of these to run:
    # example_single_video()
    # example_batch_processing()
    # setup_colab()
    example_colab_usage()
