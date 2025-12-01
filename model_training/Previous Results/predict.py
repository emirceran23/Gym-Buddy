"""
Biceps Curl Form Evaluation - Prediction Script

This script loads a trained model and scores biceps curl videos based on
their CSV pose estimation data. It can process a single CSV file or an entire
folder of CSV files, outputting results to a CSV file.

Author: Senior Data Scientist & Python Developer
Date: 2025-11-30

Usage:
    python predict.py <path_to_csv_folder> [output_csv_path]
    
Example:
    python predict.py videos/true/csv
    python predict.py videos/true/csv results.csv
"""

import pandas as pd
import numpy as np
import sys
import os
import joblib
import warnings
from glob import glob
from datetime import datetime
warnings.filterwarnings('ignore')


def extract_features(csv_path):
    """
    Extract 16 comprehensive features from a single CSV file.
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
        
        # Check if we have new format (with true torso angles) or old format
        if 'left_true_torso_angle_deg' in df.columns:
            # New format - use true torso angles for stability
            left_true_torso = df['left_true_torso_angle_deg'].dropna()
            right_true_torso = df['right_true_torso_angle_deg'].dropna()
        else:
            # Old format - fall back to elbow alignment angles (will be less effective)
            left_true_torso = df['left_torso_arm_angle_deg'].dropna() if 'left_torso_arm_angle_deg' in df.columns else pd.Series([0])
            right_true_torso = df['right_torso_arm_angle_deg'].dropna() if 'right_torso_arm_angle_deg' in df.columns else pd.Series([0])
        
        # Calculate ROM for both arms
        left_rom = left_angle.max() - left_angle.min() if len(left_angle) > 0 else 0
        right_rom = right_angle.max() - right_angle.min() if len(right_angle) > 0 else 0
        
        # Determine active arm (greater ROM)
        active_arm_rom = max(left_rom, right_rom)
        active_angle = left_angle if left_rom >= right_rom else right_angle
        
        # 1. ROM - Range of Motion
        rom = active_arm_rom
        
        # 2. True Torso Stability Left (mean angle from vertical)
        true_torso_stability_left_mean = left_true_torso.mean() if len(left_true_torso) > 0 else 0
        
        # 3. True Torso Stability Left (std dev - body movement) 
        true_torso_stability_left_std = left_true_torso.std() if len(left_true_torso) > 0 else 0
        
        # 4. Tempo/Duration
        tempo = df['time_s'].max() - df['time_s'].min() if len(df) > 0 else 0
        
        # 5. Symmetry
        symmetry = abs(left_rom - right_rom)
        
        # 6. True Torso Stability Right (mean angle from vertical)
        true_torso_stability_right_mean = right_true_torso.mean() if len(right_true_torso) > 0 else 0
        
        # 7. True Torso Stability Right (std dev - body movement)
        true_torso_stability_right_std = right_true_torso.std() if len(right_true_torso) > 0 else 0
        
        # 8. Bilateral True Torso Stability (mean)
        bilateral_true_torso_mean = (true_torso_stability_left_mean + true_torso_stability_right_mean) / 2
        
        # 9. Bilateral True Torso Stability (std dev)
        bilateral_true_torso_std = (true_torso_stability_left_std + true_torso_stability_right_std) / 2
        
        # 10. Movement Smoothness (jerkiness metric)
        left_raw = df['left_angle_raw_deg'].dropna()
        left_smooth = df['left_angle_smoothed_deg'].dropna()
        right_raw = df['right_angle_raw_deg'].dropna()
        right_smooth = df['right_angle_smoothed_deg'].dropna()
        
        left_jerk = abs(left_raw - left_smooth).mean() if len(left_raw) > 0 and len(left_smooth) > 0 else 0
        right_jerk = abs(right_raw - right_smooth).mean() if len(right_raw) > 0 and len(right_smooth) > 0 else 0
        movement_smoothness = (left_jerk + right_jerk) / 2
        
        # 11. Peak Flexion Angle
        peak_flexion = active_angle.min() if len(active_angle) > 0 else 0
        
        # 12. Peak Extension Angle
        peak_extension = active_angle.max() if len(active_angle) > 0 else 0
        
        # 13. Total Reps
        total_reps = df['total_reps'].max() if 'total_reps' in df.columns else 0
        
        # 14. Correct Rep Ratio
        left_correct = df['left_correct_reps'].max() if 'left_correct_reps' in df.columns else 0
        right_correct = df['right_correct_reps'].max() if 'right_correct_reps' in df.columns else 0
        total_possible_reps = total_reps * 2 if total_reps > 0 else 1
        correct_rep_ratio = (left_correct + right_correct) / total_possible_reps if total_possible_reps > 0 else 0
        
        # 15. Angle Consistency (CV)
        angle_cv = (active_angle.std() / active_angle.mean()) if len(active_angle) > 0 and active_angle.mean() != 0 else 0
        
        # 16. Frame Count
        frame_count = len(df)
        
        # Return feature dictionary
        features = {
            'rom': rom,
            'true_torso_stability_left_mean': true_torso_stability_left_mean,
            'true_torso_stability_left_std': true_torso_stability_left_std,
            'tempo': tempo,
            'symmetry': symmetry,
            'true_torso_stability_right_mean': true_torso_stability_right_mean,
            'true_torso_stability_right_std': true_torso_stability_right_std,
            'bilateral_true_torso_mean': bilateral_true_torso_mean,
            'bilateral_true_torso_std': bilateral_true_torso_std,
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


def generate_evaluation_comment(score, features):
    """
    Generate a detailed evaluation comment explaining why the score is high or low.
    
    Args:
        score (float): Form score (0-100)
        features (dict): Extracted features
        
    Returns:
        str: Detailed evaluation comment
    """
    issues = []
    strengths = []
    
    
    # Analyze each feature
    # 1. ROM Analysis
    rom = features['rom']
    if rom < 90:
        issues.append(f"limited range of motion ({rom:.1f}°)")
    elif rom > 150:
        strengths.append(f"excellent range of motion ({rom:.1f}°)")
    else:
        strengths.append(f"good range of motion ({rom:.1f}°)")
    
    # 2. True Torso Stability Analysis (Body Position)
    torso_mean = features.get('bilateral_true_torso_mean', 0)
    torso_std = features.get('bilateral_true_torso_std', 0)
    
    # Check if body is upright (mean angle from vertical should be < 20° for biceps curls)
    if torso_mean > 40:
        issues.append(f"body not upright (torso angle: {torso_mean:.1f}° from vertical - possible wrong exercise)")
    elif torso_mean > 25:
        issues.append(f"poor posture (torso leaning {torso_mean:.1f}° from vertical)")
    elif torso_mean < 15:
        strengths.append(f"good upright posture ({torso_mean:.1f}° from vertical)")
    
    # Check body movement/stability (std dev should be low)
    if torso_std > 15:
        issues.append(f"excessive body movement (torso sway: {torso_std:.1f}°)")
    elif torso_std > 8:
        issues.append(f"moderate body swaying (torso sway: {torso_std:.1f}°)")
    elif torso_std < 5:
        strengths.append(f"stable body position (sway: {torso_std:.1f}°)")

    
    # 3. Movement Smoothness Analysis
    smoothness = features['movement_smoothness']
    if smoothness > 15:
        issues.append(f"jerky movement pattern (smoothness: {smoothness:.1f})")
    elif smoothness > 8:
        issues.append(f"slightly uncontrolled motion (smoothness: {smoothness:.1f})")
    else:
        strengths.append(f"smooth controlled movement (smoothness: {smoothness:.1f})")
    
    # 4. Symmetry Analysis
    symmetry = features['symmetry']
    if symmetry > 30:
        issues.append(f"significant arm imbalance ({symmetry:.1f}° difference)")
    elif symmetry > 15:
        issues.append(f"noticeable arm asymmetry ({symmetry:.1f}° difference)")
    elif symmetry < 10:
        strengths.append(f"balanced bilateral movement ({symmetry:.1f}° difference)")
    
    # 5. Correct Rep Ratio Analysis
    if features['total_reps'] > 0:
        correct_ratio = features['correct_rep_ratio']
        if correct_ratio < 0.4:
            issues.append(f"poor rep quality ({correct_ratio*100:.0f}% correct reps)")
        elif correct_ratio < 0.7:
            issues.append(f"inconsistent rep quality ({correct_ratio*100:.0f}% correct reps)")
        elif correct_ratio >= 0.8:
            strengths.append(f"high rep quality ({correct_ratio*100:.0f}% correct reps)")
    
    # 6. Peak Angles Analysis
    peak_flexion = features['peak_flexion']
    peak_extension = features['peak_extension']
    
    if peak_flexion > 40:
        issues.append(f"insufficient flexion (only {peak_flexion:.1f}° at peak)")
    elif peak_flexion < 20:
        strengths.append(f"excellent peak contraction ({peak_flexion:.1f}°)")
    
    if peak_extension < 160:
        issues.append(f"incomplete extension (only {peak_extension:.1f}°)")
    elif peak_extension > 170:
        strengths.append(f"full extension achieved ({peak_extension:.1f}°)")
    
    # 7. Tempo Analysis
    tempo = features['tempo']
    reps = features['total_reps'] if features['total_reps'] > 0 else 1
    time_per_rep = tempo / reps
    
    if time_per_rep < 2:
        issues.append(f"too fast tempo ({time_per_rep:.1f}s per rep)")
    elif time_per_rep > 8:
        issues.append(f"too slow tempo ({time_per_rep:.1f}s per rep)")
    
    # Build the comment
    comment_parts = []
    
    # Overall assessment
    if score >= 85:
        comment_parts.append("Excellent form demonstrated.")
    elif score >= 70:
        comment_parts.append("Good form with minor areas for improvement.")
    elif score >= 50:
        comment_parts.append("Moderate form with several issues to address.")
    else:
        comment_parts.append("Poor form requiring significant corrections.")
    
    # Add strengths
    if strengths:
        comment_parts.append(" Strengths: " + ", ".join(strengths[:3]) + ".")
    
    # Add issues
    if issues:
        comment_parts.append(" Issues: " + ", ".join(issues[:3]) + ".")
    
    # Add recommendation
    if score >= 85:
        comment_parts.append(" Continue maintaining this technique.")
    elif score >= 70:
        comment_parts.append(" Focus on addressing the minor issues to reach excellent form.")
    elif score >= 50:
        comment_parts.append(" Work on correcting the identified issues for better results.")
    else:
        comment_parts.append(" Review proper biceps curl technique and focus on controlled, stable movement.")
    
    return "".join(comment_parts)


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


def validate_biceps_curl_exercise(features):
    """
    Validate that the exercise is actually a biceps curl and not something else.
    Uses true torso stability metrics to detect non-standing exercises.
    
    Args:
        features (dict): Extracted features
        
    Returns:
        tuple: (is_valid, rejection_reason, capped_score)
            - is_valid: True if valid biceps curl, False otherwise
            - rejection_reason: Reason for rejection if invalid
            - capped_score: Maximum allowed score if invalid
    """
    # Check if we have the new torso metrics
    if 'bilateral_true_torso_mean' not in features:
        # Old format - can't validate, allow through
        return True, None, None
    
    torso_mean = features['bilateral_true_torso_mean']
    torso_std = features['bilateral_true_torso_std']
    rom = features['rom']
    peak_flexion = features['peak_flexion']
    total_reps = features['total_reps']
    
    # Rule 1: Body must be upright (torso angle from vertical < 30°)
    # Pushups/planks would have torso_mean > 50-80°
    if torso_mean > 35:
        return False, f"Body not upright ({torso_mean:.1f}° from vertical) - appears to be a different exercise (pushups/planks have 60-90°)", 8
    
    # Rule 2: Combined checks for exercise authenticity
    # Not a biceps curl if:
    # - ROM too low AND no proper flexion AND no reps detected
    if rom < 70 and peak_flexion > 50 and total_reps == 0:
        return False, f"No biceps curl pattern detected (ROM: {rom:.1f}°, no flexion, no reps)", 5
    
    # Rule 3: Excessive body movement suggests wrong exercise
    # Walking or other movements would have high torso sway
    if torso_std > 20:
        return False, f"Excessive body movement ({torso_std:.1f}° sway) - not a static biceps curl exercise", 10
    
    # Passed all checks - valid biceps curl
    return True, None, None


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
    
    # Validate that this is actually a biceps curl exercise
    is_valid, rejection_reason, capped_score = validate_biceps_curl_exercise(features)
    
    if not is_valid:
        # Invalid exercise detected - return capped score
        print(f"⚠️  Warning: {rejection_reason}")
        print(f"   Score capped at {capped_score}% (not a valid biceps curl)")
        return capped_score, features
    
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
    """Main prediction pipeline for batch processing."""
    print("\n" + "=" * 70)
    print("BICEPS CURL FORM EVALUATION - BATCH PREDICTION")
    print("=" * 70 + "\n")
    
    # Parse command line arguments
    if len(sys.argv) < 2:
        print("Usage: python predict.py <path_to_csv_folder> [output_csv_path]")
        print("\nExample:")
        print("  python predict.py videos/true/csv")
        print("  python predict.py videos/true/csv results.csv")
        print()
        return
    
    input_path = sys.argv[1]
    output_csv = sys.argv[2] if len(sys.argv) > 2 else 'prediction_results.csv'
    
    # Get script directory for model path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, 'biceps_model.pkl')
    
    # Check if model exists
    if not os.path.exists(model_path):
        print(f"❌ Error: Model file not found at {model_path}")
        print("   Please run train_model.py first to train the model.")
        return
    
    # Find all CSV files
    csv_files = []
    if os.path.isdir(input_path):
        # It's a directory - find all CSV files
        csv_files = glob(os.path.join(input_path, "*.csv"))
        if not csv_files:
            print(f"❌ Error: No CSV files found in directory: {input_path}")
            return
    elif os.path.isfile(input_path) and input_path.endswith('.csv'):
        # It's a single CSV file
        csv_files = [input_path]
    else:
        print(f"❌ Error: Invalid path: {input_path}")
        print("   Please provide a valid directory or CSV file path.")
        return
    
    print(f"📁 Found {len(csv_files)} CSV file(s) to process")
    print(f"📊 Output will be saved to: {output_csv}")
    print()
    
    # Process all CSV files
    results = []
    
    for i, csv_path in enumerate(csv_files, 1):
        filename = os.path.basename(csv_path)
        print(f"[{i}/{len(csv_files)}] Processing: {filename}...", end=" ")
        
        score, features = predict_form_score(csv_path, model_path)
        
        if score is not None and features is not None:
            # Determine grade
            if score >= 85:
                grade = "Excellent"
            elif score >= 70:
                grade = "Good"
            elif score >= 50:
                grade = "Moderate"
            else:
                grade = "Poor"
            
            # Generate evaluation comment
            evaluation_comment = generate_evaluation_comment(score, features)
            
            # Store results
            result = {
                'filename': filename,
                'form_score': round(score, 2),
                'grade': grade,
                'evaluation_comment': evaluation_comment,
                'rom_degrees': round(features['rom'], 1),
                'torso_stability': round(features['bilateral_torso_stability'], 2),
                'movement_smoothness': round(features['movement_smoothness'], 2),
                'symmetry_difference_deg': round(features['symmetry'], 1),
                'total_reps': int(features['total_reps']),
                'correct_rep_ratio_pct': round(features['correct_rep_ratio'] * 100, 1) if features['total_reps'] > 0 else 0,
                'duration_seconds': round(features['tempo'], 2),
                'peak_flexion_deg': round(features['peak_flexion'], 1),
                'peak_extension_deg': round(features['peak_extension'], 1),
                'frame_count': int(features['frame_count'])
            }
            results.append(result)
            print(f"✅ Score: {score:.1f}% ({grade})")
        else:
            print("❌ Failed")
            # Add failed entry
            results.append({
                'filename': filename,
                'form_score': None,
                'grade': 'Error',
                'evaluation_comment': 'Failed to process video - check CSV file format and data quality',
                'rom_degrees': None,
                'torso_stability': None,
                'movement_smoothness': None,
                'symmetry_difference_deg': None,
                'total_reps': None,
                'correct_rep_ratio_pct': None,
                'duration_seconds': None,
                'peak_flexion_deg': None,
                'peak_extension_deg': None,
                'frame_count': None
            })
    
    # Convert to DataFrame and save
    if results:
        df_results = pd.DataFrame(results)
        df_results.to_csv(output_csv, index=False)
        
        print()
        print("=" * 70)
        print("BATCH PROCESSING COMPLETE")
        print("=" * 70)
        print(f"✅ Processed {len(csv_files)} file(s)")
        print(f"✅ Results saved to: {output_csv}")
        print()
        
        # Show summary statistics
        successful = df_results['form_score'].notna().sum()
        failed = len(df_results) - successful
        
        print("📊 SUMMARY STATISTICS")
        print("=" * 70)
        print(f"  Total files:           {len(csv_files)}")
        print(f"  Successful:            {successful}")
        print(f"  Failed:                {failed}")
        
        if successful > 0:
            print()
            print(f"  Average Form Score:    {df_results['form_score'].mean():.1f}%")
            print(f"  Highest Score:         {df_results['form_score'].max():.1f}%")
            print(f"  Lowest Score:          {df_results['form_score'].min():.1f}%")
            print()
            
            # Grade distribution
            grade_counts = df_results['grade'].value_counts()
            print("  Grade Distribution:")
            for grade in ['Excellent', 'Good', 'Moderate', 'Poor']:
                if grade in grade_counts:
                    print(f"    {grade:12s}: {grade_counts[grade]:3d} ({grade_counts[grade]/successful*100:.1f}%)")
        
        print("=" * 70)
        print()
    else:
        print("❌ No results to save.")
        print()



if __name__ == "__main__":
    main()
