# Historical Risk Engine Integration Guide

## 📋 Overview

This guide documents the integration of the **Historical Risk Engine** models and outputs with the Risk Route Vision application. The historical risk engine provides accident cause classification and segment-level risk severity predictions based on historical incident data.

## 🎯 Models Integrated

### 1. Cause Classifier (`cause_classifier.joblib`)
- **Type**: Logistic Regression
- **Purpose**: Predicts the most likely accident cause based on conditions
- **Classes**: 
  - Excessive Speed
  - Slipped
  - Mechanical Error
  - Mechanical Failure
- **Performance**:
  - Accuracy: 94.1%
  - F1 Score (Macro): 68.4%
  - Precision (Macro): 65.5%
  - Recall (Macro): 73.1%

### 2. Segment GBR (`segment_gbr.joblib`)
- **Type**: HistGradientBoostingRegressor
- **Purpose**: Predicts accident severity index (SPI) from historical data
- **Features**: Location, time, weather, vehicle type
- **Output**: Continuous risk score (SPI_tile)

## 📊 Outputs Available

### Risk Tiles Data (`risk_tiles.csv`)
Contains 311 historical high-risk segments with:
- **segment_id**: Unique segment identifier (lat_lon format)
- **lat_bin, lon_bin**: Geographic coordinates
- **hour**: Hour of day (0-23)
- **dow**: Day of week (0=Sunday, 6=Saturday)
- **is_wet**: Weather condition (0=dry, 1=wet)
- **Vehicle**: Vehicle type
- **incident_count**: Number of historical incidents
- **speed_reason_rate**: Proportion of speed-related incidents
- **SPI_tile**: Risk severity score

### Metrics Files
- **metrics.json**: Comprehensive model performance metrics
- **classification_metrics.json**: Detailed cause classifier metrics

## 🔌 Backend Integration

### New API Endpoints

#### 1. Get Historical Metrics
```http
GET /api/v1/models/historical/metrics
```

Returns detailed metrics for both historical models:
```json
{
  "cause_classifier": {
    "accuracy": 0.9412,
    "f1_macro": 0.6839,
    "precision_macro": 0.6548,
    "recall_macro": 0.7308,
    "per_class": {
      "Excessive Speed": {
        "precision": 0.9524,
        "recall": 1.0,
        "f1-score": 0.9756,
        "support": 20
      }
      // ... other classes
    }
  },
  "segment_gbr": {
    "rmse": 0.0123,
    "mae": 0.0098,
    "r2": 0.8456
  },
  "available": true
}
```

#### 2. Get Risk Tiles
```http
GET /api/v1/models/historical/risk-tiles?limit=100&vehicle=Car&min_risk=0.38
```

Query Parameters:
- `limit` (int, 1-1000): Number of tiles to return (default: 100)
- `vehicle` (string, optional): Filter by vehicle type
- `min_risk` (float, 0-1, optional): Minimum SPI_tile value

Returns:
```json
{
  "tiles": [
    {
      "segment_id": "6.956_80.527",
      "lat_bin": 6.956,
      "lon_bin": 80.527,
      "hour": 7,
      "dow": 1,
      "is_wet": 1,
      "Vehicle": "Bus / Van",
      "incident_count": 1,
      "speed_reason_rate": 0.0,
      "n": 1,
      "SPI_tile": 0.3507
    }
    // ... more tiles
  ],
  "total": 100,
  "filters": {
    "vehicle": "Car",
    "min_risk": 0.38,
    "limit": 100
  }
}
```

### Updated Existing Endpoints

#### `/api/v1/models/info`
Now includes historical model information:
```json
{
  "historical_models": {
    "cause_classifier": {
      "name": "Accident Cause Classifier",
      "type": "LogisticRegression",
      "status": "loaded",
      "file": "cause_classifier.joblib",
      "size_kb": 12.45,
      "classes": ["Excessive Speed", "Slipped", "Mechanical Error", "Mechanical Failure"],
      "description": "Predicts most likely accident cause based on conditions"
    },
    "segment_gbr": {
      "name": "Segment Risk Severity Model",
      "type": "HistGradientBoostingRegressor",
      "status": "loaded",
      "file": "segment_gbr.joblib",
      "size_kb": 8.23,
      "description": "Predicts accident severity index from historical data"
    }
  }
}
```

## 🎨 Frontend Integration

### New Component: `HistoricalModelInsights`

Location: `front-end/src/components/HistoricalModelInsights.tsx`

This component displays:
1. **Cause Classifier Performance**
   - Overall metrics (Accuracy, F1, Precision, Recall)
   - Per-class performance breakdown
   - Visual progress bars and badges

2. **Segment GBR Performance**
   - RMSE, MAE, R² metrics
   - Clean card-based layout

3. **Historical High-Risk Segments**
   - Top 10 risk locations (SPI ≥ 0.38)
   - Segment details: location, time, vehicle, conditions
   - Speed-related incident indicators

### Dashboard Integration

Updated: `front-end/src/pages/Dashboard.tsx`

The Dashboard now includes the `HistoricalModelInsights` component, which automatically loads and displays historical model data.

## 🐍 Python Integration Script

Location: `back-end/historical_model_integration.py`

This script demonstrates:
- Loading historical models from disk
- Reading model metrics and outputs
- Analyzing cause classifier performance
- Analyzing segment GBR performance
- Identifying high-risk segments
- Vehicle type risk pattern analysis

### Usage:
```bash
cd back-end
python historical_model_integration.py
```

## 📈 Use Cases

### 1. Real-time Risk Enhancement
Combine historical risk tiles with real-time predictions:
```python
# Get historical risk for a segment
historical_risk = risk_tiles_df[
    (risk_tiles_df['lat_bin'] == segment_lat) &
    (risk_tiles_df['lon_bin'] == segment_lon) &
    (risk_tiles_df['hour'] == current_hour) &
    (risk_tiles_df['Vehicle'] == vehicle_type)
]['SPI_tile'].mean()

# Blend with real-time prediction
final_risk = 0.6 * realtime_prediction + 0.4 * historical_risk
```

### 2. Accident Cause Prediction
When a high-risk condition is detected, predict the likely cause:
```python
from app.ml.model import load_cause_classifier

cause_model = load_cause_classifier()
predicted_cause = cause_model.predict(features)
```

### 3. Historical Pattern Analysis
Identify when and where specific vehicle types face highest risk:
```python
bus_high_risk = risk_tiles_df[
    (risk_tiles_df['Vehicle'].str.contains('Bus')) &
    (risk_tiles_df['SPI_tile'] > 0.38)
].groupby(['hour', 'dow']).agg({
    'SPI_tile': 'mean',
    'incident_count': 'sum'
})
```

## 🔄 Data Flow

```
Historical Risk Engine (Jupyter Notebook)
    ↓
Models (cause_classifier.joblib, segment_gbr.joblib)
    ↓
Outputs (metrics.json, risk_tiles.csv)
    ↓
Backend API Endpoints (/api/v1/models/historical/*)
    ↓
Frontend Components (HistoricalModelInsights)
    ↓
Dashboard Visualization
```

## 🎯 Key Features

1. **Model Performance Transparency**: Users can see exactly how well the models perform with detailed metrics
2. **High-Risk Segment Identification**: Historical data highlights consistently dangerous locations
3. **Vehicle-Specific Insights**: Different vehicle types have different risk profiles
4. **Time-Based Patterns**: Risk varies by hour and day of week
5. **Weather Correlation**: Historical data shows wet vs. dry condition impacts

## 🚀 Next Steps

1. **Integrate with Route Planning**: Use historical risk tiles to suggest safer routes
2. **Alerting System**: Send warnings when entering historically high-risk segments
3. **Comparative Analysis**: Show how current conditions compare to historical patterns
4. **Model Retraining**: Set up pipeline to retrain models with new incident data
5. **A/B Testing**: Compare predictions with and without historical data

## 📝 Notes

- Historical models are loaded separately from real-time XGBoost model
- Risk tiles data is pre-computed and stored in CSV for fast access
- All endpoints are read-only; models are not updated via API
- Frontend automatically refreshes data every 30 seconds (dashboard refresh rate)

## 🔧 Troubleshooting

### Models Not Loading
- Check that `.joblib` files exist in `back-end/models/historical_risk_engine/models/`
- Verify scikit-learn version compatibility
- Check backend logs for model loading errors

### Risk Tiles Data Missing
- Verify `risk_tiles.csv` exists in `back-end/models/historical_risk_engine/outputs/`
- Check pandas is installed (`pip install pandas`)
- Ensure CSV is not corrupted (should have 311 rows)

### Frontend Not Displaying Data
- Check browser console for API errors
- Verify backend is running on port 8080
- Ensure CORS is properly configured
- Check that API endpoints return 200 status

## 📚 References

- Model Training Notebook: `back-end/models/historical_risk_engine/historical_risk_engine.ipynb`
- Backend Integration: `back-end/app/routers/models.py`
- Frontend Component: `front-end/src/components/HistoricalModelInsights.tsx`
- Integration Script: `back-end/historical_model_integration.py`
