"""
Example usage of the BicepsCurlFormPredictor
============================================

This script demonstrates how to use the BicepsCurlFormPredictor class
programmatically in your own code.
"""

from biceps_curl_form_predictor import BicepsCurlFormPredictor
from pathlib import Path


def example_single_video():
    """Example: Predict form quality for a single video."""
    print("=" * 60)
    print("EXAMPLE 1: Single Video Prediction")
    print("=" * 60)
    
    # Initialize the predictor (uses default model)
    predictor = BicepsCurlFormPredictor()
    
    # Path to your video
    video_path = "your_video.mp4"  # Replace with your video path
    
    # Make prediction
    result = predictor.predict(video_path, frame_skip=2)
    
    if result:
        print("\n✨ Prediction Complete!")
        print(f"Form: {result['label']}")
        print(f"Confidence: {result['confidence_good']*100:.1f}%")
        
        # Access specific features
        features = result['features']
        print(f"\nElbow ROM: {features['elbow_left_range']:.1f}°")


def example_custom_model():
    """Example: Use a custom model file."""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Custom Model")
    print("=" * 60)
    
    # Initialize with custom model path
    custom_model_path = "../models/my_custom_model.joblib"
    predictor = BicepsCurlFormPredictor(model_path=custom_model_path)
    
    # Make prediction
    video_path = "your_video.mp4"
    result = predictor.predict(video_path)
    
    return result


def example_batch_processing():
    """Example: Process multiple videos."""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Batch Processing")
    print("=" * 60)
    
    # Initialize predictor
    predictor = BicepsCurlFormPredictor()
    
    # List of videos to process
    video_paths = [
        "video1.mp4",
        "video2.mp4",
        "video3.mp4"
    ]
    
    # Process all videos
    results = predictor.predict_batch(video_paths, frame_skip=2)
    
    # Analyze results
    for result in results:
        print(f"\n{result['video_name']}: {result['label']}")
        print(f"  Confidence: {result['confidence_good']*100:.1f}%")
    
    return results


def example_with_feature_analysis():
    """Example: Analyze specific features from prediction."""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Feature Analysis")
    print("=" * 60)
    
    predictor = BicepsCurlFormPredictor()
    video_path = "your_video.mp4"
    
    result = predictor.predict(video_path)
    
    if result:
        features = result['features']
        
        # Check for specific form issues
        print("\n🔍 DETAILED FORM ANALYSIS:")
        
        # Check elbow range of motion
        if features['elbow_left_range'] < 90:
            print("⚠️ Warning: Limited elbow range of motion (left)")
        
        # Check for torso stability
        if features['torso_angle_std'] > 10:
            print("⚠️ Warning: Excessive torso movement")
        
        # Check shoulder stability
        if features['shoulder_left_y_std'] > 0.05:
            print("⚠️ Warning: Shoulder moving up/down too much")
        
        # Check symmetry
        if features['elbow_lr_diff_mean'] > 15:
            print("⚠️ Warning: Asymmetric movement between left and right")
        
        print("\n✅ Analysis complete!")


def example_save_to_json():
    """Example: Save prediction results to JSON."""
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Save Results to JSON")
    print("=" * 60)
    
    import json
    
    predictor = BicepsCurlFormPredictor()
    video_path = "your_video.mp4"
    
    result = predictor.predict(video_path)
    
    if result:
        # Save to JSON file
        output_file = "prediction_results.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        
        print(f"\n💾 Results saved to: {output_file}")


if __name__ == "__main__":
    print("🏋️ Biceps Curl Form Predictor - Usage Examples\n")
    
    # Uncomment the examples you want to run:
    
    # example_single_video()
    # example_custom_model()
    # example_batch_processing()
    # example_with_feature_analysis()
    # example_save_to_json()
    
    print("\n💡 To run these examples:")
    print("   1. Uncomment the example function calls above")
    print("   2. Replace 'your_video.mp4' with actual video paths")
    print("   3. Run this script: python example_usage.py")
