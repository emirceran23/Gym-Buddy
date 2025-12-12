"""
Model Comparison Tool
=====================
Compares all trained RandomForest models on test videos and generates a comprehensive report.

This script:
1. Loads all models from the models directory
2. Tests each model on all test videos
3. Generates comparison tables and charts
4. Saves detailed results
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from datetime import datetime
import json

# Import the predictor with custom feature extraction
sys.path.insert(0, str(Path(__file__).parent))
from biceps_curl_form_predictor import BicepsCurlFormPredictor


class ModelComparator:
    """Compares multiple trained models on test videos."""
    
    def __init__(self, models_dir='../models', test_videos_dir='../models/testvideos'):
        """
        Initialize the comparator.
        
        Args:
            models_dir: Directory containing model files
            test_videos_dir: Directory containing test videos
        """
        self.models_dir = Path(models_dir)
        self.test_videos_dir = Path(test_videos_dir)
        self.results = []
        
        # Model metadata (based on training approach)
        self.model_metadata = {
            'biceps_curl_rf_model_initial.joblib': {
                'name': 'Initial Model',
                'description': 'First baseline model with video duration',
                'features': 18,
                'includes_duration': True,
                'data_augmentation': False,
                'symmetric_features': False
            },
            'biceps_curl_rf_model_no_duration_newest.joblib': {
                'name': 'No Duration',
                'description': 'Removed video_duration feature to reduce temporal bias',
                'features': 17,
                'includes_duration': False,
                'data_augmentation': False,
                'symmetric_features': False
            },
            'biceps_curl_rf_model_shorterTrueVideos.joblib': {
                'name': 'Shorter True Videos',
                'description': 'Trained with balanced dataset (shortened good form videos)',
                'features': 18,
                'includes_duration': True,
                'data_augmentation': False,
                'symmetric_features': False
            },
            'biceps_curl_rf_augmented.joblib': {
                'name': 'Augmented Dataset',
                'description': 'Trained with augmented data (flipped videos, different feature order)',
                'features': 17,
                'includes_duration': False,
                'data_augmentation': True,
                'symmetric_features': False
            },
            'biceps_curl_rf_symmetric_mean.joblib': {
                'name': 'Symmetric Mean',
                'description': 'Uses averaged left/right features for bilateral symmetry',
                'features': 11,
                'includes_duration': False,
                'data_augmentation': True,
                'symmetric_features': True
            }
        }
    
    def find_models(self):
        """Find all model files in the models directory."""
        model_files = list(self.models_dir.glob('biceps_curl_rf_*.joblib'))
        print(f"Found {len(model_files)} models:")
        for mf in model_files:
            print(f"  - {mf.name}")
        return model_files
    
    def find_test_videos(self):
        """Find all test videos."""
        video_extensions = ('.mp4', '.mov', '.avi', '.mkv')
        videos = [v for v in self.test_videos_dir.glob('*') if v.suffix.lower() in video_extensions]
        print(f"\nFound {len(videos)} test videos:")
        for v in videos:
            print(f"  - {v.name}")
        return videos
    
    def load_model_features(self, model_path):
        """Load model and get its expected features."""
        model = joblib.load(model_path)
        features = list(model.feature_names_in_)
        return model, features
    
    def test_model_on_video(self, model_path, video_path, model_name):
        """Test a single model on a single video."""
        try:
            print(f"\n    Testing {model_name} on {video_path.name}...")
            
            # Load model and get features
            model, expected_features = self.load_model_features(model_path)
            
            # Create predictor instance (it will extract features)
            predictor = BicepsCurlFormPredictor(model_path=str(model_path))
            
            # Extract features from video
            features = predictor.extract_features_from_video(
                video_path=str(video_path),
                frame_skip=2,
                max_frames=None,
                min_frames=5
            )
            
            if features is None:
                return None
            
            # Select only the features this model needs (in correct order)
            X = pd.DataFrame([features])[expected_features]
            X = X.fillna(0)
            
            # Make prediction
            prediction = model.predict(X)[0]
            probabilities = model.predict_proba(X)[0]
            
            result = {
                'model_name': model_name,
                'model_file': model_path.name,
                'video_name': video_path.name,
                'video_path': str(video_path),
                'prediction': int(prediction),
                'prediction_label': 'Good Form' if prediction == 1 else 'Bad Form',
                'confidence_good': float(probabilities[1]),
                'confidence_bad': float(probabilities[0]),
                'features_used': len(expected_features)
            }
            
            print(f"      → {result['prediction_label']} ({result['confidence_good']*100:.1f}% confidence)")
            
            return result
            
        except Exception as e:
            print(f"      ❌ Error: {e}")
            return None
    
    def run_comparison(self):
        """Run full comparison of all models on all videos."""
        print("="*70)
        print("MODEL COMPARISON STARTING")
        print("="*70)
        
        models = self.find_models()
        videos = self.find_test_videos()
        
        if not models:
            print("❌ No models found!")
            return
        
        if not videos:
            print("❌ No test videos found!")
            return
        
        print(f"\n🔬 Running {len(models)} models × {len(videos)} videos = {len(models) * len(videos)} predictions\n")
        
        results = []
        
        for model_path in models:
            model_name = self.model_metadata.get(model_path.name, {}).get('name', model_path.stem)
            print(f"\n📊 Testing Model: {model_name}")
            print(f"   File: {model_path.name}")
            
            for video_path in videos:
                result = self.test_model_on_video(model_path, video_path, model_name)
                if result:
                    results.append(result)
        
        self.results = results
        print(f"\n✅ Completed {len(results)} successful predictions")
        
        return results
    
    def generate_summary_table(self):
        """Generate summary statistics table."""
        if not self.results:
            print("No results to summarize")
            return None
        
        df = pd.DataFrame(self.results)
        
        # Summary by model
        summary = df.groupby('model_name').agg({
            'prediction': ['count', lambda x: (x == 1).sum(), lambda x: (x == 0).sum()],
            'confidence_good': ['mean', 'std'],
            'features_used': 'first'
        }).round(3)
        
        summary.columns = ['Total Videos', 'Predicted Good', 'Predicted Bad', 
                          'Avg Confidence (Good)', 'Std Confidence', 'Features Used']
        
        # Calculate percentage
        summary['% Good Form'] = (summary['Predicted Good'] / summary['Total Videos'] * 100).round(1)
        
        return summary
    
    def generate_video_comparison_table(self):
        """Generate table showing how each video was classified by each model."""
        if not self.results:
            return None
        
        df = pd.DataFrame(self.results)
        
        # Pivot table: videos as rows, models as columns
        pivot_predictions = df.pivot_table(
            index='video_name',
            columns='model_name',
            values='prediction_label',
            aggfunc='first'
        )
        
        # Pivot for confidence scores
        pivot_confidence = df.pivot_table(
            index='video_name',
            columns='model_name',
            values='confidence_good',
            aggfunc='first'
        )
        
        # Combine into one table with confidence in parentheses
        combined = pivot_predictions.copy()
        for col in combined.columns:
            combined[col] = combined[col] + ' (' + (pivot_confidence[col] * 100).round(1).astype(str) + '%)'
        
        return combined
    
    def create_visualizations(self, output_dir=None):
        """Create comparison visualizations."""
        if output_dir is None:
            output_dir = self.models_dir / 'comparison_results'
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if not self.results:
            print("No results to visualize")
            return
        
        df = pd.DataFrame(self.results)
        
        # Set style
        sns.set_style("whitegrid")
        plt.rcParams['figure.figsize'] = (14, 8)
        
        # 1. Confidence distribution by model
        fig, axes = plt.subplots(2, 1, figsize=(14, 10))
        
        # Good form confidence
        sns.boxplot(data=df, x='model_name', y='confidence_good', ax=axes[0])
        axes[0].set_title('Good Form Confidence Distribution by Model', fontsize=14, fontweight='bold')
        axes[0].set_xlabel('Model', fontsize=12)
        axes[0].set_ylabel('Confidence (Good Form)', fontsize=12)
        axes[0].tick_params(axis='x', rotation=45)
        axes[0].axhline(y=0.5, color='r', linestyle='--', label='Decision Threshold')
        axes[0].legend()
        
        # Prediction counts
        pred_counts = df.groupby(['model_name', 'prediction_label']).size().unstack(fill_value=0)
        pred_counts.plot(kind='bar', ax=axes[1], color=['#ff6b6b', '#51cf66'])
        axes[1].set_title('Prediction Distribution by Model', fontsize=14, fontweight='bold')
        axes[1].set_xlabel('Model', fontsize=12)
        axes[1].set_ylabel('Count', fontsize=12)
        axes[1].legend(title='Prediction', labels=['Bad Form', 'Good Form'])
        axes[1].tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.savefig(output_dir / 'model_comparison_overview.png', dpi=300, bbox_inches='tight')
        print(f"  📊 Saved: {output_dir / 'model_comparison_overview.png'}")
        plt.close()
        
        # 2. Heatmap of predictions per video
        fig, ax = plt.subplots(figsize=(12, 8))
        
        # Create numeric pivot for heatmap (1 = Good, 0 = Bad)
        heatmap_data = df.pivot_table(
            index='video_name',
            columns='model_name',
            values='prediction',
            aggfunc='first'
        )
        
        sns.heatmap(heatmap_data, annot=True, fmt='g', cmap='RdYlGn', 
                   cbar_kws={'label': '0=Bad, 1=Good'}, ax=ax, vmin=0, vmax=1)
        ax.set_title('Model Predictions Heatmap\n(0 = Bad Form, 1 = Good Form)', 
                    fontsize=14, fontweight='bold')
        ax.set_xlabel('Model', fontsize=12)
        ax.set_ylabel('Video', fontsize=12)
        
        plt.tight_layout()
        plt.savefig(output_dir / 'predictions_heatmap.png', dpi=300, bbox_inches='tight')
        print(f"  📊 Saved: {output_dir / 'predictions_heatmap.png'}")
        plt.close()
        
        # 3. Confidence comparison for each video
        fig, ax = plt.subplots(figsize=(14, 8))
        
        video_groups = df.groupby('video_name')
        x_pos = np.arange(len(df['model_name'].unique()))
        width = 0.8 / len(df['video_name'].unique())
        
        for i, (video_name, group) in enumerate(video_groups):
            group = group.sort_values('model_name')
            ax.bar(x_pos + i * width, group['confidence_good'].values, 
                  width=width, label=video_name[:20])
        
        ax.set_xlabel('Model', fontsize=12)
        ax.set_ylabel('Confidence (Good Form)', fontsize=12)
        ax.set_title('Confidence Scores Comparison Across Videos', fontsize=14, fontweight='bold')
        ax.set_xticks(x_pos + width * len(df['video_name'].unique()) / 2)
        ax.set_xticklabels(df['model_name'].unique(), rotation=45, ha='right')
        ax.axhline(y=0.5, color='r', linestyle='--', linewidth=1, alpha=0.5)
        ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=8)
        ax.grid(axis='y', alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(output_dir / 'confidence_comparison.png', dpi=300, bbox_inches='tight')
        print(f"  📊 Saved: {output_dir / 'confidence_comparison.png'}")
        plt.close()
        
        print(f"\n✅ All visualizations saved to: {output_dir}")
    
    def save_results(self, output_dir=None):
        """Save detailed results to files."""
        if output_dir is None:
            output_dir = self.models_dir / 'comparison_results'
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if not self.results:
            print("No results to save")
            return
        
        # Save detailed results as CSV
        df = pd.DataFrame(self.results)
        csv_path = output_dir / 'detailed_results.csv'
        df.to_csv(csv_path, index=False)
        print(f"  💾 Saved: {csv_path}")
        
        # Save summary table
        summary = self.generate_summary_table()
        summary_path = output_dir / 'model_summary.csv'
        summary.to_csv(summary_path)
        print(f"  💾 Saved: {summary_path}")
        
        # Save video comparison table
        video_comp = self.generate_video_comparison_table()
        video_path = output_dir / 'video_comparison.csv'
        video_comp.to_csv(video_path)
        print(f"  💾 Saved: {video_path}")
        
        # Save model metadata
        metadata_path = output_dir / 'model_metadata.json'
        with open(metadata_path, 'w') as f:
            json.dump(self.model_metadata, f, indent=2)
        print(f"  💾 Saved: {metadata_path}")
        
        # Generate markdown report
        self.generate_markdown_report(output_dir)
    
    def generate_markdown_report(self, output_dir):
        """Generate a comprehensive markdown report."""
        report_path = output_dir / 'COMPARISON_REPORT.md'
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("# Biceps Curl Form Classification - Model Comparison Report\n\n")
            f.write(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("---\n\n")
            
            # Model Overview
            f.write("## 📋 Model Overview\n\n")
            f.write("| Model | Features | Description |\n")
            f.write("|-------|----------|-------------|\n")
            for model_file, meta in self.model_metadata.items():
                f.write(f"| **{meta['name']}** | {meta['features']} | {meta['description']} |\n")
            f.write("\n")
            
            # Model Characteristics
            f.write("## 🔍 Model Characteristics\n\n")
            f.write("| Model | Includes Duration | Data Augmentation | Symmetric Features |\n")
            f.write("|-------|-------------------|-------------------|--------------------|\n")
            for model_file, meta in self.model_metadata.items():
                dur = "✅" if meta['includes_duration'] else "❌"
                aug = "✅" if meta['data_augmentation'] else "❌"
                sym = "✅" if meta['symmetric_features'] else "❌"
                f.write(f"| **{meta['name']}** | {dur} | {aug} | {sym} |\n")
            f.write("\n")
            
            # Summary Statistics
            f.write("## 📊 Summary Statistics\n\n")
            summary = self.generate_summary_table()
            f.write(summary.to_markdown())
            f.write("\n\n")
            
            # Video-by-Video Comparison
            f.write("## 🎬 Video-by-Video Predictions\n\n")
            video_comp = self.generate_video_comparison_table()
            f.write(video_comp.to_markdown())
            f.write("\n\n")
            
            # Detailed Results
            f.write("## 📝 Detailed Predictions\n\n")
            df = pd.DataFrame(self.results)
            
            for model_name in df['model_name'].unique():
                f.write(f"### {model_name}\n\n")
                model_results = df[df['model_name'] == model_name]
                
                for _, row in model_results.iterrows():
                    f.write(f"**{row['video_name']}**\n")
                    f.write(f"- Prediction: {row['prediction_label']}\n")
                    f.write(f"- Good Form Confidence: {row['confidence_good']*100:.1f}%\n")
                    f.write(f"- Bad Form Confidence: {row['confidence_bad']*100:.1f}%\n\n")
            
            # Analysis
            f.write("## 🎯 Analysis\n\n")
            f.write("### Key Findings\n\n")
            
            # Find model with highest average confidence
            summary = self.generate_summary_table()
            best_conf_model = summary['Avg Confidence (Good)'].idxmax()
            f.write(f"- **Most Confident Model**: {best_conf_model} ")
            f.write(f"(avg confidence: {summary.loc[best_conf_model, 'Avg Confidence (Good)']*100:.1f}%)\n")
            
            # Find most optimistic/pessimistic model
            most_good = summary['% Good Form'].idxmax()
            most_bad = summary['% Good Form'].idxmin()
            f.write(f"- **Most Optimistic** (predicts more good form): {most_good} ")
            f.write(f"({summary.loc[most_good, '% Good Form']:.1f}% good)\n")
            f.write(f"- **Most Pessimistic** (predicts more bad form): {most_bad} ")
            f.write(f"({summary.loc[most_bad, '% Good Form']:.1f}% good)\n\n")
            
            # Model agreement
            video_comp = self.generate_video_comparison_table()
            f.write("### Model Agreement\n\n")
            for video in video_comp.index:
                predictions = [str(p).split('(')[0].strip() for p in video_comp.loc[video]]
                good_count = predictions.count('Good Form')
                total = len(predictions)
                agreement = (good_count / total) * 100 if good_count > total/2 else ((total - good_count) / total) * 100
                majority = "Good Form" if good_count > total/2 else "Bad Form"
                f.write(f"- **{video}**: {good_count}/{total} models predict Good Form → ")
                f.write(f"**{majority}** ({agreement:.0f}% agreement)\n")
            f.write("\n")
            
            f.write("---\n\n")
            f.write("## 📈 Visualizations\n\n")
            f.write("See the following files for visual comparisons:\n\n")
            f.write("- `model_comparison_overview.png` - Overall model performance\n")
            f.write("- `predictions_heatmap.png` - Prediction matrix heatmap\n")
            f.write("- `confidence_comparison.png` - Confidence scores across videos\n\n")
        
        print(f"  📄 Saved: {report_path}")


def main():
    """Main execution function."""
    print("="*70)
    print("🏋️ BICEPS CURL FORM - MODEL COMPARISON TOOL")
    print("="*70)
    
    # Determine paths relative to script location
    script_dir = Path(__file__).parent
    models_dir = script_dir.parent / 'models'
    test_videos_dir = models_dir / 'testvideos'
    
    # Create comparator
    comparator = ModelComparator(
        models_dir=str(models_dir),
        test_videos_dir=str(test_videos_dir)
    )
    
    # Run comparison
    results = comparator.run_comparison()
    
    if not results:
        print("\n❌ No results generated. Please check models and videos.")
        return
    
    # Generate outputs
    print("\n" + "="*70)
    print("GENERATING COMPARISON REPORT")
    print("="*70)
    
    # Display summary table
    print("\n📊 Summary Statistics:")
    print("-" * 70)
    summary = comparator.generate_summary_table()
    print(summary)
    
    print("\n🎬 Video Predictions:")
    print("-" * 70)
    video_comp = comparator.generate_video_comparison_table()
    print(video_comp)
    
    # Save results
    print("\n💾 Saving Results...")
    comparator.save_results()
    
    # Create visualizations
    print("\n📊 Creating Visualizations...")
    comparator.create_visualizations()
    
    print("\n" + "="*70)
    print("✅ COMPARISON COMPLETE!")
    print("="*70)
    print("\n📁 Results saved to: models/comparison_results/")
    print("\nFiles generated:")
    print("  - COMPARISON_REPORT.md (comprehensive report)")
    print("  - detailed_results.csv (all predictions)")
    print("  - model_summary.csv (summary statistics)")
    print("  - video_comparison.csv (predictions by video)")
    print("  - model_metadata.json (model information)")
    print("  - *.png (visualization charts)")


if __name__ == "__main__":
    main()
