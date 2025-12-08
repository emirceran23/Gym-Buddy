# GymBuddy 💪

A comprehensive fitness companion app with AI-powered exercise analysis and nutrition tracking.

## Overview

GymBuddy is a full-stack fitness application that combines:
- **Mobile App** - React Native/Expo app for calorie tracking and exercise evaluation
- **Backend Server** - Flask API for video analysis and meal planning
- **ML Models** - Machine learning models for biceps curl form detection

## 🏗️ Project Structure

```
Gym-Buddy/
├── apps/
│   └── mobile/          # React Native mobile app
├── server/              # Flask backend API
├── scripts/             # Video analysis & ML utilities
├── models/              # Trained ML models
├── model_training/      # Training data & scripts
└── notebooks/           # Jupyter notebooks for analysis
```

## 📱 Mobile App

The mobile app provides:
- **Calorie Tracking** - Log meals, track daily intake with progress bars
- **Macro Monitoring** - Track protein, carbs, and fat consumption
- **Water Tracking** - Daily hydration goals with visual glasses
- **Exercise Evaluation** - Upload workout videos for AI form analysis
- **AI Meal Planner** - Get personalized 7-day diet plans
- **Goal Progress** - Track weight goals with projected completion dates

### Tech Stack
- React Native with Expo
- TypeScript
- React Navigation
- AsyncStorage for local data
- react-native-progress for visualizations

### Running the Mobile App
```bash
cd apps/mobile
npm install
npx expo start
```

## 🖥️ Backend Server

Flask-based API server providing:
- **/api/analyze-video** - Upload and analyze exercise videos
- **/api/progress-json/{job_id}** - Real-time analysis progress
- **/api/generate-meal-plan** - AI-powered meal planning
- **/api/health** - Health check endpoint

### Running the Server
```bash
cd server
pip install -r requirements.txt
python app.py
```

## 🤖 ML Models

### Biceps Curl Form Detection
Machine learning model that analyzes biceps curl form from video:
- Pose detection using MediaPipe
- Feature extraction (elbow angles, torso stability, ROM)
- Random Forest classifier for form quality prediction
- Real-time feedback generation

### Model Files
- `biceps_curl_rf_augmented.joblib` - Production model
- `models/` - Model versions and comparison results

## 🎥 Video Analysis Pipeline

1. **Upload** - Video uploaded via mobile app
2. **Pose Detection** - MediaPipe extracts body landmarks
3. **Feature Extraction** - Calculate angles, velocities, ROM
4. **Rep Counting** - Detect curl repetitions
5. **Form Analysis** - ML model evaluates form quality
6. **Feedback** - Generate actionable improvement tips

## 📊 Features

| Feature | Mobile | Server |
|---------|--------|--------|
| Calorie Tracking | ✅ | - |
| Macro Monitoring | ✅ | - |
| Water Tracking | ✅ | - |
| Video Upload | ✅ | ✅ |
| Form Analysis | - | ✅ |
| Rep Counting | - | ✅ |
| Meal Planning | ✅ | ✅ |
| Progress Tracking | ✅ | - |

## 🚀 Deployment

### Mobile App
- Build APK: `npx expo run:android`
- Or use Android Studio with the `android/` folder

### Server
- **Render**: Uses `render.yaml` configuration
- **Docker**: `docker build -t gymbuddy-api .`
- **Azure**: See `AZURE_DEPLOYMENT.md`

## 📦 Dependencies

### Mobile
- expo, react-native
- @react-navigation/*
- react-native-progress
- expo-image-picker, expo-av

### Server
- Flask, Flask-CORS
- MediaPipe, OpenCV
- scikit-learn, joblib
- Hugging Face API (meal planning)

## 🔧 Environment Variables

Create `.env` file:
```env
HF_API_KEY=your_huggingface_api_key
ALLOWED_ORIGINS=*
```

## 📄 License

MIT License

## 👥 Contributors

- Project developed for fitness tracking and exercise form improvement
