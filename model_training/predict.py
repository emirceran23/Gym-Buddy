"""
Biceps Curl Form Evaluation - Prediction Script

This script loads a trained model and scores new biceps curl videos based on
their CSV pose estimation data. It outputs a percentage form score (0-100%)
and provides actionable feedback.

Author: Senior Data Scientist & Python Developer
Date: 2025-11-30

Usage:
    python predict.py <path_to_csv_file>
    
Example:
    python predict.py videos/true/csv/output_true_1.csv
"""

import pandas as pd
import numpy as np
import sys
import os
import joblib
import warnings
warnings.filterwarnings('ignore')


def extract_features(csv_path):
    """
    Extract 14 comprehensive features from a single CSV file.
    This function must match the feature extraction in train_model.py exactly.
    
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
        
        left_jerk = abs(left_raw - left_smooth).mean() if len(left_raw) > 0 and len(left_smooth) > 0 else 0
        right_jerk = abs(right_raw - right_smooth).mean() if len(right_raw) > 0 and len(right_smooth) > 0 else 0
        movement_smoothness = (left_jerk + right_jerk) / 2
        
        # 9. Peak Flexion Angle
        peak_flexion = active_angle.min() if len(active_angle) > 0 else 0
        
        # 10. Peak Extension Angle
        peak_extension = active_angle.max() if len(active_angle) > 0 else 0
        
        # 11. Total Reps
        total_reps = df['total_reps'].max() if 'total_reps' in df.columns else 0
        
        # 12. Correct Rep Ratio
        left_correct = df['left_correct_reps'].max() if 'left_correct_reps' in df.columns else 0
        right_correct = df['right_correct_reps'].max() if 'right_correct_reps' in df.columns else 0
        total_possible_reps = total_reps * 2 if total_reps > 0 else 1
        correct_rep_ratio = (left_correct + right_correct) / total_possible_reps if total_possible_reps > 0 else 0
        
        # 13. Angle Consistency (CV)
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
        print(f"❌ Error processing CSV file: {str(e)}")
        return None


def get_feedback(score, features):
    """
    Generate actionable feedback based on form score and feature analysis.
    
    Args:
        score (float): Form score (0-100)
        features (dict): Extracted features
        
    Returns:
        str: Feedback message
    """
    feedback_lines = []
    
    # Primary score-based feedback
    if score >= 85:
        feedback_lines.append("🎯 **EXCELLENT FORM!** Keep up the great work!")
    elif score >= 70:
        feedback_lines.append("✅ **GOOD FORM!** Minor improvements possible.")
    elif score >= 50:
        feedback_lines.append("⚠️  **MODERATE FORM.** Focus on the areas below:")
    else:
        feedback_lines.append("❌ **POOR FORM.** Please address these issues:")
    
    feedback_lines.append("")  # Blank line
    feedback_lines.append("📊 **Analysis:**")
    
    # Detailed feature-based feedback
    suggestions = []
    
    # Torso stability check
    torso_stability = features['bilateral_torso_stability']
    if torso_stability > 8:
        suggestions.append("   • 🔴 Keep your torso stable - avoid swinging or leaning")
    elif torso_stability > 5:
        suggestions.append("   • 🟡 Improve torso stability - minimize body movement")
    else:
        suggestions.append("   • 🟢 Good torso stability")
    
    # Alignment check
    alignment = features['alignment_consistency']
    if alignment < 0.5:
        suggestions.append("   • 🔴 Poor alignment - ensure proper elbow positioning")
    elif alignment < 0.7:
        suggestions.append("   • 🟡 Maintain better alignment throughout the movement")
    else:
        suggestions.append("   • 🟢 Good alignment maintained")
    
    # Movement smoothness check
    smoothness = features['movement_smoothness']
    if smoothness > 10:
        suggestions.append("   • 🔴 Movement too jerky - use controlled, smooth motion")
    elif smoothness > 5:
        suggestions.append("   • 🟡 Improve movement smoothness - avoid rushing")
    else:
        suggestions.append("   • 🟢 Smooth, controlled movement")
    
    # ROM check
    rom = features['rom']
    if rom < 90:
        suggestions.append("   • 🟡 Limited range of motion - try to achieve fuller contraction and extension")
    else:
        suggestions.append("   • 🟢 Good range of motion")
    
    # Symmetry check
    symmetry = features['symmetry']
    if symmetry > 20:
        suggestions.append("   • 🔴 Significant imbalance between arms - work on symmetry")
    elif symmetry > 10:
        suggestions.append("   • 🟡 Minor arm imbalance detected")
    else:
        suggestions.append("   • 🟢 Good bilateral symmetry")
    
    # Correct rep ratio check
    if features['total_reps'] > 0:
        correct_ratio = features['correct_rep_ratio']
        if correct_ratio < 0.5:
            suggestions.append(f"   • 🔴 Only {correct_ratio*100:.0f}% of reps were correct - focus on form quality")
        elif correct_ratio < 0.8:
            suggestions.append(f"   • 🟡 {correct_ratio*100:.0f}% correct reps - room for improvement")
        else:
            suggestions.append(f"   • 🟢 {correct_ratio*100:.0f}% correct reps - excellent!")
    
    feedback_lines.extend(suggestions)
    
    # Bottom line recommendation
    feedback_lines.append("")
    if score >= 85:
        feedback_lines.append("💪 Your form is excellent! Continue with current technique.")
    elif score >= 70:
        feedback_lines.append("💪 Small adjustments will take you to the next level!")
    elif score >= 50:
        feedback_lines.append("💪 Focus on the red items above to improve your form.")
    else:
        feedback_lines.append("💪 Review proper biceps curl technique and focus on controlled movement.")
    
    return "\n".join(feedback_lines)


def predict_form_score(csv_path, model_path='biceps_model.pkl'):
    """
    Predict form score for a given CSV file.
    
    Args:
        csv_path (str): Path to CSV file
        model_path (str): Path to trained model
        
    Returns:
        tuple: (score, features) or (None, None) on error
    """
    # Check if model exists
    if not os.path.exists(model_path):
        print(f"❌ Error: Model file not found at {model_path}")
        print("   Please run train_model.py first to train the model.")
        return None, None
    
    # Check if CSV exists
    if not os.path.exists(csv_path):
        print(f"❌ Error: CSV file not found at {csv_path}")
        return None, None
    
    # Load model
    try:
        model = joblib.load(model_path)
    except Exception as e:
        print(f"❌ Error loading model: {str(e)}")
        return None, None
    
    # Extract features
    features = extract_features(csv_path)
    if features is None:
        return None, None
    
    # Convert to DataFrame (model expects DataFrame input)
    X = pd.DataFrame([features])
    
    # Get probability prediction
    try:
        proba = model.predict_proba(X)[0]
        # Probability of class 1 (correct form)
        correct_form_probability = proba[1]
        # Convert to 0-100 scale
        score = correct_form_probability * 100
        
        return score, features
    except Exception as e:
        print(f"❌ Error during prediction: {str(e)}")
        return None, None


def main():
    """Main prediction pipeline."""
    print("\n" + "=" * 70)
    print("BICEPS CURL FORM EVALUATION - PREDICTION")
    print("=" * 70 + "\n")
    
    # Parse command line arguments
    if len(sys.argv) < 2:
        print("Usage: python predict.py <path_to_csv_file>")
        print("\nExample:")
        print("  python predict.py videos/true/csv/output_true_1.csv")
        print()
        return
    
    csv_path = sys.argv[1]
    
    # Get script directory for model path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'biceps_model.pkl')
    
    # Make prediction
    print(f"📁 Analyzing: {os.path.basename(csv_path)}")
    print()
    
    score, features = predict_form_score(csv_path, model_path)
    
    if score is not None:
        # Display results
        print("=" * 70)
        print(f"FORM SCORE: {score:.1f}%")
        print("=" * 70)
        print()
        
        # Generate and display feedback
        feedback = get_feedback(score, features)
        print(feedback)
        print()
        
        # Display key metrics
        print("=" * 70)
        print("KEY METRICS")
        print("=" * 70)
        print(f"  ROM (Range of Motion):       {features['rom']:.1f}°")
        print(f"  Torso Stability:             {features['bilateral_torso_stability']:.2f}° (lower is better)")
        print(f"  Alignment Consistency:       {features['alignment_consistency']*100:.1f}%")
        print(f"  Movement Smoothness:         {features['movement_smoothness']:.2f} (lower is better)")
        print(f"  Symmetry:                    {features['symmetry']:.1f}° difference")
        print(f"  Total Reps:                  {features['total_reps']:.0f}")
        if features['total_reps'] > 0:
            print(f"  Correct Rep Ratio:           {features['correct_rep_ratio']*100:.1f}%")
        print(f"  Duration:                    {features['tempo']:.2f}s")
        print()
        print("=" * 70)
    else:
        print("❌ Prediction failed. Please check the error messages above.")
        print()


if __name__ == "__main__":
    main()
