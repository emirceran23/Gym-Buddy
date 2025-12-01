# Biceps Curl Form Evaluation - ML Model

A machine learning model that evaluates biceps curl exercise form from pose estimation data and provides a percentage score (0-100%) with actionable feedback.

## 📊 Model Overview

- **Algorithm**: RandomForestClassifier
- **Features**: 14 comprehensive metrics extracted from pose data
- **Output**: Probability-based form score (0-100%) + detailed feedback
- **Dataset**: 78 samples (59 correct form, 19 incorrect form)

## 🎯 Features Extracted

The model analyzes 14 key aspects of form:

### Core Biomechanics
1. **ROM (Range of Motion)**: Angular range of the active arm
2. **Peak Flexion Angle**: Minimum angle achieved (full contraction)
3. **Peak Extension Angle**: Maximum angle achieved (full extension)

### Stability & Control
4. **Torso Stability (Left)**: Standard deviation of left torso angle
5. **Torso Stability (Right)**: Standard deviation of right torso angle
6. **Bilateral Torso Stability**: Average torso stability
7. **Movement Smoothness**: Jerkiness metric (raw vs smoothed angles)

### Symmetry & Alignment
8. **Symmetry**: Difference between left and right arm ROM
9. **Alignment Consistency**: Percentage of frames with proper alignment

### Tempo & Quality
10. **Tempo/Duration**: Total exercise time
11. **Total Reps**: Number of repetitions performed
12. **Correct Rep Ratio**: Proportion of repetitions with correct form
13. **Angle Consistency (CV)**: Coefficient of variation (detects erratic movement)
14. **Frame Count**: Total frames in video

## 🚀 Quick Start

### 1. Train the Model

```powershell
cd "c:\Users\Osman\Desktop\DataScience Proje\GYM-BUDDY\Gym-Buddy-main\model_training"
python train_model.py
```

**Expected Output:**
- Dataset summary with feature statistics
- Train/test split information
- Model evaluation metrics (accuracy, precision, recall)
- Feature importance rankings
- Saved model file: `biceps_model.pkl`

### 2. Evaluate New Videos

```powershell
# Test with correct form sample
python predict.py "videos\true\csv\output_true_1.csv"

# Test with incorrect form sample
python predict.py "videos\false\csv\output_false_1.csv"
```

**Example Output:**
```
==================================================================
FORM SCORE: 87.3%
==================================================================

🎯 **EXCELLENT FORM!** Keep up the great work!

📊 **Analysis:**
   • 🟢 Good torso stability
   • 🟢 Good alignment maintained
   • 🟢 Smooth, controlled movement
   • 🟢 Good range of motion
   • 🟢 Good bilateral symmetry
   • 🟢 92% correct reps - excellent!

💪 Your form is excellent! Continue with current technique.

==================================================================
KEY METRICS
==================================================================
  ROM (Range of Motion):       128.5°
  Torso Stability:             3.42° (lower is better)
  Alignment Consistency:       89.2%
  Movement Smoothness:         2.15 (lower is better)
  Symmetry:                    8.3° difference
  Total Reps:                  5
  Correct Rep Ratio:           92.0%
  Duration:                    12.45s
==================================================================
```

## 📁 File Structure

```
model_training/
├── train_model.py          # Training script
├── predict.py              # Prediction script
├── biceps_model.pkl        # Trained model (generated)
├── README_ML.md           # This file
└── videos/
    ├── true/csv/          # Correct form samples
    └── false/csv/         # Incorrect form samples
```

## 🔍 Understanding the Feedback

### Score Ranges
- **85-100%**: 🎯 Excellent Form
- **70-84%**: ✅ Good Form (minor improvements possible)
- **50-69%**: ⚠️ Moderate Form (focus areas identified)
- **0-49%**: ❌ Poor Form (major corrections needed)

### Feedback Indicators
- 🟢 **Green**: Aspect is performing well
- 🟡 **Yellow**: Room for improvement
- 🔴 **Red**: Needs immediate attention

## 🛠️ Technical Details

### Model Configuration
```python
RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    class_weight='balanced',
    random_state=42
)
```

### Data Split
- **Training**: 80% of samples
- **Testing**: 20% of samples
- **Stratified split**: Maintains class distribution

### Handling Class Imbalance
- `class_weight='balanced'` parameter automatically adjusts for the 76/24 class distribution
- Stratified sampling ensures both classes are represented in train/test sets

## 📈 Model Performance

After training, review these metrics in the output:

1. **Accuracy**: Overall correctness
2. **Precision**: Of predicted "correct form", how many were actually correct
3. **Recall**: Of actual "correct form" samples, how many did we identify
4. **F1-Score**: Harmonic mean of precision and recall
5. **Confusion Matrix**: Breakdown of predictions vs actual labels

## 💡 Tips for Best Results

### For Training
- Ensure all CSV files have consistent column structure
- More diverse samples improve generalization
- Check feature importance to understand what matters most

### For Prediction
- Ensure CSV file has all required columns
- Videos should capture full repetitions (not partial movements)
- Better pose estimation quality → better predictions

## ⚙️ Requirements

```
pandas
numpy
scikit-learn
joblib
```

Install with:
```powershell
pip install pandas numpy scikit-learn joblib
```

## 🔄 Workflow

1. **Capture Video** → Extract pose data → **Generate CSV**
2. **Train Model** (one-time or periodic retraining)
3. **New Video** → Extract pose data → **Predict Form Score**
4. **Review Feedback** → Adjust technique → Improve

## 📝 Notes

- The model uses the "active arm" (arm with greater ROM) for single-arm ROM calculations
- Missing values (NaN) in pose data are handled gracefully
- Feature extraction is identical in both training and prediction for consistency
- Model uses probability scores for more nuanced feedback than binary classification

## 🤝 Contributing

To improve the model:
1. Add more diverse training samples
2. Experiment with additional features
3. Try different model hyperparameters
4. Consider ensemble methods or deep learning approaches

---

**Created**: 2025-11-30  
**Model Type**: Binary Classification (Correct/Incorrect Form)  
**Framework**: scikit-learn
