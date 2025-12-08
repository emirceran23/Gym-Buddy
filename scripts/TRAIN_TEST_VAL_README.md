# 🏋️ ML Training with Train/Test/Validation Split

Bu klasörde train/test/validation dizin yapısı için güncellenmiş notebook ve scriptler bulunmaktadır.

## 📁 Dizin Yapısı

Videolarınız şu yapıda olmalı:

```
normal_video/
├── train/
│   ├── true/
│   │   ├── true_1.mp4
│   │   ├── true_2.mp4
│   │   └── ...
│   └── false/
│       ├── false_1.mp4
│       ├── false_2.mp4
│       └── ...
├── test/
│   ├── true/
│   └── false/
└── validation/
    ├── true/
    └── false/
```

## 🚀 Google Colab'da Kullanım

### 1. Temel Notebook (Eski Yapı - Single Train/Test Split)
`Video_Angle_Extractor.ipynb` - Tek klasör yapısı için (videos/true, videos/false)

### 2. Yeni Yapı İçin Değişiklikler

`Video_Angle_Extractor.ipynb` dosyasını açın ve şu değişiklikleri yapın:

#### A. Dizin Kurulumu (Cell 2)

```python
from google.colab import drive
drive.mount('/content/drive')

import os

# Video klasör yolları
VIDEOS_BASE_DIR = '/content/drive/MyDrive/normal_video'  # BURASI ÖNEM Lİ!

# Train/Test/Validation dizinleri
TRAIN_DIR = f'{VIDEOS_BASE_DIR}/train'
TEST_DIR = f'{VIDEOS_BASE_DIR}/test'
VALIDATION_DIR = f'{VIDEOS_BASE_DIR}/validation'

# Output dizini
OUTPUT_DIR = '/content/output'

# CSV çıktı dizinlerini oluştur
for split in ['train', 'test', 'validation']:
    for label in ['true', 'false']:
        os.makedirs(f'{OUTPUT_DIR}/csv/{split}/{label}', exist_ok=True)

print(f"✓ Train: {TRAIN_DIR}")
print(f"✓ Test: {TEST_DIR}")
print(f"✓ Validation: {VALIDATION_DIR}")
```

#### B. Video İşleme Fonksiyonu (Cell 4 - batch_process_videos'tan SONRA ekleyin)

```python
def process_all_splits():
    """Train/Test/Validation split'lerini işle"""
    
    all_results = {}
    
    # TRAIN split
    print(f"\n{'='*70}")
    print("TRAIN SPLIT İŞLENİYOR")
    print(f"{'='*70}")
    
    train_true = batch_process_videos(
        f'{TRAIN_DIR}/true', 
        f'{OUTPUT_DIR}/csv/train/true', 
        'true', 
        'TRAIN - TRUE'
    )
    train_false = batch_process_videos(
        f'{TRAIN_DIR}/false', 
        f'{OUTPUT_DIR}/csv/train/false', 
        'false', 
        'TRAIN - FALSE'
    )
    all_results['train'] = {'true': train_true, 'false': train_false}
    
    # TEST split
    print(f"\n{'='*70}")
    print("TEST SPLIT İŞLENİYOR")
    print(f"{'='*70}")
    
    test_true = batch_process_videos(
        f'{TEST_DIR}/true', 
        f'{OUTPUT_DIR}/csv/test/true', 
        'true', 
        'TEST - TRUE'
    )
    test_false = batch_process_videos(
        f'{TEST_DIR}/false', 
        f'{OUTPUT_DIR}/csv/test/false', 
        'false', 
        'TEST - FALSE'
    )
    all_results['test'] = {'true': test_true, 'false': test_false}
    
    # VALIDATION split
    print(f"\n{'='*70}")
    print("VALIDATION SPLIT İŞLENİYOR")
    print(f"{'='*70}")
    
    val_true = batch_process_videos(
        f'{VALIDATION_DIR}/true', 
        f'{OUTPUT_DIR}/csv/validation/true', 
        'true', 
        'VALIDATION - TRUE'
    )
    val_false = batch_process_videos(
        f'{VALIDATION_DIR}/false', 
        f'{OUTPUT_DIR}/csv/validation/false', 
        'false', 
        'VALIDATION - FALSE'
    )
    all_results['validation'] = {'true': val_true, 'false': val_false}
    
    # Özet
    print(f"\n{'='*70}")
    print("TÜM SPLIT'LER İŞLENDİ")
    print(f"{'='*70}")
    for split, results in all_results.items():
        total = results['true'] + results['false']
        print(f"{split.upper():12s}: {results['true']} true + {results['false']} false = {total} toplam")
    
    return all_results

# Tüm videoları işle
results = process_all_splits()
```

#### C. Veri Yükleme (Cell 6 - load_data yerine)

```python
def load_split_data(csv_base_dir, split_name):
    """Belirli bir split'ten veri yükle"""
    
    true_csvs = sorted(glob.glob(f'{csv_base_dir}/csv/{split_name}/true/output_true_*.csv'))
    false_csvs = sorted(glob.glob(f'{csv_base_dir}/csv/{split_name}/false/output_false_*.csv'))
    
    print(f"\n{split_name.upper()} Split:")
    print(f"  TRUE: {len(true_csvs)}")
    print(f"  FALSE: {len(false_csvs)}")
    
    features_list = []
    labels = []
    filenames = []
    
    # TRUE samples
    for csv_path in true_csvs:
        features = extract_features(csv_path)
        features_list.append(features)
        labels.append(1)
        filenames.append(os.path.basename(csv_path))
    
    # FALSE samples
    for csv_path in false_csvs:
        features = extract_features(csv_path)
        features_list.append(features)
        labels.append(0)
        filenames.append(os.path.basename(csv_path))
    
    df_features = pd.DataFrame(features_list)
    X = df_features.values
    y = np.array(labels)
    
    return X, y, filenames, df_features.columns.tolist(), df_features


# Train, Test, Validation veri setlerini yükle
X_train, y_train, train_files, feature_names, df_train = load_split_data(OUTPUT_DIR, 'train')
X_test, y_test, test_files, _, df_test = load_split_data(OUTPUT_DIR, 'test')
X_val, y_val, val_files, _, df_val = load_split_data(OUTPUT_DIR, 'validation')

print("\n✓ Tüm veri setleri yüklendi!")
print(f"  TRAIN: {X_train.shape}")
print(f"  TEST: {X_test.shape}")
print(f"  VALIDATION: {X_val.shape}")
```

#### D. Model Eğitimi (Cell 7 - train_test_split KULLANMAYIN!)

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import matplotlib.pyplot as plt
import joblib

# Feature scaling (TRAIN ile fit, diğerlerini transform)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
X_val_scaled = scaler.transform(X_val)

print(f"Eğitim seti: {len(X_train)} örnek (TRUE={sum(y_train)}, FALSE={len(y_train)-sum(y_train)})")
print(f"Test seti: {len(X_test)} örnek (TRUE={sum(y_test)}, FALSE={len(y_test)-sum(y_test)})")
print(f"Validation seti: {len(X_val)} örnek (TRUE={sum(y_val)}, FALSE={len(y_val)-sum(y_val)})")

# RandomForest eğitimi
print("\n🤖 RandomForest eğitiliyor...")
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    class_weight='balanced'
)

model.fit(X_train_scaled, y_train)
print("✓ Model eğitildi!")
```

#### E. Model Değerlendirmesi (Cell 8'i değiştirin)

```python
# Tahminler
y_train_pred = model.predict(X_train_scaled)
y_test_pred = model.predict(X_test_scaled)
y_val_pred = model.predict(X_val_scaled)

# Accuracy hesapla
train_acc = accuracy_score(y_train, y_train_pred)
test_acc = accuracy_score(y_test, y_test_pred)
val_acc = accuracy_score(y_val, y_val_pred)

print(f"\n{'='*70}")
print("MODEL DEĞERLENDİRMESİ")
print(f"{'='*70}")
print(f"\n🎯 TRAIN Accuracy: {train_acc:.2%}")
print(f"🎯 TEST Accuracy: {test_acc:.2%}")
print(f"🎯 VALIDATION Accuracy: {val_acc:.2%}")

# TEST SET - Detaylı Rapor
print(f"\n{'='*70}")
print("TEST SET - Classification Report")
print(f"{'='*70}")
print(classification_report(y_test, y_test_pred, target_names=['Yanlış Form', 'Doğru Form']))

cm_test = confusion_matrix(y_test, y_test_pred)
print(f"\nConfusion Matrix (Test):")
print(f"                  Tahmin")
print(f"                  0        1")
print(f"Gerçek  0        {cm_test[0,0]:3d}      {cm_test[0,1]:3d}")
print(f"        1        {cm_test[1,0]:3d}      {cm_test[1,1]:3d}")

# VALIDATION SET - Detaylı Rapor
print(f"\n{'='*70}")
print("VALIDATION SET - Classification Report")
print(f"{'='*70}")
print(classification_report(y_val, y_val_pred, target_names=['Yanlış Form', 'Doğru Form']))

cm_val = confusion_matrix(y_val, y_val_pred)
print(f"\nConfusion Matrix (Validation):")
print(f"                  Tahmin")
print(f"                  0        1")
print(f"Gerçek  0        {cm_val[0,0]:3d}      {cm_val[0,1]:3d}")
print(f"        1        {cm_val[1,0]:3d}      {cm_val[1,1]:3d}")
```

## 📊 Çıktı Yapısı

```
output/
├── csv/
│   ├── train/
│   │   ├── true/
│   │   │   ├── output_true_1.csv
│   │   │   └── ...
│   │   └── false/
│   │       ├── output_false_1.csv
│   │       └── ...
│   ├── test/
│   │   ├── true/
│   │   └── false/
│   └── validation/
│       ├── true/
│       └── false/
├── biceps_model.pkl
├── scaler.pkl
└── feature_importance.csv
```

## ⚠️ Önemli Notlar

1. **train_test_split KULLANMAYIN!** - Zaten train/test/validation olarak ayrılmış
2. **Validation set'i mutlaka kullanın** - Final model değerlendirmesi için
3. **Test set sadece final değerlendirme için** - Hyperparameter tuning için validation kullanın
4. **Feature scaling** - Train set ile fit, test/validation'ı transform

## 🎯 İş Akışı

1. ✅ Videoları train/test/validation klasörlerine ayırın
2. ✅ Notebook'u Colab'a yükleyin
3. ✅ Yukarıdaki değişiklikleri yapın
4. ✅ Hücreleri sırayla çalıştırın
5. ✅ Model performansını validation set'te değerlendirin
6. ✅ Final sonuçları test set'te kontrol edin

## 📚 Ek Dosyalar

- `train_test_validation_setup.py` - Kod blokları ve detaylı açıklamalar
- `colab_angle_extractor.py` - Standalone Python versiyonu

---

💡 **İpucu**: İlk defa kullanıyorsanız, küçük bir subset ile test edin!
