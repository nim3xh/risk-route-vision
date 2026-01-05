import {
  ScoreRequest,
  ScoreResponse,
  SegmentsTodayResponse,
  TopSpot,
  Vehicle,
  BoundingBox,
  Weather,
} from "@/types";
import { config } from "@/lib/config";
import { httpAdapter } from "./httpAdapter";
import {
  mockScore,
  mockGetSegmentsToday,
  mockGetTopSpots,
} from "./mockAdapter";

/**
 * Unified Risk API Client
 * Automatically switches between mock and real HTTP based on config
 */
class RiskApiClient {
  private useMock: boolean;

  constructor() {
    this.useMock = config.useMockApi;
  }

  setMockMode(enabled: boolean) {
    this.useMock = enabled;
  }

  isMockMode(): boolean {
    return this.useMock;
  }

  async score(req: ScoreRequest): Promise<ScoreResponse> {
    if (this.useMock) {
      return mockScore(req);
    }
    return httpAdapter.score(req);
  }

  /**
   * Score a route with multiple coordinates (more efficient than scoring each point individually)
   * Only available for real HTTP adapter
   */
  async scoreRoute(
    coordinates: { lat: number; lon: number }[],
    vehicle: Vehicle,
    timestamp?: string
  ): Promise<{
    overall: number;
    segmentScores: number[];
    segmentCauses: string[];
    rateScores: number[];
    risk_0_100: number;
    explain: Record<string, number>;
  }> {
    if (this.useMock) {
      // For mock mode, just score the first point
      const mockResult = await mockScore({
        lat: coordinates[0].lat,
        lon: coordinates[0].lon,
        vehicle,
        timestamp,
      });
      return {
        overall: mockResult.rate_pred,
        segmentScores: coordinates.map(() => mockResult.rate_pred),
        segmentCauses: coordinates.map(() => mockResult.top_cause),
        rateScores: coordinates.map(() => mockResult.rate_pred),
        risk_0_100: mockResult.risk_0_100,
        explain: {
          curvature: mockResult.components.cause_component,
          surface_wetness_prob: mockResult.components.W_weather,
          vehicle_factor: mockResult.components.S_vehicle,
        },
      };
    }
    return httpAdapter.scoreRoute(coordinates, vehicle, timestamp);
  }

  async getSegmentsToday(
    bbox?: BoundingBox,
    hour?: number,
    vehicle?: Vehicle,
    weather?: Weather
  ): Promise<SegmentsTodayResponse> {
    if (this.useMock) {
      return mockGetSegmentsToday(bbox, hour, vehicle);
    }
    return httpAdapter.getSegmentsToday(bbox, hour, vehicle, weather);
  }

  async getSegmentsRealtime(
    bbox?: BoundingBox,
    hour?: number,
    vehicle?: Vehicle,
    weather?: Weather
  ): Promise<SegmentsTodayResponse> {
    if (this.useMock) {
      // In mock mode, return same as historical for now
      return mockGetSegmentsToday(bbox, hour, vehicle);
    }
    return httpAdapter.getSegmentsRealtime(bbox, hour, vehicle, weather);
  }

  async getTopSpots(vehicle?: Vehicle, limit: number = 10): Promise<TopSpot[]> {
    if (this.useMock) {
      return mockGetTopSpots(vehicle, limit);
    }
    return httpAdapter.getTopSpots(vehicle, limit);
  }

  async getWeather(lat: number, lon: number): Promise<Weather> {
    if (this.useMock) {
      return {
        temperature_c: 28,
        humidity_pct: 75,
        precip_mm: 0,
        wind_kmh: 12,
        is_wet: 0,
      };
    }
    return httpAdapter.getWeather(lat, lon);
  }

  // Analytics endpoints
  async compareRoutes(
    routes: Array<{ name: string; coordinates: [number, number][] }>,
    vehicle: Vehicle = "CAR",
    hour?: number
  ): Promise<any> {
    return httpAdapter.compareRoutes(routes, vehicle, hour);
  }

  async getRiskDistribution(
    bbox?: string,
    vehicle?: Vehicle,
    hour?: number
  ): Promise<any> {
    return httpAdapter.getRiskDistribution(bbox, vehicle, hour);
  }

  async getVehicleComparison(
    bbox?: string,
    hour?: number
  ): Promise<any> {
    return httpAdapter.getVehicleComparison(bbox, hour);
  }

  async getHourlyTrends(
    bbox?: string,
    vehicle: Vehicle = "CAR"
  ): Promise<any> {
    return httpAdapter.getHourlyTrends(bbox, vehicle);
  }

  async getRouteDetails(
    coordinates: [number, number][],
    vehicle: Vehicle = "CAR",
    hour?: number
  ): Promise<any> {
    return httpAdapter.getRouteDetails(coordinates, vehicle, hour);
  }

  async getRiskFactors(
    lat: number,
    lon: number,
    vehicle: Vehicle = "CAR",
    hour?: number
  ): Promise<any> {
    return httpAdapter.getRiskFactors(lat, lon, vehicle, hour);
  }
}

export const riskApi = new RiskApiClient();
