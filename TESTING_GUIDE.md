# Quick Testing Guide - Mock to API Integration

## Before You Start

Make sure both servers are running:
```powershell
.\start-both.ps1
```

## Test 1: Backend API Endpoints

### Test Segments Endpoint
```powershell
# All segments (default area)
curl http://localhost:8080/api/v1/risk/segments/today

# Filter by vehicle
curl "http://localhost:8080/api/v1/risk/segments/today?vehicle=MOTORCYCLE"

# Filter by hour
curl "http://localhost:8080/api/v1/risk/segments/today?hour=8"

# Filter by bounding box
curl "http://localhost:8080/api/v1/risk/segments/today?bbox=80.43,6.94,80.55,7.03"

# All filters combined
curl "http://localhost:8080/api/v1/risk/segments/today?bbox=80.43,6.94,80.55,7.03&hour=8&vehicle=MOTORCYCLE"
```

### Test Top Spots Endpoint
```powershell
# Top 10 spots (default)
curl http://localhost:8080/api/v1/risk/spots/top

# Top 5 spots
curl "http://localhost:8080/api/v1/risk/spots/top?limit=5"

# Top spots for buses
curl "http://localhost:8080/api/v1/risk/spots/top?vehicle=BUS"

# Top 20 spots for motorcycles
curl "http://localhost:8080/api/v1/risk/spots/top?vehicle=MOTORCYCLE&limit=20"
```

## Test 2: Frontend Integration

### Open the Application
1. Go to http://localhost:5173
2. Open DevTools (F12)

### Check Console Tab
Look for:
- ✅ No warnings about "Backend endpoint not implemented"
- ✅ No "using mock data" messages
- ✅ Successful API calls to backend

### Check Network Tab
1. Filter by "risk"
2. Look for these requests:
   - ✅ `GET /api/v1/risk/segments/today`
   - ✅ `GET /api/v1/risk/spots/top`
3. Click on a request
4. Check Response tab to see actual data

### Test Map Overview Page
1. Navigate to Map Overview
2. You should see risk segments on the map
3. Try these:
   - Change vehicle type → map updates
   - Adjust hour slider → map updates
   - Pan/zoom map → segments reload for new area

### Test Top Spots Panel
1. Look for "Top Risk Spots" panel
2. Should show list of high-risk locations
3. Click on a spot → map zooms to that location
4. Change vehicle type → list updates

## Test 3: Vehicle Type Mapping

### Test Different Vehicles
Try each vehicle type and verify risk differences:
- **Motorcycle** - Highest risk (1.3x multiplier)
- **Three Wheeler** - High risk (1.15x)
- **Car** - Normal risk (1.0x)
- **Van** - Normal risk (mapped to CAR)
- **Bus** - Lower risk (0.85x)
- **Lorry** - Lower risk (0.90x)

### Expected Behavior
Same location should show:
- Higher risk for motorcycles
- Lower risk for buses
- Different top causes based on vehicle

## Test 4: Time-Based Risk

### Test Rush Hour
Set hour slider to 8 AM or 6 PM:
- Risk should be higher (1.2x multiplier)
- "Heavy traffic" causes should appear

### Test Late Night
Set hour slider to 2 AM:
- Risk should be slightly higher (1.1x)
- Different risk patterns

### Test Normal Hours
Set hour slider to 11 AM:
- Baseline risk (1.0x multiplier)

## Test 5: API Response Format

### Check Segments Response
Should look like:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [80.4894, 6.9864]
      },
      "properties": {
        "segment_id": "seg_69864_804894",
        "risk_0_100": 95,
        "hour": 8,
        "vehicle": "CAR",
        "top_cause": "Dangerous sharp curve"
      }
    }
  ]
}
```

### Check Top Spots Response
Should look like:
```json
[
  {
    "segment_id": "seg_69864_804894",
    "lat": 6.9864,
    "lon": 80.4894,
    "risk_0_100": 95,
    "vehicle": "CAR",
    "hour": 8,
    "top_cause": "Dangerous sharp curve"
  }
]
```

## Common Issues & Solutions

### Issue: No segments appearing
**Solution:**
- Check backend is running: `curl http://localhost:8080/health`
- Check console for errors
- Verify `.env` has `VITE_USE_MOCK_API=false`

### Issue: Still seeing mock data
**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard reload page (Ctrl+F5)
- Restart frontend dev server
- Check `.env` file exists and is correct

### Issue: CORS errors
**Solution:**
- Ensure backend `.env` has `FRONTEND_ORIGIN=http://localhost:5173`
- Restart backend server
- Check backend console for CORS errors

### Issue: Wrong vehicle types displayed
**Solution:**
- Check vehicle mapping in console
- Verify `unmapVehicleType()` function in httpAdapter.ts
- Clear browser cache

## Success Criteria

✅ Backend endpoints respond correctly
✅ Frontend calls real API (not mock)
✅ Map shows dynamic segments
✅ Vehicle filter works
✅ Hour filter works
✅ Top spots panel populated
✅ Risk varies by vehicle type
✅ Risk varies by time of day
✅ No console warnings about mock data
✅ Network tab shows API calls to localhost:8080

## Quick Verification Checklist

- [ ] Backend health check works
- [ ] Segments endpoint returns data
- [ ] Top spots endpoint returns data
- [ ] Frontend opens without errors
- [ ] Console shows no mock warnings
- [ ] Network tab shows real API calls
- [ ] Map displays risk segments
- [ ] Vehicle selector changes data
- [ ] Hour slider changes data
- [ ] Top spots panel works
- [ ] Clicking spot zooms map
- [ ] Different vehicles show different risks

## Next Steps After Testing

If all tests pass:
1. ✅ Integration is complete!
2. Consider adding more features (see MOCK_TO_API_INTEGRATION.md)
3. Deploy to production
4. Monitor API performance
5. Gather user feedback

If tests fail:
1. Check console for error messages
2. Verify .env files are correct
3. Restart both servers
4. Clear browser cache
5. Check INTEGRATION.md troubleshooting section
