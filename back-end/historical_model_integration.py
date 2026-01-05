"""
Historical Risk Engine Model Integration Script
This script demonstrates how to use the historical risk engine models and outputs.
"""
import os
import json
import joblib
import pandas as pd
from pathlib import Path

# Set up paths
BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models" / "historical_risk_engine"
MODELS_PATH = MODELS_DIR / "models"
OUTPUTS_PATH = MODELS_DIR / "outputs"

def load_historical_models():
    """
    Load the historical risk engine models (cause classifier and segment GBR).
    Returns dict with both models and their metadata.
    """
    print("📦 Loading Historical Risk Engine Models...")
    
    # Load cause classifier
    cause_classifier_path = MODELS_PATH / "cause_classifier.joblib"
    segment_gbr_path = MODELS_PATH / "segment_gbr.joblib"
    
    models = {}
    
    if cause_classifier_path.exists():
        models['cause_classifier'] = joblib.load(cause_classifier_path)
        print(f"✅ Loaded cause classifier from {cause_classifier_path}")
    else:
        print(f"❌ Cause classifier not found at {cause_classifier_path}")
    
    if segment_gbr_path.exists():
        models['segment_gbr'] = joblib.load(segment_gbr_path)
        print(f"✅ Loaded segment GBR model from {segment_gbr_path}")
    else:
        print(f"❌ Segment GBR not found at {segment_gbr_path}")
    
    return models


def load_model_metrics():
    """
    Load model performance metrics from the outputs directory.
    """
    print("\n📊 Loading Model Metrics...")
    
    metrics_path = OUTPUTS_PATH / "metrics.json"
    classification_metrics_path = OUTPUTS_PATH / "classification_metrics.json"
    
    metrics = {}
    
    if metrics_path.exists():
        with open(metrics_path, 'r') as f:
            metrics['full'] = json.load(f)
        print(f"✅ Loaded full metrics from {metrics_path}")
    
    if classification_metrics_path.exists():
        with open(classification_metrics_path, 'r') as f:
            metrics['classification'] = json.load(f)
        print(f"✅ Loaded classification metrics from {classification_metrics_path}")
    
    return metrics


def load_risk_tiles():
    """
    Load historical risk tiles data.
    Returns pandas DataFrame with segment-level risk information.
    """
    print("\n🗺️  Loading Risk Tiles Data...")
    
    risk_tiles_path = OUTPUTS_PATH / "risk_tiles.csv"
    
    if risk_tiles_path.exists():
        df = pd.read_csv(risk_tiles_path)
        print(f"✅ Loaded {len(df)} risk tiles from {risk_tiles_path}")
        return df
    else:
        print(f"❌ Risk tiles not found at {risk_tiles_path}")
        return None


def analyze_cause_classifier_performance(metrics):
    """
    Print detailed cause classifier performance analysis.
    """
    if 'full' not in metrics or 'cause_classifier' not in metrics['full']:
        print("\n❌ Cause classifier metrics not available")
        return
    
    print("\n🎯 Cause Classifier Performance Analysis")
    print("=" * 60)
    
    cc_metrics = metrics['full']['cause_classifier']
    
    print(f"\nOverall Metrics:")
    print(f"  Accuracy:           {cc_metrics['accuracy']:.1%}")
    print(f"  F1 Score (Macro):   {cc_metrics['f1_macro']:.1%}")
    print(f"  Precision (Macro):  {cc_metrics['precision_macro']:.1%}")
    print(f"  Recall (Macro):     {cc_metrics['recall_macro']:.1%}")
    
    print(f"\nPer-Class Performance:")
    for cause_type, class_metrics in cc_metrics['per_class'].items():
        print(f"\n  {cause_type}:")
        print(f"    Precision: {class_metrics['precision']:.1%}")
        print(f"    Recall:    {class_metrics['recall']:.1%}")
        print(f"    F1-Score:  {class_metrics['f1-score']:.1%}")
        print(f"    Support:   {int(class_metrics['support'])} samples")


def analyze_segment_gbr_performance(metrics):
    """
    Print segment GBR model performance analysis.
    """
    if 'full' not in metrics:
        print("\n❌ Segment GBR metrics not available")
        return
    
    print("\n📈 Segment Risk Severity Model Performance")
    print("=" * 60)
    
    # Extract GBR metrics from the full metrics
    full_metrics = metrics['full']
    
    if 'segment_gbr_rmse' in full_metrics:
        print(f"\nRegression Metrics:")
        print(f"  RMSE:  {full_metrics['segment_gbr_rmse']:.6f}")
        if 'segment_gbr_mae' in full_metrics:
            print(f"  MAE:   {full_metrics['segment_gbr_mae']:.6f}")
        if 'segment_gbr_r2' in full_metrics:
            print(f"  R²:    {full_metrics['segment_gbr_r2']:.4f}")


def analyze_high_risk_segments(risk_tiles_df, min_spi=0.38, top_n=10):
    """
    Analyze and display high-risk segments from risk tiles data.
    """
    if risk_tiles_df is None:
        print("\n❌ Risk tiles data not available")
        return
    
    print(f"\n🚨 Top {top_n} High-Risk Segments (SPI ≥ {min_spi})")
    print("=" * 60)
    
    # Filter and sort by SPI
    high_risk = risk_tiles_df[risk_tiles_df['SPI_tile'] >= min_spi]
    high_risk = high_risk.sort_values('SPI_tile', ascending=False).head(top_n)
    
    print(f"\nFound {len(high_risk)} high-risk segments:")
    
    for idx, row in high_risk.iterrows():
        print(f"\n  Segment: {row['segment_id']}")
        print(f"    SPI Score:       {row['SPI_tile']:.4f}")
        print(f"    Location:        ({row['lat_bin']:.3f}, {row['lon_bin']:.3f})")
        print(f"    Vehicle:         {row['Vehicle']}")
        print(f"    Time:            Hour {row['hour']:02d}, Day {row['dow']} ({'Wet' if row['is_wet'] else 'Dry'})")
        print(f"    Incidents:       {row['incident_count']}")
        print(f"    Speed-Related:   {row['speed_reason_rate']:.1%}")


def analyze_vehicle_risk_patterns(risk_tiles_df):
    """
    Analyze risk patterns by vehicle type.
    """
    if risk_tiles_df is None:
        print("\n❌ Risk tiles data not available")
        return
    
    print("\n🚗 Vehicle Type Risk Analysis")
    print("=" * 60)
    
    vehicle_stats = risk_tiles_df.groupby('Vehicle').agg({
        'SPI_tile': ['mean', 'max', 'count'],
        'incident_count': 'sum',
        'speed_reason_rate': 'mean'
    }).round(4)
    
    vehicle_stats.columns = ['Avg_SPI', 'Max_SPI', 'Segment_Count', 'Total_Incidents', 'Avg_Speed_Rate']
    vehicle_stats = vehicle_stats.sort_values('Avg_SPI', ascending=False)
    
    print("\nVehicle Type Statistics:")
    print(vehicle_stats.to_string())


def predict_accident_cause(models, features):
    """
    Example: Predict accident cause using the cause classifier.
    
    Args:
        models: dict containing loaded models
        features: dict or DataFrame with required features
    """
    if 'cause_classifier' not in models:
        print("\n❌ Cause classifier not loaded")
        return None
    
    print("\n🔮 Predicting Accident Cause...")
    
    # Note: You'll need to know the exact feature names and preprocessing
    # used during training. This is a placeholder example.
    try:
        prediction = models['cause_classifier'].predict(features)
        probabilities = models['cause_classifier'].predict_proba(features)
        
        print(f"Predicted Cause: {prediction[0]}")
        print(f"Confidence: {probabilities.max():.1%}")
        
        return prediction[0]
    except Exception as e:
        print(f"❌ Prediction failed: {e}")
        return None


def main():
    """
    Main integration demonstration.
    """
    print("🚀 Historical Risk Engine Model Integration")
    print("=" * 60)
    
    # Load models
    models = load_historical_models()
    
    # Load metrics
    metrics = load_model_metrics()
    
    # Load risk tiles
    risk_tiles_df = load_risk_tiles()
    
    # Analyze performance
    analyze_cause_classifier_performance(metrics)
    analyze_segment_gbr_performance(metrics)
    
    # Analyze risk patterns
    if risk_tiles_df is not None:
        analyze_high_risk_segments(risk_tiles_df, min_spi=0.38, top_n=10)
        analyze_vehicle_risk_patterns(risk_tiles_df)
    
    print("\n" + "=" * 60)
    print("✅ Integration demonstration complete!")
    print("\n💡 Next Steps:")
    print("  1. Use these models in your FastAPI endpoints")
    print("  2. Integrate predictions into the risk scoring API")
    print("  3. Display historical insights in the frontend")
    print("  4. Create visualizations for risk tiles data")


if __name__ == "__main__":
    main()
