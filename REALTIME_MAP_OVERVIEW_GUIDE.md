# Realtime ML Map Overview - Complete Guide

## 🎯 Overview

The Map Overview now supports **two prediction modes** for displaying road risk segments:

1. **Historical Mode** (default) - Fast, cached data from historical patterns
2. **Realtime ML Mode** (new!) - Live XGBoost model predictions with weather and hour integration

## ✨ What's New

### Realtime XGBoost Integration

When you toggle to **Realtime ML Mode**, the map uses the trained XGBoost regression model to predict risk for each road segment by:

- ✅ **Fetching live weather data** (temperature, humidity, wind, precipitation)
- ✅ **Considering time of day** (hour-based risk patterns)
- ✅ **Vehicle-specific predictions** (using vehicle type you selected)
- ✅ **ML model features** (curvature, surface wetness probability, wind effects)

### Key Benefits

| Feature | Historical Mode | Realtime ML Mode |
|---------|----------------|------------------|
| Speed | ⚡ Instant | 🔄 5-10 seconds |
| Accuracy | 📊 Pattern-based | 🎯 ML-powered |
| Weather | ❌ Generic | ✅ Live/Manual |
| Hour Impact | ✅ Basic | ✅ Advanced |
| Model Features | ❌ No | ✅ Yes |

## 🎮 How to Use

### 1. Toggle Realtime Mode

In the **Control Center** panel (top-left), look for the **CPU icon** button:

```
🔘 Cpu Icon - Toggle Realtime ML Mode
📀 Database Icon - Toggle Mock/Live API
```

- **Click the CPU button** to switch between Historical and Realtime modes
- A toast notification will confirm the mode change
- The panel shows an indicator: "Realtime XGBoost Model" or "Historical Data"

### 2. Configure Parameters

All existing controls work with realtime predictions:

- **Vehicle Type** - Predictions adapt to selected vehicle
- **Time of Day** - Hour slider affects ML predictions
- **Weather** - Toggle between Live Weather / Manual Weather / Mock Weather
- **Map Style** - Visual presentation of data

### 3. View Enhanced Risk Data

When using **Realtime ML Mode**, segments include additional model features:

- `curvature` - Road curvature factor (0-1)
- `surface_wetness_prob` - Surface wetness probability (0-1)
- `wind_speed` - Wind speed in km/h
- `temperature` - Temperature in Celsius
- `is_realtime` - Flag indicating ML-based prediction

## 🔧 Technical Implementation

### Backend Endpoint

**New Endpoint:** `GET /api/v1/risk/segments/realtime`

**Query Parameters:**
```
bbox: string (optional) - "minLon,minLat,maxLon,maxLat"
hour: int (optional, 0-23) - Hour of day
vehicle: string (optional) - Vehicle type
temperature: float (optional) - Temperature in Celsius
humidity: float (optional) - Humidity percentage
precipitation: float (optional) - Precipitation in mm
wind_speed: float (optional) - Wind speed in km/h
is_wet: int (optional, 0 or 1) - Road wetness
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "seg_6.941_80.455",
      "geometry": {
        "type": "Point",
        "coordinates": [80.455, 6.941]
      },
      "properties": {
        "risk_0_100": 73,
        "top_cause": "Dangerous sharp curve with very poor visibility",
        "hour": 8,
        "vehicle": "CAR",
        "curvature": 0.42,
        "surface_wetness_prob": 0.85,
        "wind_speed": 12.5,
        "temperature": 28.0,
        "is_realtime": true
      }
    }
  ]
}
```

### Frontend Integration

**New Methods:**

1. **httpAdapter.getSegmentsRealtime()** - Calls realtime endpoint
2. **riskApi.getSegmentsRealtime()** - Unified client method
3. **MapOverview state:** `useRealtimeModel` - Toggle state

**Data Flow:**

```
User toggles Realtime Mode
    ↓
MapOverview.loadData() detects mode
    ↓
Calls getSegmentsRealtime() OR getSegmentsToday()
    ↓
Backend fetches weather (if not provided)
    ↓
ML model predicts risk for grid points
    ↓
Returns segments with model features
    ↓
Map visualizes with enhanced data
```

## 📊 Model Features Explained

### Curvature (0-1)
Road curvature factor calculated from GPS coordinates:
- **0.0-0.2**: Straight road
- **0.2-0.5**: Moderate curves
- **0.5-1.0**: Sharp/dangerous curves

### Surface Wetness Probability (0-1)
Probability of wet road surface:
- Based on precipitation and humidity
- **0.0**: Dry conditions
- **1.0**: Wet/rainy conditions

### Wind Speed (km/h)
Wind speed factor:
- Affects vehicle stability
- Higher for motorcycles and three-wheelers

### Temperature (°C)
Ambient temperature:
- Affects road conditions
- Influences driver behavior

## 🌤️ Weather Integration

### Live Weather Mode
When realtime mode is active and weather parameters are NOT provided:
- Automatically fetches current weather from Weather API
- Uses center point of bounding box
- Caches for all segments in view

### Manual Weather Mode
When weather parameters ARE provided in Weather Panel:
- Uses your specified values
- Overrides live weather fetch
- Allows "what-if" scenario testing

### Example Scenarios

**Scenario 1: Morning rush hour with rain**
```
Hour: 8
Vehicle: Car
Weather: Live (fetched) - Rainy, 26°C, 90% humidity
Result: Higher risk on curved sections
```

**Scenario 2: Late night, dry conditions**
```
Hour: 2
Vehicle: Motorcycle
Weather: Manual - Dry, 24°C, 60% humidity
Result: Moderate risk, visibility factors increase
```

## 🎯 Use Cases

### 1. Real-time Traffic Planning
- Check current conditions before driving
- Use live weather + current hour
- See ML predictions for your vehicle type

### 2. Historical Analysis
- Use historical mode for quick overview
- Compare patterns across different times

### 3. Scenario Testing
- Use manual weather + realtime ML
- Test "what if it rains during rush hour?"
- Compare different vehicle types

### 4. Route Optimization
- Identify high-risk segments in advance
- Plan alternate routes
- Consider time-of-day impacts

## 🔍 Debugging & Troubleshooting

### Check Mode Indicator
The Control Center panel shows:
```
🔹 Realtime XGBoost Model
   Using ML predictions with weather & hour
```

### Check Segment Properties
When clicking on a segment, the info card shows:
- `is_realtime: true` - Confirms ML prediction
- Model features (curvature, wetness, etc.)

### Performance Tips
- Realtime mode takes 5-10 seconds to load
- Uses ~100-200 grid points for Ginigathena area
- Historical mode is faster for quick browsing

### Common Issues

**Issue:** Realtime mode shows no data
- **Solution:** Check backend is running
- **Solution:** Verify weather API keys are configured

**Issue:** Weather data is missing
- **Solution:** Falls back to defaults (28°C, 75% humidity)
- **Solution:** Use manual weather mode instead

**Issue:** Predictions seem identical to historical
- **Solution:** Verify `is_realtime` flag in segment properties
- **Solution:** Check backend logs for ML model loading

## 📈 Performance Comparison

### Historical Mode
- **Load time:** 100-500ms
- **Data source:** Pre-computed segments
- **Accuracy:** Pattern-based (historical trends)
- **Best for:** Quick browsing, overview

### Realtime ML Mode
- **Load time:** 5-10 seconds
- **Data source:** Live ML predictions
- **Accuracy:** ML model-based (XGBoost)
- **Best for:** Detailed analysis, planning

## 🚀 Future Enhancements

Potential improvements for realtime mode:

1. **Caching Layer** - Cache predictions for common scenarios
2. **Progressive Loading** - Load visible area first, then expand
3. **Prediction Confidence** - Show uncertainty metrics
4. **Comparison View** - Side-by-side historical vs realtime
5. **Time Range Predictions** - Predict next few hours

## 📝 API Examples

### JavaScript/TypeScript

```typescript
// Get realtime segments
const segments = await riskApi.getSegmentsRealtime(
  config.domain.bounds,  // Bounding box
  8,                      // Hour (8 AM)
  "Car",                  // Vehicle type
  {                       // Weather (optional)
    temperature_c: 28,
    humidity_pct: 75,
    precip_mm: 0,
    wind_kmh: 10,
    is_wet: 0
  }
);

console.log(segments.features[0].properties);
// {
//   risk_0_100: 73,
//   curvature: 0.42,
//   surface_wetness_prob: 0.85,
//   is_realtime: true,
//   ...
// }
```

### Python (Backend)

```python
from fastapi import FastAPI
from app.routers import risk

# The endpoint is automatically registered
# GET /api/v1/risk/segments/realtime?hour=8&vehicle=CAR&temperature=28
```

## 🎓 Learning Resources

- **XGBoost Model Details:** See `XGBOOST_INTEGRATION_COMPLETE.md`
- **Weather Integration:** See `WEATHER_INTEGRATION_COMPLETE.md`
- **API Reference:** See `API_USAGE_GUIDE.md`
- **Feature Engineering:** See backend code in `app/services/feature_engineering.py`

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs for ML model warnings
3. Verify weather API configuration
4. Try mock mode to isolate issues

---

**Version:** 1.0.0  
**Last Updated:** January 1, 2026  
**Status:** ✅ Production Ready
