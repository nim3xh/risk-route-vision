# Risk Route Vision - Frontend-Backend Integration

This document describes how the frontend and backend are integrated.

## Architecture Overview

- **Frontend**: React + TypeScript (Vite) running on port **5173**
- **Backend**: FastAPI (Python) running on port **8080**
- **Communication**: RESTful API with CORS enabled

## Configuration

### Frontend Configuration (`.env`)

```env
VITE_API_BASE=http://localhost:8080/api/v1
VITE_TIMEZONE=Asia/Colombo
VITE_USE_MOCK_API=false
```

### Backend Configuration (`.env`)

```env
APP_NAME=Risk Route Vision API
APP_ENV=dev
PORT=8080
FRONTEND_ORIGIN=http://localhost:5173
OPENMETEO_BASE=https://api.open-meteo.com/v1/forecast
```

## API Endpoints

The backend exposes the following endpoints:

### Risk Assessment

- **POST** `/api/v1/risk/score` - Calculate risk score for a route
  - Request: `{ vehicleType, coordinates, timestampUtc }`
  - Response: `{ overall, segmentScores, explain }`

- **POST** `/api/v1/risk/nearby` - Calculate risk for nearby area
  - Request: `{ vehicleType, point, radiusMeters }`
  - Response: `{ overall, segmentScores, explain }`

- **GET** `/api/v1/risk/segments/today` - Get risk segments (GeoJSON)
  - Query params: `bbox, hour, vehicle`
  - Response: `{ type: "FeatureCollection", features: [...] }`

- **GET** `/api/v1/risk/spots/top` - Get top risk spots
  - Query params: `vehicle, limit`
  - Response: Array of top risk spots

### Datasets

- **POST** `/api/v1/datasets/upload` - Upload Excel dataset
  - Accepts: `.xlsx`, `.xls` files

### Alerts (SSE)

- **GET** `/api/v1/alerts/stream` - Real-time risk alerts stream
  - Query params: `clientId, vehicleType, lat, lon`

### Health Check

- **GET** `/health` - Server health status

## Data Mapping

### Vehicle Types

Frontend to Backend mapping:
- `"Car"` → `"CAR"`
- `"Bus"` → `"BUS"`
- `"Motor Cycle"` → `"MOTORCYCLE"`
- `"Three Wheeler"` → `"THREE_WHEELER"`
- `"Van"` → `"CAR"` (fallback)
- `"Lorry"` → `"LORRY"`

### Coordinates

- Frontend uses: `{ lat, lon }`
- Backend uses: `[lat, lon]` (array format)

### Risk Scores

- Backend returns: `overall` (0.0-1.0)
- Frontend expects: `risk_0_100` (0-100)
- Conversion: `risk_0_100 = Math.round(overall * 100)`

## CORS Configuration

The backend is configured to accept requests from `http://localhost:5173`:

```python
# In back-end/app/core/cors.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Running the Application

### Quick Start (Recommended)

Double-click `start-both.ps1` or run in PowerShell:
```powershell
.\start-both.ps1
```

### Manual Start

**Terminal 1 - Backend:**
```powershell
cd back-end
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

**Terminal 2 - Frontend:**
```powershell
cd front-end
bun run dev
```

### Individual Scripts

```powershell
# Start backend only
.\start-backend.ps1

# Start frontend only
.\start-frontend.ps1
```

## Testing the Integration

1. Start both servers
2. Open browser to http://localhost:5173
3. Check browser console for any API errors
4. Test risk calculation features
5. Verify API calls in Network tab

### Manual API Test

```powershell
# Test health endpoint
curl http://localhost:8080/health

# Test risk score endpoint
curl -X POST http://localhost:8080/api/v1/risk/score `
  -H "Content-Type: application/json" `
  -d '{"vehicleType":"CAR","coordinates":[[6.9893,80.4927]]}'
```

## Known Limitations

### All Endpoints Now Implemented! ✅

All frontend features now have working backend endpoints:

1. ✅ **Segments Today** (`GET /api/v1/risk/segments/today`)
   - Frontend: `getSegmentsToday(bbox, hour, vehicle)`
   - Status: **Fully implemented and integrated**
   - Returns dynamic risk segments based on location, time, and vehicle

2. ✅ **Top Spots** (`GET /api/v1/risk/spots/top`)
   - Frontend: `getTopSpots(vehicle, limit)`
   - Status: **Fully implemented and integrated**
   - Returns top risk locations sorted by risk score

**No more mock data!** All features use real backend APIs.

## Troubleshooting

### CORS Errors
- Ensure backend `.env` has `FRONTEND_ORIGIN=http://localhost:5173`
- Check frontend is running on port 5173
- Restart backend after changing CORS settings

### Connection Refused
- Verify backend is running on port 8080
- Check firewall settings
- Ensure no other service is using port 8080

### API Errors
- Check backend logs for detailed error messages
- Verify request format matches backend schema
- Check browser console for error details

### Mock Mode Not Disabling
- Ensure `.env` file exists in `front-end/` directory
- Check `VITE_USE_MOCK_API=false` in `.env`
- Restart frontend dev server after changing `.env`

## Development Notes

### Adding New Endpoints

1. **Backend**: Add route in `back-end/app/routers/`
2. **Frontend**: Update `httpAdapter.ts` to call new endpoint
3. **Types**: Update `front-end/src/types/index.ts` if needed
4. Test integration thoroughly

### Environment Variables

Frontend env vars must start with `VITE_` to be exposed to the client.

Backend uses `pydantic-settings` to load from `.env` file.

## API Documentation

When backend is running, visit:
- Swagger UI: http://localhost:8080/docs
- ReDoc: http://localhost:8080/redoc
