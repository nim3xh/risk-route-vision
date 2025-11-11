# DriverAlert Setup Guide

## Overview
DriverAlert is a vehicle-specific accident risk monitoring system for the Ginigathena domain in Sri Lanka. The app provides real-time risk assessment across different vehicle types using intelligent risk scoring.

## Features Implemented

### ✅ Daily Risk Overview (`/`)
- Interactive Google Maps showing risky road segments
- Hour slider (0-23) to view risk at different times
- Vehicle type selector (Car, Bus, Motorcycle, Three Wheeler)
- Color-coded risk visualization:
  - **Green** (0-39): Low Risk
  - **Amber** (40-69): Medium Risk  
  - **Red** (70-100): High Risk
- Click segments to see detailed information
- Top risky spots panel with ranked list
- Mock/Live data toggle

### ✅ Live Drive Simulation (`/live`)
- Real-time GPS-based risk monitoring (simulated)
- Drive simulation along preset route
- Live risk banner showing current location risk
- Risk score updates every 2 seconds during simulation
- Vehicle-specific risk calculation

### ✅ Route Look-Ahead (`/route`)
- Analyze risk along entire route
- Sample route points every ~100m
- Identify high-risk segments ahead
- Warning alerts for risky areas (≥70)
- Visual route overlay on map

## Quick Start

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
# Required: Get your Google Maps API key from https://console.cloud.google.com
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here

# Optional: Backend API (leave empty to use mock data)
VITE_API_BASE=

# Optional: Timezone (default: Asia/Colombo)
VITE_TIMEZONE=Asia/Colombo

# Optional: Force mock mode (automatically enabled if no API_BASE)
VITE_USE_MOCK_API=true
```

### 2. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API (optional, for search)
4. Go to Credentials → Create Credentials → API Key
5. (Recommended) Restrict the key:
   - Application restrictions: HTTP referrers
   - API restrictions: Maps JavaScript API
6. Copy the key to your `.env` file

### 3. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:8080`

## Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Maps**: Google Maps JavaScript API
- **State**: Zustand (persistent localStorage)
- **HTTP**: Axios (for future backend)
- **Date/Time**: Day.js with timezone support (Asia/Colombo)

### Project Structure

```
src/
├── components/          # React components
│   ├── HourSlider.tsx
│   ├── VehicleSelect.tsx
│   ├── Legend.tsx
│   ├── MapWeb.tsx
│   ├── RiskBanner.tsx
│   ├── SegmentInfoCard.tsx
│   └── TopSpotsPanel.tsx
├── pages/              # Route pages
│   ├── MapOverview.tsx
│   ├── LiveDrive.tsx
│   └── RouteLookAhead.tsx
├── store/              # Zustand state management
│   ├── useUiStore.ts
│   └── useRiskStore.ts
├── lib/
│   ├── api/           # API client layer
│   │   ├── client.ts       # Unified API (auto-switches mock/http)
│   │   ├── mockAdapter.ts  # Mock data generator
│   │   └── httpAdapter.ts  # HTTP client (axios)
│   ├── geo/           # Geographic utilities
│   │   ├── bbox.ts         # Bounding box helpers
│   │   └── sampling.ts     # Polyline sampling
│   ├── utils/         # Utility functions
│   │   ├── colors.ts       # Risk → color mapping
│   │   └── format.ts       # Time/date formatting (TZ-aware)
│   └── config.ts      # Environment config
├── fixtures/          # Mock data
│   ├── segments_today.json
│   └── route_demo.json
└── types/             # TypeScript interfaces
    └── index.ts
```

## Data Flow

### Mock Mode (Default)
```
User Action → API Client → Mock Adapter → Fixtures → UI Update
```

### Live Mode (When backend connected)
```
User Action → API Client → HTTP Adapter → Real API → UI Update
```

The `riskApi` client automatically switches between mock and HTTP based on:
- `VITE_USE_MOCK_API` environment variable
- Presence of `VITE_API_BASE`
- Runtime toggle in UI

## API Contracts

### Score Request
```typescript
interface ScoreRequest {
  lat: number;
  lon: number;
  vehicle: "Car" | "Bus" | "Motor Cycle" | "Three Wheeler";
  timestamp?: string;     // ISO format
  is_wet?: 0 | 1;
  temperature_c?: number;
  humidity_pct?: number;
  precip_mm?: number;
  wind_kmh?: number;
}
```

### Score Response
```typescript
interface ScoreResponse {
  risk_0_100: number;      // 0-100 risk score
  top_cause: string;       // Primary risk factor
  p_top_cause: number;     // Confidence (0-1)
  rate_pred: number;
  components: {
    cause_component: number;
    rate_component: number;
    S_vehicle: number;
    W_weather: number;
  };
}
```

### Segments Today Response
```typescript
interface SegmentsTodayResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point" | "LineString";
      coordinates: number[] | number[][];
    };
    properties: {
      segment_id: string;
      risk_0_100: number;
      hour: number;        // 0-23 (Asia/Colombo TZ)
      vehicle: Vehicle;
      top_cause?: string;
    };
  }>;
}
```

## Connecting to Real Backend

When you're ready to connect to a real API:

1. Deploy your backend with these endpoints:
   - `POST /score` - Get risk score for point
   - `GET /segments/today?bbox=...&hour=...&vehicle=...` - Get segments
   - `GET /spots/top?vehicle=...&limit=...` - Get top risky spots

2. Update `.env`:
   ```bash
   VITE_API_BASE=https://your-api.com/api
   VITE_USE_MOCK_API=false
   ```

3. The `httpAdapter.ts` is ready to use - no code changes needed!

## Mock Data

The app includes deterministic mock data:
- **8 sample segments** in Ginigathena area
- **Demo route** with 11 waypoints
- **Seeded pseudo-random risk scores** (consistent per location)
- Vehicle-specific multipliers:
  - Car: 1.0x
  - Bus: 0.85x
  - Motorcycle: 1.3x
  - Three Wheeler: 1.15x

## Customization

### Change Domain Area
Edit `src/lib/config.ts`:
```typescript
domain: {
  center: { lat: 7.3167, lng: 80.5333 },
  bounds: {
    minLon: 80.48,
    minLat: 7.28,
    maxLon: 80.58,
    maxLat: 7.35,
  },
}
```

### Adjust Risk Thresholds
Edit `src/lib/utils/colors.ts`:
```typescript
export function riskToBand(risk: number): RiskBand {
  if (risk < 40) return "safe";      // Change 40
  if (risk < 70) return "warning";   // Change 70
  return "danger";
}
```

### Add More Mock Segments
Edit `src/fixtures/segments_today.json` - add GeoJSON features.

## Troubleshooting

### Map not loading
- Check if `VITE_GOOGLE_MAPS_API_KEY` is set in `.env`
- Verify API key has Maps JavaScript API enabled
- Check browser console for errors
- Ensure billing is enabled on Google Cloud project

### "Mock mode" won't disable
- Verify `VITE_API_BASE` is set in `.env`
- Set `VITE_USE_MOCK_API=false`
- Restart dev server after `.env` changes

### Risk scores not updating
- Check browser console for API errors
- Verify mock data exists in `src/fixtures/`
- Check network tab for failed requests

## Future Enhancements

When ready to add:
- Real GPS tracking (browser Geolocation API)
- Push notifications for high-risk areas
- Historical risk data & trends
- Weather integration
- User accounts & preferences
- Offline support (service workers)
- Heatmap visualization
- Custom route planning

## Support

For issues or questions:
1. Check browser console for errors
2. Verify `.env` configuration
3. Test with mock mode first
4. Check Google Maps API quotas

---

**Built with Lovable** 🚗 Stay safe on the roads!
