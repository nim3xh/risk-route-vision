import {
  ScoreRequest,
  ScoreResponse,
  SegmentsTodayResponse,
  TopSpot,
  Vehicle,
  BoundingBox,
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
    vehicle?: Vehicle
  ): Promise<SegmentsTodayResponse> {
    if (this.useMock) {
      return mockGetSegmentsToday(bbox, hour, vehicle);
    }
    return httpAdapter.getSegmentsToday(bbox, hour, vehicle);
  }

  async getTopSpots(vehicle?: Vehicle, limit: number = 10): Promise<TopSpot[]> {
    if (this.useMock) {
      return mockGetTopSpots(vehicle, limit);
    }
    return httpAdapter.getTopSpots(vehicle, limit);
  }
}

export const riskApi = new RiskApiClient();
