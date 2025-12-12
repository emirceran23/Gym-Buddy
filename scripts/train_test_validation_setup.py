"""
Train/Test/Validation Video Dizin Yapısı için ML Training Pipeline

Dizin yapısı:
normal_video/
├── train/
│   ├── true/
│   └── false/
├── test/
│   ├── true/
│   └── false/
└── validation/
    ├── true/
    └── false/
"""

# GOOGLE COLAB KURULUM KODU
colab_setup_code = '''
# 1. Paketleri yükle
!pip install mediapipe opencv-python scikit-learn pandas numpy matplotlib joblib

# 2. Google Drive bağla
from google.colab import drive
drive.mount('/content/drive')

# 3. Dizin yapısını ayarla
import os

# Video klasör yolları (kendi yolunuza göre değiştirin!)
VIDEOS_BASE_DIR = '/content/drive/MyDrive/normal_video'  # DEĞİŞTİRİN!

# Alt dizinler
TRAIN_DIR = f'{VIDEOS_BASE_DIR}/train'
TEST_DIR = f'{VIDEOS_BASE_DIR}/test'
VALIDATION_DIR = f'{VIDEOS_BASE_DIR}/validation'

# Output dizini
OUTPUT_DIR = '/content/output'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# CSV çıktı dizinleri
for split in ['train', 'test', 'validation']:
    for label in ['true', 'false']:
        os.makedirs(f'{OUTPUT_DIR}/csv/{split}/{label}', exist_ok=True)

print("✓ Dizin yapısı hazır!")
print(f"  Train: {TRAIN_DIR}")
print(f"  Test: {TEST_DIR}")
print(f"  Validation: {VALIDATION_DIR}")
print(f"  Output: {OUTPUT_DIR}")
'''

# VIDEO İŞLEME KODU (batch_process_videos fonksiyonunu güncelle)
batch_process_updated = '''
def batch_process_videos_traintest(split_name, split_dir, output_base_dir):
    """
    Train/Test/Validation split için videoları işle
    
    Args:
        split_name: 'train', 'test', veya 'validation'
        split_dir: Split dizini (örn: /path/to/train)
        output_base_dir: CSV çıktı dizini
    """
    print(f"\\n{'='*70}")
    print(f"{split_name.upper()} SPLIT İŞLENİYOR")
    print(f"{'='*70}")
    
    results = {}
    
    # TRUE ve FALSE klasörlerini işle
    for label in ['true', 'false']:
        label_dir = os.path.join(split_dir, label)
        output_csv_dir = os.path.join(output_base_dir, 'csv', split_name, label)
        
        if not os.path.exists(label_dir):
            print(f"⚠️  {label} klasörü bulunamadı: {label_dir}")
            continue
        
        count = batch_process_videos(
            input_folder=label_dir,
            output_folder=output_csv_dir,
            prefix=label,
            category=f"{split_name.upper()} - {label.upper()}"
        )
        
        results[label] = count
    
    print(f"\\n{split_name.upper()} özeti:")
    print(f"  TRUE: {results.get('true', 0)} video")
    print(f"  FALSE: {results.get('false', 0)} video")
    print(f"  TOPLAM: {sum(results.values())} video")
    
    return results


# TÜM SPLIT'LERİ İŞLE
print("\\n" + "="*70)
print("VİDEOLARDAN AÇI ÇIKARIMI BAŞLIYOR")
print("="*70)

all_results = {}

# Train split
train_results = batch_process_videos_traintest('train', TRAIN_DIR, OUTPUT_DIR)
all_results['train'] = train_results

# Test split
test_results = batch_process_videos_traintest('test', TEST_DIR, OUTPUT_DIR)
all_results['test'] = test_results

# Validation split
val_results = batch_process_videos_traintest('validation', VALIDATION_DIR, OUTPUT_DIR)
all_results['validation'] = val_results

# GENEL ÖZET
print("\\n" + "="*70)
print("TÜM VİDEOLAR İŞLENDİ - ÖZET")
print("="*70)
for split_name, split_results in all_results.items():
    total = sum(split_results.values())
    print(f"{split_name.upper():12s}: {split_results.get('true', 0)} TRUE + {split_results.get('false', 0)} FALSE = {total} toplam")

grand_total = sum(sum(r.values()) for r in all_results.values())
print(f"\\nGRAND TOTAL: {grand_total} video işlendi")
print("="*70)
'''

# VERİ YÜKLEME KODU (load_data fonksiyonunu güncelle)
load_data_updated = '''
def load_data_traintest(csv_base_dir):
    """
    Train/Test/Validation split'lerinden veri yükle
    
    Args:
        csv_base_dir: CSV dosyalarının bulunduğu ana dizin
        
    Returns:
        Dict containing X_train, y_train, X_test, y_test, X_val, y_val, feature_names
    """
    import glob
    
    datasets = {}
    
    for split in ['train', 'test', 'validation']:
        # TRUE CSV'ler
        true_pattern = os.path.join(csv_base_dir, 'csv', split, 'true', 'output_true_*.csv')
        true_csvs = sorted(glob.glob(true_pattern))
        
        # FALSE CSV'ler
        false_pattern = os.path.join(csv_base_dir, 'csv', split, 'false', 'output_false_*.csv')
        false_csvs = sorted(glob.glob(false_pattern))
        
        print(f"\\n{split.upper()} split:")
        print(f"  TRUE: {len(true_csvs)} CSV")
        print(f"  FALSE: {len(false_csvs)} CSV")
        
        # Feature extraction
        features_list = []
        labels = []
        filenames = []
        
        # TRUE samples (label = 1)
        for csv_path in true_csvs:
            features = extract_features(csv_path)
            features_list.append(features)
            labels.append(1)
            filenames.append(os.path.basename(csv_path))
        
        # FALSE samples (label = 0)
        for csv_path in false_csvs:
            features = extract_features(csv_path)
            features_list.append(features)
            labels.append(0)
            filenames.append(os.path.basename(csv_path))
        
        # DataFrame oluştur
        if len(features_list) > 0:
            df_features = pd.DataFrame(features_list)
            X = df_features.values
            y = np.array(labels)
            
            datasets[split] = {
                'X': X,
                'y': y,
                'filenames': filenames,
                'feature_names': df_features.columns.tolist(),
                'df_features': df_features
            }
            
            print(f"  Veri boyutu: {X.shape}")
            print(f"  TRUE örnekler: {sum(y)}")
            print(f"  FALSE örnekler: {len(y) - sum(y)}")
        else:
            print(f"  ⚠️  Veri bulunamadı!")
            datasets[split] = None
    
    return datasets


# Veriyi yükle
datasets = load_data_traintest(OUTPUT_DIR)

# Train, Test, Validation ayır
if datasets['train'] is not None:
    X_train = datasets['train']['X']
    y_train = datasets['train']['y']
    feature_names = datasets['train']['feature_names']
    print(f"\\n✓ TRAIN seti yüklendi: {X_train.shape}")

if datasets['test'] is not None:
    X_test = datasets['test']['X']
    y_test = datasets['test']['y']
    print(f"✓ TEST seti yüklendi: {X_test.shape}")

if datasets['validation'] is not None:
    X_val = datasets['validation']['X']
    y_val = datasets['validation']['y']
    print(f"✓ VALIDATION seti yüklendi: {X_val.shape}")
'''

# MODEL EĞİTİMİ (validation set ile)
train_with_validation = '''
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# Feature scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
X_val_scaled = scaler.transform(X_val) if datasets['validation'] is not None else None

print("\\n" + "="*70)
print("MODEL EĞİTİMİ BAŞLIYOR")
print("="*70)

# RandomForest eğitimi
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

# TRAIN SET DEĞERLENDİRMESİ
y_train_pred = model.predict(X_train_scaled)
train_accuracy = accuracy_score(y_train, y_train_pred)
print(f"\\n📊 TRAIN Accuracy: {train_accuracy:.2%}")

# TEST SET DEĞERLENDİRMESİ
y_test_pred = model.predict(X_test_scaled)
test_accuracy = accuracy_score(y_test, y_test_pred)
print(f"📊 TEST Accuracy: {test_accuracy:.2%}")

# VALIDATION SET DEĞERLENDİRMESİ (eğer varsa)
if X_val_scaled is not None:
    y_val_pred = model.predict(X_val_scaled)
    val_accuracy = accuracy_score(y_val, y_val_pred)
    print(f"📊 VALIDATION Accuracy: {val_accuracy:.2%}")
    
    print(f"\\n{'='*70}")
    print("VALIDATION SET - Detaylı Rapor")
    print(f"{'='*70}")
    print(classification_report(y_val, y_val_pred, target_names=['Yanlış Form (0)', 'Doğru Form (1)']))
    
    cm = confusion_matrix(y_val, y_val_pred)
    print(f"\\nConfusion Matrix (Validation):")
    print(f"                  Tahmin")
    print(f"                  0        1")
    print(f"Gerçek  0        {cm[0,0]:3d}      {cm[0,1]:3d}")
    print(f"        1        {cm[1,0]:3d}      {cm[1,1]:3d}")

print(f"\\n{'='*70}")
print("TEST SET - Detaylı Rapor")
print(f"{'='*70}")
print(classification_report(y_test, y_test_pred, target_names=['Yanlış Form (0)', 'Doğru Form (1)']))

cm_test = confusion_matrix(y_test, y_test_pred)
print(f"\\nConfusion Matrix (Test):")
print(f"                  Tahmin")
print(f"                  0        1")
print(f"Gerçek  0        {cm_test[0,0]:3d}      {cm_test[0,1]:3d}")
print(f"        1        {cm_test[1,0]:3d}      {cm_test[1,1]:3d}")
'''

# ÖZETİ YAZDIRMA
summary_text = """
=======================================================================
          TRAIN/TEST/VALIDATION SPLIT KULLANIM REHBERİ
=======================================================================

## DİZİN YAPISI:

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

## GOOGLE COLAB'DA KULLANIM:

1. Yukarıdaki kod bloklarını sırayla Colab notebook'a kopyalayın
2. VIDEOS_BASE_DIR değişkenini kendi Drive yolunuza göre düzenleyin
3. Hücreleri sırayla çalıştırın

## FARKLAR:

- Eski yapı: videos/true, videos/false (tek klasör)
- Yeni yapı: train/true, train/false, test/true, test/false, validation/true, validation/false

## ÇİKTI:

output/
├── csv/
│   ├── train/
│   │   ├── true/
│   │   └── false/
│   ├── test/
│   │   ├── true/
│   │   └── false/
│   └── validation/
│       ├── true/
│       └── false/
├── biceps_model.pkl
├── scaler.pkl
└── feature_importance.csv

=======================================================================
"""

print(summary_text)

# Kod bloklarını yazdır
print("\n" + "="*70)
print("KOD BLOKLARI:")
print("="*70)

print("\n### BLOK 1: COLAB KURULUMU")
print(colab_setup_code)

print("\n### BLOK 2: VİDEO İŞLEME (batch_process_videos fonksiyonundan SONRA ekleyin)")
print(batch_process_updated)

print("\n### BLOK 3: VERİ YÜKLEME (load_data yerine kullanın)")
print(load_data_updated)

print("\n### BLOK 4: MODEL EĞİTİMİ (Validation ile)")
print(train_with_validation)
