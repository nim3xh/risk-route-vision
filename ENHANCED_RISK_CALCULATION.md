# Enhanced Risk Calculation - Detailed Segment Analysis

## Overview

The risk calculation system has been enhanced to provide **comprehensive per-segment risk analysis** for routes. Every point along your route is now analyzed individually with complete model outputs.

## What's New

### 1. **Per-Segment Detailed Information**

Each segment now returns:
- **Risk Score** (0-1 normalized and 0-100 scale)
- **Predicted Cause** (from ML model)
- **Incident Rate** (predicted likelihood of incidents)
- **Curvature** (road geometry at that point)
- **Surface Wetness Probability**
- **Weather Conditions** (temperature, wind, humidity, precipitation)
- **Vehicle Factor** (vehicle-specific risk multiplier)
- **High-Risk Flag** (whether segment exceeds safety threshold)

### 2. **Route-Level Statistics**

Overall route analysis including:
- Total number of segments analyzed
- Count and percentage of high-risk segments
- Maximum and minimum risk scores
- Average curvature and incident rate

### 3. **Complete Model Integration**

The system now uses **all available model outputs**:
- ✅ XGBoost risk predictions
- ✅ Cause classifier predictions
- ✅ Incident rate predictions
- ✅ Vehicle-specific thresholds
- ✅ Weather impact analysis
- ✅ Road geometry (curvature)
- ✅ Time-of-day patterns
- ✅ Confidence metrics

## API Response Structure

### Enhanced `/api/v1/risk/score` Response

```json
{
  "overall": 0.45,
  "overall_0_100": 45,
  "segments": [
    {
      "index": 0,
      "coordinate": [6.93, 80.45],
      "risk_score": 0.42,
      "risk_0_100": 42,
      "cause": "Weather conditions and road curvature",
      "incident_rate": 0.023,
      "curvature": 0.15,
      "surface_wetness_prob": 0.8,
      "temperature": 28.5,
      "wind_speed": 12.0,
      "humidity": 75.0,
      "precipitation": 2.5,
      "vehicle_factor": 1.0,
      "is_high_risk": false
    },
    {
      "index": 1,
      "coordinate": [6.94, 80.46],
      "risk_score": 0.67,
      "risk_0_100": 67,
      "cause": "High curvature and wet surface",
      "incident_rate": 0.041,
      "curvature": 0.45,
      "surface_wetness_prob": 0.8,
      "temperature": 28.5,
      "wind_speed": 12.0,
      "humidity": 75.0,
      "precipitation": 2.5,
      "vehicle_factor": 1.0,
      "is_high_risk": true
    }
  ],
  "route_statistics": {
    "total_segments": 25,
    "high_risk_segments": 8,
    "high_risk_percentage": 32.0,
    "max_risk": 0.72,
    "min_risk": 0.28,
    "avg_curvature": 0.23,
    "avg_incident_rate": 0.031
  },
  "segmentScores": [0.42, 0.67, ...],
  "segmentCoordinates": [[6.93, 80.45], [6.94, 80.46], ...],
  "segmentCauses": ["Weather conditions...", "High curvature...", ...],
  "rateScores": [0.023, 0.041, ...],
  "explain": {
    "curvature": 0.23,
    "surface_wetness_prob": 0.8,
    "wind_speed": 12.0,
    "temperature": 28.5,
    "vehicle_factor": 1.0
  },
  "confidence": {
    "confidence": 0.82,
    "certainty": 0.9,
    "distance_from_threshold": 0.15,
    "consistency": 0.87
  },
  "weather": {
    "temperature": 28.5,
    "humidity": 75.0,
    "precipitation": 2.5,
    "wind_speed": 12.0,
    "is_wet": 1
  }
}
```

## Risk Calculation Process

### Step 1: Point-by-Point Analysis
Every coordinate in the route is analyzed individually:

```
Route: [Point A] → [Point B] → [Point C] → [Point D]
         ↓           ↓           ↓           ↓
       Risk 0.3    Risk 0.5    Risk 0.7    Risk 0.4
```

### Step 2: Multi-Model Prediction
For each point, the system runs:

1. **XGBoost Model** → Base risk prediction
2. **Cause Classifier** → Identifies risk factors
3. **Incident Rate Model** → Predicts likelihood
4. **Curvature Analysis** → Road geometry impact
5. **Weather Integration** → Environmental factors
6. **Vehicle-Specific Adjustment** → Type-based risk

### Step 3: Integrated Risk Score
Using the thesis formula (Section 4.10.5):

```
Risk = 100 × (0.6 × Cause_component + 0.4 × Rate_component) 
       × Vehicle_multiplier × Weather_multiplier
```

Where:
- **Cause component**: Probability of risk factors (0-1)
- **Rate component**: Normalized incident rate (0-1)
- **Vehicle multiplier**: 
  - Motorcycle: 1.2 (highest risk)
  - Three-wheeler: 1.1
  - Car: 1.0 (baseline)
  - Bus: 0.85 (professional drivers)
  - Lorry: 0.90
- **Weather multiplier**: 1.25 for wet conditions, 1.0 for dry

### Step 4: Threshold Classification
Each segment is classified as high-risk based on vehicle-specific thresholds:

| Vehicle | Threshold |
|---------|-----------|
| Motorcycle | 0.45 |
| Three-wheeler | 0.48 |
| Car | 0.50 |
| Bus | 0.55 |
| Lorry | 0.52 |

## Key Features

### ✅ Complete Point Coverage
- **Every single point** in your route is analyzed
- No sampling or skipping of segments
- Full route visibility

### ✅ All Model Outputs Utilized
- XGBoost predictions
- Cause classifications
- Incident rate predictions
- Curvature measurements
- Weather impacts
- Vehicle adjustments
- Time-of-day patterns

### ✅ Detailed Segment Information
Each segment includes:
- Exact coordinates
- Normalized risk (0-1) and scaled risk (0-100)
- Specific risk cause
- Incident rate prediction
- Road geometry metrics
- Weather conditions
- Vehicle-specific factors
- High-risk flag

### ✅ Route Statistics
Overall metrics for the entire route:
- Total segments analyzed
- High-risk segment count and percentage
- Maximum and minimum risk values
- Average curvature and incident rate

## Usage Examples

### Example 1: Identify High-Risk Segments

```python
response = await score_route(coordinates, vehicle_type="CAR")

# Get all high-risk segments
high_risk_segments = [
    seg for seg in response["segments"] 
    if seg["is_high_risk"]
]

print(f"Found {len(high_risk_segments)} high-risk segments:")
for seg in high_risk_segments:
    print(f"  Segment {seg['index']}: {seg['risk_0_100']}% risk")
    print(f"    Cause: {seg['cause']}")
    print(f"    Curvature: {seg['curvature']:.2f}")
```

### Example 2: Analyze Route Statistics

```python
stats = response["route_statistics"]

print(f"Route Analysis:")
print(f"  Total segments: {stats['total_segments']}")
print(f"  High-risk: {stats['high_risk_percentage']:.1f}%")
print(f"  Max risk: {stats['max_risk']:.2f}")
print(f"  Avg curvature: {stats['avg_curvature']:.3f}")
```

### Example 3: Compare Vehicle Types

```python
# Compare risk for different vehicles
vehicles = ["MOTORCYCLE", "CAR", "BUS"]
results = {}

for vehicle in vehicles:
    response = await score_route(coordinates, vehicle_type=vehicle)
    results[vehicle] = {
        "overall": response["overall_0_100"],
        "high_risk_count": response["route_statistics"]["high_risk_segments"]
    }

# Motorcycle: 65% risk, 15 high-risk segments
# Car: 50% risk, 10 high-risk segments
# Bus: 42% risk, 7 high-risk segments
```

## Benefits

### 🎯 **Precise Risk Assessment**
- Point-by-point analysis ensures no dangerous segments are missed
- Exact location of high-risk areas

### 📊 **Complete Information**
- All model predictions available
- No data loss or aggregation
- Full transparency

### 🚗 **Vehicle-Specific**
- Tailored thresholds for each vehicle type
- Realistic risk assessment based on vehicle characteristics

### 🌤️ **Real-Time Weather**
- Live weather data integration
- Manual weather override support
- Accurate environmental impact

### 📈 **Statistical Insights**
- Route-level aggregations
- Performance metrics
- Pattern identification

## Backward Compatibility

All existing fields are preserved:
- `overall`: Overall risk score (0-1)
- `segmentScores`: Array of risk scores
- `segmentCoordinates`: Array of coordinates
- `segmentCauses`: Array of causes
- `rateScores`: Array of incident rates
- `explain`: Explanation features
- `confidence`: Confidence metrics
- `weather`: Weather conditions

New fields added:
- `overall_0_100`: Overall risk in 0-100 scale
- `segments`: Detailed per-segment information
- `route_statistics`: Route-level statistics

## Technical Details

### Models Used

1. **XGBoost Risk Model** (`xgb_vehicle_specific_risk.pkl`)
   - Predicts base risk score (SPI)
   - Considers weather, time, location, vehicle

2. **Cause Classifier** (`cause_classifier.joblib`)
   - Identifies specific risk factors
   - Uses SPI and contextual features

3. **Segment Rate Model** (`segment_gbr.joblib`)
   - Predicts incident rate
   - Based on historical patterns

### Feature Engineering

Each segment includes:
- **Weather**: Temperature, humidity, precipitation, wind
- **Time**: Hour of day, day of week, is_weekend
- **Location**: Latitude, longitude, lat/lon bins
- **Geometry**: Curvature at each point
- **Vehicle**: Type and specific factors
- **Surface**: Wetness probability

### Performance

- **Speed**: ~50-100ms per route (depends on length)
- **Accuracy**: Vehicle-specific thresholds optimized
- **Coverage**: 100% of route segments analyzed

## Next Steps

1. **Visualization**: Display detailed segments on map
2. **Alerts**: Notify drivers of high-risk segments ahead
3. **Alternative Routes**: Compare multiple routes
4. **Historical Trends**: Track risk patterns over time

## Support

For questions or issues:
- Check the API documentation
- Review the test files: `test_risk_predictions.py`
- See the integration guides in the root directory
