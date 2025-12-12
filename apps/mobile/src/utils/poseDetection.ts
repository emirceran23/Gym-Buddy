import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

/**
 * Pose Detection utility using TensorFlow.js MoveNet model
 */
export class PoseDetector {
  private detector: poseDetection.PoseDetector | null = null;
  private isInitialized = false;

  /**
   * Initialize the pose detector
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Wait for TensorFlow.js to be ready
      await tf.ready();

      // Create MoveNet detector (lightweight and fast)
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      };

      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      this.isInitialized = true;
      console.log('✅ Pose detector initialized');
    } catch (error) {
      console.error('❌ Failed to initialize pose detector:', error);
      throw error;
    }
  }

  /**
   * Detect poses in an image
   */
  async detectPose(imageTensor: tf.Tensor3D): Promise<poseDetection.Pose[]> {
    if (!this.detector) {
      throw new Error('Pose detector not initialized');
    }

    try {
      const poses = await this.detector.estimatePoses(imageTensor);
      return poses;
    } catch (error) {
      console.error('Error detecting pose:', error);
      return [];
    }
  }

  /**
   * Calculate angle between three points
   */
  calculateAngle(
    point1: { x: number; y: number },
    point2: { x: number; y: number },
    point3: { x: number; y: number }
  ): number {
    const radians =
      Math.atan2(point3.y - point2.y, point3.x - point2.x) -
      Math.atan2(point1.y - point2.y, point1.x - point2.x);

    let angle = Math.abs((radians * 180.0) / Math.PI);

    if (angle > 180.0) {
      angle = 360.0 - angle;
    }

    return angle;
  }

  /**
   * Get elbow angle for a specific arm
   */
  getArmAngle(
    keypoints: poseDetection.Keypoint[],
    side: 'left' | 'right'
  ): number | null {
    // MoveNet keypoint indices
    const indices = side === 'left'
      ? { shoulder: 5, elbow: 7, wrist: 9 }   // Left side
      : { shoulder: 6, elbow: 8, wrist: 10 }; // Right side

    const shoulder = keypoints[indices.shoulder];
    const elbow = keypoints[indices.elbow];
    const wrist = keypoints[indices.wrist];

    // Check confidence scores
    const minConfidence = 0.3;
    if (
      (shoulder?.score ?? 0) < minConfidence ||
      (elbow?.score ?? 0) < minConfidence ||
      (wrist?.score ?? 0) < minConfidence
    ) {
      return null;
    }

    return this.calculateAngle(shoulder, elbow, wrist);
  }

  /**
   * Get torso angle (elbow-shoulder-hip) for form checking
   */
  getTorsoAngle(
    keypoints: poseDetection.Keypoint[],
    side: 'left' | 'right'
  ): number | null {
    const indices = side === 'left'
      ? { elbow: 7, shoulder: 5, hip: 11 }
      : { elbow: 8, shoulder: 6, hip: 12 };

    const elbow = keypoints[indices.elbow];
    const shoulder = keypoints[indices.shoulder];
    const hip = keypoints[indices.hip];

    const minConfidence = 0.3;
    if (
      (elbow?.score ?? 0) < minConfidence ||
      (shoulder?.score ?? 0) < minConfidence ||
      (hip?.score ?? 0) < minConfidence
    ) {
      return null;
    }

    return this.calculateAngle(elbow, shoulder, hip);
  }

  /**
   * Check if arm is aligned (parallel to torso)
   */
  checkArmAlignment(
    keypoints: poseDetection.Keypoint[],
    side: 'left' | 'right'
  ): boolean {
    const indices = side === 'left'
      ? { shoulder: 5, elbow: 7, hip: 11 }
      : { shoulder: 6, elbow: 8, hip: 12 };

    const shoulder = keypoints[indices.shoulder];
    const elbow = keypoints[indices.elbow];
    const hip = keypoints[indices.hip];

    const minConfidence = 0.3;
    if (
      (shoulder?.score ?? 0) < minConfidence ||
      (elbow?.score ?? 0) < minConfidence ||
      (hip?.score ?? 0) < minConfidence
    ) {
      return true; // Assume aligned if we can't detect
    }

    // Check horizontal deviation
    const elbowXOffset = Math.abs(elbow.x - shoulder.x);
    const torsoHeight = Math.abs(hip.y - shoulder.y);

    if (torsoHeight === 0) return true;

    const maxDeviation = torsoHeight * 0.15;
    return elbowXOffset < maxDeviation;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
      this.isInitialized = false;
      console.log('🧹 Pose detector disposed');
    }
  }
}

export default PoseDetector;
