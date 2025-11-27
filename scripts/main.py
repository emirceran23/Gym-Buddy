"""
GymBuddy - Main Application
Live pose detection for fitness tracking and exercise analysis
"""

import cv2
import sys
import os
from pose_detection import LivePoseDetection, PoseDetector
from biceps_curl_counter import BicepsCurlTracker


def main():
    """
    Main function to run the GymBuddy pose detection application
    """
    print("=" * 50)
    print("Welcome to GymBuddy - Pose Detection System")
    print("=" * 50)
    
    # Check if camera is available
    print("Checking camera availability...")
    
    # Try different camera indices
    camera_found = False
    camera_id = 0
    
    for i in range(3):  # Try cameras 0, 1, 2
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            camera_found = True
            camera_id = i
            cap.release()
            print(f"Camera found at index {i}")
            break
        cap.release()
    
    if not camera_found:
        print("Error: No camera found!")
        print("Please check if your camera is connected and not being used by another application.")
        input("Press Enter to exit...")
        return
    
    # Menu options
    while True:
        print("\n" + "=" * 30)
        print("GymBuddy Menu")
        print("=" * 30)
        print("1. Start Live Pose Detection")
        print("2. Biceps Curl Rep Counter")
        print("3. Analyze MP4 Video for Biceps Curls")
        print("4. Test Single Image (if you have test images)")
        print("5. About")
        print("6. Exit")

        choice = input("\nEnter your choice (1-6): ").strip()

        if choice == '1':
            start_live_detection(camera_id)
        elif choice == '2':
            start_biceps_curl_counter(camera_id)
        elif choice == '3':
            analyze_biceps_curl_video()
        elif choice == '4':
            test_single_image()
        elif choice == '5':
            show_about()
        elif choice == '6':
            print("Thank you for using GymBuddy!")
            break
        else:
            print("Invalid choice. Please try again.")
def analyze_biceps_curl_video():
    """
    Analyze an uploaded MP4 video for biceps curl reps
    """
    print("\nBiceps Curl Rep Counter - Video Analysis")
    print("Place your MP4 video in the GymBuddy folder.")
    video_files = [f for f in os.listdir('.') if f.lower().endswith('.mp4')]
    if not video_files:
        print("No MP4 video files found in the current directory.")
        input("Press Enter to continue...")
        return
    print(f"\nFound {len(video_files)} MP4 video(s):")
    for i, file in enumerate(video_files, 1):
        print(f"{i}. {file}")
    try:
        choice = int(input(f"\nSelect a video (1-{len(video_files)}): ")) - 1
        if 0 <= choice < len(video_files):
            from biceps_curl_video_analyzer import BicepsCurlVideoAnalyzer
            analyzer = BicepsCurlVideoAnalyzer(video_files[choice])
            analyzer.analyze()
        else:
            print("Invalid selection.")
    except ValueError:
        print("Invalid input. Please enter a number.")
    input("Press Enter to continue...")


def start_live_detection(camera_id=0):
    """
    Start live pose detection
    
    Args:
        camera_id: Camera device ID
    """
    print("\nStarting Live Pose Detection...")
    print("Instructions:")
    print("- Stand in front of the camera")
    print("- Make sure you're well-lit")
    print("- Press 'q' to quit")
    print("- Press 's' to save a screenshot")
    print("\nPress Enter to continue...")
    input()
    
    try:
        live_detector = LivePoseDetection(camera_id=camera_id)
        live_detector.run()
    except Exception as e:
        print(f"Error starting live detection: {e}")
        print("Please check your camera connection and try again.")
        input("Press Enter to continue...")


def start_biceps_curl_counter(camera_id=0):
    """
    Start biceps curl rep counter
    
    Args:
        camera_id: Camera device ID
    """
    print("\nStarting Biceps Curl Rep Counter...")
    print("Instructions:")
    print("- Stand facing the camera with arms visible")
    print("- Keep your upper arms stationary")
    print("- Perform slow, controlled biceps curls")
    print("- The system will count your reps automatically")
    print("\nControls:")
    print("- 'q' to quit")
    print("- 'r' to reset rep counter")
    print("- 'i' to toggle instructions")
    print("- 'a' to toggle angle display")
    print("- 's' to toggle skeleton display")
    print("- 'space' to save screenshot")
    print("\nPress Enter to continue...")
    input()
    
    try:
        tracker = BicepsCurlTracker(camera_id=camera_id)
        tracker.run()
    except Exception as e:
        print(f"Error starting biceps curl counter: {e}")
        print("Please check your camera connection and try again.")
        input("Press Enter to continue...")


def test_single_image():
    """
    Test pose detection on a single image file
    """
    print("\nSingle Image Pose Detection")
    print("Please place your test image in the GymBuddy folder")
    
    # List available image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
    image_files = []
    
    for file in os.listdir('.'):
        if any(file.lower().endswith(ext) for ext in image_extensions):
            image_files.append(file)
    
    if not image_files:
        print("No image files found in the current directory.")
        print("Supported formats: JPG, JPEG, PNG, BMP")
        input("Press Enter to continue...")
        return
    
    print(f"\nFound {len(image_files)} image file(s):")
    for i, file in enumerate(image_files, 1):
        print(f"{i}. {file}")
    
    try:
        choice = int(input(f"\nSelect an image (1-{len(image_files)}): ")) - 1
        if 0 <= choice < len(image_files):
            test_image_file(image_files[choice])
        else:
            print("Invalid selection.")
    except ValueError:
        print("Invalid input. Please enter a number.")
    
    input("Press Enter to continue...")


def test_image_file(image_path):
    """
    Test pose detection on a specific image file
    
    Args:
        image_path: Path to the image file
    """
    try:
        # Load image
        image = cv2.imread(image_path)
        
        if image is None:
            print(f"Error: Could not load image '{image_path}'")
            return
        
        print(f"Processing image: {image_path}")
        
        # Create pose detector
        pose_detector = PoseDetector()
        
        # Detect pose
        result_image, results = pose_detector.detect_pose(image, draw=True)
        
        # Calculate angles if pose is detected
        if pose_detector.is_pose_detected():
            angles = pose_detector.get_body_angles(result_image.shape)
            print("Detected pose! Body angles:")
            for angle_name, angle_value in angles.items():
                if angle_value is not None:
                    print(f"  {angle_name}: {angle_value:.1f}°")
        else:
            print("No pose detected in the image.")
        
        # Display result
        cv2.imshow(f'Pose Detection - {image_path}', result_image)
        print("Image displayed. Press any key in the image window to close.")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
        # Save result
        output_path = f"pose_result_{os.path.splitext(image_path)[0]}.jpg"
        cv2.imwrite(output_path, result_image)
        print(f"Result saved as: {output_path}")
        
        pose_detector.close()
        
    except Exception as e:
        print(f"Error processing image: {e}")


def show_about():
    """
    Show information about the application
    """
    print("\n" + "=" * 50)
    print("About GymBuddy - Pose Detection System")
    print("=" * 50)
    print()
    print("GymBuddy is a real-time pose detection system designed")
    print("for fitness tracking and exercise analysis.")
    print()
    print("Features:")
    print("• Real-time pose detection using MediaPipe")
    print("• Biceps curl repetition counter with form analysis")
    print("• Body angle calculation for exercise analysis")
    print("• Live camera feed with pose landmarks")
    print("• Screenshot functionality")
    print("• Single image processing")
    print()
    print("Technology Stack:")
    print("• MediaPipe - Google's pose detection framework")
    print("• OpenCV - Computer vision library")
    print("• NumPy - Numerical computing")
    print()
    print("Controls:")
    print("• 'q' - Quit live detection")
    print("• 'r' - Reset rep counter (biceps curl mode)")
    print("• 's' - Save screenshot during live detection")
    print("• 'i' - Toggle instructions (biceps curl mode)")
    print("• 'a' - Toggle angle display (biceps curl mode)")
    print()
    print("Body landmarks detected:")
    print("• Arms: shoulder-elbow-wrist angles")
    print("• Legs: hip-knee-ankle angles")
    print("• 33 total pose landmarks")
    print()
    print("Biceps Curl Counter Features:")
    print("• Automatic rep counting for both arms")
    print("• Form analysis with scoring (0-100)")
    print("• Real-time angle visualization")
    print("• Exercise session tracking")
    print("• State detection: up, down, transition")
    print()
    input("Press Enter to continue...")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nApplication terminated by user.")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        input("Press Enter to exit...")
