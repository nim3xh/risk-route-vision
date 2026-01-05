# Realtime Risk Pipeline

This directory contains the trained XGBoost model and outputs from the realtime risk prediction pipeline.

## 📁 Directory Structure

```
realtime_risk_pipeline/
├── realtime_risk_pipeline.ipynb   # Training notebook
├── models/                         # Trained models (not in git)
└── outputs/                        # Model outputs and metrics
    ├── metrics.json                # Regression performance metrics
    ├── classification_metrics.json # Classification performance
    ├── classification_metrics_per_vehicle.json # Per-vehicle performance
    ├── classification_metrics_per_vehicle.csv  # Same in CSV format
    ├── classification_metrics_overall.json     # Overall classification summary
    ├── vehicle_thresholds.csv      # Per-vehicle risk thresholds
    ├── top_features.csv            # Feature importance rankings
    ├── predictions.csv             # Model predictions on test set
    └── predictions_from_pkl.csv    # Predictions from pickled model
```

## 🤖 Model

### XGBoost Regressor (Tuned)
**Purpose**: Real-time risk prediction using vehicle-specific features and environmental conditions

**Target**: SPI_smoothed (Severity Performance Index)

**Performance**:
- **R² Score**: 65.2% (Good - explains 65% of variance)
- **MAE**: 0.0098 (Very low prediction error)
- **RMSE**: 0.015 (Low root mean squared error)
- **Dataset**: 315 total samples (252 train / 63 test)

## 📊 Outputs

### Regression Metrics (`metrics.json`)
```json
{
  "dataset_path": "/content/final_dataset.csv",
  "n_train": 252,
  "n_test": 63,
  "target": "SPI_smoothed",
  "model": "XGBRegressor",
  "tuned": true,
  "test_metrics": {
    "r2": 0.6523,
    "mae": 0.0098,
    "rmse": 0.0150
  }
}
```

### Classification Metrics (`classification_metrics.json`)
Binary classification for high-risk detection:
- **Accuracy**: 76.2%
- **Precision**: 90.0%
- **Recall**: 76.6%
- **F1 Score**: 82.8%
- **Strategy**: Per-vehicle thresholds using median
- **Global Threshold**: 0.3507

### Vehicle-Specific Performance (`classification_metrics_per_vehicle.json`)
Performance broken down by 15 vehicle types/combinations:

**Top Performers** (F1 Score = 100%):
- Bus
- Bus / Van
- Motor Cycle
- Car / Three Wheeler
- Lorry / Three Wheeler
- Three Wheel

**Moderate Performers**:
- Lorry (75% F1)
- Bus / Motor Cycle (67% F1)
- Car (60% F1)

**Needs Improvement**:
- Bus / Three Wheeler (0% F1)
- Three Wheeer [sic] (0% F1)

### Vehicle Thresholds (`vehicle_thresholds.csv`)
Per-vehicle risk thresholds optimized for best classification:

| Vehicle | Threshold |
|---------|-----------|
| Bus | 0.3983 |
| Car | 0.3507 |
| Lorry | 0.3507 |
| Motor Cycle | 0.3983 |
| Three Wheeler | 0.3507 |
| Van | 0.3983 |
| __GLOBAL__ | 0.3507 |

### Feature Importance (`top_features.csv`)
Top 10 most important features for prediction:

| Rank | Feature | Importance |
|------|---------|------------|
| 1 | is_speed_reason | 78.32% |
| 2 | Reason_Excessive Speed | 16.23% |
| 3 | description_hash_338 | 0.54% |
| 4 | dow (day of week) | 0.35% |
| 5 | description_hash_181 | 0.27% |
| 6 | timestamp | 0.25% |
| 7 | Reason_Slipped | 0.22% |
| 8 | Latitude | 0.19% |
| 9 | description_hash_55 | 0.19% |
| 10 | Vehicle_Three Wheeler | 0.19% |

**Key Insights**:
- Speed-related features dominate (94.5% combined importance)
- Weather features have minimal impact (< 1% combined)
- Location features contribute modestly (~0.3%)
- Vehicle type has small but measurable effect

### Predictions (`predictions.csv`)
63 test set predictions with columns:
- `SPI_true`: Actual risk score
- `SPI_pred`: Predicted risk score
- `residual`: Prediction error
- `thr_used`: Threshold applied
- `is_high_true`: True high-risk label
- `is_high_pred`: Predicted high-risk label
- `Vehicle`, `Place`, `Reason`, `Position`, `segment_id`, `timestamp`

## 🔌 Integration

### Backend API Endpoints

#### 1. Get Realtime Metrics
```http
GET /api/v1/models/realtime/metrics
```
Returns regression metrics, classification performance, and vehicle-specific results.

#### 2. Get Feature Importance
```http
GET /api/v1/models/realtime/feature-importance?limit=15
```
Returns top N most important features with their importance scores.

#### 3. Get Predictions
```http
GET /api/v1/models/realtime/predictions?limit=20&vehicle=Car&show_errors_only=false
```
Returns model predictions from test set with filtering options.

### Frontend Dashboard
`RealtimeModelInsights` component displays:
1. **XGBoost Regression Performance**: R², MAE, RMSE
2. **Classification Performance**: Accuracy, Precision, Recall, F1
3. **Top Vehicle Performance**: Best 6 vehicle types by F1 score
4. **Feature Importance**: Top 10 predictive features

### Python Integration
```python
import json
import pandas as pd

# Load metrics
with open('outputs/metrics.json', 'r') as f:
    metrics = json.load(f)
    
print(f"R² Score: {metrics['test_metrics']['r2']:.1%}")

# Load predictions
predictions = pd.read_csv('outputs/predictions.csv')
accuracy = (predictions['is_high_true'] == predictions['is_high_pred']).mean()
print(f"Classification Accuracy: {accuracy:.1%}")

# Load feature importance
features = pd.read_csv('outputs/top_features.csv')
print(f"Top feature: {features.iloc[0]['feature']}")
```

## 📈 Use Cases

### 1. Real-time Risk Scoring
Apply model to new route requests:
```python
from ml.model import predict_segment_scores

segments, spi_scores, causes = predict_segment_scores(
    features, 
    coordinates, 
    vehicle_type="Car"
)
```

### 2. High-Risk Classification
Use vehicle-specific thresholds:
```python
import pandas as pd

thresholds = pd.read_csv('outputs/vehicle_thresholds.csv')
threshold = thresholds[thresholds['Vehicle'] == 'Car']['threshold'].iloc[0]

is_high_risk = spi_score >= threshold
```

### 3. Feature Analysis
Understand what drives predictions:
```python
features = pd.read_csv('outputs/top_features.csv')
print("Speed dominates prediction:" if features.iloc[0]['importance'] > 0.5 else "Mixed factors")
```

### 4. Model Monitoring
Track prediction accuracy:
```python
predictions = pd.read_csv('outputs/predictions.csv')

# Overall performance
accuracy = (predictions['is_high_true'] == predictions['is_high_pred']).mean()

# Per-vehicle performance
vehicle_accuracy = predictions.groupby('Vehicle').apply(
    lambda x: (x['is_high_true'] == x['is_high_pred']).mean()
)
```

## 🎯 Model Interpretation

### R² Score (65.2%)
- **Good performance**: Model captures most risk patterns
- **Room for improvement**: 35% of variance unexplained
- Likely due to missing features (road conditions, driver behavior)

### Classification Performance (82.8% F1)
- **Excellent precision (90%)**: Few false alarms
- **Good recall (76.6%)**: Catches most high-risk situations
- Balanced F1 score suitable for production

### Feature Insights
1. **Speed is King**: 78% importance for speed-related features
2. **Time matters**: Day of week contributes 0.35%
3. **Location helps**: Geographic features add ~0.3%
4. **Weather minimal**: Temperature, wind have < 0.2% each

### Vehicle-Specific Thresholds
- **Higher for Bus, Motor Cycle, Van**: 0.3983
- **Lower for Car, Lorry, Three Wheeler**: 0.3507
- Reflects different risk profiles per vehicle type

## 🔄 Model Updates

To retrain with new data:

1. Open `realtime_risk_pipeline.ipynb`
2. Update data source path
3. Run all cells
4. New outputs will overwrite existing files
5. Restart backend to load updated model

## ⚠️ Limitations

1. **Sample Size**: 315 total samples may limit generalization
2. **Speed Dominance**: Over-reliance on speed features (94.5%)
3. **Weather Under-represented**: Weather features have minimal impact
4. **Vehicle Combinations**: Some combinations have too few samples
5. **Geographic Scope**: Limited to specific region

## 🔬 Technical Details

**Algorithm**: XGBoost (Extreme Gradient Boosting)  
**Hyperparameter Tuning**: Yes (tuned=true)  
**Target Variable**: SPI_smoothed (continuous 0-1)  
**Threshold Strategy**: Per-vehicle median  
**Feature Engineering**: Hash encoding for descriptions  

**Dependencies**:
- xgboost >= 2.0.0
- scikit-learn >= 1.3.0
- pandas >= 2.1.0
- numpy >= 1.26.0

## 📚 References

- Training Notebook: `realtime_risk_pipeline.ipynb`
- Backend Integration: `back-end/app/routers/models.py`
- Frontend Component: `front-end/src/components/RealtimeModelInsights.tsx`
- Integration Script: `back-end/realtime_model_integration.py`
- Test Suite: `back-end/test_realtime_integration.py`

---

**Last Updated**: January 1, 2026  
**Model Version**: 1.0 (Tuned XGBoost)  
**Status**: ✅ Production Ready  
**Performance**: R²=65.2%, F1=82.8%
