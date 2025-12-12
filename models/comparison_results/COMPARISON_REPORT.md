# Biceps Curl Form Classification - Model Comparison Report

**Generated**: 2025-12-07 02:57:31

---

## 📋 Model Overview

| Model | Features | Description |
|-------|----------|-------------|
| **Initial Model** | 18 | First baseline model with video duration |
| **No Duration** | 17 | Removed video_duration feature to reduce temporal bias |
| **Shorter True Videos** | 18 | Trained with balanced dataset (shortened good form videos) |
| **Augmented Dataset** | 17 | Trained with augmented data (flipped videos, different feature order) |
| **Symmetric Mean** | 11 | Uses averaged left/right features for bilateral symmetry |

## 🔍 Model Characteristics

| Model | Includes Duration | Data Augmentation | Symmetric Features |
|-------|-------------------|-------------------|--------------------|
| **Initial Model** | ✅ | ❌ | ❌ |
| **No Duration** | ❌ | ❌ | ❌ |
| **Shorter True Videos** | ✅ | ❌ | ❌ |
| **Augmented Dataset** | ❌ | ✅ | ❌ |
| **Symmetric Mean** | ❌ | ✅ | ✅ |

## 📊 Summary Statistics

