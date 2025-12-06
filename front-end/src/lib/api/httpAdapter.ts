import axios, { AxiosInstance } from "axios";
import {
  ScoreRequest,
  ScoreResponse,
  SegmentsTodayResponse,
  TopSpot,
  Vehicle,
  BoundingBox,
} from "@/types";
import { bboxToString } from "@/lib/geo/bbox";
import { config } from "@/lib/config";

// Map frontend vehicle types to backend vehicle types
function mapVehicleType(vehicle: Vehicle): string {
  const mapping: Record<Vehicle, string> = {
    "Car": "CAR",
    "Bus": "BUS",
    "Motor Cycle": "MOTORCYCLE",
    "Three Wheeler": "THREE_WHEELER",
    "Van": "VAN", // Now properly mapped to VAN
    "Lorry": "LORRY",
  };
  return mapping[vehicle] || "CAR";
}

// Map backend vehicle types to frontend vehicle types
function unmapVehicleType(backendVehicle: string): Vehicle {
  const mapping: Record<string, Vehicle> = {
    "CAR": "Car",
    "BUS": "Bus",
    "MOTORCYCLE": "Motor Cycle",
    "THREE_WHEELER": "Three Wheeler",
    "VAN": "Van",
    "LORRY": "Lorry",
  };
  return mapping[backendVehicle] || "Car";
}

class HttpAdapter {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async score(req: ScoreRequest): Promise<ScoreResponse> {
    // Use /risk/nearby endpoint for single point scoring
    // This endpoint creates a small route around the point for analysis
    const backendRequest = {
      vehicleType: mapVehicleType(req.vehicle),
      point: [req.lat, req.lon], // Single point for nearby analysis
    };

    const response = await this.client.post<{
      overall: number;
      segmentScores: number[];
      explain: Record<string, number>;
    }>("/risk/nearby", backendRequest);

    // Convert backend response to frontend format
    const data = response.data;
    return {
      risk_0_100: Math.round(data.overall * 100),
      top_cause: this.getTopCause(data.explain),
      p_top_cause: this.getTopCauseValue(data.explain),
      rate_pred: data.overall,
      components: {
        cause_component: data.explain.curvature || 0,
        rate_component: data.overall,
        S_vehicle: data.explain.vehicle_factor || 1.0,
        W_weather: data.explain.surface_wetness_prob || data.explain.is_wet || 0,
      },
    };
  }

  /**
   * Score a route with multiple coordinates
   * Returns per-segment risk scores and overall route risk
   */
  async scoreRoute(
    coordinates: { lat: number; lon: number }[],
    vehicle: Vehicle,
    timestamp?: string
  ): Promise<{
    overall: number;
    segmentScores: number[];
    risk_0_100: number;
    explain: Record<string, number>;
  }> {
    // Convert to backend format: [[lat, lon], [lat, lon], ...]
    const backendRequest = {
      vehicleType: mapVehicleType(vehicle),
      coordinates: coordinates.map(c => [c.lat, c.lon]),
      timestampUtc: timestamp || null,
    };

    const response = await this.client.post<{
      overall: number;
      segmentScores: number[];
      explain: Record<string, number>;
    }>("/risk/score", backendRequest);

    const data = response.data;
    return {
      overall: data.overall,
      segmentScores: data.segmentScores,
      risk_0_100: Math.round(data.overall * 100),
      explain: data.explain,
    };
  }

  private getTopCause(explain: Record<string, number>): string {
    const causes = Object.entries(explain);
    if (causes.length === 0) return "unknown";
    
    const sorted = causes.sort((a, b) => b[1] - a[1]);
    return sorted[0][0];
  }

  private getTopCauseValue(explain: Record<string, number>): number {
    const causes = Object.values(explain);
    return causes.length > 0 ? Math.max(...causes) : 0;
  }

  async getSegmentsToday(
    bbox?: BoundingBox,
    hour?: number,
    vehicle?: Vehicle
  ): Promise<SegmentsTodayResponse> {
    const params: Record<string, string> = {};
    
    if (bbox) {
      params.bbox = bboxToString(bbox);
    }
    if (hour !== undefined) {
      params.hour = hour.toString();
    }
    if (vehicle) {
      params.vehicle = mapVehicleType(vehicle);
    }

    const response = await this.client.get<SegmentsTodayResponse>(
      "/risk/segments/today",
      { params }
    );
    
    // Transform backend response to frontend format
    const data = response.data;
    return {
      type: "FeatureCollection",
      features: data.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          vehicle: unmapVehicleType(feature.properties.vehicle),
        }
      }))
    };
  }

  async getTopSpots(vehicle?: Vehicle, limit: number = 10): Promise<TopSpot[]> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (vehicle) {
      params.vehicle = mapVehicleType(vehicle);
    }

    const response = await this.client.get<TopSpot[]>("/risk/spots/top", { params });
    
    // Transform backend response to frontend format
    return response.data.map(spot => ({
      ...spot,
      vehicle: unmapVehicleType(spot.vehicle),
    }));
  }
}

export const httpAdapter = new HttpAdapter(config.apiBase);
