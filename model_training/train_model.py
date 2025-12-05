"""
Model Training Script for Biceps Curl Form Evaluation
Trains a RandomForestClassifier to predict form correctness from biomechanical features.
"""

import os
import glob
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import matplotlib.pyplot as plt
from feature_extractor import extract_features


def load_data(base_dir='videos'):
    """
    Load all CSV files and extract features.
    
    Args:
        base_dir: Base directory containing true/false subdirectories
        
    Returns:
        X: Feature matrix (n_samples, 16)
        y: Labels (n_samples,)
        filenames: List of CSV filenames
    """
    true_csvs = glob.glob(os.path.join(base_dir, 'true', 'csv', 'output_true_*.csv'))
    false_csvs = glob.glob(os.path.join(base_dir, 'false', 'csv', 'output_false_*.csv'))
    
    print(f"Found {len(true_csvs)} true samples and {len(false_csvs)} false samples")
    
    features_list = []
    labels = []
    filenames = []
    
    # Process true samples (label = 1)
    print("\nProcessing true samples...")
    for csv_path in true_csvs:
        features = extract_features(csv_path)
        features_list.append(features)
        labels.append(1)
        filenames.append(os.path.basename(csv_path))
    
    # Process false samples (label = 0)
    print("Processing false samples...")
    for csv_path in false_csvs:
        features = extract_features(csv_path)
        features_list.append(features)
        labels.append(0)
        filenames.append(os.path.basename(csv_path))
    
    # Convert to DataFrame and numpy arrays
    df_features = pd.DataFrame(features_list)
    X = df_features.values
    y = np.array(labels)
    
    print(f"\nDataset shape: {X.shape}")
    print(f"Feature columns: {list(df_features.columns)}")
    
    return X, y, filenames, df_features.columns.tolist()


def train_model(X, y, feature_names):
    """
    Train RandomForestClassifier with proper train/test split.
    
    Args:
        X: Feature matrix
        y: Labels
        feature_names: List of feature names
        
    Returns:
        model: Trained RandomForestClassifier
        scaler: Fitted StandardScaler
        X_train, X_test, y_train, y_test: Split data for evaluation
    """
    # Split data (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"\nTrain set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    print(f"Train class distribution: {np.bincount(y_train)}")
    print(f"Test class distribution: {np.bincount(y_test)}")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train RandomForest
    print("\nTraining RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        class_weight='balanced'  # Handle class imbalance
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n" + "="*60)
    print("ALL FEATURES SORTED BY IMPORTANCE:")
    print("="*60)
    print(feature_importance.to_string(index=False))
    
    # Save feature importance to CSV
    importance_csv_path = 'feature_importance.csv'
    feature_importance.to_csv(importance_csv_path, index=False)
    print(f"\n✓ Feature importance saved to: {importance_csv_path}")
    
    # Create visualization
    plt.figure(figsize=(10, 8))
    plt.barh(range(len(feature_importance)), feature_importance['importance'].values)
    plt.yticks(range(len(feature_importance)), feature_importance['feature'].values)
    plt.xlabel('Importance Score', fontsize=12)
    plt.ylabel('Feature', fontsize=12)
    plt.title('Feature Importance for Biceps Curl Form Classification', fontsize=14, fontweight='bold')
    plt.gca().invert_yaxis()  # Highest importance at top
    plt.tight_layout()
    
    # Save plot
    plot_path = 'feature_importance_plot.png'
    plt.savefig(plot_path, dpi=300, bbox_inches='tight')
    print(f"✓ Feature importance plot saved to: {plot_path}")
    plt.close()
    
    return model, scaler, X_train_scaled, X_test_scaled, y_train, y_test


def evaluate_model(model, X_test, y_test):
    """
    Evaluate model performance on test set.
    
    Args:
        model: Trained model
        X_test: Test features
        y_test: Test labels
    """
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    
    print("\n" + "="*60)
    print("MODEL EVALUATION RESULTS")
    print("="*60)
    
    # Accuracy
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nAccuracy: {accuracy:.2%}")
    
    # Classification Report
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Incorrect Form (0)', 'Correct Form (1)']))
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("\nConfusion Matrix:")
    print("                  Predicted")
    print("                  0 (False)  1 (True)")
    print(f"Actual  0 (False)    {cm[0,0]:3d}        {cm[0,1]:3d}")
    print(f"        1 (True)     {cm[1,0]:3d}        {cm[1,1]:3d}")
    
    # Probability distribution
    print("\nPrediction Probability Distribution:")
    print(f"  Mean probability for class 1: {y_proba[:, 1].mean():.3f}")
    print(f"  Min probability for class 1: {y_proba[:, 1].min():.3f}")
    print(f"  Max probability for class 1: {y_proba[:, 1].max():.3f}")


def save_model(model, scaler, model_path='biceps_model.pkl', scaler_path='scaler.pkl'):
    """
    Save trained model and scaler to disk.
    
    Args:
        model: Trained model
        scaler: Fitted scaler
        model_path: Path to save model
        scaler_path: Path to save scaler
    """
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    
    print("\n" + "="*60)
    print("MODEL SAVED SUCCESSFULLY")
    print("="*60)
    print(f"Model saved to: {model_path}")
    print(f"Scaler saved to: {scaler_path}")


def main():
    """Main training pipeline."""
    print("="*60)
    print("BICEPS CURL FORM EVALUATION - MODEL TRAINING")
    print("="*60)
    
    # Load data
    X, y, filenames, feature_names = load_data()
    
    # Train model
    model, scaler, X_train, X_test, y_train, y_test = train_model(X, y, feature_names)
    
    # Evaluate model
    evaluate_model(model, X_test, y_test)
    
    # Save model
    save_model(model, scaler)
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("="*60)
    print("\nYou can now use predict.py to score new videos.")


if __name__ == "__main__":
    main()
