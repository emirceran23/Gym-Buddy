"""
Prediction Script for Biceps Curl Form Evaluation
Scores a new video CSV file using the trained model and provides feedback.
"""

import sys
import os
import joblib
import numpy as np
from feature_extractor import extract_features


def load_model(model_path='biceps_model.pkl', scaler_path='scaler.pkl'):
    """
    Load trained model and scaler.
    
    Args:
        model_path: Path to saved model
        scaler_path: Path to saved scaler
        
    Returns:
        model: Loaded model
        scaler: Loaded scaler
    """
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    if not os.path.exists(scaler_path):
        raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
    
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    
    return model, scaler


def get_feedback(score: float, features: dict) -> str:
    """
    Generate personalized feedback based on form score and features.
    
    Args:
        score: Form score (0-100)
        features: Dictionary of extracted features
        
    Returns:
        Feedback string
    """
    feedback_lines = []
    
    # Overall score feedback
    if score >= 80:
        feedback_lines.append("[+] PERFECT FORM!")
        feedback_lines.append("Your biceps curl technique is excellent. Keep up the great work!")
    elif score >= 60:
        feedback_lines.append("[+] GOOD FORM - Minor Improvements Needed")
        feedback_lines.append("You're doing well, but there's room for improvement:")
    elif score >= 40:
        feedback_lines.append("[!] FAIR FORM - Focus on Key Areas")
        feedback_lines.append("Your form needs work. Pay attention to:")
    else:
        feedback_lines.append("[X] POOR FORM - Major Corrections Needed")
        feedback_lines.append("Your form has significant issues. Focus on:")
    
    # Specific feedback based on features
    if score < 80:
        feedback_lines.append("")
        
        # Torso stability
        left_torso_std = features.get('true_torso_stability_left_std', 0)
        right_torso_std = features.get('true_torso_stability_right_std', 0)
        avg_torso_std = (left_torso_std + right_torso_std) / 2
        
        if avg_torso_std > 5.0:  # High torso movement
            feedback_lines.append("  • KEEP TORSO STABLE: Minimize upper body swinging")
        
        # Tempo
        tempo = features.get('tempo', 0)
        if tempo < 2.0:  # Too fast
            feedback_lines.append("  • SLOW DOWN: Control the movement, don't rush")
        elif tempo > 6.0:  # Too slow
            feedback_lines.append("  • INCREASE TEMPO: Maintain a steady rhythm")
        
        # Symmetry
        symmetry = features.get('symmetry', 0)
        if symmetry < 0.7:  # Low symmetry
            feedback_lines.append("  • IMPROVE SYMMETRY: Both arms should move together")
        
        # ROM
        rom = features.get('rom', 0)
        if rom < 90:  # Limited range
            feedback_lines.append("  • INCREASE RANGE OF MOTION: Full extension and flexion")
        
        # Movement smoothness
        smoothness = features.get('movement_smoothness', 0)
        if smoothness < 0.05:  # Jerky movement
            feedback_lines.append("  • SMOOTH MOVEMENT: Avoid jerky or choppy motions")
        
        # Correct rep ratio
        correct_ratio = features.get('correct_rep_ratio', 0)
        if correct_ratio < 0.5:
            feedback_lines.append("  • FOCUS ON FORM: Quality over quantity")
    
    return "\n".join(feedback_lines)


def predict_form_score(csv_path: str, model_path='rf_best_model.pkl', scaler_path='scaler.pkl'):
    """
    Predict form score for a biceps curl video CSV.
    
    Args:
        csv_path: Path to CSV file
        model_path: Path to trained model
        scaler_path: Path to scaler
        
    Returns:
        form_score: Score from 0-100
        features: Extracted features
    """
    # Load model and scaler
    model, scaler = load_model(model_path, scaler_path)
    
    # Extract features
    print("Extracting features...")
    features = extract_features(csv_path)
    
    # Prepare features for prediction
    feature_order = [
        'rom',
        'true_torso_stability_left_mean',
        'true_torso_stability_left_std',
        'tempo',
        'symmetry',
        'true_torso_stability_right_mean',
        'true_torso_stability_right_std',
        'bilateral_true_torso_mean',
        'bilateral_true_torso_std',
        'movement_smoothness',
        'peak_flexion',
        'peak_extension',
        'total_reps',
        'correct_rep_ratio',
        'angle_cv',
        'frame_count'
    ]
    
    X = np.array([[features[key] for key in feature_order]])
    
    # Scale features
    X_scaled = scaler.transform(X)
    
    # Get prediction probability
    proba = model.predict_proba(X_scaled)[0]
    
    # Form score is the probability of correct form (class 1) * 100
    form_score = proba[1] * 100
    
    return form_score, features


def main():
    """Main prediction pipeline."""
    print("="*60)
    print("BICEPS CURL FORM EVALUATION - PREDICTION")
    print("="*60)
    
    # Check command line arguments
    if len(sys.argv) < 2:
        print("\nUsage: python predict.py <path_to_csv_file>")
        print("\nExample:")
        print("  python predict.py videos/true/csv/output_true_5.csv")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    
    # Check if file exists
    if not os.path.exists(csv_path):
        print(f"\nError: File not found: {csv_path}")
        sys.exit(1)
    
    print(f"\nAnalyzing: {os.path.basename(csv_path)}")
    print("-" * 60)
    
    try:
        # Predict form score
        form_score, features = predict_form_score(csv_path)
        
        # Display results
        print("\n" + "="*60)
        print("RESULTS")
        print("="*60)
        print(f"\nForm Score: {form_score:.1f}%")
        print("\n" + "-"*60)
        
        # Get and display feedback
        feedback = get_feedback(form_score, features)
        print(feedback)
        
        print("\n" + "-"*60)
        print("\nKEY METRICS:")
        print(f"  Total Reps: {features['total_reps']:.0f}")
        print(f"  Range of Motion: {features['rom']:.1f}°")
        print(f"  Tempo: {features['tempo']:.2f}s per rep")
        print(f"  Symmetry: {features['symmetry']:.2f}")
        print(f"  Torso Stability (Avg): {(features['true_torso_stability_left_std'] + features['true_torso_stability_right_std'])/2:.2f}°")
        print(f"  Correct Rep Ratio: {features['correct_rep_ratio']:.2%}")
        
        print("\n" + "="*60)
        
    except Exception as e:
        print(f"\nError during prediction: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
