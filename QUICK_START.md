# Quick Start Guide - Enhanced RiskRoute Vision

## Prerequisites
- Node.js 18+
- Python 3.9+
- Git

## Installation & Setup

### Backend Setup
```bash
cd back-end
pip install -r requirements.txt
```

### Frontend Setup
```bash
cd front-end
npm install
# or
bun install
```

## Running the Application

### Option 1: Run Both (Recommended)
```bash
# From root directory
.\start-both.ps1
```

### Option 2: Run Separately
```bash
# Terminal 1 - Backend
cd back-end
python -m uvicorn app.main:app --reload --port 8080

# Terminal 2 - Frontend
cd front-end
npm run dev
# or
bun run dev
```

## Accessing the Application

Open your browser to: `http://localhost:5173`

## Testing Each Sidebar Feature

### 1. Map Overview Test
**Steps:**
1. Navigate to Map Overview (first sidebar option)
2. Adjust vehicle type to "Motorcycle" - see risk scores change
3. Change time to 22:00 (night) - peak accident hours
4. Click "Mock" toggle to switch between demo and live data
5. Click on top spots to see segment details
6. Review risk distribution statistics

**Expected:**
- Risk scores update based on vehicle and time
- Statistics show in control panel
- Top 10 spots display with clickable highlights
- Visual risk indicators change color appropriately

### 2. Route Analysis Test
**Steps:**
1. Navigate to Route Analysis (Route Analysis option)
2. Click "Use Current Location" or search origin
3. Search for a destination (e.g., Colombo)
4. Select vehicle type
5. Click "Analyze Path"
6. Review peak/average risk, model factors, primary hazard

**Expected:**
- Route renders on map
- Distance and ETA display correctly
- Risk analysis shows per-segment scores
- Model factors breakdowns show meaningful values
- Alerts appear if risk > 70%

### 3. Live Drive Test
**Steps:**
1. Navigate to Live Drive (Live Drive option)
2. Click "Demo" to start demo simulation
3. Watch risk score update every 2 seconds
4. View location coordinates and address
5. Observe HUD for current location
6. Stop simulation

**Alternative - Live Tracking:**
1. Click "Live" instead
2. Grant location permission
3. Watch real-time risk updates
4. Monitor location changes

**Expected:**
- Risk score updates in real-time
- Location marker stays centered
- Danger banner appears if risk > 70%
- Location info refreshes
- Both modes work seamlessly

### 4. Dashboard Test
**Steps:**
1. Navigate to Dashboard
2. Scroll through dashboard cards
3. Review model health status
4. Check R² Score and accuracy metrics
5. Read weather impact information
6. Check model details and features

**Expected:**
- All models show "Active" status
- Performance metrics display correctly
- Model features list shows 9+ items
- Vehicle types show 6 types
- Weather conditions display real data
- Dashboard auto-refreshes every 30 seconds

## API Endpoints Reference

### Risk Scoring
- `POST /api/v1/risk/score` - Score a route
- `POST /api/v1/risk/nearby` - Score nearby area
- `GET /api/v1/risk/segments/today` - Get daily segments
- `GET /api/v1/risk/spots/top` - Top risk spots

### Analytics (NEW)
- `POST /api/v1/analytics/route-comparison` - Compare routes
- `GET /api/v1/analytics/risk-distribution` - Risk distribution
- `GET /api/v1/analytics/vehicle-comparison` - Vehicle comparison
- `GET /api/v1/analytics/hourly-trends` - Hourly trends
- `POST /api/v1/analytics/route-details` - Route details
- `GET /api/v1/analytics/risk-factors` - Risk factor breakdown

### Models
- `GET /api/v1/models/info` - Model metadata
- `GET /api/v1/models/metrics` - Performance metrics
- `GET /api/v1/models/health` - System health
- `GET /api/v1/models/historical/metrics` - Historical metrics

### Weather
- `GET /api/v1/weather` - Current weather

## Troubleshooting

### Backend Issues
**Port 8080 already in use:**
```bash
# Find and kill process on port 8080
Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process
```

**Module import errors:**
```bash
pip install -r requirements.txt --force-reinstall
```

**Model files not found:**
- Ensure model files exist in `back-end/models/`
- Check `back-end/backend-log.txt` for details

### Frontend Issues
**Port 5173 already in use:**
```bash
npm run dev -- --port 3000
```

**Build errors:**
```bash
rm -r node_modules package-lock.json
npm install
npm run build
```

**API connection issues:**
- Check backend is running on port 8080
- Check CORS is enabled
- Verify API base URL in `front-end/src/lib/config.ts`

## Performance Tips

1. **Reduce Re-renders:**
   - Use mock mode when testing UI extensively
   - Adjust dashboard refresh interval in Dashboard.tsx

2. **Improve API Performance:**
   - Use smaller bounding boxes for segment queries
   - Limit route analysis to <500 segments

3. **Better Mobile Performance:**
   - Reduce map tile load quality
   - Use simulation mode instead of live GPS

## Advanced Configuration

### Backend (back-end/.env)
```
APP_ENV=development
APP_NAME=RiskRoute Vision
OPENWEATHER_API_KEY=your_key_here
```

### Frontend (front-end/.env)
```
VITE_API_BASE=http://localhost:8080/api/v1
VITE_USE_MOCK_API=false
```

## Support & Debugging

### Enable Verbose Logging
**Backend:**
- Check `back-end/backend-log.txt` for API logs

**Frontend:**
- Open DevTools (F12)
- Check Console tab for errors
- Monitor Network tab for API calls

### Common Issues

**Risk scores always 0:**
- Check if coordinates are in Ginigathena area
- Verify weather data is being fetched
- Check model health status in Dashboard

**Location not updating:**
- Grant browser location permissions
- Check GPS accuracy in Live Drive
- Verify geolocation API is supported

**Map not rendering:**
- Check internet connection (mapbox requires online)
- Verify map token is valid
- Clear browser cache

## Next Steps

1. Customize the experience with your own data
2. Adjust risk thresholds in vehicle profiles
3. Integrate with real-time traffic data
4. Add historical incident data
5. Deploy to production using Azure or AWS

For detailed feature documentation, see [SIDEBAR_FEATURES_GUIDE.md](SIDEBAR_FEATURES_GUIDE.md)
