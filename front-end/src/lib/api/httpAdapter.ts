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
      timeout: 30000, // Increased to 30 seconds for grid generation
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
      hour: req.hour,
      weather: req.temperature_c !== undefined ? {
        temperature: req.temperature_c,
        humidity: req.humidity_pct,
        precipitation: req.precip_mm,
        wind_speed: req.wind_kmh,
        is_wet: req.is_wet,
      } : undefined
    };

    try {
      const response = await this.client.post<{
        overall: number;
        segmentScores: number[];
        segmentCauses: string[];
        rateScores: number[];
        explain: Record<string, number>;
      }>("/risk/nearby", backendRequest);

      // Convert backend response to frontend format
      const data = response.data;
      return {
        risk_0_100: Math.round(data.overall * 100),
        top_cause: data.segmentCauses?.[0] || this.getTopCause(data.explain),
        p_top_cause: this.getTopCauseValue(data.explain),
        rate_pred: data.rateScores?.[0] || data.overall,
        components: {
          cause_component: data.explain.curvature || 0,
          rate_component: data.overall,
          S_vehicle: data.explain.vehicle_factor || 1.0,
          W_weather: data.explain.surface_wetness_prob || data.explain.is_wet || 0,
        },
        weather: (data as any).weather ? {
          temperature_c: (data as any).weather.temperature,
          humidity_pct: (data as any).weather.humidity,
          precip_mm: (data as any).weather.precipitation,
          wind_kmh: (data as any).weather.wind_speed,
          is_wet: (data as any).weather.is_wet as 0 | 1,
        } : undefined
      };
    } catch (error) {
      // Re-throw with proper axios error structure
      throw error;
    }
  }

  /**
   * Score a route with multiple coordinates using ML models
   * Returns per-segment risk scores and overall route risk
   */
  async scoreRoute(
    coordinates: { lat: number; lon: number }[],
    vehicle: Vehicle,
    timestamp?: string,
    hour?: number,
    weather?: {
      temperature_c?: number;
      humidity_pct?: number;
      precip_mm?: number;
      wind_kmh?: number;
      is_wet?: 0 | 1;
    }
  ): Promise<{
    overall: number;
    segmentScores: number[];
    segmentCoordinates: number[][];  // [[lat, lon], ...] - only analyzed coordinates
    segmentCauses: string[];
    rateScores: number[];
    risk_0_100: number;
    explain: Record<string, number>;
    weather?: {
      temperature: number;
      humidity: number;
      precipitation: number;
      wind_speed: number;
      is_wet: 0 | 1;
    };
  }> {
    // Convert to backend format: [[lat, lon], [lat, lon], ...]
    const backendRequest = {
      vehicleType: mapVehicleType(vehicle),
      coordinates: coordinates.map(c => [c.lat, c.lon]),
      timestampUtc: timestamp || null,
      hour: hour,
      weather: weather ? {
        temperature: weather.temperature_c,
        humidity: weather.humidity_pct,
        precipitation: weather.precip_mm,
        wind_speed: weather.wind_kmh,
        is_wet: weather.is_wet,
      } : undefined,
    };

    const response = await this.client.post<{
      overall: number;
      segmentScores: number[];
      segmentCoordinates: number[][];  // [[lat, lon], ...]
      segmentCauses: string[];
      rateScores: number[];
      explain: Record<string, number>;
      weather?: {
        temperature: number;
        humidity: number;
        precipitation: number;
        wind_speed: number;
        is_wet: 0 | 1;
      };
    }>("/risk/score", backendRequest);

    const data = response.data;
    return {
      overall: data.overall,
      segmentScores: data.segmentScores,
      segmentCoordinates: data.segmentCoordinates,  // Pass through analyzed coordinates
      segmentCauses: data.segmentCauses,
      rateScores: data.rateScores,
      risk_0_100: Math.round(data.overall * 100),
      explain: data.explain,
      weather: data.weather,
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
    vehicle?: Vehicle,
    weather?: {
      temperature_c: number;
      humidity_pct: number;
      precip_mm: number;
      wind_kmh: number;
      is_wet: 0 | 1;
    }
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
    if (weather) {
      params.temperature = weather.temperature_c.toString();
      params.humidity = weather.humidity_pct.toString();
      params.precipitation = weather.precip_mm.toString();
      params.wind_speed = weather.wind_kmh.toString();
      params.is_wet = weather.is_wet.toString();
    }

    try {
      console.log('[API] Fetching segments/today with params:', params);
      const response = await this.client.get<SegmentsTodayResponse>(
        "/risk/segments/today",
        { params }
      );

      console.log('[API] Received segments:', response.data.features?.length || 0);
      
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
    } catch (error) {
      console.error('[API] Error fetching segments/today:', error);
      throw error;
    }
  }

  async getSegmentsRealtime(
    bbox?: BoundingBox,
    hour?: number,
    vehicle?: Vehicle,
    weather?: {
      temperature_c: number;
      humidity_pct: number;
      precip_mm: number;
      wind_kmh: number;
      is_wet: 0 | 1;
    }
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
    if (weather) {
      params.temperature = weather.temperature_c.toString();
      params.humidity = weather.humidity_pct.toString();
      params.precipitation = weather.precip_mm.toString();
      params.wind_speed = weather.wind_kmh.toString();
      params.is_wet = weather.is_wet.toString();
    }

    try {
      console.log('[API] Fetching segments/realtime with params:', params);
      const response = await this.client.get<SegmentsTodayResponse>(
        "/risk/segments/realtime",
        { params }
      );

      console.log('[API] Received realtime segments:', response.data.features?.length || 0);
      
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
    } catch (error) {
      console.error('[API] Error fetching segments/realtime:', error);
      throw error;
    }
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

  async getWeather(lat: number, lon: number): Promise<any> {
    const response = await this.client.get("/weather", {
      params: { lat, lon }
    });
    return response.data;
  }

  // Analytics endpoints
  async compareRoutes(
    routes: Array<{ name: string; coordinates: [number, number][] }>,
    vehicle: Vehicle = "CAR",
    hour?: number
  ): Promise<any> {
    const backendRoutes = routes.map(r => ({
      name: r.name,
      coordinates: r.coordinates.map(c => ({ lat: c[0], lon: c[1] }))
    }));

    const params: Record<string, string> = {
      vehicle: mapVehicleType(vehicle),
    };
    if (hour !== undefined) {
      params.hour = hour.toString();
    }

    const response = await this.client.post("/analytics/route-comparison", backendRoutes, { params });
    return response.data;
  }

  async getRiskDistribution(
    bbox?: string,
    vehicle?: Vehicle,
    hour?: number
  ): Promise<any> {
    const params: Record<string, string> = {};
    if (bbox) params.bbox = bbox;
    if (vehicle) params.vehicle = mapVehicleType(vehicle);
    if (hour !== undefined) params.hour = hour.toString();

    const response = await this.client.get("/analytics/risk-distribution", { params });
    return response.data;
  }

  async getVehicleComparison(
    bbox?: string,
    hour?: number
  ): Promise<any> {
    const params: Record<string, string> = {};
    if (bbox) params.bbox = bbox;
    if (hour !== undefined) params.hour = hour.toString();

    const response = await this.client.get("/analytics/vehicle-comparison", { params });
    return response.data;
  }

  async getHourlyTrends(
    bbox?: string,
    vehicle: Vehicle = "CAR"
  ): Promise<any> {
    const params: Record<string, string> = {
      vehicle: mapVehicleType(vehicle),
    };
    if (bbox) params.bbox = bbox;

    const response = await this.client.get("/analytics/hourly-trends", { params });
    return response.data;
  }

  async getRouteDetails(
    coordinates: [number, number][],
    vehicle: Vehicle = "CAR",
    hour?: number
  ): Promise<any> {
    const backendCoords = coordinates.map(c => ({ lat: c[0], lon: c[1] }));
    const params: Record<string, string> = {
      vehicle: mapVehicleType(vehicle),
    };
    if (hour !== undefined) params.hour = hour.toString();

    const response = await this.client.post("/analytics/route-details", backendCoords, { params });
    return response.data;
  }

  async getRiskFactors(
    lat: number,
    lon: number,
    vehicle: Vehicle = "CAR",
    hour?: number
  ): Promise<any> {
    const params: Record<string, string> = {
      lat: lat.toString(),
      lon: lon.toString(),
      vehicle: mapVehicleType(vehicle),
    };
    if (hour !== undefined) params.hour = hour.toString();

    const response = await this.client.get("/analytics/risk-factors", { params });
    return response.data;
  }
}

export const httpAdapter = new HttpAdapter(config.apiBase);
