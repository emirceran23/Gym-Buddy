"""
Biceps Curl Form Evaluation - Model Training Script

This script trains a RandomForestClassifier to evaluate biceps curl exercise form
from pose estimation data. It extracts 14 features from frame-by-frame CSV files
and outputs a trained model for prediction.

Author: Senior Data Scientist & Python Developer
Date: 2025-11-30
"""

import pandas as pd
import numpy as np
import glob
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import warnings
warnings.filterwarnings('ignore')


def extract_features(csv_path):
    """
    Extract 14 comprehensive features from a single CSV file.
    
    Features:
    1. ROM (Range of Motion) - Active arm
    2. Torso Stability Left - Std dev of left torso angle
    3. Tempo/Duration - Total time
    4. Symmetry - Absolute difference between left/right ROM
    5. Torso Stability Right - Std dev of right torso angle
    6. Bilateral Torso Stability - Mean of both torso stabilities
    7. Alignment Consistency - % frames with good alignment
    8. Movement Smoothness - Jerkiness metric
    9. Peak Flexion Angle - Minimum angle (full contraction)
    10. Peak Extension Angle - Maximum angle (full extension)
    11. Total Reps - Number of repetitions
    12. Correct Rep Ratio - Proportion of correct reps
    13. Angle Consistency (CV) - Coefficient of variation
    14. Frame Count - Total frames in video
    
    Args:
        csv_path (str): Path to CSV file
        
    Returns:
        dict: Dictionary of features
    """
    try:
        # Read CSV with encoding to handle special characters
        df = pd.read_csv(csv_path, encoding='latin-1')
        
        # Handle missing values
        left_angle = df['left_angle_smoothed_deg'].dropna()
        right_angle = df['right_angle_smoothed_deg'].dropna()
        left_torso = df['left_torso_arm_angle_deg'].dropna()
        right_torso = df['right_torso_arm_angle_deg'].dropna()
        
        # Calculate ROM for both arms
        left_rom = left_angle.max() - left_angle.min() if len(left_angle) > 0 else 0
        right_rom = right_angle.max() - right_angle.min() if len(right_angle) > 0 else 0
        
        # Determine active arm (greater ROM)
        active_arm_rom = max(left_rom, right_rom)
        active_angle = left_angle if left_rom >= right_rom else right_angle
        
        # 1. ROM - Range of Motion
        rom = active_arm_rom
        
        # 2. Torso Stability Left
        torso_stability_left = left_torso.std() if len(left_torso) > 0 else 0
        
        # 3. Tempo/Duration
        tempo = df['time_s'].max() - df['time_s'].min() if len(df) > 0 else 0
        
        # 4. Symmetry
        symmetry = abs(left_rom - right_rom)
        
        # 5. Torso Stability Right
        torso_stability_right = right_torso.std() if len(right_torso) > 0 else 0
        
        # 6. Bilateral Torso Stability
        bilateral_torso_stability = (torso_stability_left + torso_stability_right) / 2
        
        # 7. Alignment Consistency
        left_aligned = df['left_aligned'].sum() / len(df) if len(df) > 0 else 0
        right_aligned = df['right_aligned'].sum() / len(df) if len(df) > 0 else 0
        alignment_consistency = (left_aligned + right_aligned) / 2
        
        # 8. Movement Smoothness (jerkiness metric)
        left_raw = df['left_angle_raw_deg'].dropna()
        left_smooth = df['left_angle_smoothed_deg'].dropna()
        right_raw = df['right_angle_raw_deg'].dropna()
        right_smooth = df['right_angle_smoothed_deg'].dropna()
        
        # Calculate smoothness for both arms
        left_jerk = abs(left_raw - left_smooth).mean() if len(left_raw) > 0 and len(left_smooth) > 0 else 0
        right_jerk = abs(right_raw - right_smooth).mean() if len(right_raw) > 0 and len(right_smooth) > 0 else 0
        movement_smoothness = (left_jerk + right_jerk) / 2
        
        # 9. Peak Flexion Angle (minimum - full contraction)
        peak_flexion = active_angle.min() if len(active_angle) > 0 else 0
        
        # 10. Peak Extension Angle (maximum - full extension)
        peak_extension = active_angle.max() if len(active_angle) > 0 else 0
        
        # 11. Total Reps
        total_reps = df['total_reps'].max() if 'total_reps' in df.columns else 0
        
        # 12. Correct Rep Ratio
        left_correct = df['left_correct_reps'].max() if 'left_correct_reps' in df.columns else 0
        right_correct = df['right_correct_reps'].max() if 'right_correct_reps' in df.columns else 0
        total_possible_reps = total_reps * 2 if total_reps > 0 else 1  # Avoid division by zero
        correct_rep_ratio = (left_correct + right_correct) / total_possible_reps if total_possible_reps > 0 else 0
        
        # 13. Angle Consistency (Coefficient of Variation)
        angle_cv = (active_angle.std() / active_angle.mean()) if len(active_angle) > 0 and active_angle.mean() != 0 else 0
        
        # 14. Frame Count
        frame_count = len(df)
        
        # Return feature dictionary
        features = {
            'rom': rom,
            'torso_stability_left': torso_stability_left,
            'tempo': tempo,
            'symmetry': symmetry,
            'torso_stability_right': torso_stability_right,
            'bilateral_torso_stability': bilateral_torso_stability,
            'alignment_consistency': alignment_consistency,
            'movement_smoothness': movement_smoothness,
            'peak_flexion': peak_flexion,
            'peak_extension': peak_extension,
            'total_reps': total_reps,
            'correct_rep_ratio': correct_rep_ratio,
            'angle_cv': angle_cv,
            'frame_count': frame_count
        }
        
        return features
        
    except Exception as e:
        print(f"Error processing {csv_path}: {str(e)}")
        return None


def load_dataset(data_dir):
    """
    Load all CSV files and extract features with labels.
    
    Args:
        data_dir (str): Base directory containing true/false CSV folders
        
    Returns:
        tuple: (X, y, filenames) - Features, labels, and file paths
    """
    # Find all CSV files
    true_files = glob.glob(os.path.join(data_dir, 'videos', 'true', 'csv', 'output_true_*.csv'))
    false_files = glob.glob(os.path.join(data_dir, 'videos', 'false', 'csv', 'output_false_*.csv'))
    
    print(f"Found {len(true_files)} positive samples (correct form)")
    print(f"Found {len(false_files)} negative samples (incorrect form)")
    print(f"Total dataset size: {len(true_files) + len(false_files)} samples\n")
    
    # Extract features
    features_list = []
    labels = []
    filenames = []
    
    # Process positive samples (label = 1)
    print("Processing positive samples...")
    for file_path in true_files:
        features = extract_features(file_path)
        if features is not None:
            features_list.append(features)
            labels.append(1)
            filenames.append(file_path)
    
    # Process negative samples (label = 0)
    print("Processing negative samples...")
    for file_path in false_files:
        features = extract_features(file_path)
        if features is not None:
            features_list.append(features)
            labels.append(0)
            filenames.append(file_path)
    
    # Convert to DataFrame
    X = pd.DataFrame(features_list)
    y = np.array(labels)
    
    print(f"\nSuccessfully processed {len(X)} samples")
    print(f"Feature matrix shape: {X.shape}")
    print(f"\nFeature summary statistics:")
    print(X.describe())
    
    return X, y, filenames


def train_model(X, y):
    """
    Train RandomForestClassifier with 80/20 train-test split.
    
    Args:
        X (DataFrame): Feature matrix
        y (array): Labels
        
    Returns:
        tuple: (model, X_train, X_test, y_train, y_test)
    """
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\nTrain set size: {len(X_train)} samples")
    print(f"Test set size: {len(X_test)} samples")
    print(f"Train set distribution: {np.bincount(y_train)}")
    print(f"Test set distribution: {np.bincount(y_test)}\n")
    
    # Train RandomForest
    print("Training RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight='balanced'  # Handle class imbalance
    )
    
    model.fit(X_train, y_train)
    print("Training complete!\n")
    
    return model, X_train, X_test, y_train, y_test


def evaluate_model(model, X_train, X_test, y_train, y_test, feature_names):
    """
    Evaluate model performance and display metrics.
    
    Args:
        model: Trained model
        X_train, X_test: Feature matrices
        y_train, y_test: Labels
        feature_names: List of feature names
    """
    # Predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    # Accuracy scores
    train_accuracy = accuracy_score(y_train, y_train_pred)
    test_accuracy = accuracy_score(y_test, y_test_pred)
    
    print("=" * 70)
    print("MODEL EVALUATION RESULTS")
    print("=" * 70)
    print(f"\nTrain Accuracy: {train_accuracy:.4f} ({train_accuracy*100:.2f}%)")
    print(f"Test Accuracy:  {test_accuracy:.4f} ({test_accuracy*100:.2f}%)")
    
    # Classification report
    print("\n" + "-" * 70)
    print("CLASSIFICATION REPORT (Test Set)")
    print("-" * 70)
    print(classification_report(y_test, y_test_pred, 
                                target_names=['Incorrect Form (0)', 'Correct Form (1)']))
    
    # Confusion matrix
    print("-" * 70)
    print("CONFUSION MATRIX (Test Set)")
    print("-" * 70)
    cm = confusion_matrix(y_test, y_test_pred)
    print(f"\n{cm}")
    print("\n[[TN  FP]")
    print(" [FN  TP]]\n")
    
    # Feature importance
    print("-" * 70)
    print("FEATURE IMPORTANCE (Top 10)")
    print("-" * 70)
    importances = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(importances.head(10).to_string(index=False))
    print("\n" + "=" * 70)


def main():
    """Main training pipeline."""
    print("\n" + "=" * 70)
    print("BICEPS CURL FORM EVALUATION - MODEL TRAINING")
    print("=" * 70 + "\n")
    
    # Set data directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Load dataset
    X, y, filenames = load_dataset(script_dir)
    
    # Train model
    model, X_train, X_test, y_train, y_test = train_model(X, y)
    
    # Evaluate model
    evaluate_model(model, X_train, X_test, y_train, y_test, X.columns.tolist())
    
    # Save model
    model_path = os.path.join(script_dir, 'biceps_model.pkl')
    joblib.dump(model, model_path)
    print(f"\n✅ Model saved successfully to: {model_path}")
    print(f"   Model file size: {os.path.getsize(model_path) / 1024:.2f} KB\n")
    
    print("=" * 70)
    print("TRAINING COMPLETE!")
    print("=" * 70)
    print("\nNext steps:")
    print("1. Review the accuracy and classification report above")
    print("2. Use predict.py to score new biceps curl videos")
    print("3. Example: python predict.py videos/true/csv/output_true_1.csv\n")


if __name__ == "__main__":
    main()
