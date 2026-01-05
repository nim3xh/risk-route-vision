# Route Analysis ML Integration

## Overview
Route analysis now uses the ML models (XGBoost, GBR, and Cause Classifier) to provide accurate risk predictions based on multiple factors.

## What Changed

### Backend (`back-end/app/routers/risk.py`)
- ✅ The `/risk/score` endpoint already properly integrates ML models
- ✅ Accepts full route coordinates and analyzes them together
- ✅ Uses `predict_with_cause()` to get segment-by-segment risk scores
- ✅ Returns confidence metrics from models
- ✅ Provides explanation factors (curvature, weather, vehicle factors)

### Backend Schema (`back-end/app/schemas/risk.py`)
- ✅ Added `confidence` field to `RiskScoreResponse`
- ✅ Supports weather input with temperature, humidity, precipitation, wind speed
- ✅ Supports hour parameter for time-based predictions

### Frontend API (`front-end/src/lib/api/httpAdapter.ts`)
- ✅ Enhanced `scoreRoute()` method to accept weather and hour parameters
- ✅ Properly maps vehicle types between frontend and backend
- ✅ Returns model explanation and confidence metrics

### Frontend UI (`front-end/src/pages/RouteLookAhead.tsx`)
- ✅ Changed from individual point scoring to full route analysis
- ✅ Uses `/risk/score` endpoint instead of multiple `/risk/nearby` calls
- ✅ Passes active weather data to the model
- ✅ Passes selected hour for time-based predictions
- ✅ Displays model factors (curvature, wetness, wind, vehicle)
- ✅ Shows primary risk factor across the route
- ✅ Displays both peak and average risk
- ✅ Shows analyzed segment count
- ✅ Improved UI with "ML Risk Analysis" section

## Model Integration Flow

```
User selects route endpoints
         ↓
Route coordinates fetched from routing service
         ↓
Coordinates sampled (up to 50 points)
         ↓
Sent to /risk/score with:
  - Full coordinate array
  - Vehicle type
  - Hour of day
  - Weather conditions
         ↓
Backend ML Models Process:
  1. Feature engineering (curvature, weather mapping)
  2. XGBoost segment risk prediction
  3. Gradient Boosting rate prediction
  4. Cause classification
  5. Vehicle-specific thresholds applied
         ↓
Returns:
  - Segment-by-segment risk scores
  - Top causes per segment
  - Model explanation factors
  - Confidence metrics
         ↓
Frontend displays:
  - Peak risk percentage
  - Average risk percentage
  - Primary risk factor
  - Model factors breakdown
  - Risk visualization on map
```

## Model Factors Displayed

1. **Curvature**: Road geometry complexity (%)
2. **Surface Wetness**: Probability of wet surface (%)
3. **Wind Speed**: Current wind conditions (km/h)
4. **Vehicle Factor**: Vehicle-specific risk multiplier (×)

## Risk Classification

- **Standard Priority**: Risk < 70%
- **High Priority**: Risk ≥ 70% (with warning alert)

## Benefits

1. ✅ **More Accurate**: Uses trained ML models instead of mock data
2. ✅ **Context-Aware**: Considers weather, time, and vehicle type
3. ✅ **Explainable**: Shows which factors contribute to risk
4. ✅ **Efficient**: Single API call for entire route
5. ✅ **Real-time**: Integrates with live weather data
6. ✅ **Confident**: Includes model confidence metrics

## Testing

1. Start backend: `cd back-end && python -m uvicorn app.main:app --reload --port 8080`
2. Start frontend: `cd front-end && npm run dev`
3. Navigate to Route Analysis page
4. Set departure and destination points
5. Select vehicle type
6. Choose hour of day
7. Click "Analyze Path"
8. View ML-based risk analysis with model factors

## Example Output

```
Route Intelligence
├─ Distance: 12.5 km
├─ E.T.A: 18 min
└─ Analyzed Segments: 50 points

ML Risk Analysis
├─ Peak Risk: 78%
├─ Average Risk: 45%
├─ Primary Risk Factor: road_curvature
└─ Model Factors:
    ├─ Curvature: 24.5%
    ├─ Wetness: 60%
    ├─ Wind: 15.2 km/h
    └─ Vehicle: ×1.35
```

## Next Steps

- [x] Integrate ML models into route analysis
- [x] Display model explanation factors
- [x] Show confidence metrics
- [ ] Add alternative route suggestions based on risk
- [ ] Historical risk comparison
- [ ] Export route risk reports
