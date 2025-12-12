# Biceps Curl Form Predictor

A Python script to predict biceps curl form quality (good/bad form) using a trained RandomForest machine learning model and MediaPipe Pose estimation.

## Overview

This tool analyzes biceps curl exercise videos and predicts whether the form is correct or incorrect. It uses:

- **MediaPipe Pose** for extracting body landmarks from video frames
- **Trained RandomForest Model** for classifying form quality
- **Feature Engineering** including elbow ROM, torso stability, shoulder movement, and kinematic analysis

## Installation

### Prerequisites

```bash
pip install mediapipe opencv-python numpy pandas scikit-learn joblib
```

### Verify Installation

```bash
python -c "import mediapipe, cv2, numpy, pandas, sklearn, joblib; print('✅ All dependencies installed!')"
```

## Quick Start

### Command Line Usage

#### Single Video

```bash
python biceps_curl_form_predictor.py --video biceps_curl.mp4
```

#### Multiple Videos

```bash
python biceps_curl_form_predictor.py --video video1.mp4 video2.mp4 video3.mp4
```

#### With Custom Model

```bash
python biceps_curl_form_predictor.py --video biceps_curl.mp4 --model ../models/custom_model.joblib
```

#### Save Results to CSV

```bash
python biceps_curl_form_predictor.py --video biceps_curl.mp4 --output results.csv
```

#### Faster Processing (Skip More Frames)

```bash
python biceps_curl_form_predictor.py --video biceps_curl.mp4 --frame-skip 4
```

### Programmatic Usage

```python
from biceps_curl_form_predictor import BicepsCurlFormPredictor

# Initialize predictor
predictor = BicepsCurlFormPredictor()

# Analyze a video
result = predictor.predict("biceps_curl.mp4")

if result:
    print(f"Form: {result['label']}")
    print(f"Confidence: {result['confidence_good']*100:.1f}%")
    print(f"Elbow ROM: {result['features']['elbow_left_range']:.1f}°")
```

See `example_usage.py` for more detailed examples.

## Features Analyzed

The model analyzes **17 features** extracted from each video:

### 1. Elbow Angle Features (10 features)
- **Left Elbow**: min, max, mean, std, range
- **Right Elbow**: min, max, mean, std, range

ROM (Range of Motion) is calculated as `max - min` for each elbow.

### 2. Torso Stability (5 features)
- `torso_angle_min`: Minimum torso angle relative to vertical
- `torso_angle_max`: Maximum torso angle relative to vertical  
- `torso_angle_mean`: Average torso angle
- `torso_angle_std`: Torso stability (lower = more stable)
- `torso_angle_range`: Range of torso movement

### 3. Shoulder Stability (2 features)
- `shoulder_left_y_std`: Vertical movement of left shoulder (lower = more stable)
- `shoulder_right_y_std`: Vertical movement of right shoulder (lower = more stable)

**Note**: This model uses a simplified feature set compared to the full 38-feature notebook. It focuses on the most important biomechanical indicators for form classification.

## Output Format

### Prediction Result Structure

```json
{
  "prediction": 1,
  "label": "Good Form ✅",
  "confidence_good": 0.87,
  "confidence_bad": 0.13,
  "features": {
    "elbow_left_range": 135.2,
    "torso_angle_mean": 8.5,
    "shoulder_left_y_std": 0.023,
    ...
  }
}
```

### Command Line Output Example

```
🎬 Analyzing video: biceps_curl.mp4
------------------------------------------------------------

📊 PREDICTION RESULTS:
   ➤ Form Quality: Good Form ✅
   ➤ Good Form Probability: 87.3%
   ➤ Bad Form Probability: 12.7%

📈 KEY METRICS:
   ➤ Left Elbow ROM: 135.2°
   ➤ Right Elbow ROM: 132.8°
   ➤ Torso Angle (avg): 8.5°
   ➤ Shoulder Stability (std): 0.0234
   ➤ Processed Frames: 120
   ➤ Video Duration: 4.12s
```

## Command Line Arguments

| Argument | Short | Description | Default |
|----------|-------|-------------|---------|
| `--video` | `-v` | Path to video file(s) to analyze (required) | - |
| `--model` | `-m` | Path to trained model | `../models/biceps_curl_rf_model_no_duration_newest.joblib` |
| `--frame-skip` | `-f` | Process every Nth frame | 2 |
| `--output` | `-o` | Output CSV file to save results | None |

## How It Works

1. **Video Loading**: Opens the video file using OpenCV
2. **Frame Processing**: Processes every Nth frame (configurable via `frame_skip`)
3. **Pose Detection**: Uses MediaPipe Pose to detect body landmarks
4. **Feature Extraction**: Calculates angles, ranges, velocities, and stability metrics
5. **Prediction**: Feeds features into the trained RandomForest model
6. **Results**: Returns prediction with confidence scores and detailed metrics

## Performance Tips

- **frame_skip**: Higher values = faster processing but less accurate
  - `frame_skip=1`: Most accurate, slowest
  - `frame_skip=2`: Good balance (default)
  - `frame_skip=4`: Fast, decent accuracy
  - `frame_skip=8`: Very fast, may miss details

- **Video Quality**: Better lighting and clear view of the body improves accuracy
- **Camera Angle**: Side view (sagittal plane) works best for biceps curls

## Model Information

- **Model Type**: RandomForestClassifier
- **Training Features**: 38 biomechanical features
- **Classes**: 
  - `0` = Bad Form (False)
  - `1` = Good Form (True)
- **Model File**: `biceps_curl_rf_model_no_duration_newest.joblib`

### What Makes Good Form?

The model was trained to recognize:

✅ **Good Form Indicators:**
- Full range of motion (ROM > 90°)
- Stable torso (minimal swaying)
- Stable shoulders (no excessive up/down movement)
- Symmetric movement (left-right balance)
- Controlled velocity (not too jerky)

❌ **Bad Form Indicators:**
- Limited ROM (< 90°)
- Excessive torso movement (using momentum)
- Shoulder instability (bouncing weights)
- Asymmetric movement (imbalanced lifting)
- Jerky, uncontrolled movements

## Troubleshooting

### "Model not found" Error

```bash
# Solution: Specify the model path explicitly
python biceps_curl_form_predictor.py --video video.mp4 --model /full/path/to/model.joblib
```

### "Could not open video" Error

- Verify the video file exists and the path is correct
- Check the video format (supported: .mp4, .mov, .avi, .mkv, .webm, .m4v)
- Try converting the video to MP4 format

### "Insufficient frames" Warning

- Video is too short (< 10 frames)
- MediaPipe couldn't detect pose in most frames
- Try:
  - Using a longer video
  - Improving lighting
  - Ensuring the person is fully visible in the frame

### Low Confidence Predictions

- The video might have edge cases not well represented in training data
- Try recording with better lighting and camera angle
- Ensure the full body (at least upper body) is visible

## API Reference

### BicepsCurlFormPredictor

#### `__init__(model_path=None)`

Initialize the predictor.

**Parameters:**
- `model_path` (str, optional): Path to trained model. If None, uses default model.

**Example:**
```python
predictor = BicepsCurlFormPredictor()
# or with custom model
predictor = BicepsCurlFormPredictor(model_path="my_model.joblib")
```

#### `predict(video_path, frame_skip=2)`

Predict form quality for a single video.

**Parameters:**
- `video_path` (str): Path to video file
- `frame_skip` (int): Process every Nth frame

**Returns:**
- `dict`: Prediction results or None if failed

**Example:**
```python
result = predictor.predict("biceps_curl.mp4", frame_skip=2)
```

#### `predict_batch(video_paths, frame_skip=2)`

Predict form quality for multiple videos.

**Parameters:**
- `video_paths` (list): List of video file paths
- `frame_skip` (int): Process every Nth frame

**Returns:**
- `list`: List of prediction results

**Example:**
```python
results = predictor.predict_batch(["video1.mp4", "video2.mp4"], frame_skip=2)
```

#### `extract_features_from_video(video_path, frame_skip=2, max_frames=None, min_frames=10)`

Extract features from a video.

**Parameters:**
- `video_path` (str): Path to video file
- `frame_skip` (int): Process every Nth frame
- `max_frames` (int, optional): Maximum frames to process
- `min_frames` (int): Minimum frames required

**Returns:**
- `dict`: Feature dictionary or None if failed

**Example:**
```python
features = predictor.extract_features_from_video("biceps_curl.mp4")
```

## Examples

See `example_usage.py` for comprehensive examples including:

1. Single video prediction
2. Custom model usage
3. Batch processing
4. Feature analysis
5. Saving results to JSON

## Related Files

- `biceps_curl_form_predictor.py`: Main predictor script
- `example_usage.py`: Usage examples
- `../notebooks/biceps_curl_form_analysis.ipynb`: Model training notebook
- `../models/biceps_curl_rf_model_no_duration_newest.joblib`: Trained model

## License

Part of the Gym-Buddy project.

## Support

For issues or questions, please check:
1. This README
2. `example_usage.py` for code examples
3. The training notebook for understanding model training

---

**Happy Training! 🏋️**
