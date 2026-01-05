# 🌤️ Weather Integration - Quick Reference

## ⚡ Quick Start (3 Steps)

### 1. Get API Key (Optional)
```
Visit: https://openweathermap.org/api
Sign up → Get free API key → 1,000 calls/day
```

### 2. Configure
```bash
cd back-end
echo "OPENWEATHER_API_KEY=your_key_here" >> .env
```

### 3. View Weather
```
Dashboard: http://localhost:5173/dashboard
Scroll to "Real-time Weather Conditions"
```

---

## 📡 API Endpoints

### Get Weather
```http
GET /api/v1/weather?lat=6.9271&lon=79.8612
```

**Optional**: `&provider=openweather` or `&provider=openmeteo`

### Test with cURL
```bash
curl "http://localhost:8080/api/v1/weather?lat=6.9&lon=79.8"
```

---

## 💻 Component Usage

### Full Display with Auto-Refresh
```tsx
import { WeatherDisplay } from "@/components/WeatherDisplay";

<WeatherDisplay 
  location={{ lat: 6.9271, lng: 79.8612, name: "Colombo" }}
  autoRefresh={true}
  refreshInterval={300}  // 5 minutes
/>
```

### Compact Display
```tsx
<WeatherDisplay 
  location={{ lat: 6.9271, lng: 79.8612 }}
  compact={true}
/>
```

---

## 🧪 Test Everything

```bash
cd back-end
python test_weather_integration.py
```

**Expected**: ✅ All 4 tests pass

---

## 🌡️ Weather Data Available

### OpenWeatherMap (with API key)
```
✅ Temperature (actual + feels-like)
✅ Humidity & Pressure
✅ Wind (speed, direction, gusts)
✅ Precipitation & Clouds
✅ Visibility & Weather conditions
✅ Sunrise & Sunset times
✅ Location name & Country
```

### Open-Meteo (fallback, no key)
```
✅ Temperature
✅ Humidity
✅ Wind speed & direction
✅ Precipitation
✅ Cloud cover
```

---

## 🎯 Risk Impact

| Condition | Risk Increase |
|-----------|---------------|
| Wet roads | +30-40% |
| Low visibility (<1km) | +25% |
| High winds (>40 km/h) | +20% |
| Heavy clouds (>80%) | +10% |
| Temp extremes | +15% |

**Risk Levels**:
- 🟢 0-29: Low
- 🟠 30-59: Moderate
- 🔴 60+: High

---

## 🔧 Configuration Files

### Backend
```
back-end/.env
back-end/app/core/config.py
back-end/app/routers/weather.py
```

### Frontend
```
front-end/src/components/WeatherDisplay.tsx
front-end/src/pages/Dashboard.tsx
```

---

## 🐛 Troubleshooting

### No weather showing?
1. ✅ Check backend running: `http://localhost:8080/docs`
2. ✅ Test API: `curl "http://localhost:8080/api/v1/weather?lat=6.9&lon=79.8"`
3. ✅ Check browser console

### Want full features?
1. Get OpenWeatherMap API key (free)
2. Add to `back-end/.env`
3. Restart backend

### Using fallback?
- Open-Meteo works without API key
- Basic weather data
- Always available

---

## 📚 Documentation

- **Full Guide**: `WEATHER_INTEGRATION_GUIDE.md`
- **Summary**: `WEATHER_INTEGRATION_SUMMARY.md`
- **This Card**: `WEATHER_QUICK_REFERENCE.md`

---

## ✅ Status Checklist

- [x] Backend enhanced with dual providers
- [x] Frontend WeatherDisplay component
- [x] Dashboard integration complete
- [x] Auto-refresh working
- [x] Risk calculation implemented
- [x] Test suite passing
- [x] Documentation complete

---

## 🎉 Integration Complete!

**View it now**: http://localhost:5173/dashboard

**All features working** ✅
- Real-time weather ✅
- Auto-refresh ✅
- Risk assessment ✅
- Fallback support ✅

---

**Quick Links**:
- 🌐 Dashboard: http://localhost:5173/dashboard
- 📚 API Docs: http://localhost:8080/docs
- 🔑 Get API Key: https://openweathermap.org/api

---

*Last Updated: January 1, 2026*
