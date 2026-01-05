# Risk Prediction System - Live & Manual Data Integration

## 🎯 Overview

The Risk Route Vision system predicts accident risk for routes using machine learning models trained on real accident data. It supports **TWO prediction modes**:

### 1️⃣ LIVE MODE (Real-time Data)
- ✅ **Weather**: Automatically fetched from Open-Meteo API
- ✅ **Time**: Uses current system time
- ✅ **Location**: Your GPS coordinates
- ✅ **Use Case**: Real-time navigation, live tracking

### 2️⃣ MANUAL MODE (User-Provided Data)
- ✅ **Weather**: You specify temperature, humidity, precipitation, wind, road conditions
- ✅ **Time**: You specify hour of day (0-23)
- ✅ **Location**: Your coordinates
- ✅ **Use Case**: Historical analysis, scenario planning, "what-if" simulations

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  LiveDrive    │  │ RouteLookAhead│  │   WeatherPanel       │ │
│  │  - Live GPS   │  │ - Route Plan  │  │   - Manual/Live      │ │
│  │  - Tracking   │  │ - Multi-point │  │   - Weather Toggle   │ │
│  └───────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  API Router (/api/v1/risk/score)                          │  │
│  │  - Handles both LIVE and MANUAL requests                  │  │
│  │  - Validates input, processes coordinates                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│         ↓ LIVE MODE                    ↓ MANUAL MODE            │
│  ┌───────────────────┐          ┌───────────────────────┐       │
│  │  Weather Adapter  │          │  Direct Processing    │       │
│  │  - Open-Meteo API │          │  - User values        │       │
│  │  - OpenWeatherMap │          │  - No API calls       │       │
│  └───────────────────┘          └───────────────────────┘       │
│                             ↓                                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               ML Model Pipeline                           │  │
│  │  1. XGBoost: Predicts SPI (Severity Probability Index)  │  │
│  │  2. Cause Classifier: Identifies accident cause          │  │
│  │  3. Segment GBR: Predicts incident rate                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                                │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Open-Meteo   │  │OpenWeatherMap│  │  User Manual Input  │   │
│  │ (LIVE)       │  │   (LIVE)     │  │     (MANUAL)        │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Prediction Features

The ML models use these features to predict risk:

### Primary Features (Most Important)
1. **SPI_smoothed**: Severity Probability Index from XGBoost
2. **Hour**: Time of day (0-23) - captures rush hour patterns
3. **is_wet**: Road surface condition (0=dry, 1=wet)
4. **Vehicle type**: Different vehicles have different risk profiles
5. **Curvature**: Road geometry complexity

### Secondary Features
6. **Temperature**: Weather impact on driving conditions
7. **Wind speed**: Environmental hazard
8. **Day of week**: Weekend vs weekday patterns
9. **Precipitation**: Current rainfall intensity
10. **Humidity**: Environmental conditions

---

## 🔄 Data Flow

### LIVE MODE Flow
```
User Request (no weather) 
    → API extracts midpoint coordinates
    → Calls Open-Meteo API
    → Fetches real-time weather
    → Uses current system time
    → Passes to ML models
    → Returns prediction with live data
```

### MANUAL MODE Flow
```
User Request (with weather)
    → API receives weather values
    → Validates user inputs
    → Uses provided time (hour)
    → Passes to ML models
    → Returns prediction with manual data
```

---

## 🚀 Quick Start

### Backend Setup
```bash
cd back-end
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd front-end
npm install
npm run dev
```

### Test the API
```bash
# Run comprehensive tests
cd back-end
python test_risk_predictions.py
```

---

## 💻 Code Examples

### Example 1: LIVE MODE (Python)
```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/risk/score",
    json={
        "vehicleType": "CAR",
        "coordinates": [
            [6.8755, 80.7500],
            [6.8760, 80.7505]
        ]
    }
)

result = response.json()
print(f"Risk: {result['overall']:.2%}")
print(f"Weather: {result['weather']}")  # Shows live weather used
```

### Example 2: MANUAL MODE (Python)
```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/risk/score",
    json={
        "vehicleType": "MOTORCYCLE",
        "coordinates": [
            [6.8755, 80.7500],
            [6.8760, 80.7505]
        ],
        "hour": 18,  # 6 PM rush hour
        "weather": {
            "temperature": 28.5,
            "humidity": 85.0,
            "precipitation": 5.2,
            "wind_speed": 15.0,
            "is_wet": 1
        }
    }
)

result = response.json()
print(f"Risk: {result['overall']:.2%}")
print(f"Weather: {result['weather']}")  # Shows your manual weather
```

### Example 3: Frontend Usage (React)
```typescript
import { riskApi } from "@/lib/api/client";
import { useRiskStore } from "@/store/useRiskStore";

// LIVE MODE - automatic weather
const liveResult = await riskApi.score({
  lat: 6.8755,
  lon: 80.7500,
  vehicle: "CAR"
});

// MANUAL MODE - with weather panel
const { getActiveWeather } = useRiskStore();
const weather = getActiveWeather();  // Gets manual or live based on mode

const manualResult = await riskApi.score({
  lat: 6.8755,
  lon: 80.7500,
  vehicle: "MOTORCYCLE",
  hour: 18,
  ...weather  // Spreads temperature_c, humidity_pct, etc.
});
```

---

## 🎛️ Configuration

### Weather API Configuration
Edit `back-end/app/core/config.py`:

```python
class Settings(BaseSettings):
    # Open-Meteo (free, no API key needed)
    openmeteo_base: str = "https://api.open-meteo.com/v1/forecast"
    
    # OpenWeatherMap (optional, more comprehensive)
    openweather_api_key: str = ""  # Add your key here
    openweather_base: str = "https://api.openweathermap.org/data/2.5"
```

### Default Weather Values (Manual Mode Fallback)
Edit `front-end/src/store/useRiskStore.ts`:

```typescript
weather: {
  temperature_c: 28,    // Default temperature
  humidity_pct: 75,     // Default humidity
  precip_mm: 0,         // Default precipitation
  wind_kmh: 12,         // Default wind speed
  is_wet: 0,            // Default dry road
}
```

---

## 📈 Understanding Risk Scores

### Risk Score Ranges
- **0.0 - 0.4**: 🟢 **LOW** - Normal driving conditions
- **0.4 - 0.7**: 🟡 **MEDIUM** - Increased caution required
- **0.7 - 1.0**: 🔴 **HIGH** - Dangerous conditions

### Risk Factors

#### High-Risk Scenarios
1. **Heavy Rain + Rush Hour**: Risk increases 60-80%
2. **Motorcycle + Wet Roads**: Risk increases 40-60%
3. **Night Driving (10PM-2AM)**: Risk increases 20-30%
4. **High Wind + Motorcycle**: Risk increases 30-50%

#### Example Predictions

| Scenario | Vehicle | Time | Weather | Expected Risk |
|----------|---------|------|---------|---------------|
| Clear day | Car | 2 PM | Dry, 30°C | 0.25-0.35 (LOW) |
| Light rain | Car | 8 AM | Wet, 27°C | 0.45-0.55 (MEDIUM) |
| Heavy rain | Motorcycle | 6 PM | Wet, 26°C, Wind 20km/h | 0.70-0.85 (HIGH) |
| Night | Bus | 11 PM | Dry, 24°C | 0.40-0.50 (MEDIUM) |

---

## 🧪 Testing

### Manual Testing
```bash
# Test LIVE mode
curl -X POST "http://localhost:8000/api/v1/risk/score" \
  -H "Content-Type: application/json" \
  -d '{"vehicleType":"CAR","coordinates":[[6.8755,80.7500],[6.8760,80.7505]]}'

# Test MANUAL mode
curl -X POST "http://localhost:8000/api/v1/risk/score" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleType":"MOTORCYCLE",
    "coordinates":[[6.8755,80.7500],[6.8760,80.7505]],
    "hour":18,
    "weather":{"temperature":28,"humidity":85,"precipitation":5,"wind_speed":15,"is_wet":1}
  }'
```

### Automated Testing
```bash
cd back-end
python test_risk_predictions.py
```

This runs 8 comprehensive test scenarios covering both LIVE and MANUAL modes.

---

## 📁 Key Files

### Backend
- `app/routers/risk.py` - Main API endpoints for risk prediction
- `app/ml/model.py` - ML model loading and prediction logic
- `app/services/weather_adapter.py` - Live weather fetching
- `app/services/feature_engineering.py` - Feature preparation
- `test_risk_predictions.py` - Comprehensive test suite

### Frontend
- `src/pages/LiveDrive.tsx` - Real-time risk tracking page
- `src/pages/RouteLookAhead.tsx` - Route planning page
- `src/components/WeatherPanel.tsx` - Manual/Live weather toggle
- `src/store/useRiskStore.ts` - State management for weather modes
- `src/lib/api/httpAdapter.ts` - API client

### Models
- `models/xgb_vehicle_specific_risk.pkl` - XGBoost risk predictor
- `models/cause_classifier.joblib` - Accident cause classifier
- `models/segment_gbr.joblib` - Incident rate regressor
- `models/vehicle_thresholds.csv` - Vehicle-specific risk thresholds

---

## 🔧 Troubleshooting

### Issue: Live weather not working
**Solution**: Check Open-Meteo API connectivity:
```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=6.8755&longitude=80.7500&current=temperature_2m"
```

### Issue: Model predictions always return 0.3
**Problem**: Models not loaded properly
**Solution**: 
1. Check model files exist in `back-end/models/`
2. Review `backend-log.txt` for loading errors
3. Verify sklearn and xgboost versions match training

### Issue: "Outside Ginigathena service area"
**Solution**: Ensure coordinates are within bounds:
- Latitude: 6.85 to 6.90
- Longitude: 80.70 to 80.80

---

## 📚 Additional Resources

- **API Documentation**: See `API_USAGE_GUIDE.md`
- **Integration Guides**: 
  - `INTEGRATION_COMPLETE.md` - Overall integration status
  - `WEATHER_INTEGRATION_COMPLETE.md` - Weather API details
  - `XGBOOST_INTEGRATION_COMPLETE.md` - XGBoost model details
- **Testing**: `back-end/test_*.py` files

---

## 🎓 How It Works

### Step 1: Request Arrives
API receives coordinates + optional weather/time data

### Step 2: Data Mode Selection
- **No weather provided?** → LIVE MODE → Fetch from API
- **Weather provided?** → MANUAL MODE → Use provided values

### Step 3: Feature Engineering
Convert raw data into model features:
- Calculate road curvature from coordinates
- Extract time features (hour, day of week, weekend)
- Normalize weather values
- Apply vehicle-specific factors

### Step 4: ML Prediction Pipeline
1. **XGBoost Model**: Predicts base risk (SPI score)
2. **Threshold Application**: Applies vehicle-specific thresholds
3. **Cause Classifier**: Identifies most likely accident cause
4. **Rate Model**: Predicts incident frequency

### Step 5: Response Assembly
Combine predictions, confidence metrics, and metadata into response

---

## 🤝 Contributing

To add new features or improve predictions:

1. **Add new weather features**: Update `weather_adapter.py`
2. **Modify ML pipeline**: Update `model.py`
3. **Add new endpoints**: Update `routers/risk.py`
4. **Frontend enhancements**: Update `WeatherPanel.tsx` or pages

---

## 📞 Support

For issues or questions:
- Review logs: `back-end/backend-log.txt`
- Check integration guides in project root
- Run test suite: `python test_risk_predictions.py`

---

**Last Updated**: January 2026  
**Version**: 2.0  
**License**: MIT
