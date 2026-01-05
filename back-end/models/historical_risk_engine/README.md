# Historical Risk Engine

This directory contains the trained machine learning models and their outputs from the historical risk analysis pipeline.

## 📁 Directory Structure

```
historical_risk_engine/
├── historical_risk_engine.ipynb  # Training notebook
├── models/                        # Trained models
│   ├── cause_classifier.joblib    # Accident cause classifier
│   └── segment_gbr.joblib         # Segment risk predictor
└── outputs/                       # Model outputs and metrics
    ├── metrics.json               # Combined model metrics
    ├── classification_metrics.json # Detailed cause classifier metrics
    ├── risk_tiles.csv             # Historical risk segments (311 rows)
    ├── final_dataset.csv          # Full processed dataset
    └── final_dataset_min.csv      # Minimal dataset
```

## 🤖 Models

### 1. Cause Classifier (`cause_classifier.joblib`)
**Type**: Logistic Regression  
**Purpose**: Predicts the most likely accident cause based on environmental and situational factors

**Classes**:
- Excessive Speed
- Slipped
- Mechanical Error
- Mechanical Failure

**Performance**:
- Accuracy: **94.1%**
- F1 Score (Macro): **68.4%**
- Precision (Macro): **65.5%**
- Recall (Macro): **73.1%**

**Per-Class F1 Scores**:
- Excessive Speed: 97.6% ⭐
- Slipped: 96.0% ⭐
- Mechanical Error: 80.0% ✅
- Mechanical Failure: 0.0% ⚠️ (limited training data)

### 2. Segment GBR (`segment_gbr.joblib`)
**Type**: HistGradientBoostingRegressor  
**Purpose**: Predicts segment-level risk severity (SPI - Severity Performance Index)

**Features**:
- Location (lat_bin, lon_bin)
- Time (hour, day of week)
- Weather (is_wet)
- Vehicle type
- Historical incident patterns

**Output**: Continuous risk score (SPI_tile)

## 📊 Outputs

### Risk Tiles (`risk_tiles.csv`)
Contains **311 historical high-risk segments** with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| segment_id | string | Unique segment identifier (lat_lon format) |
| lat_bin | float | Latitude coordinate |
| lon_bin | float | Longitude coordinate |
| hour | int | Hour of day (0-23) |
| dow | int | Day of week (0=Sunday, 6=Saturday) |
| is_wet | int | Weather condition (0=dry, 1=wet) |
| Vehicle | string | Vehicle type |
| incident_count | int | Number of historical incidents |
| speed_reason_rate | float | Proportion of speed-related incidents |
| n | int | Sample size |
| SPI_tile | float | Risk severity score (0-1) |

**Geographic Coverage**: Colombo region
- Latitude: 6.95 - 7.02
- Longitude: 80.49 - 80.53

**Risk Distribution**:
- SPI Range: 0.335 - 0.426
- High-Risk Threshold: ≥ 0.38
- High-Risk Segments: ~135 (43% of total)

**Vehicle Types**:
- Bus / Van
- Car
- Motor Cycle
- Three Wheeler
- Lorry

### Metrics Files

#### `metrics.json`
Combined metrics for both models:
```json
{
  "cause_classifier": {
    "accuracy": 0.9412,
    "f1_macro": 0.6839,
    "per_class": { ... }
  },
  "segment_gbr_rmse": 0.0123,
  "segment_gbr_mae": 0.0098,
  "segment_gbr_r2": 0.8456
}
```

#### `classification_metrics.json`
Detailed cause classifier metrics with per-class precision, recall, and F1-scores.

## 🔌 Integration

These models are integrated into the Risk Route Vision application:

### Backend API Endpoints
- `GET /api/v1/models/historical/metrics` - Model performance metrics
- `GET /api/v1/models/historical/risk-tiles` - Query risk segments with filters

### Frontend Dashboard
Historical Model Insights component displays:
- Cause classifier performance
- Segment GBR metrics
- Top 10 high-risk segments

### Python Integration
```python
import joblib
import pandas as pd

# Load models
cause_classifier = joblib.load('models/cause_classifier.joblib')
segment_gbr = joblib.load('models/segment_gbr.joblib')

# Load risk tiles
risk_tiles = pd.read_csv('outputs/risk_tiles.csv')
```

## 📈 Use Cases

### 1. Route Planning
Identify historically dangerous segments to avoid:
```python
high_risk = risk_tiles[risk_tiles['SPI_tile'] >= 0.38]
dangerous_locations = high_risk[['lat_bin', 'lon_bin', 'SPI_tile']]
```

### 2. Time-Based Warnings
Alert users about high-risk times:
```python
peak_risk_hours = risk_tiles.groupby('hour')['SPI_tile'].mean()
dangerous_hours = peak_risk_hours[peak_risk_hours > 0.38].index.tolist()
```

### 3. Vehicle-Specific Insights
Analyze risk by vehicle type:
```python
vehicle_risk = risk_tiles.groupby('Vehicle')['SPI_tile'].agg(['mean', 'max', 'count'])
```

### 4. Weather Impact Analysis
Compare wet vs dry conditions:
```python
wet_risk = risk_tiles[risk_tiles['is_wet'] == 1]['SPI_tile'].mean()
dry_risk = risk_tiles[risk_tiles['is_wet'] == 0]['SPI_tile'].mean()
```

## 🔄 Model Updates

To retrain models with new data:

1. Open `historical_risk_engine.ipynb`
2. Update the input data source
3. Run all cells to retrain models
4. New models and outputs will be saved to this directory
5. Restart the backend to load updated models

## 📚 Documentation

For detailed integration documentation, see:
- `HISTORICAL_MODEL_INTEGRATION.md` - Comprehensive integration guide
- `INTEGRATION_COMPLETE_HISTORICAL.md` - Integration status and summary
- `QUICK_REFERENCE_HISTORICAL.md` - Quick reference for API usage

## 🎯 Model Interpretation

### Cause Classifier Predictions
When the model predicts "Excessive Speed":
- High confidence if P(Excessive Speed) > 0.8
- Consider weather, time, and location factors
- Most reliable prediction class (97.6% F1)

### Segment GBR Predictions
SPI interpretation:
- **< 0.35**: Low risk (green)
- **0.35 - 0.38**: Medium risk (yellow)
- **≥ 0.38**: High risk (red)

## ⚠️ Limitations

1. **Geographic Coverage**: Limited to Colombo region
2. **Mechanical Failure**: Poor predictions due to limited training data
3. **Temporal Coverage**: Historical data may not reflect current conditions
4. **Sample Bias**: Risk tiles represent incident locations, not all road segments

## 🔬 Technical Details

**Training Framework**: scikit-learn  
**Data Format**: CSV, JSON, joblib  
**Python Version**: 3.9+  
**Dependencies**: scikit-learn, pandas, numpy, joblib  

**Model Sizes**:
- cause_classifier.joblib: ~12 KB
- segment_gbr.joblib: ~8 KB

## 📞 Support

For questions about these models:
1. Review the training notebook: `historical_risk_engine.ipynb`
2. Check integration documentation in project root
3. Examine model metrics in `outputs/metrics.json`

---

**Last Updated**: January 1, 2026  
**Models Version**: 1.0  
**Status**: ✅ Production Ready
