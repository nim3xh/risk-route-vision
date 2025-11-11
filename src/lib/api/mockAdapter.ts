import {
  ScoreRequest,
  ScoreResponse,
  SegmentsTodayResponse,
  TopSpot,
  Vehicle,
  BoundingBox,
} from "@/types";
import { isPointInBbox } from "@/lib/geo/bbox";
import segmentsTodayData from "@/fixtures/segments_today.json";

/**
 * Deterministic pseudo-random number generator (seeded)
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Hash a lat/lon to a seed
 */
function hashCoords(lat: number, lon: number): number {
  return Math.floor((lat * 1000 + lon * 1000) * 12345);
}

/**
 * Mock score calculation
 */
export async function mockScore(req: ScoreRequest): Promise<ScoreResponse> {
  const seed = hashCoords(req.lat, req.lon);
  const baseRisk = seededRandom(seed) * 100;
  
  // Vehicle multipliers
  const vehicleMultipliers: Record<Vehicle, number> = {
    "Car": 1.0,
    "Bus": 0.85,
    "Motor Cycle": 1.3,
    "Three Wheeler": 1.15,
  };
  
  const vehicleRisk = baseRisk * vehicleMultipliers[req.vehicle];
  
  // Wet conditions increase risk
  const wetMultiplier = req.is_wet === 1 ? 1.25 : 1.0;
  
  const finalRisk = Math.min(100, Math.max(0, vehicleRisk * wetMultiplier));
  
  const causes = [
    "Sharp curve with poor visibility",
    "Steep descent",
    "Narrow road section",
    "Heavy traffic intersection",
    "Poor road surface condition",
    "Blind corner",
    "School zone during peak hours",
  ];
  
  const topCause = causes[Math.floor(seededRandom(seed + 1) * causes.length)];
  
  return {
    risk_0_100: Math.round(finalRisk),
    top_cause: topCause,
    p_top_cause: 0.3 + seededRandom(seed + 2) * 0.4,
    rate_pred: seededRandom(seed + 3) * 0.5,
    components: {
      cause_component: seededRandom(seed + 4) * 0.3,
      rate_component: seededRandom(seed + 5) * 0.3,
      S_vehicle: vehicleMultipliers[req.vehicle],
      W_weather: wetMultiplier,
    },
  };
}

/**
 * Mock segments today
 */
export async function mockGetSegmentsToday(
  bbox?: BoundingBox,
  hour?: number,
  vehicle?: Vehicle
): Promise<SegmentsTodayResponse> {
  const data = segmentsTodayData as SegmentsTodayResponse;
  
  let filtered = data.features;
  
  // Filter by bbox
  if (bbox) {
    filtered = filtered.filter((f) => {
      const coords = f.geometry.coordinates as number[];
      const [lon, lat] = coords;
      return isPointInBbox(lat, lon, bbox);
    });
  }
  
  // Filter by hour (within ±2 hours)
  if (hour !== undefined) {
    filtered = filtered.filter((f) => {
      const diff = Math.abs(f.properties.hour - hour);
      return diff <= 2 || diff >= 22; // Handle wraparound
    });
  }
  
  // Filter by vehicle
  if (vehicle) {
    filtered = filtered.filter((f) => f.properties.vehicle === vehicle);
  }
  
  return {
    type: "FeatureCollection",
    features: filtered,
  };
}

/**
 * Mock top spots
 */
export async function mockGetTopSpots(
  vehicle?: Vehicle,
  limit: number = 10
): Promise<TopSpot[]> {
  const data = segmentsTodayData as SegmentsTodayResponse;
  
  let spots = data.features
    .filter((f) => !vehicle || f.properties.vehicle === vehicle)
    .map((f) => {
      const coords = f.geometry.coordinates as number[];
      return {
        segment_id: f.properties.segment_id,
        lat: coords[1],
        lon: coords[0],
        risk_0_100: f.properties.risk_0_100,
        vehicle: f.properties.vehicle,
        hour: f.properties.hour,
        top_cause: f.properties.top_cause,
      };
    });
  
  // Sort by risk descending
  spots.sort((a, b) => b.risk_0_100 - a.risk_0_100);
  
  return spots.slice(0, limit);
}
