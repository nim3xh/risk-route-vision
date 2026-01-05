"""
Risk Prediction API - Testing & Usage Guide
===========================================

This guide demonstrates how to use the Risk Prediction API with both LIVE and MANUAL data.

## Overview

The Risk Route Vision API predicts accident risk for routes using machine learning models.
It supports TWO modes of operation:

1. **LIVE MODE**: Fetches real-time weather, uses current time
2. **MANUAL MODE**: Uses your provided weather and time data

---

## Endpoint: POST /api/v1/risk/score

### LIVE DATA Example (Automatic)
When you don't provide weather data, the API fetches live weather from Open-Meteo.

```bash
curl -X POST "http://localhost:8000/api/v1/risk/score" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "CAR",
    "coordinates": [
      [6.8755, 80.7500],
      [6.8760, 80.7505],
      [6.8765, 80.7510]
    ]
  }'
```

**What happens:**
- ✅ Weather: Fetched LIVE from Open-Meteo API
- ✅ Time: Uses current system time
- ✅ Location: Uses your coordinates
- ✅ Vehicle: Uses your specified vehicle type

---

### MANUAL DATA Example (Full Control)
When you provide weather data, the API uses YOUR values.

```bash
curl -X POST "http://localhost:8000/api/v1/risk/score" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "MOTORCYCLE",
    "coordinates": [
      [6.8755, 80.7500],
      [6.8760, 80.7505],
      [6.8765, 80.7510]
    ],
    "hour": 18,
    "weather": {
      "temperature": 28.5,
      "humidity": 85.0,
      "precipitation": 5.2,
      "wind_speed": 15.0,
      "is_wet": 1
    }
  }'
```

**What happens:**
- ✅ Weather: Uses YOUR manual values
- ✅ Time: Uses your specified hour (18:00)
- ✅ Location: Uses your coordinates
- ✅ Vehicle: Uses your specified vehicle type

---

### HYBRID Example (Manual Time + Live Weather)
You can mix and match! Specify time but let weather be fetched live:

```bash
curl -X POST "http://localhost:8000/api/v1/risk/score" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType": "BUS",
    "coordinates": [
      [6.8755, 80.7500],
      [6.8760, 80.7505]
    ],
    "hour": 7,
    "timestampUtc": "2026-01-15T07:30:00Z"
  }'
```

**What happens:**
- ✅ Weather: Fetched LIVE from API
- ✅ Time: Uses your specified time (7 AM rush hour)
- ✅ Location: Uses your coordinates
- ✅ Vehicle: BUS

---

## Request Parameters

### Required:
- `vehicleType`: String - Vehicle type
  - Options: "CAR", "BUS", "MOTORCYCLE", "THREE_WHEELER", "LORRY", "VAN"
- `coordinates`: Array of [lat, lon] pairs
  - Minimum 2 coordinates required
  - Must be within Ginigathena area

### Optional:
- `hour`: Integer (0-23) - Hour of day for risk assessment
  - If not provided, uses current time
  - Rush hours (7-9 AM, 5-7 PM) typically have higher risk
  
- `timestampUtc`: String - ISO 8601 timestamp
  - Example: "2026-01-15T14:30:00Z"
  - Used for day-of-week calculations
  
- `weather`: Object - Manual weather override
  - `temperature`: Float - Temperature in Celsius (e.g., 28.5)
  - `humidity`: Float - Humidity percentage (0-100)
  - `precipitation`: Float - Precipitation in mm
  - `wind_speed`: Float - Wind speed in km/h
  - `is_wet`: Integer (0 or 1) - Road wetness (0=dry, 1=wet)

---

## Response Format

```json
{
  "overall": 0.65,
  "segmentScores": [0.62, 0.68, 0.64],
  "segmentCoordinates": [[6.8755, 80.7500], [6.8760, 80.7505], [6.8765, 80.7510]],
  "segmentCauses": [
    "Over Speed",
    "Over Speed", 
    "Over Takig"
  ],
  "rateScores": [0.042, 0.048, 0.045],
  "explain": {
    "curvature": 0.15,
    "surface_wetness_prob": 0.85,
    "wind_speed": 15.0,
    "temperature": 28.5,
    "vehicle_factor": 1.2
  },
  "confidence": {
    "confidence": 0.872,
    "certainty": 0.9,
    "distance_from_threshold": 0.198,
    "consistency": 0.945,
    "avg_prediction": 0.648,
    "threshold": 0.450
  },
  "weather": {
    "temperature": 28.5,
    "humidity": 85.0,
    "precipitation": 5.2,
    "wind_speed": 15.0,
    "is_wet": 1
  }
}
```

### Response Fields:
- `overall`: Overall risk score (0.0 to 1.0)
- `segmentScores`: Risk score for each segment (0.0 to 1.0)
- `segmentCoordinates`: Coordinates that were analyzed (only Ginigathena area)
- `segmentCauses`: Top accident cause for each segment
- `rateScores`: Predicted incident rate for each segment
- `explain`: Feature importance breakdown
- `confidence`: Model confidence metrics
- `weather`: Actual weather used (live or manual)

---

## Python Client Example

```python
import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000"

# Example 1: LIVE MODE (automatic weather)
def predict_risk_live(lat, lon, vehicle="CAR"):
    """Predict risk using live weather data"""
    response = requests.post(
        f"{API_BASE}/api/v1/risk/score",
        json={
            "vehicleType": vehicle,
            "coordinates": [
                [lat, lon],
                [lat + 0.001, lon + 0.001]
            ]
        }
    )
    return response.json()

# Example 2: MANUAL MODE (custom weather)
def predict_risk_manual(lat, lon, vehicle="CAR", temp=28, humidity=75, is_raining=False):
    """Predict risk using manual weather data"""
    response = requests.post(
        f"{API_BASE}/api/v1/risk/score",
        json={
            "vehicleType": vehicle,
            "coordinates": [
                [lat, lon],
                [lat + 0.001, lon + 0.001]
            ],
            "hour": datetime.now().hour,
            "weather": {
                "temperature": temp,
                "humidity": humidity,
                "precipitation": 5.0 if is_raining else 0.0,
                "wind_speed": 12.0,
                "is_wet": 1 if is_raining else 0
            }
        }
    )
    return response.json()

# Usage
if __name__ == "__main__":
    # Test location in Ginigathena
    test_lat, test_lon = 6.8755, 80.7500
    
    print("=" * 60)
    print("LIVE MODE - Automatic Weather")
    print("=" * 60)
    result_live = predict_risk_live(test_lat, test_lon, vehicle="MOTORCYCLE")
    print(f"Overall Risk: {result_live['overall']:.2%}")
    print(f"Weather Used: {result_live['weather']}")
    
    print("\n" + "=" * 60)
    print("MANUAL MODE - Custom Weather")
    print("=" * 60)
    result_manual = predict_risk_manual(
        test_lat, test_lon, 
        vehicle="CAR",
        temp=32,
        humidity=90,
        is_raining=True
    )
    print(f"Overall Risk: {result_manual['overall']:.2%}")
    print(f"Weather Used: {result_manual['weather']}")
```

---

## JavaScript/TypeScript Client Example

```typescript
// Example 1: LIVE MODE
async function predictRiskLive(lat: number, lon: number, vehicle: string = "CAR") {
  const response = await fetch("http://localhost:8000/api/v1/risk/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleType: vehicle,
      coordinates: [[lat, lon], [lat + 0.001, lon + 0.001]]
    })
  });
  return response.json();
}

// Example 2: MANUAL MODE
async function predictRiskManual(
  lat: number, 
  lon: number, 
  vehicle: string = "CAR",
  weather: {
    temperature: number;
    humidity: number;
    precipitation: number;
    wind_speed: number;
    is_wet: 0 | 1;
  },
  hour?: number
) {
  const response = await fetch("http://localhost:8000/api/v1/risk/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vehicleType: vehicle,
      coordinates: [[lat, lon], [lat + 0.001, lon + 0.001]],
      hour: hour || new Date().getHours(),
      weather: weather
    })
  });
  return response.json();
}

// Usage
const testLocation = { lat: 6.8755, lon: 80.7500 };

// Live mode
const resultLive = await predictRiskLive(testLocation.lat, testLocation.lon, "MOTORCYCLE");
console.log("Live Risk:", resultLive.overall);

// Manual mode
const resultManual = await predictRiskManual(
  testLocation.lat, 
  testLocation.lon, 
  "CAR",
  {
    temperature: 32,
    humidity: 90,
    precipitation: 5.0,
    wind_speed: 15,
    is_wet: 1
  },
  18 // 6 PM rush hour
);
console.log("Manual Risk:", resultManual.overall);
```

---

## Time-Based Risk Patterns

The model considers time of day for risk assessment:

### High-Risk Hours (typically 20-30% higher risk):
- **7-9 AM**: Morning rush hour
- **5-7 PM**: Evening rush hour
- **10 PM - 2 AM**: Fatigue, reduced visibility

### Lower-Risk Hours:
- **10 AM - 4 PM**: Off-peak daytime
- **Early morning (5-6 AM)**: Low traffic

### Weekend Effect:
- Weekends (Saturday, Sunday) typically show different patterns
- Holiday behavior included in day-of-week calculation

---

## Weather Impact on Risk

### High-Risk Weather Conditions:
1. **Heavy Rain** (precipitation > 5mm):
   - Increases risk by 40-60%
   - Road wetness = major factor
   
2. **High Wind** (> 30 km/h):
   - Increases risk by 20-30%
   - Especially dangerous for motorcycles
   
3. **Low Temperature** (< 15°C):
   - Cold affects tire grip and visibility
   
4. **High Humidity** (> 85%):
   - Often precedes rain
   - Fog risk

### Example Risk Scenarios:

**Scenario 1: Clear day, motorcycle**
```json
{
  "temperature": 28,
  "humidity": 60,
  "precipitation": 0,
  "wind_speed": 8,
  "is_wet": 0
}
// Expected: Moderate risk (0.35-0.45)
```

**Scenario 2: Heavy rain, motorcycle**
```json
{
  "temperature": 26,
  "humidity": 95,
  "precipitation": 8,
  "wind_speed": 20,
  "is_wet": 1
}
// Expected: High risk (0.65-0.85)
```

**Scenario 3: Rush hour + rain, bus**
```json
{
  "hour": 18,
  "temperature": 28,
  "precipitation": 3,
  "is_wet": 1
}
// Expected: High risk (0.60-0.75)
```

---

## Frontend Integration

The frontend automatically handles both modes through the WeatherPanel component:

### Manual Mode:
- User adjusts sliders for temperature, humidity, wind
- Toggle for wet/dry road conditions
- Predictions use these manual values

### Live Mode:
- Weather fetched automatically from API
- Updates every location change
- Shows real-time conditions

See `front-end/src/components/WeatherPanel.tsx` for implementation.

---

## Error Handling

### Common Errors:

1. **Outside Service Area**
```json
{
  "detail": "Route is outside Ginigathena service area..."
}
```
Solution: Ensure coordinates are within Ginigathena bounds.

2. **Invalid Coordinates**
```json
{
  "detail": "Need at least 2 coordinates"
}
```
Solution: Provide at least 2 coordinate pairs.

3. **Weather API Timeout**
If live weather fails, the endpoint will return 500. Use manual mode as fallback.

---

## Best Practices

1. **Use Live Mode** for real-time applications where accuracy is critical
2. **Use Manual Mode** for:
   - Historical analysis
   - "What-if" scenarios
   - Testing specific conditions
   - When live weather API is unavailable

3. **Combine Both**: Use live weather but manual time for scenario planning

4. **Cache Results**: Risk scores for same location/conditions can be cached for ~5 minutes

5. **Batch Requests**: For route analysis, send all coordinates in one request

---

## Model Features Used

The ML model uses these features (in order of importance):

1. **SPI_smoothed** (from XGBoost): Primary risk indicator
2. **Hour**: Time of day patterns
3. **is_wet**: Road surface condition
4. **Vehicle type**: Different vehicles have different risk profiles
5. **Curvature**: Road geometry
6. **Temperature**: Weather impact
7. **Wind speed**: Environmental hazard
8. **Day of week**: Weekend vs weekday patterns
9. **Precipitation**: Current rainfall
10. **Humidity**: Environmental conditions

---

## Support

For issues or questions:
- Check logs: `back-end/backend-log.txt`
- Review integration guides: `INTEGRATION_COMPLETE.md`
- Test models: `back-end/test_*.py`

---

**Last Updated**: January 2026
**API Version**: 1.0
**Model Version**: XGBoost + Cause Classifier + Segment GBR
