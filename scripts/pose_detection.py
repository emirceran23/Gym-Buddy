import cv2
import mediapipe as mp
import numpy as np
import time


class PoseDetector:
    """
    MediaPipe Pose Detection class for real-time pose estimation
    """
    
    def __init__(self, 
                 static_image_mode=False,
                 model_complexity=2,
                 smooth_landmarks=False,  # Disable smoothing for better angle detection
                 enable_segmentation=False,
                 smooth_segmentation=False,
                 min_detection_confidence=0.5,
                 min_tracking_confidence=0.5):
        """
        Initialize the pose detector with MediaPipe
        
        Args:
            static_image_mode: Whether to treat input as static images
            model_complexity: Complexity of pose model (0, 1, or 2)
            smooth_landmarks: Whether to smooth landmarks
            enable_segmentation: Whether to predict segmentation mask
            smooth_segmentation: Whether to smooth segmentation
            min_detection_confidence: Minimum confidence for detection
            min_tracking_confidence: Minimum confidence for tracking
        """
        
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        self.pose = self.mp_pose.Pose(
            static_image_mode=static_image_mode,
            model_complexity=model_complexity,
            smooth_landmarks=smooth_landmarks,
            enable_segmentation=enable_segmentation,
            smooth_segmentation=smooth_segmentation,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        
        # Store landmark positions for analysis
        self.landmarks = None
        self.pose_landmarks = None
        
    def detect_pose(self, image, draw=True):
        """
        Detect pose landmarks in the given image
        
        Args:
            image: Input image (BGR format)
            draw: Whether to draw landmarks on the image
            
        Returns:
            image: Image with pose landmarks drawn (if draw=True)
            results: MediaPipe pose detection results
        """
        
        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        rgb_image.flags.writeable = False
        
        # Process the image
        results = self.pose.process(rgb_image)
        
        # Convert back to BGR for OpenCV
        rgb_image.flags.writeable = True
        image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)
        
        # Store results
        self.pose_landmarks = results.pose_landmarks
        
        if results.pose_landmarks:
            self.landmarks = self._extract_landmarks(results.pose_landmarks)
            
            if draw:
                # Draw pose landmarks
                self.mp_drawing.draw_landmarks(
                    image,
                    results.pose_landmarks,
                    self.mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style()
                )
        
        return image, results
    
    def _extract_landmarks(self, pose_landmarks):
        """
        Extract landmark coordinates from MediaPipe results
        
        Args:
            pose_landmarks: MediaPipe pose landmarks
            
        Returns:
            landmarks: Dictionary of landmark positions
        """
        landmarks = {}
        
        for idx, landmark in enumerate(pose_landmarks.landmark):
            landmarks[idx] = {
                'x': landmark.x,
                'y': landmark.y,
                'z': landmark.z,
                'visibility': landmark.visibility
            }
            
        return landmarks
    
    def get_landmark_position(self, landmark_id, image_shape):
        """
        Get pixel coordinates of a specific landmark
        
        Args:
            landmark_id: ID of the landmark (0-32)
            image_shape: Shape of the image (height, width, channels)
            
        Returns:
            tuple: (x, y) pixel coordinates or None if not detected
        """
        if self.landmarks and landmark_id in self.landmarks:
            landmark = self.landmarks[landmark_id]
            h, w = image_shape[:2]
            x = int(landmark['x'] * w)
            y = int(landmark['y'] * h)
            return (x, y)
        return None
    
    def calculate_angle(self, point1, point2, point3):
        """
        Calculate angle between three points
        
        Args:
            point1, point2, point3: Tuples of (x, y) coordinates
            
        Returns:
            angle: Angle in degrees
        """
        if None in [point1, point2, point3]:
            return None
            
        try:
            # Convert points to numpy arrays
            a = np.array(point1, dtype=np.float64)
            b = np.array(point2, dtype=np.float64)
            c = np.array(point3, dtype=np.float64)
            
            # Calculate vectors
            ba = a - b
            bc = c - b
            
            # Calculate magnitudes
            mag_ba = np.linalg.norm(ba)
            mag_bc = np.linalg.norm(bc)
            
            # Check for zero-length vectors
            if mag_ba < 1e-6 or mag_bc < 1e-6:
                return None
            
            # Calculate angle
            cosine_angle = np.dot(ba, bc) / (mag_ba * mag_bc)
            
            # Ensure cosine is within valid range [-1, 1]
            cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
            
            angle = np.arccos(cosine_angle)
            
            return np.degrees(angle)
        except Exception as e:
            # Return None if calculation fails
            return None
    
    def get_body_angles(self, image_shape):
        """
        Calculate common body angles for exercise analysis
        
        Args:
            image_shape: Shape of the image
            
        Returns:
            dict: Dictionary of body angles
        """
        if not self.landmarks:
            return {}
        
        angles = {}
        
        # Get landmark positions
        # Left arm angle (shoulder-elbow-wrist)
        left_shoulder = self.get_landmark_position(11, image_shape)  # LEFT_SHOULDER
        left_elbow = self.get_landmark_position(13, image_shape)     # LEFT_ELBOW
        left_wrist = self.get_landmark_position(15, image_shape)     # LEFT_WRIST
        
        if all([left_shoulder, left_elbow, left_wrist]):
            angles['left_arm'] = self.calculate_angle(left_shoulder, left_elbow, left_wrist)
        
        # Right arm angle (shoulder-elbow-wrist)
        right_shoulder = self.get_landmark_position(12, image_shape)  # RIGHT_SHOULDER
        right_elbow = self.get_landmark_position(14, image_shape)     # RIGHT_ELBOW
        right_wrist = self.get_landmark_position(16, image_shape)     # RIGHT_WRIST
        
        if all([right_shoulder, right_elbow, right_wrist]):
            angles['right_arm'] = self.calculate_angle(right_shoulder, right_elbow, right_wrist)
        
        # Left leg angle (hip-knee-ankle)
        left_hip = self.get_landmark_position(23, image_shape)      # LEFT_HIP
        left_knee = self.get_landmark_position(25, image_shape)     # LEFT_KNEE
        left_ankle = self.get_landmark_position(27, image_shape)    # LEFT_ANKLE
        
        if all([left_hip, left_knee, left_ankle]):
            angles['left_leg'] = self.calculate_angle(left_hip, left_knee, left_ankle)
        
        # Right leg angle (hip-knee-ankle)
        right_hip = self.get_landmark_position(24, image_shape)     # RIGHT_HIP
        right_knee = self.get_landmark_position(26, image_shape)    # RIGHT_KNEE
        right_ankle = self.get_landmark_position(28, image_shape)   # RIGHT_ANKLE
        
        if all([right_hip, right_knee, right_ankle]):
            angles['right_leg'] = self.calculate_angle(right_hip, right_knee, right_ankle)

        # Torso-arm angles
        if all([left_hip, left_shoulder, left_elbow]):
            angles['left_torso_arm'] = self.calculate_angle(left_hip, left_shoulder, left_elbow)

        if all([right_hip, right_shoulder, right_elbow]):
            angles['right_torso_arm'] = self.calculate_angle(right_hip, right_shoulder, right_elbow)
        
        return angles
    
    def is_pose_detected(self):
        """
        Check if pose is currently detected
        
        Returns:
            bool: True if pose is detected, False otherwise
        """
        return self.pose_landmarks is not None
    
    def close(self):
        """
        Clean up resources
        """
        self.pose.close()


class LivePoseDetection:
    """
    Live camera pose detection class
    """
    
    def __init__(self, camera_id=0):
        """
        Initialize live pose detection
        
        Args:
            camera_id: Camera device ID (usually 0 for default camera)
        """
        self.camera_id = camera_id
        self.cap = None
        self.pose_detector = PoseDetector()
        
        # Performance tracking
        self.fps_counter = 0
        self.fps_start_time = time.time()
        self.current_fps = 0
        
    def start_camera(self):
        """
        Start the camera capture
        
        Returns:
            bool: True if camera started successfully, False otherwise
        """
        self.cap = cv2.VideoCapture(self.camera_id)
        
        if not self.cap.isOpened():
            print(f"Error: Could not open camera {self.camera_id}")
            return False
        
        # Set camera properties for better performance
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        
        print(f"Camera {self.camera_id} started successfully")
        return True
    
    def run(self):
        """
        Main loop for live pose detection
        """
        if not self.start_camera():
            return
        
        print("Live Pose Detection Started!")
        print("Press 'q' to quit, 's' to save screenshot")
        
        while True:
            ret, frame = self.cap.read()
            
            if not ret:
                print("Error: Failed to read frame from camera")
                break
            
            # Flip frame horizontally for mirror effect
            frame = cv2.flip(frame, 1)
            
            # Detect pose
            frame, results = self.pose_detector.detect_pose(frame, draw=True)
            
            # Calculate and display body angles
            if self.pose_detector.is_pose_detected():
                angles = self.pose_detector.get_body_angles(frame.shape)
                self._display_angles(frame, angles)
            
            # Calculate FPS
            self._update_fps()
            
            # Display FPS
            cv2.putText(frame, f'FPS: {self.current_fps:.1f}', 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Display pose detection status
            status = "Pose Detected" if self.pose_detector.is_pose_detected() else "No Pose"
            color = (0, 255, 0) if self.pose_detector.is_pose_detected() else (0, 0, 255)
            cv2.putText(frame, status, (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            
            # Show frame
            cv2.imshow('Live Pose Detection', frame)
            
            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                self._save_screenshot(frame)
        
        self.cleanup()
    
    def _display_angles(self, frame, angles):
        """
        Display calculated angles on the frame
        
        Args:
            frame: Current video frame
            angles: Dictionary of calculated angles
        """
        y_offset = 110
        for angle_name, angle_value in angles.items():
            if angle_value is not None:
                text = f'{angle_name}: {angle_value:.1f}°'
                cv2.putText(frame, text, (10, y_offset), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                y_offset += 30
    
    def _update_fps(self):
        """
        Update FPS calculation
        """
        self.fps_counter += 1
        
        if self.fps_counter >= 30:  # Update every 30 frames
            end_time = time.time()
            self.current_fps = self.fps_counter / (end_time - self.fps_start_time)
            self.fps_counter = 0
            self.fps_start_time = end_time
    
    def _save_screenshot(self, frame):
        """
        Save current frame as screenshot
        
        Args:
            frame: Current video frame
        """
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"pose_screenshot_{timestamp}.jpg"
        cv2.imwrite(filename, frame)
        print(f"Screenshot saved as {filename}")
    
    def cleanup(self):
        """
        Clean up resources
        """
        if self.cap:
            self.cap.release()
        cv2.destroyAllWindows()
        self.pose_detector.close()
        print("Cleanup completed")


if __name__ == "__main__":
    # Create and run live pose detection
    live_detector = LivePoseDetection(camera_id=0)
    live_detector.run()
