"""
Batch Analysis of Existing CSV Files
Analyzes all CSV files from model_training/videos folders with ML model
and generates Excel reports with comprehensive metrics.
"""

import os
import glob
import pandas as pd
import numpy as np
import joblib
from feature_extractor import extract_features


def get_grade(score):
    """Convert score to letter grade."""
    if score >= 80:
        return "Perfect"
    elif score >= 60:
        return "Good"
    elif score >= 40:
        return "Fair"
    else:
        return "Poor"


def process_csv_files(csv_folder, category, model, scaler, output_excel_dir):
    """
    Process all CSV files in a folder and generate Excel report.
    
    Args:
        csv_folder: Folder containing CSV files
        category: "true" or "false"
        model: Trained ML model
        scaler: StandardScaler
        output_excel_dir: Directory to save Excel file
        
    Returns:
        DataFrame with results
    """
    print(f"\n{'='*70}")
    print(f"Processing {category.upper()} CSV files from: {csv_folder}")
    print(f"{'='*70}")
    
    # Get all CSV files
    csv_files = sorted(glob.glob(os.path.join(csv_folder, "*.csv")))
    print(f"Found {len(csv_files)} CSV files\n")
    
    results = []
    
    for idx, csv_path in enumerate(csv_files, 1):
        filename = os.path.basename(csv_path)
        print(f"[{idx}/{len(csv_files)}] Processing: {filename} ", end='')
        
        try:
            # Extract features
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
            X_scaled = scaler.transform(X)
            
            # Get prediction probability
            proba = model.predict_proba(X_scaled)[0]
            form_score = proba[1] * 100
            grade = get_grade(form_score)
            
            # Get video duration from CSV
            try:
                df = pd.read_csv(csv_path, encoding='utf-8-sig')
                duration_seconds = df['time_s'].iloc[-1] if len(df) > 0 else 0
            except:
                duration_seconds = 0
            
            # Calculate derived metrics
            avg_torso_stability = (
                features['true_torso_stability_left_std'] + 
                features['true_torso_stability_right_std']
            ) / 2
            
            # Symmetry difference in degrees (lower is better)
            symmetry_diff = abs(1.0 - abs(features['symmetry'])) * 180
            
            # Store comprehensive results
            result = {
                'filename': filename,
                'form_score': round(form_score, 2),
                'grade': grade,
                'rom_degrees': round(features['rom'], 2),
                'torso_stability': round(avg_torso_stability, 2),
                'movement_smoothness': round(features['movement_smoothness'], 4),
                'symmetry': round(features['symmetry'], 3),
                'symmetry_difference_deg': round(symmetry_diff, 2),
                'total_reps': int(features['total_reps']),
                'correct_rep_ratio_pct': round(features['correct_rep_ratio'] * 100, 2),
                'duration_seconds': round(duration_seconds, 2),
                'peak_flexion_deg': round(features['peak_flexion'], 2),
                'peak_extension_deg': round(features['peak_extension'], 2),
                'frame_count': int(features['frame_count']),
                # All training features
                'tempo': round(features['tempo'], 2),
                'true_torso_stability_left_mean': round(features['true_torso_stability_left_mean'], 2),
                'true_torso_stability_left_std': round(features['true_torso_stability_left_std'], 2),
                'true_torso_stability_right_mean': round(features['true_torso_stability_right_mean'], 2),
                'true_torso_stability_right_std': round(features['true_torso_stability_right_std'], 2),
                'bilateral_true_torso_mean': round(features['bilateral_true_torso_mean'], 2),
                'bilateral_true_torso_std': round(features['bilateral_true_torso_std'], 2),
                'angle_cv': round(features['angle_cv'], 4),
            }
            
            results.append(result)
            print(f"-> Score: {form_score:.1f}% ({grade})")
            
        except Exception as e:
            print(f"-> ERROR: {e}")
            continue
    
    # Create DataFrame
    df_results = pd.DataFrame(results)
    
    if len(df_results) > 0:
        # Save to Excel
        excel_filename = f"{category}_results.xlsx"
        excel_path = os.path.join(output_excel_dir, excel_filename)
        
        # Create Excel with formatting
        with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
            df_results.to_excel(writer, index=False, sheet_name='Results')
            
            # Get the worksheet
            worksheet = writer.sheets['Results']
            
            # Adjust column widths
            for column in worksheet.columns:
                max_length = 0
                column = [cell for cell in column]
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column[0].column_letter].width = adjusted_width
        
        print(f"\n{'='*70}")
        print(f"[+] Processed {len(results)} videos successfully")
        print(f"[+] Results saved to: {excel_path}")
        print(f"{'='*70}")
        
        # Print summary statistics
        print(f"\n[SUMMARY STATISTICS]:")
        print(f"  Average Form Score: {df_results['form_score'].mean():.2f}%")
        print(f"  Min Score: {df_results['form_score'].min():.2f}%")
        print(f"  Max Score: {df_results['form_score'].max():.2f}%")
        print(f"  Std Dev: {df_results['form_score'].std():.2f}%")
        print(f"\n  Grade Distribution:")
        grade_counts = df_results['grade'].value_counts().sort_index()
        for grade, count in grade_counts.items():
            percentage = (count / len(df_results)) * 100
            print(f"    {grade:8s}: {count:3d} ({percentage:5.1f}%)")
        
        print(f"\n  Average Metrics:")
        print(f"    ROM: {df_results['rom_degrees'].mean():.1f}°")
        print(f"    Torso Stability: {df_results['torso_stability'].mean():.2f}°")
        print(f"    Total Reps: {df_results['total_reps'].mean():.1f}")
        print(f"    Correct Rep Ratio: {df_results['correct_rep_ratio_pct'].mean():.1f}%")
    
    return df_results


def main():
    """Main batch processing pipeline."""
    print("="*70)
    print(" "*15 + "BATCH VIDEO FORM ANALYSIS")
    print("="*70)
    
    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    videos_dir = os.path.join(base_dir, "videos")
    true_csv_folder = os.path.join(videos_dir, "true", "csv")
    false_csv_folder = os.path.join(videos_dir, "false", "csv")
    
    model_path = os.path.join(base_dir, "biceps_model.pkl")
    scaler_path = os.path.join(base_dir, "scaler.pkl")
    
    current_results_dir = os.path.join(base_dir, "Current_Results")
    true_results_dir = os.path.join(current_results_dir, "true")
    false_results_dir = os.path.join(current_results_dir, "false")
    
    os.makedirs(true_results_dir, exist_ok=True)
    os.makedirs(false_results_dir, exist_ok=True)
    
    # Check if model exists
    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        print("\n[X] ERROR: Model files not found!")
        print("Please run 'python train_model.py' first.")
        return
    
    # Load model
    print("\n[+] Loading model...")
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    print("[+] Model loaded successfully")
    
    # Process TRUE videos
    if os.path.exists(true_csv_folder):
        df_true = process_csv_files(
            true_csv_folder,
            "true",
            model,
            scaler,
            true_results_dir
        )
    else:
        print(f"\n[X] Warning: True CSV folder not found: {true_csv_folder}")
        df_true = pd.DataFrame()
    
    # Process FALSE videos
    if os.path.exists(false_csv_folder):
        df_false = process_csv_files(
            false_csv_folder,
            "false",
            model,
            scaler,
            false_results_dir
        )
    else:
        print(f"\n[X] Warning: False CSV folder not found: {false_csv_folder}")
        df_false = pd.DataFrame()
    
    # Overall summary
    print("\n" + "="*70)
    print(" "*20 + "OVERALL SUMMARY")
    print("="*70)
    
    if len(df_true) > 0 and len(df_false) > 0:
        print(f"\n  TRUE samples:  {len(df_true):3d} videos | Avg Score: {df_true['form_score'].mean():.2f}%")
        print(f"  FALSE samples: {len(df_false):3d} videos | Avg Score: {df_false['form_score'].mean():.2f}%")
        print(f"  TOTAL:         {len(df_true) + len(df_false):3d} videos")
        
        print(f"\n  Score Difference: {abs(df_true['form_score'].mean() - df_false['form_score'].mean()):.2f}%")
        print(f"  (True avg - False avg)")
    
    print("\n" + "="*70)
    print(" "*15 + "BATCH PROCESSING COMPLETE!")
    print("="*70)
    print(f"\n[RESULTS LOCATION]:")
    print(f"  TRUE:  {os.path.join(true_results_dir, 'true_results.xlsx')}")
    print(f"  FALSE: {os.path.join(false_results_dir, 'false_results.xlsx')}")
    print()


if __name__ == "__main__":
    main()
