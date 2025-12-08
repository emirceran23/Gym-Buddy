# Biceps Curl Form Predictor - Quick Reference

## 🚀 Quick Commands

### Analyze Single Video
```bash
python biceps_curl_form_predictor.py --video my_video.mp4
```

### Analyze Multiple Videos
```bash
python biceps_curl_form_predictor.py --video video1.mp4 video2.mp4 video3.mp4 --output results.csv
```

### Faster Processing
```bash
python biceps_curl_form_predictor.py --video my_video.mp4 --frame-skip 4
```

### Test the Predictor
```bash
python test_predictor.py
```

---

## 📚 Python API - Quick Examples

### Basic Usage
```python
from biceps_curl_form_predictor import BicepsCurlFormPredictor

predictor = BicepsCurlFormPredictor()
result = predictor.predict("video.mp4")

print(result['label'])  # "Good Form ✅" or "Bad Form ❌"
print(result['confidence_good'])  # 0.0 to 1.0
```

### Batch Processing
```python
videos = ["video1.mp4", "video2.mp4", "video3.mp4"]
results = predictor.predict_batch(videos)

for r in results:
    print(f"{r['video_name']}: {r['label']}")
```

### Access Individual Features
```python
result = predictor.predict("video.mp4")
features = result['features']

print(f"Elbow ROM: {features['elbow_left_range']:.1f}°")
print(f"Torso Stability: {features['torso_angle_std']:.2f}")
print(f"Shoulder Movement: {features['shoulder_left_y_std']:.4f}")
```

---

## 📊 Understanding Results

### Prediction Labels
- **Good Form ✅** (`prediction = 1`): Correct biceps curl technique
- **Bad Form ❌** (`prediction = 0`): Incorrect technique detected

### Confidence Scores
- `confidence_good`: Probability of good form (0.0 - 1.0)
- `confidence_bad`: Probability of bad form (0.0 - 1.0)
- Higher confidence = more certain prediction

### Key Metrics

| Metric | Good Form | Bad Form |
|--------|-----------|----------|
| **Elbow ROM** | > 90° | < 90° |
| **Torso Stability (std)** | < 10° | > 10° |
| **Shoulder Movement (std)** | < 0.05 | > 0.05 |
| **L-R Asymmetry** | < 15° | > 15° |

---

## 🎯 Feature Categories (17 total)

1. **Elbow Angles** (10): min, max, mean, std, range for left & right
2. **Torso Stability** (5): min, max, mean, std, range
3. **Shoulder Stability** (2): vertical movement (Y-axis std) for left & right

---

## ⚙️ Performance Tuning

| frame_skip | Speed | Accuracy | Use Case |
|------------|-------|----------|----------|
| 1 | Slowest | Best | Research, final analysis |
| 2 | Normal | Good | **Default, recommended** |
| 4 | Fast | Decent | Quick checks |
| 8 | Very Fast | Lower | Rough screening |

---

## 🐛 Common Issues & Solutions

### "Model not found"
```bash
# Use absolute path
python biceps_curl_form_predictor.py --video video.mp4 --model C:\full\path\to\model.joblib
```

### "Could not open video"
- Check file exists and path is correct
- Try converting to MP4: `ffmpeg -i input.avi output.mp4`

### "Insufficient frames"
- Video too short or pose not detected
- Ensure person is fully visible
- Improve lighting

### Low/uncertain confidence
- Video quality may be poor
- Try better lighting and camera angle
- Side view works best

---

## 📁 File Structure

```
Gym-Buddy/
├── models/
│   └── biceps_curl_rf_model_no_duration_newest.joblib  # Trained model
├── scripts/
│   ├── biceps_curl_form_predictor.py  # Main script
│   ├── example_usage.py                # Examples
│   ├── test_predictor.py               # Test script
│   └── BICEPS_CURL_PREDICTOR_README.md # Full docs
└── notebooks/
    └── biceps_curl_form_analysis.ipynb # Training notebook
```

---

## 📖 More Help

- **Full Documentation**: See `BICEPS_CURL_PREDICTOR_README.md`
- **Code Examples**: See `example_usage.py`
- **Help Command**: `python biceps_curl_form_predictor.py --help`

---

**Happy Training! 🏋️**
