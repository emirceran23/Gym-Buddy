"""
Step 2: Batch process all renamed videos to generate CSV files with custom naming.
Processes true_*.mp4 → output_true_*.csv and false_*.mp4 → output_false_*.csv
"""
import os
import sys
import re
from pathlib import Path
from biceps_curl_video_analyzer import BicepsCurlVideoAnalyzer

def extract_number_from_filename(filename):
    """Extract the number from filenames like 'true_1.mp4' or 'false_5.mp4'"""
    match = re.search(r'_(\d+)', filename)
    return int(match.group(1)) if match else 0

def process_videos_in_folder(input_folder, output_csv_folder, prefix, category_name):
    """
    Process all video files in a folder with custom CSV naming.
    
    Args:
        input_folder: Path to folder containing videos
        output_csv_folder: Path to folder where CSV files will be saved
        prefix: Prefix for videos ('true' or 'false')
        category_name: Name of category (for logging)
    """
    # Create output folder if it doesn't exist
    os.makedirs(output_csv_folder, exist_ok=True)
    
    # Get all video files matching the prefix
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.MOV']
    video_files = []
    
    for ext in video_extensions:
        pattern = f'{prefix}_*{ext}'
        video_files.extend(list(Path(input_folder).glob(pattern)))
    
    # Sort files by number
    video_files.sort(key=lambda x: extract_number_from_filename(x.stem))
    
    total_videos = len(video_files)
    print(f"\n{'='*70}")
    print(f"Processing {category_name} videos")
    print(f"{'='*70}")
    print(f"Found {total_videos} videos in {input_folder}")
    print(f"Output CSV folder: {output_csv_folder}")
    print(f"{'='*70}\n")
    
    successful = 0
    failed = 0
    
    for idx, video_path in enumerate(video_files, 1):
        # Extract the number from filename (e.g., 'true_5.mp4' → 5)
        video_number = extract_number_from_filename(video_path.stem)
        
        print(f"\n[{idx}/{total_videos}] Processing: {video_path.name}")
        print("-" * 70)
        
        try:
            # Create a temporary directory for this video's output
            temp_output_dir = Path(output_csv_folder) / f"temp_{prefix}_{video_number}"
            temp_output_dir.mkdir(exist_ok=True)
            
            # Create analyzer with temporary output directory
            analyzer = BicepsCurlVideoAnalyzer(
                video_path=str(video_path),
                visualize=False,  # Don't create annotated videos, only CSV
                output_dir=str(temp_output_dir)
            )
            
            # Analyze the video
            analyzer.analyze()
            
            # The analyzer creates a file like "true_5__timeline.csv"
            # We need to rename it to "output_true_5.csv"
            temp_csv = temp_output_dir / f"{video_path.stem}__timeline.csv"
            final_csv_name = f"output_{prefix}_{video_number}.csv"
            final_csv_path = Path(output_csv_folder) / final_csv_name
            
            # Move the CSV to the final location with the correct name
            if temp_csv.exists():
                temp_csv.rename(final_csv_path)
                # Remove temporary directory
                temp_output_dir.rmdir()
                print(f"✓ Successfully created: {final_csv_name}")
                successful += 1
            else:
                print(f"✗ Failed to create CSV for: {video_path.name}")
                failed += 1
                
        except Exception as e:
            print(f"✗ Error processing {video_path.name}: {str(e)}")
            failed += 1
            # Try to clean up temp directory if it exists
            try:
                if temp_output_dir.exists():
                    for file in temp_output_dir.iterdir():
                        file.unlink()
                    temp_output_dir.rmdir()
            except:
                pass
    
    print(f"\n{'='*70}")
    print(f"{category_name} Processing Complete")
    print(f"{'='*70}")
    print(f"Total: {total_videos} videos")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"{'='*70}\n")
    
    return successful, failed

def main():
    # Get the base directory (parent of scripts folder)
    base_dir = Path(__file__).parent.parent
    
    # Define input and output paths
    dogru_input = base_dir / "normal_video" / "Doğru"
    yanlis_input = base_dir / "normal_video" / "Yanlış"
    
    true_csv_output = base_dir / "model_training" / "videos" / "true" / "csv"
    false_csv_output = base_dir / "model_training" / "videos" / "false" / "csv"
    
    print("\n" + "="*70)
    print("BATCH VIDEO PROCESSING WITH CUSTOM CSV NAMING")
    print("="*70)
    print(f"Base directory: {base_dir}")
    print(f"\nInput folders:")
    print(f"  True (Doğru): {dogru_input}")
    print(f"  False (Yanlış): {yanlis_input}")
    print(f"\nOutput folders:")
    print(f"  True CSV: {true_csv_output}")
    print(f"  False CSV: {false_csv_output}")
    print(f"\nNaming scheme:")
    print(f"  Videos: true_1.mp4, true_2.mp4, ... / false_1.mp4, false_2.mp4, ...")
    print(f"  CSVs: output_true_1.csv, output_true_2.csv, ... / output_false_1.csv, output_false_2.csv, ...")
    print("="*70)
    
    # Process true videos (correct form)
    print("\n\nSTEP 1: Processing CORRECT FORM videos (true_*)")
    true_success, true_failed = process_videos_in_folder(
        input_folder=str(dogru_input),
        output_csv_folder=str(true_csv_output),
        prefix="true",
        category_name="CORRECT FORM (true_*)"
    )
    
    # Process false videos (incorrect form)
    print("\n\nSTEP 2: Processing INCORRECT FORM videos (false_*)")
    false_success, false_failed = process_videos_in_folder(
        input_folder=str(yanlis_input),
        output_csv_folder=str(false_csv_output),
        prefix="false",
        category_name="INCORRECT FORM (false_*)"
    )
    
    # Final summary
    total_success = true_success + false_success
    total_failed = true_failed + false_failed
    total_videos = total_success + total_failed
    
    print("\n" + "="*70)
    print("FINAL SUMMARY")
    print("="*70)
    print(f"Total videos processed: {total_videos}")
    print(f"  Correct form (true_*): {true_success} successful, {true_failed} failed")
    print(f"  Incorrect form (false_*): {false_success} successful, {false_failed} failed")
    print(f"\nOverall: {total_success} successful, {total_failed} failed")
    print(f"Success rate: {(total_success/total_videos*100):.1f}%" if total_videos > 0 else "N/A")
    print("="*70)
    
    return 0 if total_failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
