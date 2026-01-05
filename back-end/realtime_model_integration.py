"""
Realtime Risk Pipeline Model Integration Script
This script demonstrates how to use the realtime XGBoost model and outputs.
"""
import os
import json
import pandas as pd
from pathlib import Path

# Set up paths
BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models" / "realtime_risk_pipeline"
OUTPUTS_PATH = MODELS_DIR / "outputs"

def load_realtime_metrics():
    """
    Load realtime XGBoost model performance metrics.
    """
    print("📊 Loading Realtime Model Metrics...")
    
    metrics_path = OUTPUTS_PATH / "metrics.json"
    classification_path = OUTPUTS_PATH / "classification_metrics.json"
    vehicle_metrics_path = OUTPUTS_PATH / "classification_metrics_per_vehicle.json"
    
    metrics = {}
    
    if metrics_path.exists():
        with open(metrics_path, 'r') as f:
            metrics['regression'] = json.load(f)
        print(f"✅ Loaded regression metrics from {metrics_path}")
    
    if classification_path.exists():
        with open(classification_path, 'r') as f:
            metrics['classification'] = json.load(f)
        print(f"✅ Loaded classification metrics from {classification_path}")
    
    if vehicle_metrics_path.exists():
        with open(vehicle_metrics_path, 'r') as f:
            metrics['vehicle_specific'] = json.load(f)
        print(f"✅ Loaded vehicle-specific metrics from {vehicle_metrics_path}")
    
    return metrics


def load_feature_importance():
    """
    Load feature importance values from XGBoost model.
    """
    print("\n🔍 Loading Feature Importance...")
    
    features_path = OUTPUTS_PATH / "top_features.csv"
    
    if features_path.exists():
        df = pd.read_csv(features_path)
        print(f"✅ Loaded {len(df)} features from {features_path}")
        return df
    else:
        print(f"❌ Feature importance not found at {features_path}")
        return None


def load_predictions():
    """
    Load model predictions from test set.
    Returns pandas DataFrame with predictions and errors.
    """
    print("\n🎯 Loading Model Predictions...")
    
    predictions_path = OUTPUTS_PATH / "predictions.csv"
    
    if predictions_path.exists():
        df = pd.read_csv(predictions_path)
        print(f"✅ Loaded {len(df)} predictions from {predictions_path}")
        return df
    else:
        print(f"❌ Predictions not found at {predictions_path}")
        return None


def load_vehicle_thresholds():
    """
    Load per-vehicle risk thresholds.
    """
    print("\n⚙️  Loading Vehicle Thresholds...")
    
    thresholds_path = OUTPUTS_PATH / "vehicle_thresholds.csv"
    
    if thresholds_path.exists():
        df = pd.read_csv(thresholds_path)
        print(f"✅ Loaded thresholds for {len(df)} vehicle types")
        return df
    else:
        print(f"❌ Vehicle thresholds not found at {thresholds_path}")
        return None


def analyze_regression_performance(metrics):
    """
    Print detailed regression performance analysis.
    """
    if 'regression' not in metrics:
        print("\n❌ Regression metrics not available")
        return
    
    print("\n📈 XGBoost Regression Performance")
    print("=" * 60)
    
    reg_metrics = metrics['regression']
    test_metrics = reg_metrics.get('test_metrics', {})
    
    print(f"\nModel: {reg_metrics.get('model', 'XGBRegressor')}")
    print(f"Tuned: {'Yes' if reg_metrics.get('tuned', False) else 'No'}")
    print(f"\nDataset Size:")
    print(f"  Training:   {reg_metrics.get('n_train', 0):>4} samples")
    print(f"  Test:       {reg_metrics.get('n_test', 0):>4} samples")
    print(f"  Total:      {reg_metrics.get('n_train', 0) + reg_metrics.get('n_test', 0):>4} samples")
    
    print(f"\nRegression Metrics:")
    print(f"  R² Score:   {test_metrics.get('r2', 0):.4f} ({test_metrics.get('r2', 0)*100:.1f}%)")
    print(f"  MAE:        {test_metrics.get('mae', 0):.6f}")
    print(f"  RMSE:       {test_metrics.get('rmse', 0):.6f}")
    
    # Interpret R² score
    r2 = test_metrics.get('r2', 0)
    if r2 >= 0.8:
        quality = "Excellent"
    elif r2 >= 0.6:
        quality = "Good"
    elif r2 >= 0.4:
        quality = "Moderate"
    else:
        quality = "Poor"
    
    print(f"\n  Model Quality: {quality} (R² = {r2:.2f})")


def analyze_classification_performance(metrics):
    """
    Print classification performance analysis.
    """
    if 'classification' not in metrics:
        print("\n❌ Classification metrics not available")
        return
    
    print("\n🎯 Binary Classification Performance (High-Risk Detection)")
    print("=" * 60)
    
    class_metrics = metrics['classification']
    
    print(f"\nThreshold Strategy: {class_metrics.get('strategy', 'N/A')}")
    print(f"Threshold Mode:     {class_metrics.get('threshold_mode', 'N/A')}")
    print(f"Global Threshold:   {class_metrics.get('global_threshold', 0):.4f}")
    
    print(f"\nOverall Performance:")
    print(f"  Accuracy:   {class_metrics.get('accuracy', 0):.1%}")
    print(f"  Precision:  {class_metrics.get('precision', 0):.1%}")
    print(f"  Recall:     {class_metrics.get('recall', 0):.1%}")
    print(f"  F1 Score:   {class_metrics.get('f1', 0):.1%}")


def analyze_vehicle_performance(metrics):
    """
    Print per-vehicle performance analysis.
    """
    if 'vehicle_specific' not in metrics:
        print("\n❌ Vehicle-specific metrics not available")
        return
    
    print("\n🚗 Per-Vehicle Classification Performance")
    print("=" * 60)
    
    vehicles = metrics['vehicle_specific']
    
    # Sort by F1 score
    vehicles_sorted = sorted(vehicles, key=lambda x: x.get('f1', 0), reverse=True)
    
    print(f"\nTop Performers:")
    for idx, vehicle in enumerate(vehicles_sorted[:5], 1):
        print(f"\n  {idx}. {vehicle['Vehicle']}")
        print(f"     F1 Score:    {vehicle.get('f1', 0):.1%}")
        print(f"     Accuracy:    {vehicle.get('accuracy', 0):.1%}")
        print(f"     Samples:     {vehicle.get('n_test', 0)}")
        print(f"     Threshold:   {vehicle.get('threshold_used', 0):.4f}")
    
    print(f"\n\nAll Vehicles Summary:")
    print(f"{'Vehicle':<25} {'F1':<8} {'Acc':<8} {'Samples':<8} {'Threshold'}")
    print("-" * 65)
    for vehicle in vehicles_sorted:
        print(
            f"{vehicle['Vehicle']:<25} "
            f"{vehicle.get('f1', 0):>6.1%}  "
            f"{vehicle.get('accuracy', 0):>6.1%}  "
            f"{vehicle.get('n_test', 0):>7}  "
            f"{vehicle.get('threshold_used', 0):.4f}"
        )


def analyze_feature_importance(features_df):
    """
    Analyze and display top features.
    """
    if features_df is None:
        print("\n❌ Feature importance data not available")
        return
    
    print("\n🔍 Top Predictive Features")
    print("=" * 60)
    
    print(f"\nTop 10 Most Important Features:")
    print(f"{'Rank':<6} {'Feature':<35} {'Importance':<12} {'Contribution'}")
    print("-" * 70)
    
    total_importance = features_df['importance'].sum()
    cumulative = 0
    
    for idx, row in features_df.head(10).iterrows():
        importance = row['importance']
        pct = (importance / total_importance) * 100
        cumulative += pct
        
        print(
            f"{idx+1:<6} "
            f"{row['feature']:<35} "
            f"{importance:>10.4f}  "
            f"{pct:>5.1f}%"
        )
    
    print(f"\nTop 10 features account for {cumulative:.1f}% of total importance")
    
    # Identify key feature categories
    print(f"\nFeature Categories:")
    speed_features = features_df[features_df['feature'].str.contains('speed', case=False, na=False)]
    weather_features = features_df[features_df['feature'].str.contains('Temperature|Wind|Humidity', case=False, na=False)]
    vehicle_features = features_df[features_df['feature'].str.contains('Vehicle_', case=False, na=False)]
    location_features = features_df[features_df['feature'].str.contains('Latitude|Longitude|segment', case=False, na=False)]
    
    print(f"  Speed-related:    {len(speed_features)} features, {speed_features['importance'].sum():.1%} importance")
    print(f"  Weather-related:  {len(weather_features)} features, {weather_features['importance'].sum():.1%} importance")
    print(f"  Vehicle-related:  {len(vehicle_features)} features, {vehicle_features['importance'].sum():.1%} importance")
    print(f"  Location-related: {len(location_features)} features, {location_features['importance'].sum():.1%} importance")


def analyze_predictions(predictions_df):
    """
    Analyze prediction accuracy and errors.
    """
    if predictions_df is None:
        print("\n❌ Predictions data not available")
        return
    
    print("\n🎯 Prediction Analysis")
    print("=" * 60)
    
    # Overall accuracy
    correct = (predictions_df['is_high_true'] == predictions_df['is_high_pred']).sum()
    total = len(predictions_df)
    accuracy = correct / total
    
    print(f"\nOverall Performance:")
    print(f"  Total Predictions:  {total}")
    print(f"  Correct:            {correct} ({correct/total:.1%})")
    print(f"  Incorrect:          {total-correct} ({(total-correct)/total:.1%})")
    
    # Error analysis
    predictions_df['abs_residual'] = predictions_df['residual'].abs()
    mean_error = predictions_df['abs_residual'].mean()
    max_error = predictions_df['abs_residual'].max()
    
    print(f"\nError Statistics:")
    print(f"  Mean Absolute Error:  {mean_error:.6f}")
    print(f"  Max Absolute Error:   {max_error:.6f}")
    print(f"  Std Deviation:        {predictions_df['abs_residual'].std():.6f}")
    
    # Worst predictions
    print(f"\nTop 5 Largest Prediction Errors:")
    worst = predictions_df.nlargest(5, 'abs_residual')
    for idx, row in worst.iterrows():
        print(
            f"  {row['Vehicle']:<20} "
            f"True: {row['SPI_true']:.4f}  "
            f"Pred: {row['SPI_pred']:.4f}  "
            f"Error: {row['abs_residual']:.4f}"
        )
    
    # Vehicle-wise performance
    print(f"\nVehicle-wise Prediction Accuracy:")
    vehicle_accuracy = predictions_df.groupby('Vehicle').apply(
        lambda x: (x['is_high_true'] == x['is_high_pred']).mean()
    ).sort_values(ascending=False)
    
    for vehicle, acc in vehicle_accuracy.head(10).items():
        count = len(predictions_df[predictions_df['Vehicle'] == vehicle])
        print(f"  {vehicle:<25} {acc:>6.1%}  ({count} samples)")


def main():
    """
    Main integration demonstration.
    """
    print("🚀 Realtime Risk Pipeline Model Integration")
    print("=" * 60)
    
    # Load all data
    metrics = load_realtime_metrics()
    features_df = load_feature_importance()
    predictions_df = load_predictions()
    thresholds_df = load_vehicle_thresholds()
    
    # Analyze performance
    analyze_regression_performance(metrics)
    analyze_classification_performance(metrics)
    analyze_vehicle_performance(metrics)
    analyze_feature_importance(features_df)
    analyze_predictions(predictions_df)
    
    # Display thresholds
    if thresholds_df is not None:
        print("\n⚙️  Vehicle Risk Thresholds")
        print("=" * 60)
        print(thresholds_df.to_string(index=False))
    
    print("\n" + "=" * 60)
    print("✅ Integration demonstration complete!")
    print("\n💡 Next Steps:")
    print("  1. These metrics are now available via /api/v1/models/realtime/*")
    print("  2. Frontend displays insights in RealtimeModelInsights component")
    print("  3. Use feature importance to understand predictions")
    print("  4. Vehicle-specific thresholds improve classification accuracy")


if __name__ == "__main__":
    main()
