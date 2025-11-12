# Route Look-Ahead with Location Search & Real Routing

## Overview
Enhanced Route Look-Ahead mode with location search, real-time routing, and comprehensive risk analysis along actual road paths.

## Features

### 🔍 Location Search
- **Intelligent Search**: Type-ahead search with debouncing (500ms)
- **Geocoding**: Powered by Nominatim (OpenStreetMap)
- **Country-Specific**: Defaults to Sri Lanka (LK)
- **Rich Results**: Shows location type, coordinates, and importance
- **Click Outside to Close**: Intuitive dropdown behavior

### 📍 Current Location
- **One-Click**: "Use Current Location" button
- **GPS Integration**: Uses browser geolocation API
- **Reverse Geocoding**: Converts coordinates to readable address
- **High Accuracy**: Requests precise GPS location

### 🛣️ Real Routing
- **Multiple Providers**:
  - **Primary**: OpenRouteService API (2000 requests/day free)
  - **Fallback**: Simple linear interpolation if no API key
- **Profile Support**: Driving-car, cycling, walking
- **Metadata**: Distance (km), duration (minutes), bounding box

### 📊 Risk Analysis
- **Sampled Points**: Analyzes up to 20 points along route
- **Smart Sampling**: Every ~100 meters
- **Statistics**:
  - Maximum risk score
  - Average risk score
  - Number of analyzed points
- **Visual Markers**: Color-coded circles on map
- **Risk Warnings**:
  - 🔴 High Risk (≥70): Critical warning
  - 🟡 Moderate Risk (40-69): Caution
  - 🟢 Low Risk (<40): Safe

### 🗺️ Map Visualization
- **Route Line**: Blue gradient with direction arrows
- **Risk Circles**: Dynamic sizing based on risk level
- **Auto-Centering**: Map centers on route bounding box
- **User Location**: Blue pulsing marker
- **Interactive**: Click circles for risk details

## Setup

### Environment Variables

Create or update `.env` file:

```env
# Optional: OpenRouteService API Key (free tier: 2000 req/day)
# Get your key at: https://openrouteservice.org/dev/#/signup
VITE_ORS_API_KEY=your_ors_api_key_here

# Existing variables
VITE_API_BASE=your_backend_api
VITE_TIMEZONE=Asia/Colombo
VITE_USE_MOCK_API=true
```

**Note**: The app works without ORS API key using fallback routing!

### Get OpenRouteService API Key (Optional but Recommended)

1. Visit: https://openrouteservice.org/dev/#/signup
2. Sign up for free account
3. Create new API key
4. Copy key to `.env` as `VITE_ORS_API_KEY`
5. Restart dev server

**Benefits of ORS API**:
- Real road routing (not straight lines)
- Accurate distances and durations
- Respects road networks and traffic rules
- Turn restrictions and one-way streets

## Usage

### Step-by-Step Guide

1. **Open Route Look-Ahead** page from navigation

2. **Select Vehicle Type**
   - Car, Bus, Motorcycle, or Three Wheeler
   - Different risk profiles per vehicle

3. **Set Starting Location** (From)
   - Option A: Click "Use Current Location"
   - Option B: Search for location:
     - Type at least 3 characters
     - Select from dropdown results

4. **Set Destination** (To)
   - Search for destination location
   - Select from dropdown results

5. **Click "Analyze Route"**
   - Fetches route from routing service
   - Shows route distance and duration
   - Analyzes risk along route
   - Displays results on map

6. **Review Results**
   - **Route Line**: Blue path with direction arrows
   - **Risk Circles**: Colored markers showing hazards
   - **Statistics Panel**: Max/avg risk, point count
   - **Route Info**: Distance and estimated time
   - **Warnings**: Risk-based recommendations

### Example Searches

**Within Sri Lanka:**
- "Colombo Fort"
- "Kandy city"
- "Galle Face Green"
- "Negombo beach"
- "Mount Lavinia"
- "Dehiwala Zoo"

**Specific Places:**
- "University of Colombo"
- "Colombo Railway Station"
- "Bandaranaike International Airport"

## Technical Architecture

### Components

#### `LocationSearch.tsx`
```typescript
<LocationSearch
  label="From"
  placeholder="Search starting location..."
  onLocationSelect={(location) => {
    // location: { lat, lng, name }
  }}
  disabled={false}
/>
```

**Features**:
- Debounced search (500ms)
- Loading spinner
- Clear button
- Selected location badge
- Minimum 3 characters

#### `routingService.ts`

**Functions**:

1. `getRoute(from, to, profile)`
   - Fetches route from ORS API
   - Falls back to simple route
   - Returns coordinates, distance, duration, bbox

2. `geocodeAddress(query, countryCode)`
   - Searches for locations
   - Returns array of results
   - Includes lat, lng, display_name, type

3. `reverseGeocode(lat, lng)`
   - Converts coordinates to address
   - Used for "Current Location"

### Data Flow

```
User Input
    ↓
LocationSearch → geocodeAddress() → Results Dropdown
    ↓
User Selects → setFromLocation / setToLocation
    ↓
Click "Analyze Route"
    ↓
getRoute(from, to) → Route Coordinates
    ↓
samplePolyline() → Sample Points (every 100m)
    ↓
riskApi.score() → Risk for Each Point (x20)
    ↓
Statistics Calculation → Max, Avg, Count
    ↓
Map Visualization → Route Line + Risk Circles
```

### API Integration

#### OpenRouteService API

**Endpoint**: `https://api.openrouteservice.org/v2/directions/driving-car`

**Request**:
```json
{
  "coordinates": [
    [lng1, lat1],  // From
    [lng2, lat2]   // To
  ],
  "preference": "recommended",
  "units": "m"
}
```

**Response**:
```json
{
  "routes": [{
    "geometry": {
      "coordinates": [[lng, lat], ...]
    },
    "summary": {
      "distance": 5432.1,  // meters
      "duration": 612.4    // seconds
    },
    "bbox": [minLng, minLat, maxLng, maxLat]
  }]
}
```

#### Nominatim API (Geocoding)

**Endpoint**: `https://nominatim.openstreetmap.org/search`

**Parameters**:
- `q`: Search query
- `format`: json
- `countrycodes`: lk (Sri Lanka)
- `limit`: 5
- `addressdetails`: 1

**Response**:
```json
[{
  "lat": "6.9271",
  "lon": "79.8612",
  "display_name": "Colombo, Western Province, Sri Lanka",
  "type": "city",
  "importance": 0.87
}]
```

## Performance Considerations

### Optimization Strategies

1. **Debounced Search**: 500ms delay prevents excessive API calls
2. **Result Limit**: Maximum 5 search results per query
3. **Point Sampling**: Analyzes only 20 points (not entire route)
4. **Cached Results**: Same search returns immediately
5. **Lazy Loading**: Route only fetched when needed

### API Rate Limits

- **Nominatim**: 1 request/second, no API key needed
- **OpenRouteService**: 2000 requests/day (free tier)
- **Fallback**: Unlimited (client-side calculation)

### User-Agent Required

Nominatim requires User-Agent header:
```typescript
headers: {
  'User-Agent': 'DriverAlert/1.0'
}
```

## Error Handling

### Graceful Degradation

1. **No ORS API Key**: Falls back to simple routing
2. **ORS API Failure**: Catches error, uses fallback
3. **Geocoding Failure**: Shows error toast
4. **No Results**: Displays "No results found"
5. **Network Error**: User-friendly error messages

### Error Messages

- "Please select both from and to locations"
- "Could not get your location"
- "Failed to analyze route"
- "Type at least 3 characters to search"
- "Geolocation not supported"

## Accessibility

- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader compatible
- ✅ High contrast colors
- ✅ Clear labels and placeholders
- ✅ Loading states
- ✅ Error announcements

## Browser Compatibility

### Required Features

- ✅ Geolocation API
- ✅ Fetch API
- ✅ ES6+ JavaScript
- ✅ CSS Grid/Flexbox

### Tested Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

### Planned Features

1. **Multiple Routes**
   - Show 2-3 alternative routes
   - Compare risk scores
   - Select safest route

2. **Waypoints**
   - Add intermediate stops
   - Reorder waypoints
   - Optimize route

3. **Route History**
   - Save favorite routes
   - Recent searches
   - Quick access

4. **Real-time Traffic**
   - Live traffic data
   - Dynamic rerouting
   - Accident avoidance

5. **Turn-by-Turn**
   - Step-by-step directions
   - Voice guidance
   - ETA updates

6. **Offline Mode**
   - Cache routes
   - Download maps
   - Offline geocoding

7. **Share Route**
   - Generate shareable link
   - QR code
   - Social media

8. **Advanced Filters**
   - Avoid highways
   - Prefer scenic routes
   - Minimum risk path

## Troubleshooting

### Issue: "No results found" when searching

**Solution**:
- Type at least 3 characters
- Check spelling
- Try generic terms (e.g., "Colombo" not "Colompo")
- Ensure internet connection

### Issue: Route not showing on map

**Solution**:
- Check browser console for errors
- Verify both locations selected
- Click "Analyze Route" button
- Try zooming out on map

### Issue: "Could not get your location"

**Solution**:
- Allow location permission in browser
- Check HTTPS (geolocation requires secure context)
- Try manual search instead
- Check GPS on mobile devices

### Issue: Straight line route instead of roads

**Solution**:
- Add ORS API key to `.env`
- Restart development server
- Check API key is valid
- Verify internet connection

## Development

### File Structure

```
src/
├── pages/
│   └── RouteLookAhead.tsx      # Main route analysis page
├── components/
│   ├── LocationSearch.tsx       # Search component
│   └── MapWeb.tsx               # Map with route display
└── lib/
    └── api/
        └── routingService.ts    # Routing & geocoding
```

### Adding New Routing Provider

1. Create provider function in `routingService.ts`
2. Follow `RouteResult` interface
3. Add to `getRoute()` with fallback chain
4. Update documentation

Example:
```typescript
async function getRouteFromProvider(
  from: RoutePoint,
  to: RoutePoint
): Promise<RouteResult> {
  // Implementation
}
```

## Testing

### Manual Test Checklist

- [ ] Search for "From" location
- [ ] Search for "To" location
- [ ] Click "Use Current Location"
- [ ] Select from dropdown results
- [ ] Clear selected location
- [ ] Analyze route without selections (error)
- [ ] Analyze route with both locations
- [ ] View route line on map
- [ ] View risk circles
- [ ] Check statistics panel
- [ ] Try different vehicle types
- [ ] Test with/without ORS API key
- [ ] Mobile responsiveness
- [ ] Keyboard navigation

### Example Test Cases

1. **Colombo to Kandy**
   - Expected: ~115 km, ~3 hours
   - Route through A1 highway

2. **Galle Face to Fort Station**
   - Expected: ~2 km, ~10 minutes
   - Urban route with traffic

3. **Current Location to Airport**
   - Expected: Variable
   - Uses GPS coordinates

## Summary

The Route Look-Ahead mode now features:
✅ Intelligent location search
✅ Real-time routing through roads
✅ Current location support
✅ Comprehensive risk analysis
✅ Visual route display with directions
✅ Distance and duration estimates
✅ Graceful fallbacks
✅ Professional UI/UX

Users can now plan their journey with confidence, knowing the accident risk levels along their actual driving route! 🚗🗺️📍
