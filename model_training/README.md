# ML Pipeline for Biceps Curl Form Evaluation

## Overview

This machine learning pipeline evaluates biceps curl exercise form from pose estimation CSV files and outputs a percentage score (0-100%) indicating how correct the form is.

## Files

- **`feature_extractor.py`** - Extracts 16 biomechanical features from CSV files
- **`train_model.py`** - Trains the RandomForest model
- **`predict.py`** - Scores new videos and provides feedback
- **`biceps_model.pkl`** - Trained model (generated after training)
- **`scaler.pkl`** - Feature scaler (generated after training)

## Quick Start

### 1. Train the Model (One-time)

```bash
cd "c:\Users\Osman\Desktop\DataScience Proje\GYM-BUDDY\Gym-Buddy-main\model_training"
python train_model.py
```

**Output**: Creates `biceps_model.pkl` and `scaler.pkl`

### 2. Score a Video

```bash
python predict.py "path/to/your/video_output.csv"
```

**Example**:
```bash
python predict.py "videos/true/csv/output_true_5.csv"
```

## Features Extracted

The pipeline extracts 16 biomechanical features:

1. **ROM** - Range of motion
2. **Torso Stability** (left/right mean/std) - Upper body stability
3. **Bilateral Torso** (mean/std) - Combined torso metrics
4. **Tempo** - Time per repetition
5. **Symmetry** - Left vs right arm coordination
6. **Movement Smoothness** - Fluidity of movement
7. **Peak Flexion/Extension** - Maximum and minimum angles
8. **Total Reps** - Number of repetitions
9. **Correct Rep Ratio** - Quality percentage
10. **Angle CV** - Consistency measure
11. **Frame Count** - Video length

## Model Performance

- **Accuracy**: 71.43%
- **Dataset**: 70 samples (53 true, 17 false)
- **Top Features**: Torso stability, symmetry, movement smoothness

## Feedback Tiers

- **80-100%**: Perfect Form ✓
- **60-79%**: Good Form - Minor improvements
- **40-59%**: Fair Form - Focus on key areas
- **0-39%**: Poor Form - Major corrections needed

## Example Output

```
Form Score: 91.5%

[+] PERFECT FORM!
Your biceps curl technique is excellent. Keep up the great work!

KEY METRICS:
  Total Reps: 3
  Range of Motion: 153.6°
  Tempo: 3.34s per rep
  Symmetry: -0.65
  Torso Stability (Avg): 1.35°
  Correct Rep Ratio: 33.33%
```

## Dependencies

```bash
pip install pandas numpy scikit-learn joblib
```

## Integration

This pipeline can be integrated into the main GYM-BUDDY application:

```python
from model_training.predict import predict_form_score

# Score a video
form_score, features = predict_form_score("path/to/csv_file.csv")
print(f"Form Score: {form_score:.1f}%")
```

## Notes

- CSV files must contain pose estimation data with columns for angles, torso positions, and rep counts
- Model performs best with videos containing clear, complete biceps curl movements
- Collecting more false samples would improve model accuracy
