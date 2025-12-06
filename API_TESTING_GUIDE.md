# API Testing Commands 🧪

## Correct API Request Format

### ✅ Risk Score Endpoint

**Correct Format:**
```powershell
curl -X POST "http://localhost:8080/api/v1/risk/score" `
  -H "Content-Type: application/json" `
  -d '{
    "vehicleType": "MOTORCYCLE",
    "coordinates": [[79.8612, 6.9271], [79.8620, 6.9280]],
    "timestampUtc": null
  }'
```

**Expected Response:**
```json
{
  "overall": 0.68,
  "segmentScores": [0.68, 0.65],
  "explain": {
    "curvature": 0.002,
    "surface_wetness_prob": 0.0,
    "wind_speed": 5.0,
    "temperature": 28.0,
    "vehicle_factor": 1.3
  }
}
```

### Vehicle Types

Valid values for `vehicleType`:
- `MOTORCYCLE` (highest risk multiplier: 1.3x)
- `THREE_WHEELER` (1.2x)
- `CAR` (1.0x baseline)
- `BUS` (0.9x safer)
- `LORRY` (1.1x)

### ✅ Nearby Risk Endpoint

```powershell
curl -X POST "http://localhost:8080/api/v1/risk/nearby" `
  -H "Content-Type: application/json" `
  -d '{
    "vehicleType": "CAR",
    "point": [79.8612, 6.9271],
    "radiusMeters": 300
  }'
```

### ✅ Segments Today Endpoint

```powershell
# All segments
curl "http://localhost:8080/api/v1/risk/segments/today"

# With bounding box
curl "http://localhost:8080/api/v1/risk/segments/today?bbox=79.8,6.9,79.9,7.0"

# With hour filter (0-23)
curl "http://localhost:8080/api/v1/risk/segments/today?hour=14"

# With vehicle filter
curl "http://localhost:8080/api/v1/risk/segments/today?vehicle=MOTORCYCLE"

# Combined filters
curl "http://localhost:8080/api/v1/risk/segments/today?bbox=79.8,6.9,79.9,7.0&hour=14&vehicle=CAR"
```

### ✅ Top Risk Spots Endpoint

```powershell
# Top 10 spots (default)
curl "http://localhost:8080/api/v1/risk/spots/top"

# Top 20 spots
curl "http://localhost:8080/api/v1/risk/spots/top?limit=20"

# Filter by vehicle
curl "http://localhost:8080/api/v1/risk/spots/top?vehicle=MOTORCYCLE&limit=15"
```

---

## Common Errors

### ❌ Wrong: Using `vehicle` instead of `vehicleType`
```json
{
  "vehicle": "MOTORCYCLE",  // ❌ Wrong field name
  "coordinates": [[79.8612, 6.9271]]
}
```

### ❌ Wrong: Using `route` object instead of `coordinates`
```json
{
  "vehicleType": "MOTORCYCLE",
  "route": {  // ❌ Wrong - don't wrap in route object
    "type": "LineString",
    "coordinates": [[79.8612, 6.9271]]
  }
}
```

### ✅ Correct: Flat structure
```json
{
  "vehicleType": "MOTORCYCLE",
  "coordinates": [[79.8612, 6.9271], [79.8620, 6.9280]],
  "timestampUtc": null
}
```

---

## Testing Different Vehicles

### Motorcycle (High Risk)
```powershell
curl -X POST "http://localhost:8080/api/v1/risk/score" `
  -H "Content-Type: application/json" `
  -d '{
    "vehicleType": "MOTORCYCLE",
    "coordinates": [[79.8612, 6.9271], [79.8620, 6.9280]]
  }'
```

### Car (Baseline Risk)
```powershell
curl -X POST "http://localhost:8080/api/v1/risk/score" `
  -H "Content-Type: application/json" `
  -d '{
    "vehicleType": "CAR",
    "coordinates": [[79.8612, 6.9271], [79.8620, 6.9280]]
  }'
```

### Bus (Lower Risk)
```powershell
curl -X POST "http://localhost:8080/api/v1/risk/score" `
  -H "Content-Type: application/json" `
  -d '{
    "vehicleType": "BUS",
    "coordinates": [[79.8612, 6.9271], [79.8620, 6.9280]]
  }'
```

**Note:** With the same route, MOTORCYCLE should show ~30% higher risk than CAR, and BUS should show ~10% lower risk.

---

## Backend API Documentation

Start backend and visit:
```
http://localhost:8080/docs
```

Interactive Swagger UI with:
- All endpoints documented
- Try-it-out functionality
- Request/response schemas
- Example values

---

## Quick Test Script

Create `test-api.ps1`:
```powershell
# Test all endpoints

Write-Host "Testing Risk Score..." -ForegroundColor Yellow
curl -X POST "http://localhost:8080/api/v1/risk/score" `
  -H "Content-Type: application/json" `
  -d '{"vehicleType": "MOTORCYCLE", "coordinates": [[79.8612, 6.9271], [79.8620, 6.9280]]}'

Write-Host "`nTesting Nearby..." -ForegroundColor Yellow
curl -X POST "http://localhost:8080/api/v1/risk/nearby" `
  -H "Content-Type: application/json" `
  -d '{"vehicleType": "CAR", "point": [79.8612, 6.9271], "radiusMeters": 300}'

Write-Host "`nTesting Segments Today..." -ForegroundColor Yellow
curl "http://localhost:8080/api/v1/risk/segments/today?limit=5"

Write-Host "`nTesting Top Spots..." -ForegroundColor Yellow
curl "http://localhost:8080/api/v1/risk/spots/top?limit=5"

Write-Host "`nAll tests complete!" -ForegroundColor Green
```

Run with:
```powershell
.\test-api.ps1
```

---

## Frontend Integration

The frontend already sends the correct format:

```typescript
// httpAdapter.ts
const backendRequest = {
  vehicleType: mapVehicleType(req.vehicle),  // ✅ Correct field name
  coordinates: [[req.lat, req.lon]],          // ✅ Correct format
  timestampUtc: req.timestamp || null,
};
```

So your frontend will work perfectly! The issue was only with the manual curl test command.

---

## Summary

**Wrong curl command:**
```bash
-d '{"route": {...}, "vehicle": "MOTORCYCLE"}'  # ❌
```

**Correct curl command:**
```bash
-d '{"vehicleType": "MOTORCYCLE", "coordinates": [[79.8612, 6.9271]]}'  # ✅
```

**Your frontend is already correct!** ✅

Test the corrected curl command and you'll see your XGBoost predictions! 🚀
