# 🚀 Risk Prediction API - Quick Reference

## Endpoints

### POST /api/v1/risk/score
Predict risk for a route with multiple coordinates.

### POST /api/v1/risk/nearby  
Predict risk for a single point (creates small route around it).

---

## Request Format

```json
{
  "vehicleType": "CAR",                    // Required: CAR, MOTORCYCLE, THREE_WHEELER, BUS, LORRY, VAN
  "coordinates": [[lat, lon], ...],        // Required: Min 2 coordinates
  "hour": 18,                              // Optional: 0-23 (manual time)
  "timestampUtc": "2026-01-15T18:00:00Z", // Optional: ISO timestamp
  "weather": {                             // Optional: Manual weather
    "temperature": 28.5,                   // °C
    "humidity": 85.0,                      // %
    "precipitation": 5.2,                  // mm
    "wind_speed": 15.0,                    // km/h
    "is_wet": 1                            // 0=dry, 1=wet
  }
}
```

---

## Modes

### 🌐 LIVE MODE
Omit `weather` field → API fetches live weather from Open-Meteo

### ✋ MANUAL MODE  
Include `weather` field → API uses your values

### 🔀 HYBRID MODE
Include `hour` but not `weather` → Manual time + live weather

---

## Response Format

```json
{
  "overall": 0.65,                         // Overall risk (0-1)
  "segmentScores": [0.62, 0.68, 0.64],    // Per-segment risks
  "segmentCoordinates": [[lat, lon], ...], // Analyzed coordinates
  "segmentCauses": ["Over Speed", ...],    // Top causes
  "rateScores": [0.042, ...],              // Incident rates
  "explain": {                             // Risk factors
    "curvature": 0.15,
    "surface_wetness_prob": 0.85,
    "wind_speed": 15.0,
    "temperature": 28.5,
    "vehicle_factor": 1.2
  },
  "confidence": {                          // Model confidence
    "confidence": 0.872,
    "certainty": 0.9,
    "consistency": 0.945
  },
  "weather": {                             // Weather used (live or manual)
    "temperature": 28.5,
    "humidity": 85.0,
    "precipitation": 5.2,
    "wind_speed": 15.0,
    "is_wet": 1
  }
}
```

---

## Risk Levels

| Score | Level | Color | Meaning |
|-------|-------|-------|---------|
| 0.0-0.4 | LOW | 🟢 | Normal conditions |
| 0.4-0.7 | MEDIUM | 🟡 | Increased caution |
| 0.7-1.0 | HIGH | 🔴 | Dangerous |

---

## Quick Examples

### Bash - LIVE Mode
```bash
curl -X POST "http://localhost:8000/api/v1/risk/score" \
  -H "Content-Type: application/json" \
  -d '{"vehicleType":"CAR","coordinates":[[6.8755,80.7500],[6.8760,80.7505]]}'
```

### Bash - MANUAL Mode
```bash
curl -X POST "http://localhost:8000/api/v1/risk/score" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType":"MOTORCYCLE",
    "coordinates":[[6.8755,80.7500],[6.8760,80.7505]],
    "hour":18,
    "weather":{"temperature":28,"humidity":85,"precipitation":5,"wind_speed":15,"is_wet":1}
  }'
```

### Python - LIVE Mode
```python
import requests

r = requests.post("http://localhost:8000/api/v1/risk/score", json={
    "vehicleType": "CAR",
    "coordinates": [[6.8755, 80.7500], [6.8760, 80.7505]]
})
print(f"Risk: {r.json()['overall']:.2%}")
```

### Python - MANUAL Mode
```python
import requests

r = requests.post("http://localhost:8000/api/v1/risk/score", json={
    "vehicleType": "MOTORCYCLE",
    "coordinates": [[6.8755, 80.7500], [6.8760, 80.7505]],
    "hour": 18,
    "weather": {
        "temperature": 28.0,
        "humidity": 85.0,
        "precipitation": 5.0,
        "wind_speed": 15.0,
        "is_wet": 1
    }
})
print(f"Risk: {r.json()['overall']:.2%}")
```

### JavaScript - LIVE Mode
```javascript
const response = await fetch("http://localhost:8000/api/v1/risk/score", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    vehicleType: "CAR",
    coordinates: [[6.8755, 80.7500], [6.8760, 80.7505]]
  })
});
const data = await response.json();
console.log(`Risk: ${(data.overall * 100).toFixed(0)}%`);
```

### JavaScript - MANUAL Mode
```javascript
const response = await fetch("http://localhost:8000/api/v1/risk/score", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    vehicleType: "MOTORCYCLE",
    coordinates: [[6.8755, 80.7500], [6.8760, 80.7505]],
    hour: 18,
    weather: {
      temperature: 28.0,
      humidity: 85.0,
      precipitation: 5.0,
      wind_speed: 15.0,
      is_wet: 1
    }
  })
});
const data = await response.json();
console.log(`Risk: ${(data.overall * 100).toFixed(0)}%`);
```

---

## Risk Factors

### High-Risk Conditions
- ⚠️ Heavy rain (precip > 5mm) → +40-60% risk
- ⚠️ Rush hours (7-9 AM, 5-7 PM) → +20-30% risk
- ⚠️ Night (10 PM - 2 AM) → +20-30% risk
- ⚠️ High wind (> 30 km/h) → +20-30% risk
- ⚠️ Motorcycle + wet roads → +40-60% risk
- ⚠️ High curvature → +15-45% risk

### Vehicle Risk Multipliers
- Motorcycle: 1.2x (highest risk)
- Three-Wheeler: 1.15x
- Lorry: 1.15x
- Bus: 1.1x
- Car: 1.0x (baseline)
- Van: 1.0x

---

## Common Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 400 | "Need at least 2 coordinates" | Provide min 2 coordinate pairs |
| 400 | "Outside Ginigathena service area" | Use coordinates within bounds |
| 422 | Validation error | Check JSON format and types |
| 500 | Internal server error | Check logs, model loading |

---

## Frontend Integration

### React - Using Store
```typescript
import { useRiskStore } from "@/store/useRiskStore";
import { riskApi } from "@/lib/api/client";

const { getActiveWeather } = useRiskStore();

// Automatically uses manual or live weather based on toggle
const weather = getActiveWeather();
const result = await riskApi.score({
  lat: 6.8755,
  lon: 80.7500,
  vehicle: "CAR",
  hour: 18,
  ...weather
});
```

### React - Weather Panel
```typescript
import { WeatherPanel } from "@/components/WeatherPanel";

// Renders manual/live toggle + sliders
<WeatherPanel location={{ lat: 6.8755, lng: 80.7500 }} />
```

---

## Testing

```bash
# Run comprehensive test suite
cd back-end
python test_risk_predictions.py

# Individual tests
python test_historical_integration.py
python test_realtime_integration.py
python test_weather_integration.py
```

---

## Useful Links

- **Full API Guide**: `API_USAGE_GUIDE.md`
- **System Overview**: `LIVE_MANUAL_DATA_GUIDE.md`
- **Integration Status**: `INTEGRATION_COMPLETE.md`
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

---

**Need Help?**
- Check logs: `back-end/backend-log.txt`
- Run health check: `curl http://localhost:8000/health`
- Test models: `python test_model_loading.py`
