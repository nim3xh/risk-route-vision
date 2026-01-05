/**
 * Routing Service - Handles route calculation between two points
 * Uses OpenRouteService API or fallback to simple linear interpolation
 */

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lng, lat]
  distance: number; // in meters
  duration: number; // in seconds
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

/**
 * Calculate route using OSRM (Open Source Routing Machine)
 * FREE - No API key required!
 * Public demo server - for production, consider self-hosting
 */
async function getRouteFromOSRM(
  from: RoutePoint,
  to: RoutePoint
): Promise<RouteResult> {
  try {
    // OSRM demo server - free, no API key needed
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
    

    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }
    
    const route = data.routes[0];
    const geometry = route.geometry;
    

    
    return {
      coordinates: geometry.coordinates,
      distance: route.distance,
      duration: route.duration,
      bbox: [
        Math.min(...geometry.coordinates.map((c: number[]) => c[0])),
        Math.min(...geometry.coordinates.map((c: number[]) => c[1])),
        Math.max(...geometry.coordinates.map((c: number[]) => c[0])),
        Math.max(...geometry.coordinates.map((c: number[]) => c[1])),
      ],
    };
  } catch (error) {
    console.error('Error fetching route from OSRM:', error);
    throw error;
  }
}

/**
 * Calculate route using OpenRouteService API
 * Requires API key - 2000 requests/day free tier
 */
async function getRouteFromORS(
  from: RoutePoint,
  to: RoutePoint,
  profile: 'driving-car' | 'cycling-regular' | 'foot-walking' = 'driving-car'
): Promise<RouteResult> {
  const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;
  
  if (!ORS_API_KEY) {
    throw new Error('No ORS API key');
  }

  const url = 'https://api.openrouteservice.org/v2/directions/' + profile;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
      preference: 'recommended',
      units: 'm',
    }),
  });

  if (!response.ok) {
    throw new Error(`ORS API error: ${response.status}`);
  }

  const data = await response.json();
  const route = data.routes[0];
  
  return {
    coordinates: route.geometry.coordinates,
    distance: route.summary.distance,
    duration: route.summary.duration,
    bbox: route.bbox,
  };
}

/**
 * Calculate route - tries multiple services with fallback
 * 1. OSRM (free, no API key) - PRIMARY
 * 2. OpenRouteService (if API key provided)
 * 3. Simple straight line (last resort)
 */
export async function getRoute(
  from: RoutePoint,
  to: RoutePoint,
  profile: 'driving-car' | 'cycling-regular' | 'foot-walking' = 'driving-car'
): Promise<RouteResult> {
  // Try OSRM first (free, no API key needed)
  try {
    return await getRouteFromOSRM(from, to);
  } catch (error) {
    console.warn('OSRM routing failed, trying alternatives...', error);
  }

  // Try OpenRouteService if API key is available
  const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;
  if (ORS_API_KEY) {
    try {

      return await getRouteFromORS(from, to, profile);
    } catch (error) {
      console.warn('ORS routing failed:', error);
    }
  }

  // Last resort: simple straight line
  console.warn('⚠️ All routing services failed, using simple route');
  return getSimpleRoute(from, to);
}

/**
 * Simple fallback route calculation
 * Creates a straight line with intermediate points
 */
function getSimpleRoute(from: RoutePoint, to: RoutePoint): RouteResult {
  const coordinates: [number, number][] = [];
  const steps = 20; // Number of intermediate points
  
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const lng = from.lng + (to.lng - from.lng) * fraction;
    const lat = from.lat + (to.lat - from.lat) * fraction;
    coordinates.push([lng, lat]);
  }
  
  // Calculate approximate distance using Haversine formula
  const R = 6371000; // Earth's radius in meters
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Estimate duration (assuming 30 km/h average speed)
  const duration = (distance / 30000) * 3600;
  
  return {
    coordinates,
    distance,
    duration,
    bbox: [
      Math.min(from.lng, to.lng),
      Math.min(from.lat, to.lat),
      Math.max(from.lng, to.lng),
      Math.max(from.lat, to.lat),
    ],
  };
}

/**
 * Geocode address to coordinates using Nominatim (OpenStreetMap)
 * Free service, no API key required
 */
export interface GeocodingResult {
  lat: number;
  lng: number;
  display_name: string;
  type: string;
  importance: number;
}

export async function geocodeAddress(
  query: string,
  countryCode: string = 'lk' // Default to Sri Lanka
): Promise<GeocodingResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      countrycodes: countryCode,
      limit: '5',
    });

    // Use backend proxy to avoid CORS issues
    const response = await fetch(
      `http://localhost:8080/api/v1/geocoding/search?${params}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.map((item: {
      lat: string;
      lon: string;
      display_name: string;
      type: string;
      importance: number;
    }) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      display_name: item.display_name,
      type: item.type,
      importance: item.importance,
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          'User-Agent': 'DriverAlert/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding error: ${response.status}`);
    }

    const data = await response.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
