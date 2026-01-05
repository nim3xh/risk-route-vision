# 🚀 Quick Start Guide - Risk Route Vision

## What Was Fixed

### Main Issues
1. ❌ **Map showing nothing** → ✅ **Now shows 20+ risk segments**
2. ❌ **API returning empty data** → ✅ **Backend bounds fixed**
3. ❌ **No error visibility** → ✅ **Console logging + toast notifications**
4. ❌ **Poor UI/UX** → ✅ **Enhanced panels, animations, and feedback**

---

## Starting the App

```powershell
# In project root
.\start-both.ps1
```

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8080/api/v1
- API Docs: http://localhost:8080/docs

---

## What You'll See Now

### 🗺️ Map View
- **Risk segments** displayed as colored polygons
- **Color coding**: Green (safe) → Amber (moderate) → Red (dangerous)
- **Click any segment** to see detailed risk information
- **20+ segments** loaded by default in Ginigathhena area

### 🎮 Control Panel (Left Side)
1. **⚡ ML Mode Button**: Toggle between Realtime XGBoost / Historical
2. **💾 Mock Button**: Switch between Mock data / Live API
3. **Vehicle Selector**: Choose from 6 vehicle types
4. **Map Style**: Pick from Streets, Satellite, Dark, Light, Outdoors
5. **Weather Panel**: See current conditions
6. **Time Slider**: Adjust hour (0-23) for time-based risk
7. **Visualization Mode**: Labels, Circles, or Graduated

### 📊 Statistics Panel
- **Total segments analyzed**
- **Coverage area** in km
- **Peak risk** and **Average risk** with progress bars
- **Risk distribution**: Low/Medium/High counts
- **Primary risk factor**
- **Model factors**: Curvature, Wetness, Wind speed
- **High-risk alert** when danger detected

### 📍 Top Spots Panel
- Lists **top 10 high-risk locations**
- Click to **jump to location** on map
- Shows **risk score** and **address**

---

## Controls Quick Reference

| Control | Action | Result |
|---------|--------|--------|
| **⚡ CPU Icon** | Toggle ML mode | Switch between Realtime predictions / Historical data |
| **💾 Database Icon** | Toggle mock mode | Switch between Mock data / Live API |
| **🎨 Map Style** | Change background | Choose map appearance |
| **🚗 Vehicle Type** | Select vehicle | Adjust risk for vehicle (motorcycle = higher risk) |
| **⏰ Time Slider** | Adjust hour | See risk at different times (rush hour = higher risk) |
| **🌦️ Weather** | View conditions | See current weather affecting risk |
| **📊 Viz Mode** | Change display | Labels / Circles / Graduated symbols |
| **🔄 Now Button** | Reset time | Jump back to current hour |
| **📍 Reset Button** | Reset view | Re-center map to Ginigathhena |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Mouse Click** | Select segment for details |
| **Mouse Drag** | Pan the map |
| **Scroll Wheel** | Zoom in/out |
| **ESC** | Close info panels |

---

## Understanding Risk Levels

### Risk Score Colors
- **0-39 (Green)**: ✅ Low risk - Safe to travel
- **40-69 (Amber)**: ⚠️ Medium risk - Exercise caution
- **70-100 (Red)**: 🚨 High risk - Dangerous conditions

### Risk Factors
- **Curvature**: Sharp turns and bends
- **Surface Wetness**: Road moisture probability
- **Wind Speed**: Strong winds affecting stability
- **Temperature**: Extreme temperatures
- **Vehicle Type**: Vehicle-specific risk multipliers
- **Time of Day**: Rush hours and night time

---

## Browser Console (F12)

### Expected Output (No Errors)
```
[API] Fetching segments/today with params: {...}
[API] Received segments: 20
Loading data with params: {...}
Loaded segments: 20
Loaded spots: 10
```

### If You See Errors
1. Check both servers are running
2. Verify coordinates are within service area
3. Check backend terminal for Python errors
4. Refresh the page (Ctrl+R)

---

## Testing Different Scenarios

### Test 1: Different Time of Day
1. Move **Time Slider** to hour 8 (morning rush)
2. Risk should **increase** at rush hour
3. Map updates with new data

### Test 2: Different Vehicle
1. Change **Vehicle Type** to "Motor Cycle"
2. Risk should be **higher** (motorcycles = 1.2x multiplier)
3. Map colors update

### Test 3: Realtime ML Mode
1. Click **⚡ CPU button** to enable Realtime mode
2. Badge shows "REALTIME ML"
3. Each cell calculated independently by XGBoost model
4. Slightly slower but more accurate

### Test 4: Mock vs Live
1. Click **💾 Database button** to toggle mock mode
2. Blue = Mock data (faster, for testing)
3. Gray = Live API (real predictions)

---

## Troubleshooting

### Problem: "No risk data available"
**Solution**: You're outside the service area. Click "Reset" button or manually pan to coordinates around:
- Latitude: 6.97 - 7.01
- Longitude: 80.48 - 80.51

### Problem: "Failed to load data"
**Solution**: 
1. Check backend is running on port 8080
2. Check frontend is running on port 5173
3. Open browser DevTools (F12) → Console tab
4. Look for red error messages

### Problem: Map not showing
**Solution**:
1. Hard refresh: Ctrl+Shift+R
2. Clear browser cache
3. Check internet connection (for map tiles)
4. Try different map style

### Problem: Segments not clickable
**Solution**:
1. Ensure segments are loaded (check console)
2. Try different visualization mode
3. Zoom in closer to segments

---

## Performance Tips

1. **Use Historical Mode** for faster loading (disable ⚡ Realtime)
2. **Reduce time range** by focusing on specific hours
3. **Close info panels** when not needed
4. **Use mock mode** when developing/testing

---

## Mobile Usage

- **Tap** segments to select
- **Pinch** to zoom
- **Swipe** to pan
- **☰ Menu button** (top-left) for navigation
- All controls accessible via floating panels

---

## Data Refresh

- **Automatic**: Changes when you adjust controls
- **Manual**: Click "Reset" or change parameters
- **Frequency**: On-demand (not real-time streaming)

---

## API Endpoints (for developers)

```bash
# Get risk segments
GET /api/v1/risk/segments/today?bbox=80.48,6.97,80.51,7.01&hour=12&vehicle=CAR

# Get realtime predictions
GET /api/v1/risk/segments/realtime?bbox=80.48,6.97,80.51,7.01&hour=18&vehicle=MOTORCYCLE

# Get top spots
GET /api/v1/risk/spots/top?vehicle=CAR&limit=10

# Score a route
POST /api/v1/risk/score
{
  "coordinates": [[6.989, 80.492], [6.990, 80.493]],
  "vehicleType": "CAR",
  "hour": 12
}
```

---

## What's Different Now

### Before Fix ❌
- Empty map (no segments)
- API returning `{"features": []}`
- No error messages
- Confusing UI
- Silent failures

### After Fix ✅
- 20+ segments displayed
- API returning valid GeoJSON
- Console logs for debugging
- Toast notifications for feedback
- Clear visual hierarchy
- Loading states
- Risk statistics panel
- Better error handling

---

## Support

**Check Console First**: Open DevTools (F12) → Console tab

**Common Log Messages**:
- ✅ `Loaded segments: 20` - Working correctly
- ❌ `Loaded segments: 0` - Outside service area or API error
- ⚠️ `Failed to load data` - Backend not responding

**Get Help**:
1. Check [UI_FIX_SUMMARY.md](UI_FIX_SUMMARY.md) for detailed fixes
2. Review backend logs in terminal
3. Verify coordinates within bounds (6.95-7.05, 80.45-80.55)

---

**Status**: ✅ **FULLY FUNCTIONAL**  
**Last Test**: January 5, 2026  
**Segments Loading**: 20/20  
**API Status**: ONLINE
