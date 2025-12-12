# Biceps Curl Model Training - Evolution & Comparison

## 📋 Models Overview

This document explains the evolution of the biceps curl form classification models and their key differences.

### Model Timeline

```
Initial Model (18 features)
    ↓
    Removed video_duration bias
    ↓
No Duration Model (17 features)
    ↓                              ↓
    Dataset balancing         Feature reordering + augmentation
    ↓                              ↓
Shorter True Videos (18)      Augmented Model (17)
                                   ↓
                            Symmetric features averaging
                                   ↓
                         Symmetric Mean Model (11)
```

---

## 🔬 Model Descriptions

### 1. **Initial Model** (`biceps_curl_rf_model_initial.joblib`)

**Purpose**: Baseline model to establish initial performance

**Features**: 18 total
- Elbow angles: left/right (min, max, mean, std, range) - 10 features
- Torso stability: (min, max, mean, std, range) - 5 features
- Shoulder stability: left/right Y-axis std - 2 features  
- **Video duration** - 1 feature ⚠️

**Training Approach**:
- Direct training on original dataset
- Included video duration as a feature
- Standard RandomForestClassifier

**Key Characteristics**:
- ✅ Simple baseline
- ⚠️ Temporal bias (longer videos might correlate with label)
- ❌ No data augmentation

---

### 2. **No Duration Model** (`biceps_curl_rf_model_no_duration_newest.joblib`)

**Purpose**: Remove temporal bias by excluding video duration

**Features**: 17 total (removed `video_duration`)
- Same as Initial Model minus video_duration

**Training Approach**:
- Removed video_duration feature
- Aim: Prevent model from learning video length patterns
- Force focus on biomechanical features only

**Key Characteristics**:
- ✅ No temporal bias
- ✅ Pure biomechanical classification
- ❌ Still uses same dataset (potential class imbalance)
- ❌ No data augmentation

**Hypothesis**: Good form videos might be systematically longer/shorter, creating a shortcut for the model.

---

### 3. **Shorter True Videos Model** (`biceps_curl_rf_model_shorterTrueVideos.joblib`)

**Purpose**: Balance dataset by shortening "true" (good form) videos

**Features**: 18 total (includes video_duration again)
- Same as Initial Model

**Training Approach**:
- Dataset preprocessing: trimmed good form videos to match bad form video lengths
- Goal: Equal representation and duration distribution
- Keeps video_duration but now it's balanced

**Key Characteristics**:
- ✅ Balanced dataset (duration-wise)
- ✅ Reduces dataset bias
- ⚠️ Still includes video_duration
- ❌ Reduced training data (shortened videos)
- ❌ No augmentation

**Hypothesis**: Class imbalance or duration mismatch was affecting performance.

---

### 4. **Augmented Model** (`biceps_curl_rf_augmented.joblib`)

**Purpose**: Increase dataset size and variation through augmentation

**Features**: 17 total (no duration, **different feature order**)
- **Feature order changed**: `range` comes before `mean/std` for elbows
- Shoulder features come before torso features
- This is important for model input!

**Training Approach**:
- Data augmentation: Horizontal flip (swap left ↔ right)
- Effectively doubles the dataset
- Removed video_duration
- **Feature engineering: reordered features**

**Key Characteristics**:
- ✅ 2x more training data (original + flipped)
- ✅ Better generalization (left/right invariance)
- ✅ No temporal bias
- ⚠️ **Different feature order** (important for inference!)
- ✅ Robust to camera angle (left vs right side view)

**Hypothesis**: Limited data was causing overfitting. Augmentation helps generalization.

---

### 5. **Symmetric Mean Model** (`biceps_curl_rf_symmetric_mean.joblib`)

**Purpose**: Simplify by using bilateral symmetry (averaged features)

**Features**: 11 total (**significantly reduced**)
- **Torso**: min, max, range, mean, std - 5 features
- **Elbow (averaged)**: min_mean, max_mean, range_mean, mean_mean, std_mean - 5 features
- **Shoulder (averaged)**: y_std_mean - 1 feature

**Feature Calculation**:
```python
elbow_min_mean = (elbow_left_min + elbow_right_min) / 2
elbow_max_mean = (elbow_left_max + elbow_right_max) / 2
# ... and so on
```

**Training Approach**:
- Combines left/right measurements
- Assumes bilateral symmetry in good form
- Uses augmented dataset
- Fewer features = simpler model

**Key Characteristics**:
- ✅ Simpler model (11 vs 17 features)
- ✅ Assumes bilateral symmetry
- ✅ Less prone to overfitting
- ✅ Faster inference
- ⚠️ Loses asymmetry information
- ❌ Can't detect left/right imbalances

**Hypothesis**: Bilateral averaging reduces noise and overfitting while capturing essential biomechanics.

---

## 📊 Feature Comparison Table

| Model | Total Features | Elbow | Torso | Shoulder | Duration | Augmentation | Symmetric |
|-------|---------------|--------|-------|----------|----------|--------------|-----------|
| Initial | 18 | 10 (L+R) | 5 | 2 (L+R) | ✅ Yes | ❌ No | ❌ No |
| No Duration | 17 | 10 (L+R) | 5 | 2 (L+R) | ❌ No | ❌ No | ❌ No |
| Shorter True | 18 | 10 (L+R) | 5 | 2 (L+R) | ✅ Yes | ❌ No | ❌ No |
| Augmented | 17 | 10 (L+R) | 5 | 2 (L+R) | ❌ No | ✅ Yes | ❌ No |
| Symmetric Mean | 11 | 5 (avg) | 5 | 1 (avg) | ❌ No | ✅ Yes | ✅ Yes |

---

## 🎯 Training Hypotheses & Approaches

### Hypothesis 1: Temporal Bias
**Problem**: Video duration correlates with labels
**Solution**: Remove `video_duration` feature
**Models**: No Duration, Augmented, Symmetric Mean

### Hypothesis 2: Dataset Imbalance
**Problem**: Unequal video counts or durations between classes
**Solution**: Balance dataset by trimming longer videos
**Model**: Shorter True Videos

### Hypothesis 3: Insufficient Data
**Problem**: Limited training examples causing overfitting
**Solution**: Data augmentation (horizontal flip)
**Models**: Augmented, Symmetric Mean

### Hypothesis 4: Feature Redundancy
**Problem**: Too many features, left/right redundancy
**Solution**: Average left/right features (bilateral symmetry)
**Model**: Symmetric Mean

### Hypothesis 5: Learning from Noise
**Problem**: Model learning from asymmetries that aren't meaningful
**Solution**: Use symmetric features to focus on bilateral patterns
**Model**: Symmetric Mean

---

## 🔑 Key Differences Summary

### Data Perspective

| Aspect | Initial | No Duration | Shorter True | Augmented | Symmetric Mean |
|--------|---------|-------------|--------------|-----------|----------------|
| **Dataset** | Original | Original | Trimmed | 2× (flipped) | 2× (flipped) |
| **Class Balance** | Imbalanced? | Imbalanced? | Balanced | Imbalanced? | Imbalanced? |
| **Duration Bias** | Yes | No | Balanced | No | No |

### Feature Perspective

| Aspect | Initial | No Duration | Shorter True | Augmented | Symmetric Mean |
|--------|---------|-------------|--------------|-----------|----------------|
| **Feature Count** | 18 | 17 | 18 | 17 | 11 |
| **Temporal Feature** | ✅ | ❌ | ✅ | ❌ | ❌ |
| **L/R Separate** | ✅ | ✅ | ✅ | ✅ | ❌ (averaged) |
| **Feature Order** | Standard | Standard | Standard | **Modified** | **Different** |

---

## 🧪 Expected Performance Characteristics

### Initial Model
- **Strengths**: May have good training accuracy if duration is predictive
- **Weaknesses**: Overfits to video length, not generalizable
- **Best for**: Not recommended due to temporal bias

### No Duration Model
- **Strengths**: Pure biomechanical focus
- **Weaknesses**: May struggle if dataset is imbalanced
- **Best for**: Baseline comparison without temporal bias

### Shorter True Videos Model
- **Strengths**: Balanced dataset should improve fairness
- **Weaknesses**: Reduced training data, still has duration feature
- **Best for**: Testing if imbalance was the issue

### Augmented Model
- **Strengths**: More data = better generalization, robust to camera side
- **Weaknesses**: Still 17 features (potentially overfitting)
- **Best for**: Production use with varied camera angles

### Symmetric Mean Model
- **Strengths**: Simplest, fastest, assumes symmetry
- **Weaknesses**: Can't detect asymmetric problems
- **Best for**: Quick inference, assuming bilateral symmetry ideal

---

## 📈 Evaluation Metrics to Compare

When comparing these models, consider:

1. **Accuracy**: Overall prediction correctness
2. **Confidence**: How certain is the model?
3. **Consistency**: Do all models agree on a video?
4. **Generalization**: Performance on diverse test videos
5. **Overfitting**: Train vs test performance gap
6. **Feature Importance**: Which features matter most?

---

## 🎬 Test Videos Rationale

The test videos should ideally cover:
- ✅ **perfect.mp4** - Textbook good form
- ✅ **valid.mp4** - Acceptable form
- ⚠️ **toprak.mp4** - Moderate form (edge case)
- ❌ **Bad form examples** - Various errors
- 🤷 **Sitting posture** - Non-biceps curl (should reject)

---

## 🔮 Expected Outcomes

**Agreement Scenarios**:
- All models agree (Good) → Clearly good form
- All models agree (Bad) → Clearly bad form
- Models disagree → Edge case or ambiguous form

**Model-Specific Predictions**:
- **Initial/Shorter = more confident on duration-correlated videos**
- **No Duration = more conservative (pure biomechanics)**
- **Augmented = most balanced (best data)**
- **Symmetric Mean = fastest, assumes symmetry**

---

**Next Steps**: Run `compare_all_models.py` to get empirical results and validate these hypotheses! 🏋️
