"""
Feature Extraction Module for Biceps Curl Form Evaluation
Extracts 16 aggregate biomechanical features from frame-by-frame pose estimation CSV files.
"""

import pandas as pd
import numpy as np
from typing import Dict


def extract_features(csv_path: str) -> Dict[str, float]:
    """
    Extract 16 biomechanical features from a biceps curl CSV file.
    
    Args:
        csv_path: Path to the CSV file containing frame-by-frame pose data
        
    Returns:
        Dictionary containing 16 features:
        - rom: Range of motion
        - true_torso_stability_left_mean: Mean left torso angle
        - true_torso_stability_left_std: Std dev of left torso angle
        - tempo: Average time per rep
        - symmetry: Left vs right movement symmetry
        - true_torso_stability_right_mean: Mean right torso angle
        - true_torso_stability_right_std: Std dev of right torso angle
        - bilateral_true_torso_mean: Mean of bilateral torso stability
        - bilateral_true_torso_std: Std dev of bilateral torso stability
        - movement_smoothness: Smoothness of angle transitions
        - peak_flexion: Maximum elbow flexion angle
        - peak_extension: Maximum elbow extension angle
        - total_reps: Total repetitions performed
        - correct_rep_ratio: Ratio of correct to total reps
        - angle_cv: Coefficient of variation in angles
        - frame_count: Total frames in video
    """
    try:
        # Load CSV file with proper encoding handling
        try:
            df = pd.read_csv(csv_path, encoding='utf-8')
        except UnicodeDecodeError:
            # Try with different encodings
            try:
                df = pd.read_csv(csv_path, encoding='utf-8-sig')
            except UnicodeDecodeError:
                df = pd.read_csv(csv_path, encoding='latin-1')
        
        # Validate required columns
        required_cols = [
            'left_angle_smoothed_deg', 'right_angle_smoothed_deg',
            'left_true_torso_angle_deg', 'right_true_torso_angle_deg',
            'time_s', 'total_reps', 'left_correct_reps', 'right_correct_reps'
        ]
        
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required column: {col}")
        
        # Extract features
        features = {}
        
        # 1. ROM (Range of Motion) - using both arms
        left_angles = df['left_angle_smoothed_deg'].dropna()
        right_angles = df['right_angle_smoothed_deg'].dropna()
        all_angles = pd.concat([left_angles, right_angles])
        
        features['rom'] = float(all_angles.max() - all_angles.min()) if len(all_angles) > 0 else 0.0
        
        # 2-3. True Torso Stability - Left (mean and std)
        left_torso = df['left_true_torso_angle_deg'].dropna()
        features['true_torso_stability_left_mean'] = float(left_torso.mean()) if len(left_torso) > 0 else 0.0
        features['true_torso_stability_left_std'] = float(left_torso.std()) if len(left_torso) > 0 else 0.0
        
        # 4. Tempo (average time per rep)
        total_reps = df['total_reps'].iloc[-1] if len(df) > 0 else 0
        total_time = df['time_s'].iloc[-1] if len(df) > 0 else 0
        features['tempo'] = float(total_time / total_reps) if total_reps > 0 else 0.0
        
        # 5. Symmetry (correlation between left and right arm movements)
        if len(left_angles) > 1 and len(right_angles) > 1:
            # Align lengths
            min_len = min(len(left_angles), len(right_angles))
            left_aligned = left_angles.iloc[:min_len].values
            right_aligned = right_angles.iloc[:min_len].values
            
            # Calculate correlation
            correlation = np.corrcoef(left_aligned, right_aligned)[0, 1]
            features['symmetry'] = float(correlation) if not np.isnan(correlation) else 0.0
        else:
            features['symmetry'] = 0.0
        
        # 6-7. True Torso Stability - Right (mean and std)
        right_torso = df['right_true_torso_angle_deg'].dropna()
        features['true_torso_stability_right_mean'] = float(right_torso.mean()) if len(right_torso) > 0 else 0.0
        features['true_torso_stability_right_std'] = float(right_torso.std()) if len(right_torso) > 0 else 0.0
        
        # 8-9. Bilateral True Torso (mean and std of both sides)
        all_torso = pd.concat([left_torso, right_torso])
        features['bilateral_true_torso_mean'] = float(all_torso.mean()) if len(all_torso) > 0 else 0.0
        features['bilateral_true_torso_std'] = float(all_torso.std()) if len(all_torso) > 0 else 0.0
        
        # 10. Movement Smoothness (inverse of average angle change)
        left_angle_changes = left_angles.diff().abs().dropna()
        right_angle_changes = right_angles.diff().abs().dropna()
        all_angle_changes = pd.concat([left_angle_changes, right_angle_changes])
        
        avg_change = all_angle_changes.mean()
        # Smoothness: lower change = higher smoothness
        features['movement_smoothness'] = float(1.0 / (avg_change + 1e-6)) if len(all_angle_changes) > 0 else 0.0
        
        # 11. Peak Flexion (minimum angle - when arm is most curled)
        features['peak_flexion'] = float(all_angles.min()) if len(all_angles) > 0 else 0.0
        
        # 12. Peak Extension (maximum angle - when arm is most extended)
        features['peak_extension'] = float(all_angles.max()) if len(all_angles) > 0 else 0.0
        
        # 13. Total Reps
        features['total_reps'] = float(total_reps)
        
        # 14. Correct Rep Ratio
        left_correct = df['left_correct_reps'].iloc[-1] if len(df) > 0 else 0
        right_correct = df['right_correct_reps'].iloc[-1] if len(df) > 0 else 0
        total_correct = left_correct + right_correct
        total_reps_both = total_reps * 2  # Each rep counted for both arms
        
        features['correct_rep_ratio'] = float(total_correct / total_reps_both) if total_reps_both > 0 else 0.0
        
        # 15. Angle CV (Coefficient of Variation)
        angle_mean = all_angles.mean()
        angle_std = all_angles.std()
        features['angle_cv'] = float(angle_std / angle_mean) if angle_mean > 0 else 0.0
        
        # 16. Frame Count
        features['frame_count'] = float(len(df))
        
        return features
        
    except Exception as e:
        print(f"Error extracting features from {csv_path}: {e}")
        # Return zero-filled features on error
        return {
            'rom': 0.0,
            'true_torso_stability_left_mean': 0.0,
            'true_torso_stability_left_std': 0.0,
            'tempo': 0.0,
            'symmetry': 0.0,
            'true_torso_stability_right_mean': 0.0,
            'true_torso_stability_right_std': 0.0,
            'bilateral_true_torso_mean': 0.0,
            'bilateral_true_torso_std': 0.0,
            'movement_smoothness': 0.0,
            'peak_flexion': 0.0,
            'peak_extension': 0.0,
            'total_reps': 0.0,
            'correct_rep_ratio': 0.0,
            'angle_cv': 0.0,
            'frame_count': 0.0
        }


if __name__ == "__main__":
    # Test the feature extraction
    import sys
    
    if len(sys.argv) > 1:
        test_csv = sys.argv[1]
    else:
        # Default test file
        test_csv = "videos/true/csv/output_true_1.csv"
    
    print(f"Testing feature extraction on: {test_csv}")
    features = extract_features(test_csv)
    
    print(f"\nExtracted {len(features)} features:")
    for key, value in features.items():
        print(f"  {key}: {value:.4f}")
