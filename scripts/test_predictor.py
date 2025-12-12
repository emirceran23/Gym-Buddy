"""
Quick Test Script for Biceps Curl Form Predictor
=================================================

This script runs a quick test to verify the predictor is working correctly.
"""

import sys
from pathlib import Path
from biceps_curl_form_predictor import BicepsCurlFormPredictor

def main():
    print("=" * 70)
    print("🏋️ BICEPS CURL FORM PREDICTOR - TEST SCRIPT")
    print("=" * 70)
    
    # Find a test video
    script_dir = Path(__file__).parent
    test_videos = [
        script_dir / "toprak.mp4",
        script_dir / "valid.mp4",
        script_dir / "Biceps_Curl_Exercise_Video_Generated.mp4",
    ]
    
    # Find the first video that exists
    test_video = None
    for video in test_videos:
        if video.exists():
            test_video = video
            break
    
    if not test_video:
        print("\n❌ No test video found in scripts directory.")
        print("Please place a biceps curl video in the scripts directory and update this script.")
        return 1
    
    print(f"\n📹 Using test video: {test_video.name}")
    
    try:
        # Initialize predictor
        print("\n🔧 Initializing predictor...")
        predictor = BicepsCurlFormPredictor()
        
        # Run prediction
        print(f"\n🎬 Analyzing video...")
        result = predictor.predict(str(test_video), frame_skip=2)
        
        if result:
            print("\n" + "=" * 70)
            print("✅ TEST SUCCESSFUL!")
            print("=" * 70)
            print("\nThe predictor is working correctly!")
            print(f"Video analyzed: {test_video.name}")
            print(f"Result: {result['label']}")
            print(f"Confidence: {result['confidence_good']*100:.1f}%")
            return 0
        else:
            print("\n" + "=" * 70)
            print("❌ TEST FAILED")
            print("=" * 70)
            print("\nCould not extract features from the video.")
            return 1
            
    except Exception as e:
        print("\n" + "=" * 70)
        print("❌ TEST FAILED - UNEXPECTED ERROR")
        print("=" * 70)
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
