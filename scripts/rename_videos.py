"""
Step 1: Rename all videos in normal_video folder to standardized names.
- Doğru videos: true_1.mp4, true_2.mp4, etc.
- Yanlış videos: false_1.mp4, false_2.mp4, etc.
"""
import os
from pathlib import Path

def rename_videos_in_folder(folder_path, prefix):
    """
    Rename all video files in a folder with a standardized naming scheme.
    
    Args:
        folder_path: Path to folder containing videos
        prefix: Prefix for renamed files (e.g., 'true' or 'false')
    """
    # Get all video files
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.MOV']
    video_files = []
    
    for ext in video_extensions:
        video_files.extend(list(Path(folder_path).glob(f'*{ext}')))
    
    # Sort files for consistent ordering
    video_files.sort()
    
    print(f"\n{'='*70}")
    print(f"Renaming videos in: {folder_path}")
    print(f"Prefix: {prefix}")
    print(f"Total videos: {len(video_files)}")
    print(f"{'='*70}\n")
    
    renamed_count = 0
    
    for idx, old_path in enumerate(video_files, 1):
        # Get the file extension
        ext = old_path.suffix
        
        # Create new filename
        new_name = f"{prefix}_{idx}{ext}"
        new_path = old_path.parent / new_name
        
        # Skip if already named correctly
        if old_path.name == new_name:
            print(f"[{idx}/{len(video_files)}] Already named: {new_name}")
            renamed_count += 1
            continue
        
        # Check if target name already exists
        if new_path.exists():
            print(f"[{idx}/{len(video_files)}] ⚠ Target exists, skipping: {old_path.name} → {new_name}")
            continue
        
        # Rename the file
        try:
            old_path.rename(new_path)
            print(f"[{idx}/{len(video_files)}] ✓ Renamed: {old_path.name} → {new_name}")
            renamed_count += 1
        except Exception as e:
            print(f"[{idx}/{len(video_files)}] ✗ Error renaming {old_path.name}: {str(e)}")
    
    print(f"\n{'='*70}")
    print(f"Renaming complete: {renamed_count}/{len(video_files)} files")
    print(f"{'='*70}\n")
    
    return renamed_count, len(video_files)

def main():
    # Get the base directory
    base_dir = Path(__file__).parent.parent
    
    # Define paths
    dogru_folder = base_dir / "normal_video" / "Doğru"
    yanlis_folder = base_dir / "normal_video" / "Yanlış"
    
    print("\n" + "="*70)
    print("VIDEO RENAMING SCRIPT")
    print("="*70)
    print(f"Base directory: {base_dir}")
    print(f"Doğru folder: {dogru_folder}")
    print(f"Yanlış folder: {yanlis_folder}")
    print("="*70)
    
    # Rename Doğru videos to true_1, true_2, etc.
    print("\n\nSTEP 1: Renaming CORRECT FORM videos (Doğru → true_*)")
    true_renamed, true_total = rename_videos_in_folder(str(dogru_folder), "true")
    
    # Rename Yanlış videos to false_1, false_2, etc.
    print("\n\nSTEP 2: Renaming INCORRECT FORM videos (Yanlış → false_*)")
    false_renamed, false_total = rename_videos_in_folder(str(yanlis_folder), "false")
    
    # Final summary
    total_renamed = true_renamed + false_renamed
    total_videos = true_total + false_total
    
    print("\n" + "="*70)
    print("FINAL SUMMARY")
    print("="*70)
    print(f"Total videos processed: {total_videos}")
    print(f"  Correct form (true_*): {true_renamed}/{true_total}")
    print(f"  Incorrect form (false_*): {false_renamed}/{false_total}")
    print(f"\nTotal renamed: {total_renamed}/{total_videos}")
    print("="*70)

if __name__ == "__main__":
    main()
