# True Torso Angle Implementation

## Summary

We've implemented a comprehensive solution to detect and reject non-biceps curl exercises (like pushups, walking, etc.) by adding true torso stability metrics.

## Changes Made

### 1. **BicepsCurlVideoAnalyzer** (`scripts/biceps_curl_video_analyzer.py`)

#### New Methods:
- `_get_true_torso_angle(image_shape, side)`: Calculates hip-shoulder-vertical angle
  - Measures how upright the body is
  - Returns angle from vertical (0° = perfectly vertical)
  - **Biceps curls**: 5-20° (standing upright)
  - **Pushups/Planks**: 60-90° (body horizontal)

#### Renamed Method:
- `_get_torso_angle()` → `_get_elbow_alignment_angle()`
  - Still measures elbow-shoulder-hip angle
  - Used for form evaluation (elbow position relative to torso)

#### New CSV Columns:
- `left_true_torso_angle_deg`: Left side true torso angle
- `right_true_torso_angle_deg`: Right side true torso angle  
- `left_elbow_alignment_angle_deg`: Left elbow alignment (renamed from left_torso_arm_angle_deg)
- `right_elbow_alignment_angle_deg`: Right elbow alignment (renamed from right_torso_arm_angle_deg)

### 2. **Training Script** (`model_training/train_model.py`)

#### New Features (16 total, up from 13):
1. ROM (Range of Motion)
2. **True Torso Stability Left Mean** - Mean angle from vertical
3. **True Torso Stability Left Std** - Body movement variation
4. Tempo/Duration
5. Symmetry
6. **True Torso Stability Right Mean** - Mean angle from vertical
7. **True Torso Stability Right Std** - Body movement variation
8. **Bilateral True Torso Mean** - Average body angle from vertical
9. **Bilateral True Torso Std** - Average body movement
10. Movement Smoothness
11. Peak Flexion Angle
12. Peak Extension Angle
13. Total Reps
14. Correct Rep Ratio
15. Angle Consistency (CV)
16. Frame Count

#### Backward Compatibility:
- Automatically detects old CSV format
- Falls back to elbow alignment angles if true torso angles not available

### 3. **Prediction Script** (`model_training/predict.py`)

#### New Function: `validate_biceps_curl_exercise(features)`
Validates that the exercise is actually a biceps curl using these rules:

**Rule 1: Body Upright Check**
- `torso_mean > 35°` → **Rejected** (score capped at 8%)
- Detects pushups/planks (60-90° angles)

**Rule 2: Exercise Pattern Check**
- `ROM < 70° AND peak_flexion > 50° AND total_reps == 0` → **Rejected** (score capped at 5%)
- Detects random arm movements with no actual curls

**Rule 3: Body Movement Check**
- `torso_std > 20°` → **Rejected** (score capped at 10%)
- Detects excessive body movement (walking, dynamic exercises)

#### Updated Evaluation Comments:
- Now explains body position and stability
- Flags exercises that aren't biceps curls
- Provides specific torso angle feedback

## Expected Results

### Proper Biceps Curl:
- **True Torso Mean**: 5-20° (upright)
- **True Torso Std**: < 10° (stable)
- **Score**: Based on model (can be 0-100%)

### Pushup Video:
- **True Torso Mean**: 60-80° (horizontal body)
- **Validation**: **REJECTED** 
- **Score**: Capped at **8%**
- **Reason**: "Body not upright - appears to be a different exercise"

### Walking Video:
- **True Torso Mean**: 5-15° (upright but moving)
- **True Torso Std**: > 20° (high movement)
- **Validation**: **REJECTED**
- **Score**: Capped at **10%**  
- **Reason**: "Excessive body movement - not a static biceps curl exercise"

### Random Arm Swings:
- **ROM**: < 70° (limited movement)
- **Peak Flexion**: > 50° (no contraction)
- **Total Reps**: 0
- **Validation**: **REJECTED**
- **Score**: Capped at **5%**
- **Reason**: "No biceps curl pattern detected"

## Next Steps

1. **Generate New Videos**: Run `biceps_curl_video_analyzer.py` on test videos to generate CSVs with true torso angles
2. **Retrain Model**: Run `python train_model.py` with new CSV data
3. **Test Validation**: Test with pushups, walking, and other exercises
4. **Fine-tune Thresholds**: Adjust validation thresholds based on real-world testing

## Testing

```bash
# Test with new CSVs (will use true torso angles)
python predict.py path/to/new_csv_folder output.csv

# Test with old CSVs (will fall back gracefully)
python predict.py path/to/old_csv_folder output_old.csv

# The validation will automatically activate with new CSVs
```

## Key Metrics for Exercise Classification

| Exercise Type | Torso Mean | Torso Std | Expected Score |
|--------------|------------|-----------|----------------|
| Biceps Curl  | 5-20°      | < 10°     | 0-100% (model) |
| Pushup       | 60-90°     | 5-15°     | ≤ 8% (capped)  |
| Walking      | 5-15°      | > 20°     | ≤ 10% (capped) |
| Arm Swings   | 5-15°      | 5-15°     | ≤ 5% (capped)  |
